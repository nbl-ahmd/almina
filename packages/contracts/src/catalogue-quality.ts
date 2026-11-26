import { z } from 'zod';
import { hasProductPhoto, validGtin } from './product-content';

/**
 * Catalogue completeness: which verified details a product still lacks, how urgently, and which identifiers are safe to
 * use as a GTIN. Everything here reads stored catalogue values only. Nothing infers, invents or fetches product facts.
 */

// ---------------------------------------------------------------------------------------------------------------------
// GTIN identity

/** A valid GTIN-8/12/13/14 as its 14-digit form, so a UPC-A and its EAN-13 spelling compare equal; null otherwise. */
export function normalizeGtin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const digits = value.trim();
  if (!validGtin(digits) || /^0+$/.test(digits)) return null;
  return digits.padStart(14, '0');
}

/**
 * GS1 numbers a shop or a coupon can carry that are not a manufacturer's trade-item GTIN: restricted circulation
 * (in-store and variable-measure codes, 02x, 04x, 20x–29x), coupons and refund receipts (05x, 98x, 99x), and
 * GTIN-8 velocity / internal codes (leading 0 or 2). They pass the check digit, so a checksum alone is not enough.
 */
export function restrictedGtin(value: string): boolean {
  const digits = value.trim();
  if (digits.length === 8) return digits[0] === '0' || digits[0] === '2';
  const gtin13 = digits.padStart(14, '0').slice(1);
  const prefix = Number(gtin13.slice(0, 3));
  return (prefix >= 20 && prefix <= 29) || (prefix >= 40 && prefix <= 59) || (prefix >= 200 && prefix <= 299) || prefix >= 980;
}

/** A stored barcode that could be confirmed as the product's GTIN: valid check digit and not a restricted-circulation code. */
export function tradeGtin(value: unknown): string | null {
  const normalized = normalizeGtin(value);
  return normalized && !restrictedGtin(String(value).trim()) ? normalized : null;
}

// ---------------------------------------------------------------------------------------------------------------------
// Gaps

export const catalogueGaps = ['photo', 'brand', 'gtin', 'manufacturer', 'pack', 'description', 'type', 'category'] as const;
export type CatalogueGap = (typeof catalogueGaps)[number];
export const catalogueGapLabels: Record<CatalogueGap, string> = {
  photo: 'Photo', brand: 'Brand', gtin: 'GTIN / barcode', manufacturer: 'Manufacturer', pack: 'Pack size',
  description: 'Description', type: 'Product type', category: 'Specific category',
};
/** Category names that file a product nowhere in particular. */
const genericCategory = /^\s*(?:general|others?|misc(?:ellaneous)?|uncategori[sz]ed)\s*$/i;
const blank = (value: unknown) => typeof value !== 'string' || !value.trim();

/** What a product still lacks. A GTIN is not a gap when staff recorded that the manufacturer assigns none. */
export function productGaps(product: Record<string, unknown>, categoryName?: string): CatalogueGap[] {
  const gaps: CatalogueGap[] = [];
  if (!hasProductPhoto(product)) gaps.push('photo');
  if (blank(product.brand) && blank(product.familyBrand)) gaps.push('brand');
  if (product.identifierStatus !== 'not-assigned' && !normalizeGtin(product.gtin)) gaps.push('gtin');
  if (blank(product.manufacturer)) gaps.push('manufacturer');
  if (blank(product.packLabel) && blank(product.variantPackSize) && blank(product.variantSize)) gaps.push('pack');
  if (blank(product.description)) gaps.push('description');
  if (!['general', 'otc', 'prescription'].includes(String(product.productType))) gaps.push('type');
  if (categoryName !== undefined && genericCategory.test(categoryName)) gaps.push('category');
  return gaps;
}

// ---------------------------------------------------------------------------------------------------------------------
// Priority

export type PrioritySignals = { units90: number; stock: number; live: boolean; featured: boolean; sale: boolean; gaps: number };
/**
 * Which incomplete product to enrich first. Real signals only: units ordered in the last 90 days (current order system),
 * stock on hand, whether customers can see it, and the merchandising flags staff set. There is no view or search data.
 * Ties fall back to catalogue order, so pages stay stable while staff work through them.
 */
export function enrichmentPriority(signals: PrioritySignals): { score: number; reasons: string[] } {
  const units = Math.max(0, Math.floor(signals.units90));
  const reasons: string[] = [];
  let score = Math.min(units, 50) * 10;
  if (units) reasons.push(`${units} sold in 90 days`);
  if (signals.stock > 0) { score += 50; reasons.push('in stock'); }
  if (signals.live) { score += 40; reasons.push('live'); }
  if (signals.featured) { score += 15; reasons.push('featured'); }
  if (signals.sale) { score += 10; reasons.push('on sale'); }
  // Among equals, the product with more missing details gains more from one visit.
  score += Math.min(Math.max(0, signals.gaps), 8);
  return { score, reasons };
}

// ---------------------------------------------------------------------------------------------------------------------
// Requests and responses

const wholeNumber = (maximum: number) => z.union([z.number(), z.string().regex(/^\d{1,6}$/).transform(Number)]).pipe(z.number().int().min(0).max(maximum));
export const enrichmentScopes = ['live', 'instock', 'all'] as const;
export type EnrichmentScope = (typeof enrichmentScopes)[number];
export const enrichmentScopeLabels: Record<EnrichmentScope, string> = { live: 'Live products', instock: 'In stock', all: 'Whole catalogue' };
export const enrichmentQuerySchema = z.object({
  scope: z.enum(enrichmentScopes).default('live'),
  gap: z.enum(['any', ...catalogueGaps]).default('any'),
  limit: wholeNumber(100).pipe(z.number().min(1)).default(25),
  offset: wholeNumber(100000).default(0),
}).strict();
export type EnrichmentQuery = z.infer<typeof enrichmentQuerySchema>;
export const enrichmentExportQuerySchema = enrichmentQuerySchema.omit({ limit: true, offset: true }).strict();

