import { ObjectId, type ClientSession, type Db, type Document } from 'mongodb';
import { z } from 'zod';
import {
  enrichmentApplySchema, enrichmentCsvColumns, enrichmentEditableColumns, enrichmentPreviewSchema, productContentFields, tradeGtin,
  normalizeGtin, unescapeEnrichmentCell, type EnrichmentApplyResult, type EnrichmentChange, type EnrichmentField, type EnrichmentPreview,
} from '@almina/contracts';
import { boundedCsvRecords } from '../imports/csv.js';
import { HttpError } from '../../errors.js';
import { gtinSpellings } from './quality.js';

/**
 * Enrichment spreadsheet: staff (or a supplier) fill in brand, manufacturer, GTIN, pack and description for many products
 * at once. Preview shows every change; apply writes only what an administrator confirmed. The file can only fill catalogue
 * details: it never publishes, hides, prices, stocks or marks anything reviewed, and it never clears a value.
 */

const fieldSchema: Record<EnrichmentField, z.ZodType> = {
  brand: productContentFields.brand, manufacturer: productContentFields.manufacturer, gtin: productContentFields.gtin,
  mpn: productContentFields.mpn, identifierStatus: productContentFields.identifierStatus, packLabel: productContentFields.packLabel,
  saleUnit: productContentFields.saleUnit, description: z.string().trim().max(5000),
};
const projection = { product_id: 1, name: 1, productType: 1, published: 1, disabled: 1, active: 1, archivedAt: 1, ...Object.fromEntries(enrichmentEditableColumns.map(field => [field, 1])) };
const text = (value: unknown) => typeof value === 'string' ? value : '';
/** "Unknown" identifier status means nobody has checked yet, so it is treated as blank. */
const blank = (field: EnrichmentField, value: string) => !value.trim() || (field === 'identifierStatus' && value === 'unknown');
const isMedicine = (product: Document) => product.productType === 'otc' || product.productType === 'prescription';

/** Why a value cannot be stored for this product, or null when it can. Shared by preview and apply. */
async function refusal(db: Db, product: Document, field: EnrichmentField, value: string, session?: ClientSession): Promise<string | null> {
  if (!fieldSchema[field].safeParse(value).success) return field === 'gtin' ? 'Not a valid GTIN (check digit).' : 'Value is not allowed here (too long or not an option).';
  if (field === 'description' && isMedicine(product)) return 'Medicine descriptions are changed in the product editor only.';
  if (field === 'gtin') {
    const code = tradeGtin(value);
    if (!code) return 'This is an in-store or coupon code, not a manufacturer GTIN.';
    const other = await db.collection('products').findOne({ _id: { $ne: product._id }, archivedAt: { $exists: false },
      $or: [{ barcode: { $in: gtinSpellings(code) } }, { gtin: { $in: gtinSpellings(code) } }] }, { projection: { product_id: 1 }, ...(session ? { session } : {}) });
    if (other) return `Another product (${text(other.product_id) || 'unnamed'}) already uses this GTIN.`;
  }
  return null;
}

