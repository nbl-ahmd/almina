import { z } from 'zod';
import { ObjectId, type Db } from 'mongodb';
import { HttpError } from '../../errors.js';
import { queryOptions } from '../../database.js';
import { resolveRetainedAsset } from './retention.js';
const filenameSchema = z.string().regex(/^[A-Za-z0-9_-]{1,200}\.(webp|png|jpe?g|gif|avif)$/i);
export async function retainedCatalogAsset(db: Db, collection: 'products' | 'categories' | 'banners', raw: unknown, query: unknown) {
  const parsed = filenameSchema.safeParse(raw);
  if (!parsed.success || !z.object({}).strict().safeParse(query).success) throw new HttpError(400, 'INVALID_REQUEST');
  const filename = parsed.data;
  // Archive is a catalog visibility operation, not revocation of historically shared media URLs.
  const current = await db.collection(collection).findOne(collection === 'products' ? { $or: [{ image: filename }, { images: filename }] } : { image: filename },
    { ...queryOptions, projection: { image: 1, images: 1, gdriveFileId: 1, gdriveFileIds: 1 } });
  const index = Array.isArray(current?.images) ? current.images.indexOf(filename) : -1;
  const id = current?.image === filename && typeof current.gdriveFileId === 'string' ? current.gdriveFileId
    : index >= 0 && Array.isArray(current?.gdriveFileIds) ? current.gdriveFileIds[index] : undefined;
  const fileId = typeof id === 'string' && id ? id : await resolveRetainedAsset(db, collection, filename);
  if (!fileId) throw new HttpError(404, 'NOT_FOUND'); return fileId;
}
export async function catalogUploadTarget(db: Db, collection: 'products' | 'categories', raw: unknown, creation = false) {
  const parsed = z.string().regex(/^[a-f0-9]{24}$/i).safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const target = await db.collection(collection).findOne({ _id: new ObjectId(parsed.data) },
    { ...queryOptions, projection: { archivedAt: 1, images: 1, gdriveFileIds: 1, stock: 1 } });
  if (!target) throw new HttpError(creation ? 400 : 404, creation ? 'INVALID_REQUEST' : 'NOT_FOUND');
  if (target.archivedAt) throw new HttpError(creation ? 400 : 409, creation ? 'INVALID_REQUEST' : 'PRODUCT_UNAVAILABLE');
  return target;
}
export function retainedBannerQuery(raw: unknown) {
  const integer = z.string().regex(/^\d{1,5}$/).transform(Number);
  const value = z.object({ limit: integer.pipe(z.number().int().min(1).max(100)).optional(), offset: integer.pipe(z.number().int().min(0).max(10000)).optional() }).strict().safeParse(raw);
  if (!value.success) throw new HttpError(400, 'INVALID_REQUEST'); return { limit: value.data.limit ?? 25, offset: value.data.offset ?? 0 };
}
export async function retainedBannerList(db: Db, raw: unknown) {
  const page = retainedBannerQuery(raw);
  return db.collection('banners').find({ archivedAt: { $exists: false } }, { ...queryOptions, projection: { _id: 1, name: 1, image: 1, link: 1, gdriveFileId: 1 } })
    .sort({ _id: -1 }).skip(page.offset).limit(page.limit).toArray();
}