const count = z.number().int().min(0);
export const enrichmentItemSchema = z.object({
  _id: z.string(), productId: z.string(), name: z.string(), brand: z.string(), barcode: z.string(), category: z.string(),
  image: z.string().nullable(), stock: z.number(), live: z.boolean(), units90: count,
  gaps: z.array(z.enum(catalogueGaps)), score: count, reasons: z.array(z.string()),
  /** The stored barcode is a valid trade GTIN no other product uses, so staff can confirm it as this product's GTIN. */
  barcodeGtin: z.boolean(),
}).strict();
export type EnrichmentItem = z.infer<typeof enrichmentItemSchema>;
export const enrichmentQueueSchema = z.object({ items: z.array(enrichmentItemSchema).max(100), total: count, offset: count, ordersSince: z.string() }).strict();
export type EnrichmentQueue = z.infer<typeof enrichmentQueueSchema>;

const coverage = z.object({ total: count, missing: z.record(z.enum(catalogueGaps), count) }).strict();
export const qualityReportSchema = z.object({
  live: coverage, instock: coverage, all: coverage,
  merchant: z.object({
    /** Live products the Google feed would accept today. */
    ready: count,
    /** Live medicines: excluded from the UAE Google feed by policy, not by missing data. */
    medicines: count,
    /** Live products with a storefront photo that is not yet a published catalogue (Cloudinary) image. */
    legacyPhotoOnly: count,
    /** Missing catalogue details, most common first. */
    dataGaps: z.array(z.object({ issue: z.string(), products: count }).strict()),
    /** Review steps that need a person (approval, content and identifier review), most common first. */
    reviewSteps: z.array(z.object({ issue: z.string(), products: count }).strict()),
  }).strict(),
  identifiers: z.object({
    barcodeGtinCandidates: count,
    restrictedBarcodes: count,
    nonGtinBarcodes: count,
    duplicateGroups: z.array(z.object({ code: z.string(), products: z.array(z.object({ _id: z.string(), productId: z.string(), name: z.string() }).strict()) }).strict()).max(50),
    duplicateGroupTotal: count,
  }).strict(),
  /** Live products the storefront cannot read (a stored value breaks validation), so their pages return 404. */
  unreadableLive: z.array(z.object({ _id: z.string(), productId: z.string(), name: z.string() }).strict()).max(50),
  unreadableLiveTotal: count,
  generatedAt: z.string(),
}).strict();
export type QualityReport = z.infer<typeof qualityReportSchema>;

export const barcodeGtinSchema = z.object({
  ids: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).min(1).max(100).refine(ids => new Set(ids).size === ids.length),
  /** The administrator confirmed each barcode against the product's pack. */
  confirmed: z.literal(true),
}).strict();
export const barcodeGtinResultSchema = z.object({ results: z.array(z.object({ id: z.string(), ok: z.boolean(), changed: z.boolean(), reason: z.string().optional() }).strict()).max(100) }).strict();
export type BarcodeGtinResult = z.infer<typeof barcodeGtinResultSchema>;

// ---------------------------------------------------------------------------------------------------------------------
// Enrichment CSV

/** Columns the enrichment file may change. Everything else in the file is for reference and is ignored on import. */
export const enrichmentEditableColumns = ['brand', 'manufacturer', 'gtin', 'mpn', 'identifierStatus', 'packLabel', 'saleUnit', 'description'] as const;
export type EnrichmentField = (typeof enrichmentEditableColumns)[number];
export const enrichmentCsvColumns = ['product_id', 'name', 'barcode', 'category', 'priority', 'gaps', ...enrichmentEditableColumns, 'photo_file_name'] as const;

/** Spreadsheet-safe cell: values a spreadsheet would run as a formula get a leading apostrophe (undone on import). */
export function enrichmentCsvCell(value: string): string {
  const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function unescapeEnrichmentCell(value: string): string {
  return /^'[=+@\-\t\r]/.test(value) ? value.slice(1) : value;
}

export const enrichmentPreviewSchema = z.object({
  content: z.string().min(1).max(1024 * 1024),
  /** Replace values that are already filled in. Off by default: the file only fills blanks. */
  overwrite: z.boolean().default(false),
}).strict();
export const enrichmentChangeSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i), field: z.enum(enrichmentEditableColumns),
  before: z.string().max(5000), after: z.string().min(1).max(5000),
}).strict();
export type EnrichmentChange = z.infer<typeof enrichmentChangeSchema>;
export const enrichmentApplySchema = z.object({
  changes: z.array(enrichmentChangeSchema).min(1).max(4000),
  /** The administrator confirmed the values come from the pack, the manufacturer or an authorised supplier. */
  confirmed: z.literal(true),
}).strict();
export const enrichmentPreviewResultSchema = z.object({
  rows: z.array(z.object({ line: count, productId: z.string(), id: z.string().nullable(), name: z.string(), live: z.boolean(),
    changes: z.array(enrichmentChangeSchema), notes: z.array(z.string()) }).strict()).max(4000),
  changeCount: count, productCount: count, errorCount: count,
}).strict();
export type EnrichmentPreview = z.infer<typeof enrichmentPreviewResultSchema>;
export const enrichmentApplyResultSchema = z.object({ applied: count, products: count,
  skipped: z.array(z.object({ id: z.string(), field: z.string(), reason: z.string() }).strict()) }).strict();
export type EnrichmentApplyResult = z.infer<typeof enrichmentApplyResultSchema>;
