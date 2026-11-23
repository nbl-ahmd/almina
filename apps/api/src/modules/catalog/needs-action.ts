import { z } from 'zod';
import type { Db, Document } from 'mongodb';
import { incompleteProductNamePattern, storePublicationIssues, hasProductPhoto } from '@almina/contracts';
import { HttpError } from '../../errors.js';

const querySchema = z.object({
  limit: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(25),
  offset: z.string().regex(/^\d{1,5}$/).transform(Number).pipe(z.number().int().min(0).max(10000)).default(0),
  q: z.string().trim().min(1).max(80).optional(),
  reason: z.enum(['all', 'identity', 'classification', 'prescription', 'content', 'images', 'missing-photo']).default('all'),
  status: z.enum(['drafts','published','all']).default('drafts'),
}).strict();

export function needsActionQuery(raw: unknown) {
  const result = querySchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  return result.data;
}

export function needsActionFilter(query: z.infer<typeof querySchema>): Document {
  const photoValue = { $type: 'string', $regex: '\\S', $not: /^\s*\/?product-placeholder\.svg\s*$/ };
  const reason: Record<string, Document> = {
    identity: { $or: [{ name: { $exists: false } }, { name: '' }, { name: incompleteProductNamePattern }] },
    classification: { productType: { $nin: ['general', 'otc', 'prescription'] } },
    prescription: { productType: 'prescription' },
    // Listing details help customers choose; they are not a publishing gate.
    content: { $or: [{ brand: { $in: [null, ''] }, familyBrand: { $in: [null, ''] } }, { description: { $in: [null, ''] } }] },
    'missing-photo': { $nor: [{ image: photoValue }, { images: { $elemMatch: photoValue } }, { cloudinaryImages: { $elemMatch: photoValue } }] },
    // Image permission is no longer a separate check: a missing photo is the only image action left.
    images: { $nor: [{ image: photoValue }, { images: { $elemMatch: photoValue } }, { cloudinaryImages: { $elemMatch: photoValue } }] },
  };
  return { $and: [
    { archivedAt: { $exists: false } },
    ...(query.status==='drafts' ? [{ $or: [{ published: false }, { disabled: true }, { active: false }] }] : query.status==='published' ? [{published:{$ne:false},disabled:{$ne:true},active:{$ne:false}}] : []),
    ...(reason[query.reason] ? [reason[query.reason]!] : []),
    ...(query.q ? [{ $or: ['name', 'product_id'].map(field => ({
      [field]: { $regex: query.q!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    })) }] : []),
  ] };
}

// Admin-only route. Bound the returned documents; never send the catalogue to the client.
export async function catalogueNeedsAction(db: Db, raw: unknown) {
  const query = needsActionQuery(raw);
  const [result] = await db.collection('products').aggregate([
    { $match: needsActionFilter(query) },
    { $facet: {
      count: [{ $count: 'total' }],
      items: [{ $sort: { _id: 1 } }, { $skip: query.offset }, { $limit: query.limit }, { $project: {
        _id: 1, product_id: 1, name: 1, productType: 1, brand: 1, familyBrand: 1,
        saleUnit: 1, packLabel: 1, description: 1, contentReviewed: 1, stockVerified: 1,
        imageRights: 1, image: 1, images: 1, cloudinaryImages: 1, published:1,disabled:1,active:1,
      } }],
    } },
  ], { maxTimeMS: 5000, allowDiskUse: false }).toArray();
  return { total: result?.count[0]?.total ?? 0, offset: query.offset, items: (result?.items ?? []).map((product: Document) => ({
    _id: product._id, product_id: product.product_id, name: product.name, productType: product.productType,
    published:product.published!==false&&product.disabled!==true&&product.active!==false,missingPhoto:!hasProductPhoto(product),
    reasons: storePublicationIssues(product),
  })) };
}
