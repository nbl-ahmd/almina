import { ObjectId, type Db, type Document } from 'mongodb';
import {
  catalogueGapLabels, enrichmentCsvCell, enrichmentCsvColumns, enrichmentExportQuerySchema, enrichmentPriority, enrichmentQuerySchema,
  hasProductPhoto, normalizeGtin, productGaps, restrictedGtin, tradeGtin,
  barcodeGtinSchema, type BarcodeGtinResult, type CatalogueGap, type EnrichmentItem, type EnrichmentQuery, type EnrichmentQueue, type QualityReport,
} from '@almina/contracts';
import type { z } from 'zod';
// Pure catalogue modules shared with the storefront and the Merchant sync: one definition of "readable" and "feed ready".
import { readProduct } from '../../../../web/src/lib/catalog/model.js';
import { feedIssues } from '../../../../web/src/lib/catalog/feed.js';
import { merchantImages, merchantInput } from './merchant.js';
import { compatibilityProductProjection } from './compatibility-reads.js';
import { HttpError } from '../../errors.js';

/**
 * Catalogue completeness for the staff console. Read-only. Every read is admin-triggered, bounded (row caps, maxTimeMS)
 * and runs nothing in the background: no timers, no stored scores to keep fresh.
 */

const options = { maxTimeMS: 8000, allowDiskUse: false };
/** Hard cap on catalogue rows one request reads. Production holds about 6,300 products. */
const catalogueCap = 20000;
const demandDays = 90;
const live: Document = { published: { $ne: false }, disabled: { $ne: true }, active: { $ne: false } };
const notArchived: Document = { archivedAt: { $exists: false } };

function parse<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  return result.data;
}
const text = (value: unknown) => typeof value === 'string' ? value : '';
const isLive = (product: Document) => product.published !== false && product.disabled !== true && product.active !== false;
const scopeMatch = (scope: EnrichmentQuery['scope']): Document => scope === 'live' ? live : scope === 'instock' ? { stock: { $gt: 0 } } : {};

/** Units ordered per product (Mongo id) in the last 90 days, from the current order system; cancelled orders excluded. */
export async function demandUnits(db: Db, now = new Date()): Promise<{ units: Map<string, number>; since: Date }> {
  const since = new Date(now.getTime() - demandDays * 86400000);
  const rows = await db.collection('orders').aggregate<Document>([
    { $match: { schemaVersion: 2, createdAt: { $gte: since, $lt: now }, status: { $ne: 'cancelled' } } },
    { $set: { _lines: { $ifNull: ['$lines', '$totals.lines'] } } },
    { $unwind: '$_lines' },
    { $group: { _id: { $toString: '$_lines.productId' }, units: { $sum: { $ifNull: ['$_lines.quantity', 0] } } } },
    { $limit: catalogueCap },
  ], options).toArray();
  return { units: new Map(rows.map(row => [String(row._id), Math.max(0, Number(row.units) || 0)])), since };
}

const queueProjection = { _id: 1, product_id: 1, name: 1, brand: 1, familyBrand: 1, manufacturer: 1, gtin: 1, barcode: 1, identifierStatus: 1,
  packLabel: 1, variantPackSize: 1, variantSize: 1, saleUnit: 1, mpn: 1, productType: 1, category: 1, stock: 1, featured: 1, sale: 1,
  published: 1, disabled: 1, active: 1, image: 1, images: 1, cloudinaryImages: 1, description: 1 };

async function categoryNames(db: Db) {
  const rows = await db.collection('categories').find({}, { projection: { name: 1 }, limit: 2000, maxTimeMS: 3000 }).toArray();
  return new Map(rows.map(row => [String(row._id), text(row.name)]));
}

