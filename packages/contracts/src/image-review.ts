import { z } from 'zod';
import { productContentFields } from './product-content';

export const imageIdentityFields = ['name', 'brand', 'line', 'strength', 'form', 'size', 'quantity', 'multipack', 'flavour', 'shadeModel', 'variantSize', 'ageStage', 'barcode', 'gtin'] as const;
export type ImageIdentityField = typeof imageIdentityFields[number];
const text = z.string().trim().max(500);
export const imageIdentitySchema = z.object({
  name: text.default(''), brand: text.default(''), line: text.default(''), strength: text.default(''),
  form: text.default(''), size: text.default(''), quantity: text.default(''), multipack: text.default(''),
  flavour: text.default(''), shadeModel: text.default(''), variantSize: text.default(''), ageStage: text.default(''),
  barcode: text.default(''), gtin: text.default(''),
}).strict();
export type ImageIdentity = z.infer<typeof imageIdentitySchema>;
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const assetId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const businessId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
export const imageReviewSourceSchema = z.object({
  assetId, sourceSha256: hash, publicId: z.string().regex(/^(?:almina\/)?products\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/).max(500),
  imageUrl: z.string().url().max(1000).regex(/^https:\/\/res\.cloudinary\.com\/[A-Za-z0-9_-]+\/image\/upload\/v[1-9][0-9]{0,19}\/(?:almina\/)?products\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:webp|png|jpe?g|avif)$/i), identity: imageIdentitySchema,
  labelText: z.array(z.string().max(1000)).max(40),
  flags: z.array(z.enum(['placeholder', 'promotion', 'watermark', 'multipleViews', 'blurry', 'notProduct'])).max(6),
  candidateProductIds: z.array(businessId).max(8),
  priorDecision: z.enum(['approved', 'held', 'unmatched', 'rejected', 'withdrawn']),
  sourceNote: z.string().max(3000), extractionReference: z.string().min(1).max(200),
}).strict();
export type ImageReviewSource = z.infer<typeof imageReviewSourceSchema>;
export const imageReviewWithdrawalSchema = z.object({ assetId, productId: businessId, reason: z.string().min(1).max(1000) }).strict();
export const imageReviewPackageSchema = z.object({
  schemaVersion: z.literal('image-review-package-v1'), sourceRun: z.string().regex(/^[a-z0-9-]{1,100}$/),
  catalogueChecksum: hash, withdrawals: z.array(imageReviewWithdrawalSchema).max(100),
  items: z.array(imageReviewSourceSchema).min(1).max(5000),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.items.map(item => item.assetId)).size !== value.items.length) ctx.addIssue({ code: 'custom', message: 'Duplicate asset IDs' });
});
export const imageReviewStageSchema = imageReviewPackageSchema.safeExtend({ items: z.array(imageReviewSourceSchema).min(1).max(25),
  upload: z.object({ packageId: hash, offset: z.number().int().min(0).max(4999), total: z.number().int().min(1).max(5000) }).strict().optional(),
});
export const imageReviewListQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'held', 'approved', 'rejected', 'imported']).default('pending'),
  after: hash.optional(), limit: z.coerce.number().int().min(1).max(25).default(15),
}).strict();
export const imageReviewExportQuerySchema = z.object({ after: hash.optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
export const imageReviewChecksSchema = z.array(z.object({
  field: z.enum(imageIdentityFields), confirmed: z.boolean(),
  imageValue: text, catalogueValue: text, evidence: z.string().trim().max(1000),
  discardedExtraction: z.literal(true).optional(),
}).strict()).max(imageIdentityFields.length);
export const imageReviewProductChangesSchema = z.object({
  name: text.min(1).optional(),
  brand: productContentFields.brand,
  productForm: productContentFields.productForm,
  strength: productContentFields.strength,
  packLabel: productContentFields.packLabel,
  mpn: productContentFields.mpn,
  barcode: text.optional(),
  gtin: productContentFields.gtin,
}).strict();
export type ImageReviewProductChanges = z.infer<typeof imageReviewProductChangesSchema>;
export const imageReviewEditableFields = {
  name: 'name', brand: 'brand', strength: 'strength', form: 'productForm',
  size: 'packLabel', shadeModel: 'mpn', barcode: 'barcode', gtin: 'gtin',
} as const satisfies Partial<Record<ImageIdentityField, keyof ImageReviewProductChanges>>;
export const imageReviewDraftSchema = z.object({
  itemId: hash, expectedRevision: z.number().int().nonnegative(), requestId: z.uuid(),
  product: imageReviewProductChangesSchema.extend({
    name: text.min(1), category: z.string().regex(/^[a-f0-9]{24}$/i),
    price: z.string().max(18).regex(/^\d+(?:\.\d{1,2})?$/),
    stock: z.string().max(16).regex(/^\d+$/), vat: z.boolean(),
    description: z.string().max(4000).optional(),
  }).strict(),
}).strict();
export type ImageReviewDraftInput = z.infer<typeof imageReviewDraftSchema>;
export const imageReviewDecisionSchema = z.object({
  itemId: hash, expectedRevision: z.number().int().nonnegative(), productId: businessId.nullable(),
  productRevision: hash.nullable(), decision: z.enum(['approved', 'held', 'rejected']),
  originalViewed: z.boolean(), checks: imageReviewChecksSchema, note: z.string().trim().min(5).max(2000),
  sharedIdentifierConfirmed: z.boolean().default(false),
  requestId: z.uuid(),
  productChanges: imageReviewProductChangesSchema.optional(),
}).strict();
export type ImageReviewDecisionInput = z.infer<typeof imageReviewDecisionSchema>;
export const imageReviewSelectionSchema = z.object({ itemId: hash, productId: businessId }).strict();
export const imageReviewImportSchema = z.object({
  manifestId: hash, approvalIds: z.array(hash).min(1).max(8),
}).strict();
export const imageReviewPublishSchema = imageReviewImportSchema.omit({ manifestId: true }).extend({ requestId: z.uuid() });
export const imagePublicationStartSchema = z.object({ requestId: z.uuid() }).strict();
export const imagePublicationActionSchema = z.object({ jobId: z.uuid() }).strict();
export const imagePublicationSchema = z.object({
  jobId: z.uuid(), phase: z.enum(['preparing', 'publishing', 'paused', 'complete']),
  preparedImages: z.number().int().nonnegative(), publishedImages: z.number().int().nonnegative(),
  skippedImages: z.number().int().nonnegative(), totalProducts: z.number().int().nonnegative(), processedProducts: z.number().int().nonnegative(),
  error: z.enum(['access', 'provider', 'service']).nullable(), updatedAt: z.string(), canResume: z.boolean(),
  issues: z.array(z.object({ productId: businessId, images: z.number().int().nonnegative(), reason: z.string().max(200) })).max(20), moreIssues: z.boolean(),
});
export const imagePublicationResponseSchema = z.object({ publication: imagePublicationSchema.nullable(), execution: z.enum(['hosted', 'local']).optional() });
export type ImagePublication = z.infer<typeof imagePublicationSchema>;
export type ImagePublicationResponse = z.infer<typeof imagePublicationResponseSchema>;

export type ImageReviewComparison = {
  field: ImageIdentityField; imageValue: string; catalogueValue: string;
  required: boolean; status: 'match' | 'unknown' | 'conflict';
};
export const imageReviewProductFields = ['name', 'brand', 'productForm', 'strength', 'packLabel', 'mpn', 'barcode', 'gtin', 'variantSize', 'variantPackSize', 'variantFlavour'] as const;
export type ImageReviewProduct = { productId: string; id: string; name: string; revision: string; mediaRevision: number; images: string[]; identity: ImageIdentity;
  fields?: Partial<Record<typeof imageReviewProductFields[number], string>> };
export type ImageReviewItem = {
  itemId: string; revision: number; status: 'pending' | 'held' | 'approved' | 'rejected' | 'imported';
  source: ImageReviewSource; selectedProductId: string | null; note: string; reviewer: string | null;
  reviewedAt: string | null; approvalId: string | null; draftProductId?: string | undefined;
};
export type ImageReviewDetail = {
  item: ImageReviewItem; product: ImageReviewProduct | null; candidates: ImageReviewProduct[];
  comparison: ImageReviewComparison[]; withdrawalReason: string | null; sharedIdentifiers: string[];
  history: { decision: string; reviewer: string; note: string; reviewedAt: string }[];
};
export type ImageReviewList = {
  enabled: boolean; items: ImageReviewItem[]; nextAfter: string | null;
  counts: { pending: number; held: number; approved: number; rejected: number; imported: number };
};
export type ImageReviewApprovedMapping = { approvalId: string; itemId: string; productId: string; id: string; name: string; imageUrl: string; publicId: string; sourceSha256: string; productRevision: string; mediaRevision: number; reviewer: string; reviewedAt: string; note: string };
export type ImageReviewManifest = { schemaVersion: 'image-review-approved-v1'; manifestId: string; mappings: ImageReviewApprovedMapping[] };

const productSchema = z.object({ productId: businessId, id: z.string().regex(/^[a-f0-9]{24}$/i), name: text, revision: hash, mediaRevision: z.number().int().nonnegative(), images: z.array(z.string().max(1000)).max(100), identity: imageIdentitySchema,
  fields: z.partialRecord(z.enum(imageReviewProductFields), text).optional() });
const itemSchema = z.object({ itemId: hash, revision: z.number().int().nonnegative(), status: z.enum(['pending', 'held', 'approved', 'rejected', 'imported']), source: imageReviewSourceSchema,
  selectedProductId: businessId.nullable(), note: z.string().max(2000), reviewer: z.string().nullable(), reviewedAt: z.string().nullable(), approvalId: hash.nullable(), draftProductId: businessId.optional() });
export const imageReviewListResponseSchema = z.object({ enabled: z.boolean(), items: z.array(itemSchema).max(25), nextAfter: hash.nullable(), counts: z.object({ pending: z.number(), held: z.number(), approved: z.number(), rejected: z.number(), imported: z.number() }) });
export const imageReviewDetailResponseSchema = z.object({ item: itemSchema, product: productSchema.nullable(), candidates: z.array(productSchema).max(9), comparison: z.array(z.object({ field: z.enum(imageIdentityFields), imageValue: text, catalogueValue: text, required: z.boolean(), status: z.enum(['match', 'unknown', 'conflict']) })).max(14), withdrawalReason: z.string().nullable(), sharedIdentifiers: z.array(z.string()).max(2), history: z.array(z.object({ decision: z.string(), reviewer: z.string(), note: z.string(), reviewedAt: z.string() })).max(20) });
const mappingSchema = z.object({ approvalId: hash, itemId: hash, productId: businessId, id: z.string(), name: text, imageUrl: z.string().max(1000), publicId: z.string(), sourceSha256: hash, productRevision: hash, mediaRevision: z.number(), reviewer: z.string(), reviewedAt: z.string(), note: z.string() });
export const imageReviewManifestSchema = z.object({ schemaVersion: z.literal('image-review-approved-v1'), manifestId: hash, mappings: z.array(mappingSchema).min(1).max(8) });
export function projectImageReviewResponse(path: string, value: unknown): unknown {
  if (/^image-review\/publication(?:\/(?:start|resume|pause))?$/.test(path)) return imagePublicationResponseSchema.parse(value);
  if (path === 'image-review') return imageReviewListResponseSchema.parse(value);
  if (path === 'image-review/select' || /^image-review\/[a-f0-9]{64}$/.test(path)) return imageReviewDetailResponseSchema.parse(value);
  if (path === 'image-review/decide' || path === 'image-review/draft') return itemSchema.parse(value);
  if (path === 'image-review/stage') return z.object({ created: z.number(), replayed: z.number() }).parse(value);
  if (/^image-review\/uploads\/[a-f0-9]{64}$/.test(path)) return z.object({ processed: z.number().int().nonnegative(), total: z.number().int().nullable() }).parse(value);
  if (path === 'image-review/export') return z.object({ mappings: z.array(mappingSchema).max(100), staleItemIds: z.array(hash).max(100), nextAfter: hash.nullable() }).parse(value);
  if (path === 'image-review/preview') return imageReviewManifestSchema.parse(value);
  if (path === 'image-review/import' || path === 'image-review/publish') return z.object({ imported: z.number(), replayed: z.boolean(), manifestId: hash }).parse(value);
  throw new Error('Unknown image review response');
}