export async function previewEnrichmentImport(db: Db, raw: unknown): Promise<EnrichmentPreview> {
  const parsed = enrichmentPreviewSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const records = boundedCsvRecords(parsed.data.content, { bytes: 1024 * 1024, columns: enrichmentCsvColumns.length, rows: 4001, trimOuterWhitespace: true });
  const header = records.shift()?.map(value => value.trim());
  // Unknown columns are refused rather than ignored, so a misspelt heading cannot silently drop a whole column.
  if (!header?.includes('product_id') || new Set(header).size !== header.length || header.some(column => !(enrichmentCsvColumns as readonly string[]).includes(column))
    || !records.length || records.length > 4000 || records.some(values => values.length !== header.length)) throw new HttpError(400, 'INVALID_REQUEST');
  const editable = enrichmentEditableColumns.filter(field => header.includes(field));
  const rows = records.map(values => Object.fromEntries(header.map((column, index) => [column, unescapeEnrichmentCell(values[index]!.trim())])) as Record<string, string>);
  const ids = [...new Set(rows.map(row => row.product_id!).filter(Boolean))];
  const found = await db.collection('products').find({ product_id: { $in: ids }, archivedAt: { $exists: false } }, { projection, maxTimeMS: 8000 }).toArray();
  const byId = new Map<string, Document[]>();
  for (const product of found) byId.set(text(product.product_id), [...(byId.get(text(product.product_id)) ?? []), product]);

  const seen = new Set<string>(), fileGtins = new Map<string, string>();
  const result: EnrichmentPreview['rows'] = [];
  for (const [index, row] of rows.entries()) {
    const productId = row.product_id ?? '', matches = byId.get(productId) ?? [];
    const entry: EnrichmentPreview['rows'][number] = { line: index + 2, productId, id: null, name: row.name ?? '', live: false, changes: [], notes: [] };
    result.push(entry);
    if (!productId) { entry.notes.push('No product_id.'); continue; }
    if (seen.has(productId)) { entry.notes.push('This product appears earlier in the file; only the first row is used.'); continue; }
    seen.add(productId);
    if (matches.length !== 1) { entry.notes.push(matches.length ? 'This product ID matches more than one product. Fix it in the product editor.' : 'No product has this ID.'); continue; }
    const product = matches[0]!;
    Object.assign(entry, { id: String(product._id), name: text(product.name), live: product.published !== false && product.disabled !== true && product.active !== false });
    const after: Partial<Record<EnrichmentField, string>> = {};
    for (const field of editable) {
      const value = row[field] ?? '', current = text(product[field]);
      if (!value || value === current) continue;
      if (!blank(field, current) && !parsed.data.overwrite) { entry.notes.push(`${field}: kept the current value. Choose “Replace filled-in values” to change it.`); continue; }
      const reason = await refusal(db, product, field, value);
      if (reason) { entry.notes.push(`${field}: ${reason}`); continue; }
      if (field === 'gtin') {
        const code = normalizeGtin(value)!, earlier = fileGtins.get(code);
        if (earlier) { entry.notes.push(`gtin: also given to ${earlier} in this file.`); continue; }
        fileGtins.set(code, productId);
      }
      after[field] = value;
    }
    // A GTIN means the manufacturer assigned one; say so unless the file already decided the status.
    if (after.gtin && !after.identifierStatus && text(product.identifierStatus) !== 'assigned' && (blank('identifierStatus', text(product.identifierStatus)) || parsed.data.overwrite)) after.identifierStatus = 'assigned';
    entry.changes = (Object.entries(after) as [EnrichmentField, string][]).map(([field, value]) => ({ id: entry.id!, field, before: text(product[field]), after: value }));
  }
  return {
    rows: result, changeCount: result.reduce((sum, row) => sum + row.changes.length, 0),
    productCount: result.filter(row => row.changes.length).length,
    errorCount: result.filter(row => !row.id).length,
  };
}

/** Writes confirmed changes. A change whose product no longer holds the previewed "before" value is skipped, not forced. */
export async function applyEnrichmentImport(db: Db, raw: unknown, actor: string): Promise<EnrichmentApplyResult> {
  const parsed = enrichmentApplySchema.safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const byProduct = new Map<string, EnrichmentChange[]>();
  for (const change of parsed.data.changes) byProduct.set(change.id.toLowerCase(), [...(byProduct.get(change.id.toLowerCase()) ?? []), change]);
  if ([...byProduct.values()].some(changes => new Set(changes.map(change => change.field)).size !== changes.length)) throw new HttpError(400, 'INVALID_REQUEST');
  const skipped: EnrichmentApplyResult['skipped'] = [];
  let applied = 0, products = 0;
  for (const [id, changes] of byProduct) {
    const session = db.client.startSession();
    // Reset on every attempt: withTransaction may run the callback again after a transient error.
    let attempt: { skipped: EnrichmentApplyResult['skipped']; written: number } = { skipped: [], written: 0 };
    try {
      await session.withTransaction(async () => {
        attempt = { skipped: [], written: 0 };
        const product = await db.collection('products').findOne({ _id: new ObjectId(id), archivedAt: { $exists: false } }, { session, projection });
        if (!product) { for (const change of changes) attempt.skipped.push({ id, field: change.field, reason: 'Product not found.' }); return; }
        const fields: Record<string, string> = {}, before: Record<string, unknown> = {};
        for (const change of changes) {
          if (text(product[change.field]) !== change.before) { attempt.skipped.push({ id, field: change.field, reason: 'Changed since the preview. Preview the file again.' }); continue; }
          const reason = await refusal(db, product, change.field, change.after, session);
          if (reason) { attempt.skipped.push({ id, field: change.field, reason }); continue; }
          fields[change.field] = change.after.trim(); before[change.field] = product[change.field];
        }
        if (!Object.keys(fields).length) return;
        await db.collection('products').updateOne({ _id: product._id }, { $set: fields }, { session });
        await db.collection('catalog_audit').insertOne({ entityId: product._id, collection: 'products', actor, before, after: fields,
          reason: 'Enrichment file, values confirmed by administrator', createdAt: new Date() }, { session });
        attempt.written = Object.keys(fields).length;
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally { await session.endSession(); }
    skipped.push(...attempt.skipped);
    if (attempt.written) { applied += attempt.written; products += 1; }
  }
  return { applied, products, skipped };
}
