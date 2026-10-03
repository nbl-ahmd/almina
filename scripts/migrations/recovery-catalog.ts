import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { z } from 'zod';
import { ObjectId, type Db, type Document } from 'mongodb';
import { readApiEnvironment } from '@almina/config/env';
import { createDatabase } from '../../apps/api/src/database.js';
import { cloudinaryImage } from '../../apps/web/src/lib/catalog/media.js';

const money = z.string().regex(/^\d{1,7}(\.\d{1,2})?$/).transform(value => Number(value));
const row = z.object({
  product_id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(200), category: z.string().trim().min(1).max(200),
  barcode: z.string().trim().min(1).max(100), price: money, salePrice: money.optional(),
  vat: z.boolean(), featured: z.boolean().default(false),
  description: z.string().max(5000).default(''), cloudinaryImages: z.array(z.string()).max(8).default([]),
}).strict().refine(value => value.salePrice === undefined || value.salePrice <= value.price);
export function parseRecoveryCatalog(raw: unknown, cloudName: string) {
  const cloud = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/).parse(cloudName);
  return z.array(row).min(1).max(500)
    .refine(rows => new Set(rows.map(value => value.product_id)).size === rows.length)
    .refine(rows => rows.every(value => value.cloudinaryImages.every(image => cloudinaryImage(image, cloud))))
    .parse(raw);
}
export async function importRecoveryCatalog(db: Db, raw: unknown, cloudName: string) {
  const rows = parseRecoveryCatalog(raw, cloudName);
  const digest = createHash('sha256').update(JSON.stringify({ cloudName, rows })).digest('hex');
  const batches = db.collection<Document & { _id: string }>('recovery_catalog_batches');
  const session = db.client.startSession();
  try {
    return await session.withTransaction(async () => {
      // An exact rerun is a no-op, even after stock or products were edited later.
      if (await batches.findOne({ _id: digest }, { session })) return { created: 0, replayed: true, batch: digest };
      const store = await db.collection('stores').findOne({}, { session });
      if (store?.status !== 'closed') throw new Error('Store must remain closed during recovery');
      if (!await db.collection<Document & { _id: string }>('recovery_bootstrap').findOne({ _id: 'empty-database-v1' }, { session })) throw new Error('Recovery bootstrap required');
      if (await db.collection('products').findOne({ product_id: { $in: rows.map(value => value.product_id) } }, { session })) {
        throw new Error('Existing identifiers require manual review; importer never overwrites products or stock');
      }
      await batches.insertOne({ _id: digest, count: rows.length, createdAt: new Date() }, { session });
      const categories = new Map<string, ObjectId>();
      for (const input of rows) {
        let category = categories.get(input.category);
        if (!category) {
          const existing = await db.collection('categories').find({ name: input.category }, { session }).limit(2).toArray();
          if (existing.length > 1) throw new Error('Ambiguous category name requires review');
          category = existing[0]?._id ?? new ObjectId();
          if (!existing.length) await db.collection('categories').insertOne({ _id: category, name: input.category, disabled: true }, { session });
          categories.set(input.category, category!);
        }
        await db.collection('products').insertOne({ ...input, _id: new ObjectId(), category,
          stock: 0, sale: input.salePrice !== undefined, disabled: true,
          images: [], gdriveFileIds: [], createdAt: new Date(), recoveryBatch: digest }, { session });
      }
      return { created: rows.length, replayed: false, batch: digest };
    });
  } finally { await session.endSession(); }
}
async function main() {
  const [file, apply, ...extra] = process.argv.slice(2);
  if (!file || extra.length || apply && apply !== '--apply') throw new Error('Expected reviewed JSON file and optional --apply');
  if ((await stat(file)).size > 4 * 1024 * 1024) throw new Error('Input too large');
  const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  const rows = parseRecoveryCatalog(raw, cloudName);
  if (!apply) {
    process.stdout.write(JSON.stringify({ mode: 'plan', count: rows.length, categories: new Set(rows.map(value => value.category)).size,
      writes: 'disabled, unpublished products with zero stock; no updates or image deletion',
      review: 'Check product identity, image match, price, VAT, barcode and physical stock before publishing' }) + '\n');
    return;
  }
  if (process.env.RECOVERY_CATALOG_ALLOWED !== 'true' || process.env.COMMERCE_WRITERS_PAUSED !== 'true') throw new Error('Recovery maintenance gate required');
  const config = readApiEnvironment(process.env);
  if (config.database.mode !== 'enabled') throw new Error('Database disabled');
  const database = createDatabase(config.database);
  try { process.stdout.write(JSON.stringify({ event: 'recovery_catalog', ...await importRecoveryCatalog(await database.getDb(), raw, cloudName) }) + '\n'); }
  finally { await database.close(); }
}
if (process.argv[1]?.endsWith('/recovery-catalog.ts')) void main().catch(() => {
  process.stderr.write('{"event":"recovery_catalog_failed"}\n'); process.exitCode = 1;
});
