import { z } from 'zod';

/** The admin product list and the editor's "Save & next" queue share one definition of "which products", so the next product is
 *  always the next row of the list the administrator came from. Fixed names only: no database filter ever crosses the boundary. */
export const catalogueViews = ['all', 'live', 'hidden', 'outofstock', 'sale'] as const;
export const catalogueFilters = ['all', 'missing-photo', 'has-photo', 'ready', 'identity', 'classification', 'prescription', 'content'] as const;
export type CatalogueView = (typeof catalogueViews)[number];
export type CatalogueFilter = (typeof catalogueFilters)[number];

export const catalogueViewLabels: Record<CatalogueView, string> = {
  all: 'All products', live: 'Live', hidden: 'Hidden', outofstock: 'Out of stock', sale: 'On sale',
};
export const catalogueFilterLabels: Record<CatalogueFilter, string> = {
  all: 'Everything', 'missing-photo': 'Missing photo', 'has-photo': 'Has photo', ready: 'Ready to go live',
  identity: 'Name incomplete', classification: 'Type not chosen', prescription: 'Prescription', content: 'Brand or description missing',
};

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const wholeNumber = (maximum: number) => z.union([z.number(), z.string().regex(/^\d{1,6}$/).transform(Number)]).pipe(z.number().int().min(0).max(maximum));
const listContext = {
  view: z.enum(catalogueViews).default('all'),
  filter: z.enum(catalogueFilters).default('all'),
  q: z.string().trim().min(1).max(80).optional(),
  category: objectId.optional(),
};
export const catalogueContextSchema = z.object(listContext).strict();
export type CatalogueContext = z.infer<typeof catalogueContextSchema>;

export const catalogueListQuerySchema = z.object({
  ...listContext,
  limit: wholeNumber(100).pipe(z.number().min(1)).default(25),
  offset: wholeNumber(100000).default(0),
  /** Exact product IDs or barcodes, comma separated: used to match photo file names to products. */
  codes: z.string().regex(/^[A-Za-z0-9_-]{1,40}(?:,[A-Za-z0-9_-]{1,40}){0,49}$/).optional(),
}).strict();

export const catalogueQueueQuerySchema = z.object({ ...listContext, id: objectId }).strict();

export const catalogueItemSchema = z.object({
  _id: z.string(), productId: z.string(), name: z.string(), brand: z.string(), category: z.string(),
  price: z.number().nullable(), salePrice: z.number().nullable(), stock: z.number().nullable(),
  productType: z.string(), live: z.boolean(), missingPhoto: z.boolean(), ready: z.boolean(), issues: z.array(z.string()),
  /** First photo, as stored: a catalogue CDN address or a legacy media filename. */
  image: z.string().nullable(), photos: z.number().int().min(0), mediaRevision: z.number().int().min(0),
  barcode: z.string(), gtin: z.string(),
}).strict();
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;

const count = z.number().int().min(0);
export const catalogueListSchema = z.object({
  items: z.array(catalogueItemSchema).max(100), total: count, offset: count,
  counts: z.object({ views: z.record(z.enum(catalogueViews), count), filters: z.record(z.enum(catalogueFilters), count) }).strict(),
}).strict();
export type CatalogueList = z.infer<typeof catalogueListSchema>;

export const catalogueQueueSchema = z.object({
  previousId: objectId.nullable(), nextId: objectId.nullable(),
  /** 1-based place of the current product in the queue; null once it no longer matches (for example it now has a photo). */
  position: count.nullable(), total: count,
}).strict();
export type CatalogueQueue = z.infer<typeof catalogueQueueSchema>;

export const catalogueVisibilityLimit = 50;
export const catalogueVisibilitySchema = z.object({
  ids: z.array(objectId).min(1).max(catalogueVisibilityLimit).refine(ids => new Set(ids).size === ids.length),
  live: z.boolean(),
}).strict();
export const catalogueVisibilityResultSchema = z.object({
  results: z.array(z.object({ id: objectId, ok: z.boolean(), changed: z.boolean(), reason: z.string().max(200).optional() }).strict()).max(catalogueVisibilityLimit),
}).strict();
export type CatalogueVisibilityResult = z.infer<typeof catalogueVisibilityResultSchema>;

/** Classifying several products at once. Only products still without a confirmed type can change, and the request must state
 *  that a person checked them. */
export const productTypes = ['general', 'otc', 'prescription'] as const;
export type ProductType = (typeof productTypes)[number];
export const productTypeLabels: Record<ProductType, string> = { general: 'General', otc: 'Pharmacy medicine', prescription: 'Prescription' };
export const catalogueTypeSchema = z.object({
  ids: z.array(objectId).min(1).max(catalogueVisibilityLimit).refine(ids => new Set(ids).size === ids.length),
  productType: z.enum(productTypes),
  confirmed: z.literal(true),
}).strict();

/** The list context as URL parameters, leaving defaults out so links stay short. */
export function catalogueContextParams(context: Partial<CatalogueContext>): URLSearchParams {
  const params = new URLSearchParams();
  if (context.view && context.view !== 'all') params.set('view', context.view);
  if (context.filter && context.filter !== 'all') params.set('filter', context.filter);
  if (context.q) params.set('q', context.q);
  if (context.category) params.set('category', context.category);
  return params;
}
/** Reads a list context from page parameters, dropping anything unknown instead of failing the page. */
export function readCatalogueContext(source: Record<string, unknown>): CatalogueContext {
  const pick = <T extends z.ZodType>(schema: T, value: unknown): z.infer<T> | undefined => { const parsed = schema.safeParse(value); return parsed.success ? parsed.data : undefined; };
  const q = pick(listContext.q, source.q), category = pick(objectId, source.category);
  // 'disabled' is the name older links use for hidden products.
  return { view: pick(z.enum(catalogueViews), source.view === 'disabled' ? 'hidden' : source.view) ?? 'all', filter: pick(z.enum(catalogueFilters), source.filter) ?? 'all',
    ...(q ? { q } : {}), ...(category ? { category } : {}) };
}
