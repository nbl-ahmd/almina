import { ObjectId, type Db, type Document } from 'mongodb';
import { catalogueFilters, catalogueViews, catalogueListQuerySchema, catalogueQueueQuerySchema, hasProductPhoto, incompleteProductNamePattern,
  storePublicationIssues, type CatalogueContext, type CatalogueFilter, type CatalogueItem, type CatalogueList, type CatalogueQueue, type CatalogueView } from '@almina/contracts';
import type { z } from 'zod';
import { HttpError } from '../../errors.js';

function parse<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  return result.data;
}

const options = { maxTimeMS: 5000, allowDiskUse: false };
const photoValue = { $type: 'string', $regex: '\\S', $not: /^\s*\/?product-placeholder\.svg\s*$/ };
const filled = { $type: 'string', $regex: '\\S' };
const hasPhoto: Document = { $or: [{ image: photoValue }, { images: { $elemMatch: photoValue } }, { cloudinaryImages: { $elemMatch: photoValue } }] };
const live: Document = { published: { $ne: false }, disabled: { $ne: true }, active: { $ne: false } };
const hidden: Document = { $or: [{ published: false }, { disabled: true }, { active: false }] };
const incompleteName: Document = { $or: [{ name: { $not: { $type: 'string' } } }, { name: { $not: /\S/ } }, { name: incompleteProductNamePattern }] };

const viewMatch: Record<CatalogueView, Document> = {
  all: {}, live, hidden, outofstock: { stock: { $lte: 0 } }, sale: { sale: true },
};
const filterMatch: Record<CatalogueFilter, Document> = {
  all: {},
  'missing-photo': { $nor: hasPhoto.$or as Document[] },
  'has-photo': hasPhoto,
  // Hidden, but nothing stops an administrator from putting it on sale.
  ready: { $and: [hidden, hasPhoto, { $nor: [incompleteName] }, { productType: { $in: ['general', 'otc'] } }, { price: { $gt: 0 } }] },
  identity: incompleteName,
  classification: { productType: { $nin: ['general', 'otc', 'prescription'] } },
  prescription: { productType: 'prescription' },
  content: { $or: [{ brand: { $in: [null, ''] }, familyBrand: { $in: [null, ''] } }, { description: { $in: [null, ''] } }] },
  // One missing detail each, matching productGaps() in @almina/contracts (a GTIN is not missing when none is assigned).
  'missing-brand': { $and: [{ $nor: [{ brand: filled }] }, { $nor: [{ familyBrand: filled }] }] },
  'missing-gtin': { $and: [{ identifierStatus: { $ne: 'not-assigned' } }, { $nor: [{ gtin: { $type: 'string', $regex: '^(\\d{8}|\\d{12,14})$' } }] }] },
  'missing-pack': { $nor: [{ packLabel: filled }, { variantPackSize: filled }, { variantSize: filled }] },
  'missing-manufacturer': { $nor: [{ manufacturer: filled }] },
  'missing-description': { description: { $in: [null, ''] } },
};
const literal = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Archived products never appear; search and category narrow every view and count. */
function baseMatch(context: Pick<CatalogueContext, 'q' | 'category'>): Document {
  return { $and: [
    { archivedAt: { $exists: false } },
    ...(context.category ? [{ category: new ObjectId(context.category) }] : []),
    ...(context.q ? [{ $or: ['name', 'product_id', 'brand', 'barcode', 'gtin'].map(field => ({ [field]: { $regex: literal(context.q!), $options: 'i' } })) }] : []),
  ] };
}
function contextMatch(context: Pick<CatalogueContext, 'view' | 'filter'>): Document {
  return { $and: [viewMatch[context.view], filterMatch[context.filter]] };
}
const projection = { _id: 1, product_id: 1, name: 1, brand: 1, familyBrand: 1, category: 1, price: 1, salePrice: 1, sale: 1, stock: 1, disabled: 1,
  published: 1, active: 1, productType: 1, image: 1, images: 1, cloudinaryImages: 1, mediaRevision: 1, barcode: 1, gtin: 1 };
/** Everything the filters, counts and rows read. Narrowing the documents before the counts keeps the whole catalogue
 *  within the aggregation memory and time limits. */
const counted = { ...projection, archivedAt: 1, description: { $cond: [{ $in: [{ $ifNull: ['$description', ''] }, ['']] }, '', 'present'] },
  manufacturer: 1, packLabel: 1, variantPackSize: 1, variantSize: 1, identifierStatus: 1 };
const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const photoStrings = (value: unknown) => (Array.isArray(value) ? value : []).filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0 && !/^\s*\/?product-placeholder\.svg\s*$/.test(entry));

