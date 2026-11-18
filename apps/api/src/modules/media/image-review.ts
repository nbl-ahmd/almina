import { createHash } from 'node:crypto';
import { MongoServerError, ObjectId, type Db, type Document, type ClientSession } from 'mongodb';
import {
  cloudinaryImage, imageReviewStageSchema, imageReviewListQuerySchema, imageReviewDecisionSchema,
  imageReviewSelectionSchema, imageReviewImportSchema, imageReviewExportQuerySchema, imageReviewPublishSchema,
  imageReviewDraftSchema, imageReviewProductFields, imageReviewEditableFields, storePublicationIssues,
  imageIdentitySchema, type ImageIdentity, type ImageReviewItem, type ImageReviewSource,
  type ImageReviewProduct, type ImageReviewDetail, type ImageReviewList, type ImageReviewManifest,
  type ImageReviewApprovedMapping, type ImageReviewDecisionInput,
} from '@almina/contracts';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
import { allocateCatalogIds, catalogCreationInput, insertCatalogProduct, serializeCatalog } from '../catalog/creation.js';
import { validateFamilyMembership } from '../catalog/families.js';
import { recordMediaHistory } from './retention.js';
import { compareImageIdentity, imageReviewProductIdentity, imageReviewProductRevision, reviewDigest } from './image-review-identity.js';

