import { catalogueTypeSchema, catalogueVisibilitySchema, cloudinaryImage, productTypeLabels, productTypes, storePublicationIssues, type CatalogueVisibilityResult } from '@almina/contracts';
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
  const schema = collection === 'banners' ? z.object({ name, link, locale: z.enum(['all', 'en', 'ar']).optional() }).strict()
    : collection === 'whatsappposters' ? z.object({ name: z.string().max(500).optional(), link: z.string().max(2000).optional() }).strict() : null;
  const parsed = schema?.safeParse(raw);
  if (!parsed?.success) throw new HttpError(400, 'INVALID_REQUEST');
  // Legacy poster name/link fields are recognized compatibility input, never published destinations.
  if (collection === 'whatsappposters') return {};
  // A banner with no language shows to everyone, which is also what every banner saved before languages existed does.
  const { locale, ...fields } = parsed.data as { locale?: 'all' | 'en' | 'ar' } & Document;
  return locale === 'en' || locale === 'ar' ? { ...fields, locale } : fields;
}
/** Saves a record whose picture was uploaded straight to storage. The caller has verified every address with the provider. */
export function saveDirectMedia(db: Db, collection: Collection, fields: Document, actor: string) { return saveMediaMetadata(db, collection, fields, actor); }
export async function createMediaMetadata(db: Db, collection: Collection, raw: unknown, actor: string, assets?: { image: string; gdriveFileId: string }) {
  const fields = mediaMetadataInput(collection, raw);
  if (!collections.includes(collection) || !ObjectId.isValid(actor)
    || (assets && (typeof assets.image !== 'string' || typeof assets.gdriveFileId !== 'string' || !/^[A-Za-z0-9_-]{1,200}\.(webp|png|jpe?g|avif|gif)$/i.test(assets.image) || !/^[A-Za-z0-9_-]{1,200}$/.test(assets.gdriveFileId)))
    || (!assets && collection !== 'categories')) throw new HttpError(400, 'INVALID_REQUEST');
  return saveMediaMetadata(db, collection, { ...fields, ...(collection === 'categories' ? {
    color: fields.color ?? '198, 229, 214', image: '305dd291-e32e-4d7f-9abb-aae212c434a4.webp',
    gdriveFileId: '1cQnD6nDQ7Qge0LplEP22vuVTjtphlkoL',
  } : {}), ...assets }, actor);
}
export function createBannerWithArtwork(db: Db, raw: unknown, actor: string, filename: string, urls: string[], cloudName: string) {
  const fields = mediaMetadataInput('banners', raw);
  if (!ObjectId.isValid(actor) || !/^banner-[a-f0-9-]{36}\.webp$/.test(filename)
    || urls.length < 1 || urls.length > 2 || urls.some(url => !cloudinaryImage(url, cloudName))) {
    throw new HttpError(400, 'INVALID_REQUEST');
  }
  return saveMediaMetadata(db, 'banners', { ...fields, image: filename, cloudinaryImages: urls }, actor);
}
async function saveMediaMetadata<T extends Document>(db: Db, collection: Collection, fields: T, actor: string) {
  const document = { _id: new ObjectId(), ...fields, createdAt: new Date() };
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      await db.collection(collection).insertOne(document, { session });
      await recordMediaHistory(db, collection, { _id: document._id }, document, actor, 'Create; retain media reference', session);
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return document;
  } finally { await session.endSession(); }
}
/** Sets many products live or hidden in one request. Each product is its own transaction and repeating a request changes
 *  nothing. Going live is stricter than the single switch: every product needs a complete name, a General or Pharmacy
 *  medicine type and a price above zero, so prescription and unclassified items can never be published in bulk. */
export async function setProductsVisibility(db: Db, raw: unknown, actor: string): Promise<CatalogueVisibilityResult> {
  const parsed = catalogueVisibilitySchema.safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const results: CatalogueVisibilityResult['results'] = [];
  for (const id of parsed.data.ids) {
    try { results.push({ id, ok: true, changed: await changeCatalogVisibility(db, 'products', id, actor, parsed.data.live) }); }
    catch (error) {
      // A product that cannot change is reported; a database failure stops the request.
      if (!(error instanceof HttpError)) throw error;
      results.push({ id, ok: false, changed: false, reason: error.code === 'NOT_FOUND' ? 'Product not found.' : error.code === 'PRODUCT_UNAVAILABLE' ? 'Product is archived.'
        : error.code === 'CATALOG_REVIEW_REQUIRED' ? 'Needs a complete name, a General or Pharmacy medicine type and a price. Prescription items are never sold online.'
        : 'Open the product and correct its price or offer.' });
    }
  }
  return { results };
}
/** Records the type an administrator confirmed for selected products. A type already on a product is never overwritten here,
 *  so a bulk choice cannot undo a pharmacist's decision; that is changed on the product itself. Marking Prescription also
 *  hides the product, because prescription items are never sold online. Prices, stock and review stamps are untouched. */