export function catalogueItem(product: Document): CatalogueItem {
  const cdn = photoStrings(product.cloudinaryImages), drive = photoStrings(product.images), single = photoStrings([product.image]);
  const isLive = product.published !== false && product.disabled !== true && product.active !== false;
  const issues = storePublicationIssues(product), missingPhoto = !hasProductPhoto(product), price = amount(product.price);
  return {
    _id: String(product._id), productId: text(product.product_id), name: text(product.name), brand: text(product.brand) || text(product.familyBrand),
    category: text(product.categoryName), price, salePrice: product.sale === true ? amount(product.salePrice) : null, stock: amount(product.stock),
    productType: text(product.productType), live: isLive, missingPhoto, ready: !isLive && !missingPhoto && !issues.length && !!price && price > 0, issues,
    image: cdn[0] ?? single[0] ?? drive[0] ?? null, photos: cdn.length || new Set([...single, ...drive]).size,
    mediaRevision: Number.isSafeInteger(product.mediaRevision) && product.mediaRevision >= 0 ? Number(product.mediaRevision) : 0,
    barcode: text(product.barcode), gtin: text(product.gtin),
  };
}
const withCategory: Document[] = [
  { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryDoc', pipeline: [{ $project: { name: 1 } }] } },
  { $set: { categoryName: { $first: '$categoryDoc.name' } } },
  { $unset: 'categoryDoc' },
];
const countOf = (match: Document): Document[] => [{ $match: match }, { $count: 'total' }];

/** One bounded page of the admin product list with the counts its tabs show. Catalogue order is `_id`: it never changes when a
 *  product is edited, so pages and the editor queue stay stable while staff work through them. */
export async function adminCatalogue(db: Db, raw: unknown): Promise<CatalogueList> {
  const query = parse(catalogueListQuerySchema, raw);
  const codes = query.codes?.split(',');
  const match = codes
    ? { archivedAt: { $exists: false }, $or: [{ product_id: { $in: codes.map(code => new RegExp(`^${literal(code)}$`, 'i')) } }, { barcode: { $in: codes } }, { gtin: { $in: codes } }] }
    : baseMatch(query);
  const [result] = await db.collection('products').aggregate([
    { $match: match },
    { $project: counted },
    { $facet: {
      items: [{ $match: contextMatch(query) }, { $sort: { _id: 1 } }, { $skip: query.offset }, { $limit: query.limit }, { $project: projection }, ...withCategory],
      total: countOf(contextMatch(query)),
      ...Object.fromEntries(catalogueViews.map(view => [`view_${view}`, countOf(contextMatch({ view, filter: query.filter }))])),
      ...Object.fromEntries(catalogueFilters.map(filter => [`filter_${filter.replace('-', '_')}`, countOf(contextMatch({ view: query.view, filter }))])),
    } },
  ], options).toArray();
  const total = (key: string) => Number(result?.[key]?.[0]?.total ?? 0);
  return {
    items: ((result?.items ?? []) as Document[]).map(catalogueItem), total: total('total'), offset: query.offset,
    counts: {
      views: Object.fromEntries(catalogueViews.map(view => [view, total(`view_${view}`)])) as Record<CatalogueView, number>,
      filters: Object.fromEntries(catalogueFilters.map(filter => [filter, total(`filter_${filter.replace('-', '_')}`)])) as Record<CatalogueFilter, number>,
    },
  };
}

/** Neighbours of a product inside a list context. Keyset on `_id` rather than a numbered slice: it works for every product in the
 *  catalogue, and still finds the right next one after the current product has left the queue (published, or given a photo). */
export async function adminCatalogueQueue(db: Db, raw: unknown): Promise<CatalogueQueue> {
  const query = parse(catalogueQueueQuerySchema, raw);
  const id = new ObjectId(query.id), inContext = contextMatch(query);
  const neighbour = (range: Document, direction: 1 | -1): Document[] => [{ $match: { $and: [inContext, { _id: range }] } }, { $sort: { _id: direction } }, { $limit: 1 }, { $project: { _id: 1 } }];
  const [result] = await db.collection('products').aggregate([
    { $match: baseMatch(query) },
    { $project: counted },
    { $facet: {
      previous: neighbour({ $lt: id }, -1), next: neighbour({ $gt: id }, 1),
      total: countOf(inContext), before: countOf({ $and: [inContext, { _id: { $lt: id } }] }), current: countOf({ $and: [inContext, { _id: id }] }),
    } },
  ], options).toArray();
  return {
    previousId: result?.previous?.[0] ? String(result.previous[0]._id) : null,
    nextId: result?.next?.[0] ? String(result.next[0]._id) : null,
    position: result?.current?.[0] ? Number(result.before?.[0]?.total ?? 0) + 1 : null,
    total: Number(result?.total?.[0]?.total ?? 0),
  };
}
