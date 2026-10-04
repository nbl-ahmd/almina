import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { productBusinessIdSchema } from '@almina/contracts';
import { ObjectId, type Db, type Document } from 'mongodb';
import { cloudinaryImage } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { recoveryCsv } from './csv.js';
const money = z.string().regex(/^\d{1,7}(\.\d{1,2})?$/).transform(value => Number(value));
const row = z.object({
  product_id: productBusinessIdSchema,
  name: z.string().trim().min(1).max(200), category: z.string().trim().min(1).max(200),
  barcode: z.string().trim().min(1).max(100), price: money, salePrice: money.optional(),
  vat: z.boolean(), featured: z.boolean().default(false),
  description: z.string().max(5000).default(''), cloudinaryImages: z.array(z.string().max(1000)).max(8).default([]),
}).strict().refine(value => value.salePrice === undefined || value.salePrice <= value.price, { path: ['salePrice'] });
const rowsSchema = z.array(row).min(1).max(500);
type Rows = z.infer<typeof rowsSchema>;
type Issue = { row: number; field: string; message: string };
function bounded(raw: unknown) {
  if (Buffer.byteLength(JSON.stringify(raw) ?? '') > 4 * 1024 * 1024) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
}
export function parseRecoveryCatalog(raw: unknown, cloudName: string) {
  bounded(raw);
  const cloud = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).parse(cloudName);
  return rowsSchema.refine(rows => new Set(rows.map(value => value.product_id)).size === rows.length)
    .refine(rows => rows.every(value => value.cloudinaryImages.every(image => cloudinaryImage(image, cloud))))
    .parse(raw);
}
export function recoveryDigest(rows: Rows, cloudName: string) {
  return createHash('sha256').update(JSON.stringify({ cloudName, rows })).digest('hex');
}
function decimalRows(rows: Rows) {
  return rows.map(({ salePrice, ...value }) => ({ ...value, price: value.price.toFixed(2),
    ...(salePrice === undefined ? {} : { salePrice: salePrice.toFixed(2) }) }));
}
export function validateRecoveryInput(raw: unknown, cloudName: string): { rows: Rows; errors: Issue[] } {
  bounded(raw);
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(cloudName)) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const result = rowsSchema.safeParse(raw);
  if (!result.success) return { rows: [], errors: result.error.issues.slice(0, 1000).map(issue => ({
    row: typeof issue.path[0] === 'number' ? issue.path[0] + 1 : 0,
    field: typeof issue.path[1] === 'string' && Object.keys(row.shape).includes(issue.path[1]) ? issue.path[1] : 'row',
    message: 'Invalid or missing value. Use the template and at most two decimal places for money.',
  })) };
  const errors: Issue[] = [], seen = new Set<string>();
  result.data.forEach((value, index) => {
    if (seen.has(value.product_id)) errors.push({ row: index + 1, field: 'product_id', message: 'Duplicate stable product ID.' });
    seen.add(value.product_id);
    if (value.cloudinaryImages.some(image => !cloudinaryImage(image, cloudName))) {
      errors.push({ row: index + 1, field: 'cloudinaryImages', message: 'Use raster upload URLs from the configured Cloudinary account.' });
    }
  });
  return { rows: result.data, errors };
}
export async function previewRecoveryCatalog(db: Db, raw: unknown, cloudName: string, actor: string) {
  const input = z.object({ format: z.enum(['csv', 'json']), content: z.string().max(4 * 1024 * 1024) }).strict().safeParse(raw);
  if (!input.success) throw new HttpError(400, 'INVALID_REQUEST');
  let parsed: unknown;
  try { parsed = input.data.format === 'csv' ? recoveryCsv(input.data.content) : JSON.parse(input.data.content); }
  catch { return { errors: [{ row: 0, field: 'file', message: 'Invalid CSV/JSON, headers, row width or input size.' }], rows: [] }; }
  const validated = validateRecoveryInput(parsed, cloudName);
  if (validated.errors.length) return { errors: validated.errors, rows: [] };
  if ((await db.collection('stores').findOne({}))?.status !== 'closed'
    || !await db.collection<Document & { _id: string }>('recovery_bootstrap').findOne({ _id: 'empty-database-v1' })) {
    throw new HttpError(409, 'COMMERCE_UNAVAILABLE');
  }
  const existing = await db.collection('products').find({ product_id: { $in: validated.rows.map(value => value.product_id) } },
    { projection: { product_id: 1 }, maxTimeMS: 3000 }).limit(501).toArray();
  const ids = new Set(existing.map(value => value.product_id));
  const errors = validated.rows.flatMap((value, i) => ids.has(value.product_id)
    ? [{ row: i + 1, field: 'product_id', message: 'Existing identifier: no overwrite permitted.' }] : []);
  const categories = await db.collection('categories').find({ name: { $in: validated.rows.map(value => value.category) } },
    { projection: { name: 1 }, maxTimeMS: 3000 }).limit(1001).toArray();
  const counts = new Map<string, number>();
  for (const category of categories) counts.set(category.name, (counts.get(category.name) ?? 0) + 1);
  validated.rows.forEach((value, index) => {
    if ((counts.get(value.category) ?? 0) > 1) errors.push({ row: index + 1, field: 'category', message: 'Ambiguous existing category: review it before importing.' });
  });
  if (errors.length) return { errors, rows: [] };
  const previewId = randomUUID(), hash = recoveryDigest(validated.rows, cloudName);
  const rows = decimalRows(validated.rows), expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.collection<Document & { _id: string }>('recovery_catalog_previews').insertOne({ _id: previewId, actor, rows, cloudName, hash, expiresAt });
  return { previewId, hash, expiresAt: expiresAt.toISOString(), rows, errors: [] };
}
export async function importRecoveryCatalog(db: Db, raw: unknown, cloudName: string,
  approval?: { previewId: string; hash: string; actor: string }) {
  const rows = parseRecoveryCatalog(raw, cloudName);
  const digest = recoveryDigest(rows, cloudName);
  if (approval && approval.hash !== digest) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  const batches = db.collection<Document & { _id: string }>('recovery_catalog_batches');
  const session = db.client.startSession();
  let result: { created: number; replayed: boolean; batch: string } | undefined;
  try {
    await session.withTransaction(async () => {
      const previews = db.collection<Document & { _id: string }>('recovery_catalog_previews');
      const preview = approval ? await previews.findOne({ _id: approval.previewId, actor: approval.actor, hash: digest, cloudName }, { session }) : null;
      if (approval && !preview) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      if (await batches.findOne({ _id: digest }, { session })) { result = { created: 0, replayed: true, batch: digest }; return; }
      if (preview && (!(preview.expiresAt instanceof Date) || preview.expiresAt.getTime() < Date.now())) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      // Write the closed-store document to serialize against reopening and other imports.
      const store = await db.collection('stores').findOne({}, { session });
      if (store?.status !== 'closed') throw new HttpError(409, 'COMMERCE_UNAVAILABLE');
      if (!await db.collection<Document & { _id: string }>('recovery_bootstrap').findOne({ _id: 'empty-database-v1' }, { session })) throw new HttpError(409, 'COMMERCE_UNAVAILABLE');
      await db.collection('stores').updateOne({ _id: store._id, status: 'closed' }, { $inc: { recoveryRevision: 1 } }, { session });
      if (await db.collection('products').findOne({ product_id: { $in: rows.map(value => value.product_id) } }, { session })) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      await batches.insertOne({ _id: digest, count: rows.length, actor: approval?.actor ?? 'operator-cli', createdAt: new Date() }, { session });
      const categories = new Map<string, ObjectId>();
      for (const input of rows) {
        let category = categories.get(input.category);
        if (!category) {
          const existing = await db.collection('categories').find({ name: input.category }, { session }).limit(2).toArray();
          if (existing.length > 1) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
          category = existing[0]?._id ?? new ObjectId();
          if (!existing.length) await db.collection('categories').insertOne({ _id: category, name: input.category, disabled: true }, { session });
          categories.set(input.category, category!);
        }
        await db.collection('products').insertOne({ ...input, _id: new ObjectId(), category, stock: 0, sale: input.salePrice !== undefined,
          disabled: true, published: false, images: [], gdriveFileIds: [], createdAt: new Date(), recoveryBatch: digest }, { session });
      }
      if (approval) await previews.updateOne({ _id: approval.previewId }, { $set: { committedAt: new Date() } }, { session });
      result = { created: rows.length, replayed: false, batch: digest };
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    if (!result) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    return result;
  } finally { await session.endSession(); }
}
export async function commitRecoveryCatalog(db: Db, raw: unknown, cloudName: string, actor: string) {
  const input = z.object({ previewId: z.uuid(), hash: z.string().regex(/^[a-f0-9]{64}$/) }).strict().safeParse(raw);
  if (!input.success) throw new HttpError(400, 'INVALID_REQUEST');
  const preview = await db.collection<Document & { _id: string }>('recovery_catalog_previews').findOne({ _id: input.data.previewId, actor });
  if (!preview || preview.hash !== input.data.hash || preview.cloudName !== cloudName) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  return importRecoveryCatalog(db, preview.rows, cloudName, { ...input.data, actor });
}