const queryOptions = { maxTimeMS: 3000 };
const sessionOptions = (session?: ClientSession) => session ? { ...queryOptions, session } : queryOptions;
const idSchema = z.string().regex(/^[a-f0-9]{64}$/);
const projection = Object.fromEntries(['_id', 'name', 'product_id', 'brand', 'manufacturer', 'strength', 'productForm', 'packLabel', 'variantSize', 'variantPackSize', 'variantFlavour', 'mpn', 'barcode', 'gtin', 'images', 'cloudinaryImages', 'gdriveFileIds', 'mediaRevision', 'archivedAt'].map(key => [key, 1]));
type StoredItem = Document & { _id: string; source: ImageReviewSource; sourceDigest: string; revision: number; status: ImageReviewItem['status']; draftProductId?: string; selectedProductId: string | null; note: string; approvalId: string | null; reviewer: string | null; reviewedAt: Date | null };
const items = (db: Db) => db.collection<StoredItem>('image_review_items');
const events = (db: Db) => db.collection<Document & { _id: string }>('image_review_events');
const withdrawals = (db: Db) => db.collection<Document & { _id: string }>('image_review_withdrawals');
const manifests = (db: Db) => db.collection<Document & { _id: string }>('image_review_manifests');
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const value = schema.safeParse(raw); if (!value.success) throw new HttpError(400, 'INVALID_REQUEST'); return value.data;
}
export const imageReviewSelectionInput = (raw: unknown) => parse(imageReviewSelectionSchema, raw);
export const imageReviewListInput = (raw: unknown) => parse(imageReviewListQuerySchema, raw);
export async function imageReviewUploadProgress(db: Db, uploadId: string, actor: string) {
  await authorize(db, actor, true); parse(idSchema, uploadId);
  const row = await db.collection<Document & { _id: string }>('image_review_uploads').findOne({ _id: uploadId }, queryOptions);
  return { processed: row ? Number(row.processed) : 0, total: row ? Number(row.total) : null };
}
export async function authorizeImageReview(db: Db, actor: string, admin = false, session?: ClientSession) {
  if (!/^[a-f0-9]{24}$/i.test(actor)) throw new HttpError(403, 'FORBIDDEN');
  const user = await db.collection('users').findOne({ _id: new ObjectId(actor), disabled: { $ne: true }, role: { $in: admin ? ['admin'] : ['admin', 'user'] } }, { ...sessionOptions(session), projection: { _id: 1 } });
  if (!user) throw new HttpError(403, 'FORBIDDEN');
}
const authorize = authorizeImageReview;
function sourceUrl(source: ImageReviewSource, cloudName?: string) {
  const value = cloudinaryImage(source.imageUrl, cloudName);
  if (!value || !cloudName) throw new HttpError(400, 'INVALID_REQUEST');
  const relative = new URL(value).pathname.slice(`/${cloudName}/image/upload/`.length);
  if (!/^v[1-9][0-9]{0,19}\/(?:almina\/)?products\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:webp|png|jpe?g|avif)$/i.test(relative)
    || relative.replace(/^v\d+\//, '').replace(/\.(?:webp|png|jpe?g|avif)$/i, '') !== source.publicId) throw new HttpError(400, 'INVALID_REQUEST');
  return value;
}
function dto(row: StoredItem): ImageReviewItem {
  return { itemId: row._id, revision: row.revision, status: row.status, source: row.source, selectedProductId: row.selectedProductId,
    ...(row.draftProductId ? { draftProductId: row.draftProductId } : {}), note: row.note, approvalId: row.approvalId, reviewer: row.reviewer, reviewedAt: row.reviewedAt?.toISOString() ?? null };
}
async function productByBusinessId(db: Db, productId: string, session?: ClientSession) {
  const matches = await db.collection('products').find({ product_id: productId }, { ...sessionOptions(session), projection }).limit(2).toArray();
  if (matches.length > 1) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  const product = matches[0]; if (!product || product.archivedAt) throw new HttpError(404, 'NOT_FOUND'); return product;
}
function productDto(product: Document, image: ImageIdentity, includeFields = false): ImageReviewProduct {
  return { productId: String(product.product_id), id: String(product._id), name: String(product.name), revision: imageReviewProductRevision(product),
    mediaRevision: Number(product.mediaRevision ?? 0), images: Array.isArray(product.cloudinaryImages) ? product.cloudinaryImages.filter((v): v is string => typeof v === 'string') : [],
    identity: imageReviewProductIdentity(product, image),
    ...(includeFields ? { fields: Object.fromEntries(imageReviewProductFields.filter(key => typeof product[key] === 'string').map(key => [key, product[key].trim().slice(0, 500)])) } : {}) };
}
async function sharedIdentifiers(db: Db, product: Document, session?: ClientSession): Promise<string[]> {
  const identifiers = [...new Set([product.barcode, product.gtin].filter((v): v is string => typeof v === 'string' && !!v))];
  const shared: string[] = [];
  for (const value of identifiers) {
    const peers = await db.collection('products').find({ $or: [{ barcode: value }, { gtin: value }] }, { ...sessionOptions(session), projection: { _id: 1 } }).limit(2).toArray();
    if (peers.length > 1) shared.push(value);
  }
  return shared;
}
async function withdrawn(db: Db, row: StoredItem, productId: string, session?: ClientSession) {
  return withdrawals(db).findOne({ _id: reviewDigest([row.source.assetId, productId]) }, sessionOptions(session));
}
export async function stageImageReview(db: Db, raw: unknown, actor: string, cloudName?: string) {
  await authorize(db, actor, true); const value = parse(imageReviewStageSchema, raw);
  value.items.forEach(source => sourceUrl(source, cloudName));
  const session = db.client.startSession(); let created = 0, replayed = 0;
  try {
    await session.withTransaction(async () => {
      created = 0; replayed = 0;
      if (value.upload) {
        const upload = value.upload, uploads = db.collection<Document & { _id: string }>('image_review_uploads');
        if (upload.offset + value.items.length > upload.total) throw new HttpError(400, 'INVALID_REQUEST');
        const state = await uploads.findOne({ _id: upload.packageId }, { session });
        if (state && (state.total !== upload.total || state.catalogueChecksum !== value.catalogueChecksum || state.sourceRun !== value.sourceRun)) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
        const receipt = await db.collection<Document & { _id: string }>('image_review_upload_chunks').findOne({ _id: reviewDigest([upload.packageId, upload.offset]) }, { session });
        if (receipt) { if (receipt.digest !== reviewDigest(value)) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT'); created = Number(receipt.created); replayed = Number(receipt.replayed); return; }
        if ((state?.processed ?? 0) !== upload.offset) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
        if (!state) await uploads.insertOne({ _id: upload.packageId, total: upload.total, processed: 0, catalogueChecksum: value.catalogueChecksum, sourceRun: value.sourceRun, actor, createdAt: new Date() }, { session });
      }
      for (const barrier of value.withdrawals) {
        await withdrawals(db).updateOne({ _id: reviewDigest([barrier.assetId, barrier.productId]) }, { $setOnInsert: { ...barrier, sourceRun: value.sourceRun, actor, createdAt: new Date() } }, { upsert: true, session });
        // Touch the same review documents an importer writes, so a concurrent
        // withdrawal cannot pass unnoticed under snapshot isolation.
        await items(db).updateMany({ 'source.assetId': barrier.assetId, selectedProductId: barrier.productId, status: { $in: ['pending', 'approved'] } },
          { $set: { status: 'held', approvalId: null, note: `Withdrawn association: ${barrier.reason}`, reviewer: actor, reviewedAt: new Date() }, $inc: { revision: 1 } }, { session });
      }
      for (const source of value.items) {
        const id = reviewDigest([source.assetId, source.sourceSha256, source.extractionReference]), digest = reviewDigest(source);
        const previous = await items(db).findOne({ _id: id }, { session });
        if (previous) { if (previous.sourceDigest !== digest) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT'); replayed++; continue; }
        const selectedProductId = source.candidateProductIds[0] ?? null;
        const barrier = selectedProductId ? await withdrawals(db).findOne({ _id: reviewDigest([source.assetId, selectedProductId]) }, { session }) : null;
        await items(db).insertOne({ _id: id, source, sourceDigest: digest, sourceRun: value.sourceRun, catalogueChecksum: value.catalogueChecksum,
          revision: 0, status: barrier ? 'held' : 'pending', selectedProductId, note: barrier ? `Withdrawn association: ${barrier.reason}` : '', approvalId: null, reviewer: null, reviewedAt: null, createdBy: actor, createdAt: new Date() }, { session });
        created++;
      }
      if (value.upload) {
        await db.collection<Document & { _id: string }>('image_review_upload_chunks').insertOne({ _id: reviewDigest([value.upload.packageId, value.upload.offset]), digest: reviewDigest(value), created, replayed, actor, createdAt: new Date() }, { session });
        await db.collection<Document & { _id: string }>('image_review_uploads').updateOne({ _id: value.upload.packageId, processed: value.upload.offset }, { $set: { processed: value.upload.offset + value.items.length } }, { session });
      }
    });
  } finally { await session.endSession(); }
  return { created, replayed };
}
export async function listImageReviews(db: Db, raw: unknown, actor: string): Promise<ImageReviewList> {
  await authorize(db, actor); const query = parse(imageReviewListQuerySchema, raw);
  const filter = { ...(query.status === 'all' ? {} : { status: query.status }), ...(query.after ? { _id: { $gt: query.after } } : {}) };
  const [page, groups] = await Promise.all([
    items(db).find(filter, queryOptions).sort({ _id: 1 }).limit(query.limit + 1).toArray(),
    items(db).aggregate<{ _id: ImageReviewItem['status']; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }], { maxTimeMS: 3000 }).toArray(),
  ]);
  const counts = { pending: 0, held: 0, approved: 0, rejected: 0, imported: 0 };
  for (const row of groups) if (row._id in counts) counts[row._id] = row.count;
  return { enabled: true, items: page.slice(0, query.limit).map(dto), counts, nextAfter: page.length > query.limit ? page[query.limit - 1]!._id : null };
}
export async function getImageReview(db: Db, itemId: string, actor: string, productId?: string): Promise<ImageReviewDetail> {
  await authorize(db, actor); parse(idSchema, itemId);
  if (productId !== undefined) parse(imageReviewSelectionSchema, { itemId, productId });
  const row = await items(db).findOne({ _id: itemId }, queryOptions); if (!row) throw new HttpError(404, 'NOT_FOUND');
  const selected = productId ?? row.selectedProductId;
  const ids = [...new Set([...row.source.candidateProductIds, ...(selected ? [selected] : [])])];
  const candidates: ImageReviewProduct[] = [];
  const records = await Promise.all(ids.map(async id => {
    try { return await productByBusinessId(db, id); }
    catch (error) { if (!(error instanceof HttpError) || error.status !== 404) throw error; return null; }
  }));
  for (const record of records) if (record) candidates.push(productDto(record, row.source.identity));
  const selectedRecord = records.find(record => record?.product_id === selected);
  const product = selectedRecord ? productDto(selectedRecord, row.source.identity, true) : null;
  const [barrier, history, shared] = await Promise.all([
    product ? withdrawn(db, row, product.productId) : null,
    events(db).find({ itemId: row._id }, { ...queryOptions, projection: { actor: 1, result: 1, createdAt: 1, kind: 1 } }).sort({ createdAt: -1 }).limit(20).toArray(),
    selectedRecord ? sharedIdentifiers(db, selectedRecord) : [],
  ]);
  return { item: dto(row), product, candidates, comparison: product ? compareImageIdentity(row.source.identity, product.identity) : [],
    withdrawalReason: barrier ? String(barrier.reason) : null, sharedIdentifiers: shared,
    history: history.map(event => ({ decision: String(event.kind ?? event.result?.status ?? 'reviewed'), reviewer: String(event.actor), note: String(event.result?.note ?? ''), reviewedAt: (event.createdAt as Date).toISOString() })) };
}
function validateChecks(row: StoredItem, product: Document, value: ImageReviewDecisionInput) {
  if (!value.originalViewed || row.source.flags.length) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
  const base = row.source.identity, catalogue = imageReviewProductIdentity(product, base);
  const comparison = compareImageIdentity(base, catalogue);
  if (new Set(value.checks.map(c => c.field)).size !== value.checks.length) throw new HttpError(400, 'INVALID_REQUEST');
  for (const field of comparison.filter(c => c.required || value.checks.some(check => check.field === c.field && (check.imageValue || check.catalogueValue)))) {
    const check = value.checks.find(c => c.field === field.field);
    if (!check?.confirmed) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
    // OCR corrections retain the original extraction and require a human receipt.
    // A known catalogue value cannot be rewritten inside an image approval.
    const correctedOcr = check.imageValue !== field.imageValue;
    if ((field.catalogueValue && check.catalogueValue !== field.catalogueValue) || (correctedOcr && check.evidence.length < 10)) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
    const resolved = compareImageIdentity(imageIdentitySchema.parse({ ...base, [field.field]: check.imageValue }), imageIdentitySchema.parse({ ...catalogue, [field.field]: check.catalogueValue })).find(c => c.field === field.field)!;
    if (field.status !== 'match' && check.evidence.length < 10) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
    if (resolved.status !== 'match' && !(field.field === 'name' && resolved.status === 'unknown' && check.imageValue && check.catalogueValue && check.evidence.length >= 10)) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
  }
}
export async function decideImageReview(db: Db, raw: unknown, actor: string) {
  await authorize(db, actor); const value = parse(imageReviewDecisionSchema, raw), digest = reviewDigest(value);
  if (value.productChanges && value.decision !== 'approved') throw new HttpError(400, 'INVALID_REQUEST');
  const session = db.client.startSession(); let result: ImageReviewItem | undefined;
  try {
    await session.withTransaction(async () => {
      if (value.productChanges && Object.keys(value.productChanges).length) await authorize(db, actor, true, session);
      const replay = await events(db).findOne({ _id: value.requestId }, { session });
      if (replay) { if (replay.digest !== digest || replay.actor !== actor) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT'); result = replay.result as ImageReviewItem; return; }
      const row = await items(db).findOne({ _id: value.itemId }, { session });
      if (!row || row.revision !== value.expectedRevision || row.status === 'imported') throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      let product: Document | null = null;
      let priorProduct: ImageReviewProduct | null = null;
      if (value.decision === 'approved') {
        if (!value.productId) throw new HttpError(400, 'INVALID_REQUEST');
        product = await productByBusinessId(db, value.productId, session);
        if (imageReviewProductRevision(product) !== value.productRevision || await withdrawn(db, row, value.productId, session)) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
        if (value.productChanges && Object.keys(value.productChanges).length) {
          for (const [field, key] of Object.entries(imageReviewEditableFields)) {
            if (value.productChanges[key] === undefined) continue;
            const check = value.checks.find(candidate => candidate.field === field);
            if (!check?.confirmed || !check.imageValue || check.evidence.length < 10) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
          }
          const current = await db.collection('products').findOne({ _id: product._id }, { session });
          if (!current) throw new HttpError(404, 'NOT_FOUND');
          priorProduct = productDto(current, row.source.identity, true);
          const nextProduct = { ...current, ...value.productChanges };
          if (current.catalogManaged === true && current.published !== false && !current.disabled && storePublicationIssues(nextProduct).length) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
          await validateFamilyMembership(db, nextProduct, session);
          await db.collection('products').updateOne({ _id: product._id }, { $set: value.productChanges }, { session });
          product = nextProduct;
        }
        validateChecks(row, product, value);
        if ((await sharedIdentifiers(db, product, session)).length && (!value.sharedIdentifierConfirmed || value.note.length < 10)) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
      }
      const productRevision = product ? imageReviewProductRevision(product) : value.productRevision;
      const now = new Date(), approvalId = value.decision === 'approved' ? reviewDigest([row._id, value.requestId, row.sourceDigest, productRevision]) : null;
      const next: StoredItem = { ...row, status: value.decision, selectedProductId: value.productId, revision: row.revision + 1,
        note: value.note, reviewer: actor, reviewedAt: now, approvalId };
      const saved = await items(db).updateOne({ _id: row._id, revision: row.revision }, { $set: { status: next.status, selectedProductId: next.selectedProductId,
        revision: next.revision, note: next.note, reviewer: actor, reviewedAt: now, approvalId, productRevision } }, { session });
      if (saved.modifiedCount !== 1) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      result = dto(next);
      await events(db).insertOne({ _id: value.requestId, digest, actor, input: value, itemId: row._id, sourceDigest: row.sourceDigest,
        approvalId, before: dto(row), result, priorProduct, product: product ? productDto(product, row.source.identity) : null, createdAt: now }, { session });
    });
  } finally { await session.endSession(); }
  return result!;
}
export async function createImageReviewDraft(db: Db, raw: unknown, actor: string) {
  await authorize(db, actor, true);
  const value = parse(imageReviewDraftSchema, raw), digest = reviewDigest(value);
  const input = catalogCreationInput({ ...value.product, barcode: value.product.barcode ?? '' });
  const session = db.client.startSession();
  try {
    return await session.withTransaction(async () => {
      await authorize(db, actor, true, session);
      const replay = await events(db).findOne({ _id: value.requestId }, { session });
      if (replay) {
        if (replay.digest !== digest || replay.actor !== actor || replay.kind !== 'draft created') throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
        return replay.result as ImageReviewItem;
      }
      const row = await items(db).findOne({ _id: value.itemId }, { session });
      if (!row || row.revision !== value.expectedRevision || !['pending', 'held'].includes(row.status) || row.draftProductId) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      if (row.source.flags.length) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
      await serializeCatalog(db, session, false);
      const [id] = await allocateCatalogIds(db, 1, 0, session);
      const product = await insertCatalogProduct(db, input, id!, actor, session, undefined, true);
      const now = new Date();
      const next = { ...row, revision: row.revision + 1, selectedProductId: product.product_id, draftProductId: product.product_id,
        reviewer: actor, reviewedAt: now, note: 'Draft product created from this image. Image approval is pending.' };
      const saved = await items(db).updateOne({ _id: row._id, revision: row.revision }, { $set: {
        revision: next.revision, selectedProductId: next.selectedProductId, draftProductId: next.selectedProductId,
        reviewer: actor, reviewedAt: now, note: next.note,
      } }, { session });
      if (saved.matchedCount !== 1) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      const result = dto(next);
      await events(db).insertOne({ _id: value.requestId, itemId: row._id, kind: 'draft created', actor, digest,
        before: dto(row), result, product: productDto(product, row.source.identity, true), createdAt: now }, { session });
      return result;
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
  } finally { await session.endSession(); }
}
async function approvedMapping(db: Db, row: StoredItem, session?: ClientSession): Promise<ImageReviewApprovedMapping> {
  if (row.status !== 'approved' || !row.approvalId || !row.selectedProductId) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
  const event = await events(db).findOne({ approvalId: row.approvalId }, sessionOptions(session));
  const product = await productByBusinessId(db, row.selectedProductId, session);
  if (!event || !event.product || event.product.revision !== imageReviewProductRevision(product) || await withdrawn(db, row, row.selectedProductId, session)) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
  const input = parse(imageReviewDecisionSchema, event.input);
  validateChecks(row, product, input);
  if ((await sharedIdentifiers(db, product, session)).length && !input.sharedIdentifierConfirmed) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
  return { approvalId: row.approvalId, itemId: row._id, productId: row.selectedProductId, id: String(product._id), name: String(product.name),
    imageUrl: row.source.imageUrl, publicId: row.source.publicId, sourceSha256: row.source.sourceSha256,
    productRevision: String(event.product.revision), mediaRevision: Number(product.mediaRevision ?? 0), reviewer: row.reviewer!, reviewedAt: row.reviewedAt!.toISOString(), note: row.note };
}
export async function exportImageReviewApprovals(db: Db, raw: unknown, actor: string) {
  await authorize(db, actor); const query = parse(imageReviewExportQuerySchema, raw);
  const page = await items(db).find({ status: 'approved', ...(query.after ? { _id: { $gt: query.after } } : {}) }, queryOptions).sort({ _id: 1 }).limit(query.limit + 1).toArray();
  const mappings: ImageReviewApprovedMapping[] = [], staleItemIds: string[] = [];
  for (const row of page.slice(0, query.limit)) {
    try { mappings.push(await approvedMapping(db, row)); }
    catch (error) { if (!(error instanceof HttpError) || ![404, 409].includes(error.status)) throw error; staleItemIds.push(row._id); }
  }
  return { mappings, staleItemIds, nextAfter: page.length > query.limit ? page[query.limit - 1]!._id : null };
}
export async function previewImageReviewImport(db: Db, raw: unknown, actor: string): Promise<ImageReviewManifest> {
  await authorize(db, actor, true);
  const { approvalIds } = parse(imageReviewImportSchema.omit({ manifestId: true }), raw);
  if (new Set(approvalIds).size !== approvalIds.length) throw new HttpError(400, 'INVALID_REQUEST');
  const mappings: ImageReviewApprovedMapping[] = [];
  for (const approvalId of approvalIds) {
    const row = await items(db).findOne({ approvalId, status: 'approved' }, queryOptions);
    if (!row) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
    mappings.push(await approvedMapping(db, row));
  }
  mappings.sort((a, b) => a.approvalId.localeCompare(b.approvalId));
  const manifest: ImageReviewManifest = { schemaVersion: 'image-review-approved-v1', manifestId: reviewDigest(mappings), mappings };
  await manifests(db).updateOne({ _id: manifest.manifestId }, { $setOnInsert: { manifest, actor, createdAt: new Date() } }, { upsert: true });
  return manifest;
}
async function verifyOriginal(source: ImageReviewSource, cloudName: string | undefined, transport: typeof fetch) {
  const response = await transport(sourceUrl(source, cloudName), { redirect: 'error', signal: AbortSignal.timeout(8000), headers: { accept: 'image/*' } });
  if (!response.ok || !response.body) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const reader = response.body.getReader(), hash = createHash('sha256'); let size = 0;
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength;
      if (size > 8 * 1024 * 1024) throw new HttpError(413, 'PAYLOAD_TOO_LARGE'); hash.update(chunk.value); }
  } finally { await reader.cancel().catch(() => undefined); }
  if (!size || hash.digest('hex') !== source.sourceSha256) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
}
export async function importImageReviewApprovals(db: Db, raw: unknown, actor: string, cloudName?: string, transport: typeof fetch = fetch) {
  await authorize(db, actor, true); const value = parse(imageReviewImportSchema, raw);
  const stored = await manifests(db).findOne({ _id: value.manifestId }, queryOptions);
  const manifest = stored?.manifest as ImageReviewManifest | undefined;
  if (!manifest || new Set(value.approvalIds).size !== value.approvalIds.length || reviewDigest([...value.approvalIds].sort()) !== reviewDigest(manifest.mappings.map(m => m.approvalId).sort())) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  const receipts = db.collection<Document & { _id: string }>('image_review_imports');
  const existing = await receipts.findOne({ _id: manifest.manifestId }, queryOptions);
  if (existing) return { imported: existing.imported as number, replayed: true, manifestId: manifest.manifestId };
  try {
    // Check immutable original bytes before the transaction, never upload or rename.
    await Promise.all(manifest.mappings.map(async mapping => {
      const row = await items(db).findOne({ _id: mapping.itemId }, queryOptions);
      if (!row || row.approvalId !== mapping.approvalId || row.status !== 'approved') throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
      await verifyOriginal(row.source, cloudName, transport);
    }));
    const session = db.client.startSession(); let replayed = false;
    try {
      await session.withTransaction(async () => {
        const receipt = await receipts.findOne({ _id: manifest.manifestId }, { session });
        if (receipt) { replayed = true; return; }
        await authorize(db, actor, true, session);
        const groups = new Map<string, ImageReviewApprovedMapping[]>();
        for (const mapping of manifest.mappings) groups.set(mapping.productId, [...(groups.get(mapping.productId) ?? []), mapping]);
        for (const [productId, group] of groups) {
          const product = await productByBusinessId(db, productId, session);
          for (const mapping of group) {
            const row = await items(db).findOne({ _id: mapping.itemId, approvalId: mapping.approvalId, status: 'approved' }, { session });
            if (!row || (await approvedMapping(db, row, session)).productRevision !== mapping.productRevision || imageReviewProductRevision(product) !== mapping.productRevision) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
          }
          if (product.cloudinaryImages !== undefined && (!Array.isArray(product.cloudinaryImages) || product.cloudinaryImages.some((v: unknown) => typeof v !== 'string'))) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
          const urls = [...new Set([...(product.cloudinaryImages ?? []) as string[], ...group.map(m => m.imageUrl)])];
          if (urls.length > 8 || !Number.isSafeInteger(Number(product.mediaRevision ?? 0))) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
          const next = { ...product, cloudinaryImages: urls, mediaRevision: Number(product.mediaRevision ?? 0) + 1 };
          if (urls.length !== (product.cloudinaryImages?.length ?? 0)) {
            await recordMediaHistory(db, 'products', product, next, actor, `Pharmacist image review ${manifest.manifestId}`, session);
            const saved = await db.collection('products').updateOne({ _id: product._id, ...(product.mediaRevision === undefined ? { mediaRevision: { $exists: false } } : { mediaRevision: product.mediaRevision }) }, { $set: { cloudinaryImages: urls, mediaRevision: next.mediaRevision } }, { session });
            if (saved.modifiedCount !== 1) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
          }
        }
        for (const mapping of manifest.mappings) {
          const changed = await items(db).updateOne({ _id: mapping.itemId, status: 'approved', approvalId: mapping.approvalId }, { $set: { status: 'imported', importedAt: new Date(), importManifestId: manifest.manifestId }, $inc: { revision: 1 } }, { session });
          if (changed.modifiedCount !== 1) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
        }
        await receipts.insertOne({ _id: manifest.manifestId, actor, imported: manifest.mappings.length, manifest, createdAt: new Date() }, { session });
      }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    } finally { await session.endSession(); }
    return { imported: manifest.mappings.length, replayed, manifestId: manifest.manifestId };
  } catch (error) {
    const conflict = error instanceof HttpError && ['CATALOG_REVIEW_REQUIRED', 'IDEMPOTENCY_CONFLICT'].includes(error.code);
    if (!conflict && !(error instanceof MongoServerError && error.code === 11000)) throw error;
    // Another caller can commit after our initial receipt read, including while
    // preflight or transaction validation is running.
    // Only an atomic completion of this exact validated manifest permits replay.
    const completed = await receipts.findOne({ _id: manifest.manifestId }, queryOptions);
    if (!completed) throw error;
    return { imported: completed.imported as number, replayed: true, manifestId: manifest.manifestId };
  }
}

/** One explicit administrator action; the existing preflight/import gates stay intact. */
export async function publishImageReviewApprovals(db: Db, raw: unknown, actor: string, cloudName?: string, transport: typeof fetch = fetch) {
  await authorize(db, actor, true);
  const parsed = parse(imageReviewPublishSchema, raw);
  const value = { ...parsed, approvalIds: [...parsed.approvalIds].sort() };
  if (new Set(value.approvalIds).size !== value.approvalIds.length) throw new HttpError(400, 'INVALID_REQUEST');
  const digest = reviewDigest(value), requests = db.collection<Document & { _id: string }>('image_review_publish_requests');
  let saved = await requests.findOne({ _id: value.requestId }, queryOptions);
  if (!saved) {
    try {
      const manifest = await previewImageReviewImport(db, { approvalIds: value.approvalIds }, actor);
      await requests.insertOne({ _id: value.requestId, digest, actor, manifestId: manifest.manifestId, approvalIds: value.approvalIds, createdAt: new Date() });
    } catch (error) {
      // A concurrent retry can finish the import while this caller is still in preflight.
      // Adopt its immutable request only after checking the exact actor and payload below.
      saved = await requests.findOne({ _id: value.requestId }, queryOptions);
      if (!saved) throw error;
    }
    saved ??= await requests.findOne({ _id: value.requestId }, queryOptions);
  }
  if (!saved || saved.digest !== digest || saved.actor !== actor) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  return importImageReviewApprovals(db, { manifestId: saved.manifestId, approvalIds: value.approvalIds }, actor, cloudName, transport);
}
