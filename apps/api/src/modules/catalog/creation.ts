import { randomUUID } from 'node:crypto';
import { ObjectId, type Db, type Document, type ClientSession } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';

const money = z.union([z.string(), z.number()]).refine(value => /^\d+(\.\d{1,2})?$/.test(String(value)) && Number(value) <= Number.MAX_SAFE_INTEGER / 100).transform(Number);
const boolean = z.union([z.boolean(), z.enum(['true', 'false']).transform(value => value === 'true')]).default(false);
const input = z.object({ name: z.string().trim().min(1).max(500), category: z.string().regex(/^[a-f0-9]{24}$/i),
  barcode: z.string().trim().min(1).max(500), price: money, stock: z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)),
  vat: boolean, sale: boolean, featured: boolean, salePrice: money.optional(), description: z.string().max(4000).optional(),
}).strict().refine(value => (!value.sale || value.salePrice !== undefined) && (value.salePrice === undefined || value.salePrice <= value.price));
export function catalogCreationInput(raw: unknown) {
  const parsed = input.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  return parsed.data;
}
type ProductInput = ReturnType<typeof catalogCreationInput>;
type Assets = { images: string[]; gdriveFileIds: string[] };
async function serializeCatalog(db: Db, session: ClientSession, batch: boolean) {
  if (batch && await db.collection<Document & { _id: string }>('recovery_bootstrap').findOne({ _id: 'empty-database-v1' }, { session })) throw new HttpError(409, 'RECOVERY_IMPORT_REQUIRED');
  const store = await db.collection('stores').findOne({}, { session });
  if (!store) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  // Recovery imports write this same document. Serialize identifier allocation against them too.
  await db.collection('stores').updateOne({ _id: store._id }, { $inc: { catalogRevision: 1 } }, { session });
}
async function allocate(db: Db, count: number, floor: number, session: ClientSession) {
  // Server-side indexed prefix scan; no unbounded document download or parseInt on arbitrary IDs.
  const [maximum] = await db.collection('products').aggregate<{ value: number }>([
    { $match: { product_id: /^PD\d{1,16}$/ } },
    { $group: { _id: null, value: { $max: { $convert: { input: { $substrBytes: ['$product_id', 2, 16] }, to: 'long', onError: null } } } } },
  ], { session, maxTimeMS: 3000 }).toArray();
  const counters = db.collection<Document & { _id: string }>('catalog_counters');
  const previous = await counters.findOne({ _id: 'legacy-product-sequence' }, { session });
  const start = Math.max(Number(maximum?.value ?? 0), previous?.value ?? 0, floor);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(start + count)) throw new HttpError(409, 'COMMERCE_UNAVAILABLE');
  await counters.updateOne({ _id: 'legacy-product-sequence' }, { $set: { value: start + count } }, { session, upsert: true });
  return Array.from({ length: count }, (_, index) => `PD${String(start + index + 1).padStart(4, '0')}`);
}
async function insert(db: Db, value: ProductInput, id: string, actor: string, session: ClientSession, assets: Assets = { images: [], gdriveFileIds: [] }) {
  const category = await db.collection('categories').findOne({ _id: new ObjectId(value.category), archivedAt: { $exists: false } }, { session });
  if (!category) throw new HttpError(400, 'INVALID_REQUEST');
  const product = { ...value, category: category._id, product_id: id, ...assets, _id: new ObjectId(), disabled: false, createdAt: new Date() };
  await db.collection('products').insertOne(product, { session });
  await db.collection<Document & { _id: string }>('inventory_adjustments').insertOne({ _id: randomUUID(), productId: product._id, product_id: id,
    actor, reason: 'Initial catalog stock', delta: value.stock, before: 0, after: value.stock, createdAt: new Date() }, { session });
  return product;
}
export async function createCatalogProduct(db: Db, raw: unknown, actor: string, assets?: Assets) {
  const value = catalogCreationInput(raw);
  if (!ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const session = db.client.startSession();
  let result: Document | undefined;
  try {
    await session.withTransaction(async () => {
      await serializeCatalog(db, session, false);
      const [id] = await allocate(db, 1, 0, session);
      const product = await insert(db, value, id!, actor, session, assets);
      // Retain the populated create response used by older admin callers.
      result = { ...product, category: await db.collection('categories').findOne({ _id: product.category }, { session }) };
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    if (!result) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    return result;
  } finally { await session.endSession(); }
}
export async function createLegacyCatalogBatch(db: Db, raw: unknown, actor: string) {
  if (!ObjectId.isValid(actor) || !Array.isArray(raw) || raw.length > 500) throw new HttpError(400, 'INVALID_REQUEST');
  // Validate every row before any write. Category names are explicit; filenames never establish identity.
  const rows = raw.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.category !== 'string' || value.category.length > 500) throw new HttpError(400, 'INVALID_REQUEST');
    const category = value.category.trim() || 'General';
    const validated = catalogCreationInput({ name: value.name, price: value.price, stock: value.stock, barcode: value.barcode,
      category: '000000000000000000000000', vat: value.vat === 'TRUE', sale: value.sale === 'TRUE', featured: value.featured === 'TRUE',
      ...(value.salePrice ? { salePrice: value.salePrice } : {}) });
    return { category, validated };
  });
  const session = db.client.startSession();
  let result: { success: boolean; count: number } | undefined;
  try {
    await session.withTransaction(async () => {
      await serializeCatalog(db, session, true);
      const ids = await allocate(db, rows.length, 5000, session);
      const categories = new Map<string, ObjectId>();
      for (const [index, row] of rows.entries()) {
        let category = categories.get(row.category);
        if (!category) {
          const existing = await db.collection('categories').find({ name: row.category }, { session }).limit(2).toArray();
          if (existing.length > 1 || existing[0]?.archivedAt) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
          category = existing[0]?._id ?? new ObjectId();
          if (!existing.length) await db.collection('categories').insertOne({ _id: category, name: row.category, color: '198, 229, 214',
            image: '305dd291-e32e-4d7f-9abb-aae212c434a4.webp', gdriveFileId: '1cQnD6nDQ7Qge0LplEP22vuVTjtphlkoL' }, { session });
          categories.set(row.category, category);
        }
        await insert(db, { ...row.validated, category: String(category) }, ids[index]!, actor, session);
      }
      result = { success: true, count: rows.length };
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    if (!result) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    return result;
  } finally { await session.endSession(); }
}