export async function setProductsType(db: Db, raw: unknown, actor: string): Promise<CatalogueVisibilityResult> {
  const parsed = catalogueTypeSchema.safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const { ids, productType } = parsed.data;
  const results: CatalogueVisibilityResult['results'] = [];
  for (const id of ids) {
    const session = db.client.startSession();
    let result: CatalogueVisibilityResult['results'][number] = { id, ok: false, changed: false };
    try {
      await session.withTransaction(async () => {
        const product = await db.collection('products').findOne({ _id: new ObjectId(id) }, { session });
        if (!product) { result = { id, ok: false, changed: false, reason: 'Product not found.' }; return; }
        if (product.archivedAt) { result = { id, ok: false, changed: false, reason: 'Product is archived.' }; return; }
        const current = productTypes.find(type => type === product.productType);
        if (current && current !== productType) { result = { id, ok: false, changed: false, reason: `Already marked ${productTypeLabels[current]}. Open the product to change it.` }; return; }
        const hide = productType === 'prescription' && product.disabled !== true && product.published !== false;
        if (current && !hide) { result = { id, ok: true, changed: false }; return; }
        const fields = { productType, ...(hide ? { disabled: true, published: false } : {}) };
        await db.collection('products').updateOne({ _id: product._id }, { $set: fields }, { session });
        await db.collection('catalog_audit').insertOne({ entityId: product._id, collection: 'products', actor,
          before: { productType: product.productType, disabled: product.disabled, published: product.published }, after: fields,
          reason: 'Bulk product type, confirmed by administrator', createdAt: new Date() }, { session });
        result = { id, ok: true, changed: true };
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally { await session.endSession(); }
    results.push(result);
  }
  return { results };
}
export async function toggleCatalogVisibility(db: Db, collection: 'products' | 'categories', id: string, actor: string) {
  await changeCatalogVisibility(db, collection, id, actor);
  return { message: collection === 'products' ? 'Product updated successfully' : 'category updated successfully' };
}
/** `live` undefined flips the current state (the single switch); a value sets that state and reports whether it changed. */
async function changeCatalogVisibility(db: Db, collection: 'products' | 'categories', id: string, actor: string, live?: boolean): Promise<boolean> {
  if (!['products', 'categories'].includes(collection) || !ObjectId.isValid(id) || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const session = db.client.startSession();
  let changed = false;
  try {
    await session.withTransaction(async () => {
      changed = false;
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
      if (live !== undefined) {
        const shown = document.disabled !== true && document.published !== false;
        if (shown === live) return;
        if (live && (storePublicationIssues(document).length || moneyMinor(document.price) <= 0 || document.active === false)) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
      }
      const target = live ?? Boolean(document.disabled);
      // Prescription items are never sold online, whichever record or control asks.
      if (collection === 'products' && target && document.productType === 'prescription') throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
      if (collection === 'products' && target && document.catalogManaged === true && storePublicationIssues(document).length) throw new HttpError(409,'CATALOG_REVIEW_REQUIRED');
      const goingLive = collection === 'products' && target;
      // Publishing is the reviewer's statement that what the record says is true: content, stock and image usage are recorded as
      // reviewed here, exactly as saving in the product editor does, so downstream features that rely on the stamps keep working.
      const reviewed = goingLive ? {
        ...(document.contentReviewed === true ? {} : { contentReviewed: true }),
        ...(document.stockVerified === true ? {} : { stockVerified: true, stockReviewedAt: new Date(), stockReviewedBy: actor }),
        ...(document.imageRights === 'authorized' ? {} : { imageRights: 'authorized' }),
      } : {};
      const fields = { disabled: !target, ...(collection === 'products' ? { published: target } : {}), ...reviewed };
      await db.collection(collection).updateOne({ _id: document._id }, { $set: fields }, { session });
      await db.collection('catalog_audit').insertOne({ entityId: document._id, collection, actor, before: { disabled: document.disabled, published: document.published },
        after: fields, reason: `${live === undefined ? 'Visibility toggle' : 'Bulk visibility change'}${goingLive && Object.keys(reviewed).length ? ' (marked reviewed)' : ''}`, createdAt: new Date() }, { session });
      changed = true;
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return changed;
  } finally { await session.endSession(); }
}