/** Every normalized identifier (barcode or GTIN) and the products carrying it, across the non-archived catalogue. */
async function identifierOwners(db: Db) {
  const rows = await db.collection('products').find(notArchived, { projection: { product_id: 1, name: 1, barcode: 1, gtin: 1 }, limit: catalogueCap, maxTimeMS: 8000 }).toArray();
  const owners = new Map<string, Document[]>();
  for (const row of rows) for (const code of new Set([normalizeGtin(row.barcode), normalizeGtin(row.gtin)])) {
    if (!code) continue;
    owners.set(code, [...(owners.get(code) ?? []), row]);
  }
  return { rows, owners };
}
const usedByOther = (owners: Map<string, Document[]>, code: string, id: string) => (owners.get(code) ?? []).some(owner => String(owner._id) !== id);

type Ranked = { product: Document; gaps: CatalogueGap[]; units90: number; score: number; reasons: string[]; category: string };
async function ranked(db: Db, query: Pick<EnrichmentQuery, 'scope' | 'gap'>, now: Date) {
  const [{ units, since }, categories, products] = await Promise.all([
    demandUnits(db, now), categoryNames(db),
    db.collection('products').find({ $and: [notArchived, scopeMatch(query.scope)] }, { projection: queueProjection, limit: catalogueCap, maxTimeMS: 8000 }).toArray(),
  ]);
  const rows: Ranked[] = [];
  for (const product of products) {
    const category = categories.get(String(product.category)) ?? '';
    const gaps = productGaps(product, category);
    if (!gaps.length || (query.gap !== 'any' && !gaps.includes(query.gap))) continue;
    const units90 = units.get(String(product._id)) ?? 0;
    const { score, reasons } = enrichmentPriority({ units90, stock: Number(product.stock) || 0, live: isLive(product), featured: product.featured === true, sale: product.sale === true, gaps: gaps.length });
    rows.push({ product, gaps, units90, score, reasons, category });
  }
  // Highest priority first; catalogue order breaks ties so pages stay stable between visits.
  rows.sort((a, b) => b.score - a.score || String(a.product._id).localeCompare(String(b.product._id)));
  return { rows, since };
}

/** The prioritised list of products to enrich, one bounded page at a time. */
export async function catalogueEnrichmentQueue(db: Db, raw: unknown, now = new Date()): Promise<EnrichmentQueue> {
  const query = parse(enrichmentQuerySchema, raw);
  const [{ rows, since }, identifiers] = await Promise.all([ranked(db, query, now), identifierOwners(db)]);
  const items: EnrichmentItem[] = rows.slice(query.offset, query.offset + query.limit).map(({ product, gaps, units90, score, reasons, category }) => {
    const id = String(product._id), code = tradeGtin(product.barcode);
    const photos = [...(Array.isArray(product.cloudinaryImages) ? product.cloudinaryImages : []), product.image, ...(Array.isArray(product.images) ? product.images : [])];
    return {
      _id: id, productId: text(product.product_id), name: text(product.name), brand: text(product.brand) || text(product.familyBrand),
      barcode: text(product.barcode), category, image: hasProductPhoto(product) ? photos.find(value => typeof value === 'string' && value.trim()) ?? null : null,
      stock: Number(product.stock) || 0, live: isLive(product), units90, gaps, score, reasons,
      barcodeGtin: gaps.includes('gtin') && !text(product.gtin).trim() && code !== null && !usedByOther(identifiers.owners, code, id),
    };
  });
  return { items, total: rows.length, offset: query.offset, ordersSince: since.toISOString() };
}

/** The same list as a spreadsheet for suppliers and staff: up to 2,000 rows, highest priority first. */
export async function catalogueEnrichmentCsv(db: Db, raw: unknown, now = new Date()): Promise<string> {
  const query = parse(enrichmentExportQuerySchema, raw);
  const { rows } = await ranked(db, query, now);
  const lines = rows.slice(0, 2000).map(({ product, gaps, score, category }) => {
    const value: Record<(typeof enrichmentCsvColumns)[number], string> = {
      product_id: text(product.product_id), name: text(product.name), barcode: text(product.barcode), category, priority: String(score),
      gaps: gaps.map(gap => catalogueGapLabels[gap]).join('; '), brand: text(product.brand), manufacturer: text(product.manufacturer),
      gtin: text(product.gtin), mpn: text(product.mpn), identifierStatus: text(product.identifierStatus), packLabel: text(product.packLabel),
      saleUnit: text(product.saleUnit), description: text(product.description),
      // Name returned photos like this and Products → Upload many photos matches them to the product.
      photo_file_name: gaps.includes('photo') && text(product.product_id) ? `${text(product.product_id)}.jpg` : '',
    };
    return enrichmentCsvColumns.map(column => enrichmentCsvCell(value[column])).join(',');
  });
  return [enrichmentCsvColumns.join(','), ...lines].join('\r\n') + '\r\n';
}

