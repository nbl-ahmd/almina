import { ObjectId, type Db, type ClientSession, type Document } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../../errors.js';
export const mediaCollections = ['products', 'categories', 'banners', 'whatsappposters'] as const;
export type MediaCollection = typeof mediaCollections[number];
export function assetReferences(document: Document) {
  return Object.fromEntries(['image', 'images', 'gdriveFileId', 'gdriveFileIds', 'cloudinaryImages'].filter(key => document[key] !== undefined).map(key => [key, document[key]]));
}
export async function recordMediaHistory(db: Db, collection: MediaCollection, previous: Document, next: Document, actor: string, reason: string, session: ClientSession) {
  await db.collection<Document & { _id: string }>('media_history').insertOne({ _id: randomUUID(), collection,
    entityId: previous._id, actor, reason, previousAssets: assetReferences(previous), nextAssets: assetReferences(next), createdAt: new Date() }, { session });
}
export async function archiveEntity(db: Db, collection: MediaCollection, id: string, actor: string) {
  if (!mediaCollections.includes(collection) || !ObjectId.isValid(id) || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      const document = await db.collection(collection).findOne({ _id: new ObjectId(id) }, { session });
      if (!document) throw new HttpError(404, 'NOT_FOUND');
      if (document.archivedAt) return;
      const fields = { archivedAt: new Date(), archivedBy: actor, disabled: true,
        ...(collection === 'products' ? { published: false } : {}) };
      await recordMediaHistory(db, collection, document, { ...document, ...fields }, actor, 'Archive; retain all references', session);
      await db.collection(collection).updateOne({ _id: document._id }, { $set: fields }, { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally { await session.endSession(); }
  return { success: true, message: 'Archived. Historical records and images are retained.' };
}
export async function resolveRetainedAsset(db: Db, collection: MediaCollection, filename: string) {
  if (!/^[A-Za-z0-9_-]{1,200}\.(webp|png|jpe?g|gif|avif)$/i.test(filename)) throw new HttpError(400, 'INVALID_REQUEST');
  const history = await db.collection('media_history').findOne({ collection, $or: [
    { 'previousAssets.image': filename }, { 'previousAssets.images': filename },
  ] }, { sort: { createdAt: -1 }, projection: { previousAssets: 1 }, maxTimeMS: 3000 });
  const assets = history?.previousAssets;
  if (!assets) return undefined;
  const fileId = assets.image === filename ? assets.gdriveFileId : assets.gdriveFileIds?.[assets.images?.indexOf(filename)];
  return typeof fileId === 'string' ? fileId : undefined;
}
export async function replaceCategory(db: Db, id: string, fields: Document, actor: string) {
  if (!ObjectId.isValid(id) || !ObjectId.isValid(actor)
    || Object.keys(fields).some(key => !['name', 'color', 'image', 'gdriveFileId', 'cloudinaryImages'].includes(key))
    || Object.entries(fields).some(([key, value]) => key === 'cloudinaryImages'
      ? !Array.isArray(value) || value.length !== 1 || !String(value[0]).startsWith('https://res.cloudinary.com/')
      : typeof value !== 'string' || value.length > 500)) throw new HttpError(400, 'INVALID_REQUEST');
  const session = db.client.startSession(); let saved: Document | undefined;
  try {
    await session.withTransaction(async () => {
      const previous = await db.collection('categories').findOne({ _id: new ObjectId(id) }, { session });
      if (!previous) throw new HttpError(404, 'NOT_FOUND');
      if (previous.archivedAt) throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
      saved = { ...previous, ...fields };
      // A new picture replaces the other storage's reference, so no read can serve the old picture under the new name.
      const stale = fields.cloudinaryImages ? 'gdriveFileId' : fields.image ? 'cloudinaryImages' : undefined;
      if (stale) delete saved[stale];
      if (fields.image) await recordMediaHistory(db, 'categories', previous, saved, actor, 'Reviewed category media replacement', session);
      await db.collection('categories').updateOne({ _id: previous._id }, { $set: fields, ...(stale ? { $unset: { [stale]: '' } } : {}) }, { session });
    }); return saved;
  } finally { await session.endSession(); }
}
