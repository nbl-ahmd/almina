import { ObjectId, type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
import { recordMediaHistory } from './retention.js';
import { moneyMinor } from '../orders/commerce.js';
const collections = ['categories', 'banners', 'whatsappposters'] as const;
type Collection = typeof collections[number];
const name = z.string().trim().min(1).max(500);
const color = z.string().max(30).refine(value => /^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/.test(value) && value.split(',').every(channel => Number(channel.trim()) <= 255));
const link = z.string().min(1).max(2000).refine(value => {
  if (/[\\\s]/.test(value) || [...value].some(character => character.charCodeAt(0) < 32)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
});
export function categoryMetadataInput(raw: unknown, partial = false) {
  const compatibility = { color: color.optional(), image: z.string().max(500).optional() };
  const parsed = (partial ? z.object({ name: name.optional(), ...compatibility }).strict() : z.object({ name, ...compatibility }).strict()).safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  // The retained editor echoes the old filename as a text part. Only decoded server uploads may replace it.
  const { image, ...fields } = parsed.data;
  void image;
  return fields;
}
export function mediaMetadataInput(collection: Collection, raw: unknown): Document {
  if (collection === 'categories') return categoryMetadataInput(raw);
  const schema = collection === 'banners' ? z.object({ name, link }).strict()
    : collection === 'whatsappposters' ? z.object({ name: z.string().max(500).optional(), link: z.string().max(2000).optional() }).strict() : null;
  const parsed = schema?.safeParse(raw);
  if (!parsed?.success) throw new HttpError(400, 'INVALID_REQUEST');
  // Legacy poster name/link fields are recognized compatibility input, never published destinations.
  return collection === 'whatsappposters' ? {} : parsed.data;
}
export async function createMediaMetadata(db: Db, collection: Collection, raw: unknown, actor: string, assets?: { image: string; gdriveFileId: string }) {
  const fields = mediaMetadataInput(collection, raw);
  if (!collections.includes(collection) || !ObjectId.isValid(actor)
    || (assets && (typeof assets.image !== 'string' || typeof assets.gdriveFileId !== 'string' || !/^[A-Za-z0-9_-]{1,200}\.(webp|png|jpe?g|avif|gif)$/i.test(assets.image) || !/^[A-Za-z0-9_-]{1,200}$/.test(assets.gdriveFileId)))
    || (!assets && collection !== 'categories')) throw new HttpError(400, 'INVALID_REQUEST');
  const document = { _id: new ObjectId(), ...fields, ...(collection === 'categories' ? { color: fields.color ?? '198, 229, 214',
    image: '305dd291-e32e-4d7f-9abb-aae212c434a4.webp', gdriveFileId: '1cQnD6nDQ7Qge0LplEP22vuVTjtphlkoL' } : {}), ...assets, createdAt: new Date() };
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection(collection).insertOne(document, { session });
      await recordMediaHistory(db, collection, { _id: document._id }, document, actor, 'Create; retain media reference', session);
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return document;
  } finally { await session.endSession(); }
}
export async function toggleCatalogVisibility(db: Db, collection: 'products' | 'categories', id: string, actor: string) {
  if (!['products', 'categories'].includes(collection) || !ObjectId.isValid(id) || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      const document = await db.collection(collection).findOne({ _id: new ObjectId(id) }, { session });
      if (!document) throw new HttpError(404, 'NOT_FOUND');
      if (document.archivedAt) throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
      if (document.disabled !== undefined && typeof document.disabled !== 'boolean') throw new HttpError(409, 'COMMERCE_UNAVAILABLE');
      if (collection === 'products') {
        const regular = moneyMinor(document.price);
        if (document.salePrice !== undefined && moneyMinor(document.salePrice) > regular) throw new HttpError(400, 'INVALID_REQUEST');
        if (document.sale === true && document.salePrice === undefined) throw new HttpError(400, 'INVALID_REQUEST');
        if (document.sale !== undefined && typeof document.sale !== 'boolean') throw new HttpError(400, 'INVALID_REQUEST');
      }
      const fields = { disabled: !document.disabled, ...(collection === 'products' ? { published: Boolean(document.disabled) } : {}) };
      await db.collection(collection).updateOne({ _id: document._id }, { $set: fields }, { session });
      await db.collection('catalog_audit').insertOne({ entityId: document._id, collection, actor, before: { disabled: document.disabled, published: document.published },
        after: fields, reason: 'Visibility toggle', createdAt: new Date() }, { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return { message: collection === 'products' ? 'Product updated successfully' : 'category updated successfully' };
  } finally { await session.endSession(); }
}