// Feed blockers that need a person's decision rather than missing data.
const reviewIssues = new Set(['Content review', 'Physical stock review', 'Channel approval', 'Manufacturer identifier review', 'Condition review',
  'Image usage permission', 'Product classification (prescription requires a separate dispensing workflow)']);
const tally = (counts: Map<string, number>) => [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([issue, products]) => ({ issue, products }));

/** One read of the catalogue's completeness, identifier health and Google feed readiness. */
export async function catalogueQualityReport(db: Db, config: { cloudName: string; origin: string }, now = new Date()): Promise<QualityReport> {
  const [categories, scoped, liveProducts, identifiers] = await Promise.all([
    categoryNames(db),
    db.collection('products').find(notArchived, { projection: queueProjection, limit: catalogueCap, maxTimeMS: 8000 }).toArray(),
    // Live products with their category, exactly as the storefront and the feed read them.
    db.collection('products').aggregate<Document>([
      { $match: { ...notArchived, ...live } }, { $limit: catalogueCap },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category', pipeline: [{ $project: { _id: 1, name: 1, disabled: 1 } }] } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $project: { ...compatibilityProductProjection, active: 1, audience: 1 } },
    ], options).toArray(),
    identifierOwners(db),
  ]);
  const empty = () => ({ total: 0, missing: Object.fromEntries(Object.keys(catalogueGapLabels).map(gap => [gap, 0])) as Record<CatalogueGap, number> });
  const coverage = { live: empty(), instock: empty(), all: empty() };
  for (const product of scoped) {
    const gaps = productGaps(product, categories.get(String(product.category)) ?? '');
    for (const scope of [coverage.all, ...(isLive(product) ? [coverage.live] : []), ...(Number(product.stock) > 0 ? [coverage.instock] : [])]) {
      scope.total += 1;
      for (const gap of gaps) scope.missing[gap] += 1;
    }
  }

  const dataGaps = new Map<string, number>(), reviewSteps = new Map<string, number>();
  let ready = 0, medicines = 0, legacyPhotoOnly = 0;
  const unreadable: Document[] = [];
  for (const row of liveProducts) {
    if (!row.category) { unreadable.push(row); continue; }
    // Database reads return ObjectIds; the storefront and the Merchant sync read string ids (same normalisation as the sync).
    const raw = { ...row, _id: String(row._id), category: { ...row.category, _id: String(row.category._id) } };
    const product = readProduct(raw);
    if (!product) { if (row.category.disabled !== true) unreadable.push(row); continue; }
    const images = merchantImages(product, config.cloudName);
    if (hasProductPhoto(raw) && !images.length) legacyPhotoOnly += 1;
    if (product.productType === 'otc' || product.productType === 'prescription') { medicines += 1; continue; }
    if (merchantInput(raw, config)) { ready += 1; continue; }
    for (const issue of feedIssues(product, 'google', images)) {
      const target = reviewIssues.has(issue) || issue.startsWith('Google UAE healthcare') ? reviewSteps : dataGaps;
      target.set(issue, (target.get(issue) ?? 0) + 1);
    }
  }

  let barcodeGtinCandidates = 0, restrictedBarcodes = 0, nonGtinBarcodes = 0;
  for (const row of identifiers.rows) {
    const barcode = text(row.barcode).trim();
    if (!barcode) continue;
    const code = normalizeGtin(barcode);
    if (!code) { nonGtinBarcodes += 1; continue; }
    if (restrictedGtin(barcode)) { restrictedBarcodes += 1; continue; }
    if (!text(row.gtin).trim() && !usedByOther(identifiers.owners, code, String(row._id))) barcodeGtinCandidates += 1;
  }
  const duplicates = [...identifiers.owners].filter(([, owners]) => new Set(owners.map(owner => String(owner._id))).size > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const summary = (row: Document) => ({ _id: String(row._id), productId: text(row.product_id), name: text(row.name) });
  return {
    ...coverage,
    merchant: { ready, medicines, legacyPhotoOnly, dataGaps: tally(dataGaps), reviewSteps: tally(reviewSteps) },
    identifiers: {
      barcodeGtinCandidates, restrictedBarcodes, nonGtinBarcodes, duplicateGroupTotal: duplicates.length,
      duplicateGroups: duplicates.slice(0, 50).map(([code, owners]) => ({ code: code.replace(/^0+(?=\d{8,})/, ''), products: [...new Map(owners.map(owner => [String(owner._id), summary(owner)])).values()].slice(0, 10) })),
    },
    unreadableLive: unreadable.slice(0, 50).map(summary), unreadableLiveTotal: unreadable.length,
    generatedAt: now.toISOString(),
  };
}

/** Every way the same GTIN can be spelled in a stored field (GTIN-14 down to GTIN-8, by leading zeros). */
export function gtinSpellings(code: string): string[] {
  return [14, 13, 12, 8].filter(length => /^0*$/.test(code.slice(0, 14 - length))).map(length => code.slice(14 - length));
}

/**
 * Record each selected product's barcode as its GTIN, after an administrator checked it against the pack. Only fills an
 * empty GTIN, only with a valid trade GTIN (no in-store or coupon codes) that no other product carries. Visibility, price,
 * stock and review stamps are untouched; every change is audited.
 */
export async function useBarcodesAsGtin(db: Db, raw: unknown, actor: string): Promise<BarcodeGtinResult> {
  const parsed = barcodeGtinSchema.safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const results: BarcodeGtinResult['results'] = [];
  for (const id of parsed.data.ids) {
    const session = db.client.startSession();
    let result: BarcodeGtinResult['results'][number] = { id, ok: false, changed: false };
    try {
      await session.withTransaction(async () => {
        const product = await db.collection('products').findOne({ _id: new ObjectId(id) }, { session });
        if (!product || product.archivedAt) { result = { id, ok: false, changed: false, reason: 'Product not found.' }; return; }
        if (text(product.gtin).trim()) { result = { id, ok: true, changed: false, reason: 'Already has a GTIN.' }; return; }
        const barcode = text(product.barcode).trim(), code = tradeGtin(barcode);
        if (!code) { result = { id, ok: false, changed: false, reason: normalizeGtin(barcode) ? 'The barcode is an in-store or coupon code, not a manufacturer GTIN.' : 'The barcode is not a valid GTIN.' }; return; }
        const forms = gtinSpellings(code);
        const other = await db.collection('products').findOne({ _id: { $ne: product._id }, ...notArchived, $or: [{ barcode: { $in: forms } }, { gtin: { $in: forms } }] }, { session, projection: { product_id: 1 } });
        if (other) { result = { id, ok: false, changed: false, reason: `Another product (${text(other.product_id) || 'unnamed'}) uses this barcode. Check which one is right.` }; return; }
        const fields = { gtin: barcode, identifierStatus: 'assigned' };
        await db.collection('products').updateOne({ _id: product._id }, { $set: fields }, { session });
        await db.collection('catalog_audit').insertOne({ entityId: product._id, collection: 'products', actor,
          before: { gtin: product.gtin, identifierStatus: product.identifierStatus }, after: fields,
          reason: 'Barcode confirmed as GTIN by administrator', createdAt: new Date() }, { session });
        result = { id, ok: true, changed: true };
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally { await session.endSession(); }
    results.push(result);
  }
  return { results };
}
