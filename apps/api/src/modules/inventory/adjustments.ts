import { validateAudience } from '../catalog/validate-audience.js';
import { productContentFields, productContentNames, storePublicationIssues } from '@almina/contracts';
import { createHash } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
import { recordMediaHistory } from '../media/retention.js';
import { productFamilyFields, familyFieldNames, validateProductFamily } from '@almina/contracts';
import { validateFamilyMembership } from '../catalog/families.js';
import { moneyMinor } from '../orders/commerce.js';
const quantity = z.union([z.number(), z.string().regex(/^\d+$/).transform(Number)]).pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));
const money = z.union([z.number(), z.string()]).refine(value => /^\d+(\.\d{1,2})?$/.test(String(value)) && Number(value) <= Number.MAX_SAFE_INTEGER / 100).transform(Number);
const boolean = z.union([z.boolean(), z.enum(['true', 'false']).transform(value => value === 'true')]);
const mutation = z.object({ ...productFamilyFields, ...productContentFields, name: z.string().trim().min(1).max(500).optional(), price: money.optional(),
  stock: quantity.optional(), expectedStock: quantity.optional(), stockReason: z.string().trim().min(3).max(200).optional(), inventoryKey: z.uuid().optional(),
  description: z.string().max(4000).optional(), sale: boolean.optional(), salePrice: money.optional(),
  // Recognized compatibility fields remain ignored as in the retained update adapter.
  category: z.string().regex(/^[a-f0-9]{24}$/i).optional(), barcode: z.string().max(500).optional(), vat: boolean.optional(),
  featured: boolean.optional(), disabled: boolean.optional(), salePercent: z.union([z.string(), z.number()]).optional(),
  saleType: z.string().max(100).optional(), saleBadge: z.string().max(200).optional(),
}).strict().superRefine(validateProductFamily).refine(value => value.stock === undefined || value.expectedStock !== undefined);
type Assets = { images: string[]; gdriveFileIds: string[] };
export function inventoryInput(raw: unknown) {
  const result = mutation.safeParse(raw);
  if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  return result.data;
}
function requestDigest(id: string, actor: string, input: ReturnType<typeof inventoryInput>, assetHash?: string) {
  return createHash('sha256').update(JSON.stringify({ id, actor, input, assetHash })).digest('hex');
}
export async function replayProductMutation(db: Db, id: string, raw: unknown, actor: string, assetHash?: string) {
  const input = inventoryInput(raw);
  if (!input.inventoryKey) return undefined;
  const receipt = await db.collection<Document & { _id: string }>('inventory_adjustments').findOne({ _id: input.inventoryKey });
  if (!receipt) return undefined;
  if (receipt.digest !== requestDigest(id, actor, input, assetHash) || receipt.actor !== actor) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  return receipt.result;
}
export async function updateProductInventory(db: Db, id: string, raw: unknown, actor: string, assets?: Assets, assetHash?: string) {
  const input = inventoryInput(raw);
  if (!ObjectId.isValid(id) || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const digest = requestDigest(id, actor, input, assetHash);
  const ledger = db.collection<Document & { _id: string }>('inventory_adjustments');
  const session = db.client.startSession();
  let saved: Document | undefined;
  try {
    await session.withTransaction(async () => {
      // Receipt lookup precedes stock predicates: a lost-response retry must not apply twice.
      const previous = input.inventoryKey ? await ledger.findOne({ _id: input.inventoryKey }, { session }) : null;
      if (previous) {
        if (previous.digest !== digest || previous.actor !== actor) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
        saved = previous.result; return;
      }
      const product = await db.collection('products').findOne({ _id: new ObjectId(id) }, { session });
      if (!product) throw new HttpError(404, 'NOT_FOUND');
      if (product.archivedAt) throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
      if (!Number.isSafeInteger(product.stock) || product.stock < 0) throw new HttpError(409, 'COMMERCE_UNAVAILABLE');
      if (input.stock !== undefined && product.stock !== input.expectedStock) throw new HttpError(409, 'STOCK_CHANGED');
      if(input.stock!==undefined){const allocated=await db.collection('branch_inventory').find({productId:product._id},{session}).limit(21).toArray();if(allocated.length>20||allocated.some(row=>!Number.isSafeInteger(row.stock)||row.stock<0)||allocated.reduce((sum,row)=>sum+(Number.isSafeInteger(row.stock)?row.stock:Number.MAX_SAFE_INTEGER),0)>input.stock)throw new HttpError(409,'BRANCH_STOCK_CONFLICT');}
      const delta = input.stock === undefined ? 0 : input.stock - product.stock;
      if (delta !== 0 && (!input.stockReason || !input.inventoryKey)) throw new HttpError(400, 'INVALID_REQUEST');
      const fields: Document = {};
      for (const name of ['name', 'price', 'stock', 'description', 'sale', 'salePrice', ...familyFieldNames, ...productContentNames] as const) if (input[name] !== undefined) fields[name] = input[name];
      if (assets) fields.mediaRevision = (product.mediaRevision ?? 0) + 1;
      const next: Document = { ...product, ...fields, ...assets };
      if (input.stockVerified === true || input.stock !== undefined) { fields.stockReviewedAt = new Date(); fields.stockReviewedBy = actor; next.stockReviewedAt = fields.stockReviewedAt; }
      if (product.catalogManaged === true && product.published !== false && !product.disabled && storePublicationIssues(next).length) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
      await validateFamilyMembership(db, next, session);
      await validateAudience(db, next, session);
      const price = moneyMinor(next.price);
      if (next.salePrice !== undefined && next.salePrice !== null) {
        if (moneyMinor(next.salePrice) > price) throw new HttpError(400, 'INVALID_REQUEST');
      }
      if (next.sale === true && (next.salePrice === undefined || next.salePrice === null)) throw new HttpError(400, 'INVALID_REQUEST');
      if (typeof next.sale !== 'boolean' && next.sale !== undefined) throw new HttpError(400, 'INVALID_REQUEST');
      if (assets) await recordMediaHistory(db, 'products', product, next, actor, 'Reviewed product media replacement', session);
      const result = await db.collection('products').updateOne({ _id: product._id, stock: product.stock }, { $set: { ...fields, ...assets } }, { session });
      if (result.matchedCount !== 1) throw new HttpError(409, 'STOCK_CHANGED');
      saved = next;
      if (input.inventoryKey) await ledger.insertOne({ _id: input.inventoryKey, digest, productId: product._id,
        product_id: product.product_id, actor, reason: input.stockReason ?? 'Product metadata review', delta,
        before: product.stock, after: next.stock, createdAt: new Date(), result: next }, { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    if (!saved) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    return saved;
  } finally { await session.endSession(); }
}
