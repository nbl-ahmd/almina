import { createHash, timingSafeEqual } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import { cloudinaryImage } from '@almina/contracts';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
import { recordMediaHistory } from './retention.js';
export type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string };
export function cloudinarySignature(parameters: Record<string, string>, secret: string, algorithm = 'sha256') {
  return createHash(algorithm).update(Object.keys(parameters).sort().map(key => `${key}=${parameters[key]}`).join('&') + secret).digest('hex');
}
function configured(config: CloudinaryConfig) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(config.cloudName) || !/^[0-9]{1,100}$/.test(config.apiKey)
    || !config.apiSecret || config.apiSecret.length > 500) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
}
async function responseJson(response: Response) {
  if (!response.body) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) { const chunk = await reader.read(); if (chunk.done) break;
      total += chunk.value.byteLength; if (total > 65536) throw new HttpError(503, 'SERVICE_UNAVAILABLE'); chunks.push(chunk.value); }
    return JSON.parse(Buffer.concat(chunks).toString()) as unknown;
  } finally { await reader.cancel().catch(() => undefined); }
}
const asset = z.object({ public_id: z.string(), version: z.number().int().positive(), resource_type: z.literal('image'),
  type: z.literal('upload'), format: z.enum(['webp', 'jpg']), width: z.number().int().min(1).max(5000), height: z.number().int().min(1).max(5000),
  bytes: z.number().int().positive().max(5 * 1024 * 1024), secure_url: z.string(), signature: z.string().optional() });
function verifyAsset(raw: unknown, publicId: string, config: CloudinaryConfig, signedResponse: boolean, format: 'webp' | 'jpg' = 'webp') {
  const parsed = asset.safeParse(raw);
  if (!parsed.success || parsed.data.public_id !== publicId || parsed.data.format !== format || parsed.data.width * parsed.data.height > 20000000
    || !cloudinaryImage(parsed.data.secure_url, config.cloudName)) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const result = parsed.data;
  const expectedUrl = `https://res.cloudinary.com/${config.cloudName}/image/upload/v${result.version}/${publicId}.${format}`;
  if (result.secure_url !== expectedUrl) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  if (signedResponse) {
    const signature = result.signature ?? '';
    if (!/^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(signature)) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    const expected = cloudinarySignature({ public_id: publicId, version: String(result.version) }, config.apiSecret, signature.length === 64 ? 'sha256' : 'sha1');
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  }
  return expectedUrl;
}
export async function signedRasterUpload(config: CloudinaryConfig, bytes: Uint8Array, publicId: string,
  signal: AbortSignal, transport: typeof fetch = fetch) {
  configured(config);
  if (!/^almina\/(?:products\/[a-f0-9-]{36}-[0-4]|banners\/[a-f0-9-]{36}-(?:desktop|mobile))$/.test(publicId) || !bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) throw new HttpError(400, 'INVALID_REQUEST');
  const resource = `https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`;
  const lookup = () => transport(resource, { headers: { authorization: 'Basic ' + Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64') }, signal, redirect: 'error' });
  // A prior lost response is reconciled through the provider's authenticated resource API.
  const existing = await lookup();
  if (existing.ok) return verifyAsset(await responseJson(existing), publicId, config, false);
  if (existing.status !== 404) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const parameters = { allowed_formats: 'webp', overwrite: 'false', public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)), type: 'upload' };
  const form = new FormData(); for (const [key, value] of Object.entries(parameters)) form.set(key, value);
  form.set('api_key', config.apiKey); form.set('signature', cloudinarySignature(parameters, config.apiSecret));
  form.set('file', new Blob([new Uint8Array(bytes)], { type: 'image/webp' }), 'product.webp');
  const response = await transport(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, { method: 'POST', body: form, signal, redirect: 'error' });
  if (response.status === 409) { const found = await lookup(); if (found.ok) return verifyAsset(await responseJson(found), publicId, config, false); }
  if (!response.ok) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  return verifyAsset(await responseJson(response), publicId, config, true);
}
const uploadRequest = z.object({ uploadKey: z.uuid(), expectedMediaRevision: z.union([z.string().regex(/^\d{1,9}$/).transform(Number), z.number().int().min(0).max(999999999)]), count: z.number().int().min(1).max(5) }).strict();
/** Browser-direct uploads: the server only decides where a photo may go and signs that, so the image bytes never pass through this process.
 *  Each ticket pins the public id (derived from the upload key), the format and "never overwrite". */
export function directUploadTickets(config: CloudinaryConfig, raw: unknown, nowSeconds = Math.floor(Date.now() / 1000)) {
  configured(config);
  const parsed = uploadRequest.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const { uploadKey, count } = parsed.data;
  return signedTickets(config, Array.from({ length: count }, (_, index) => `almina/products/${uploadKey}-${index}`), 'webp', nowSeconds);
}
/** One ticket per public id, each pinned to that id, the format and "never overwrite". Callers choose the ids; a browser never does. */
export function signedTickets(config: CloudinaryConfig, publicIds: string[], format: 'webp' | 'jpg', nowSeconds = Math.floor(Date.now() / 1000)) {
  configured(config);
  return { cloudName: config.cloudName, apiKey: config.apiKey, uploads: publicIds.map(publicId => {
    const parameters = { allowed_formats: format, overwrite: 'false', public_id: publicId, timestamp: String(nowSeconds), type: 'upload' };
    return { publicId, fields: { ...parameters, api_key: config.apiKey, signature: cloudinarySignature(parameters, config.apiSecret) } };
  }) };
}
/** Confirms with Cloudinary's authenticated API that a directly uploaded asset arrived as signed, and returns its address. */
export async function lookupDirectAsset(config: CloudinaryConfig, publicId: string, format: 'webp' | 'jpg', signal: AbortSignal, transport: typeof fetch = fetch) {
  configured(config);
  const found = await transport(`https://api.cloudinary.com/v1_1/${config.cloudName}/resources/image/upload/${encodeURIComponent(publicId)}`,
    { headers: { authorization: 'Basic ' + Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64') }, signal, redirect: 'error' });
  if (found.status === 404) { await found.body?.cancel().catch(() => undefined); throw new HttpError(400, 'INVALID_REQUEST'); }
  if (!found.ok) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  return verifyAsset(await responseJson(found), publicId, config, false, format);
}
async function claimUpload(db: Db, id: string, actor: string, uploadKey: string, digest: string) {
  const receipts = db.collection<Document & { _id: string }>('media_uploads');
  try { await receipts.insertOne({ _id: uploadKey, digest, actor, entityId: new ObjectId(id), state: 'pending', createdAt: new Date() }); }
  catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error; }
  const receipt = await receipts.findOne({ _id: uploadKey });
  if (!receipt || receipt.digest !== digest) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  return { receipts, receipt };
}
async function attachProductImages(db: Db, id: string, actor: string, uploadKey: string, expectedMediaRevision: number, urls: string[], reason: string) {
  const receipts = db.collection<Document & { _id: string }>('media_uploads');
  const session = db.client.startSession(); let result: Document | undefined;
  try {
    await session.withTransaction(async () => {
      const saved = await receipts.findOne({ _id: uploadKey }, { session });
      if (saved?.state === 'complete') { result = saved.result; return; }
      const previous = await db.collection('products').findOne({ _id: new ObjectId(id) }, { session });
      if (!previous || previous.archivedAt || (previous.mediaRevision ?? 0) !== expectedMediaRevision) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      const next = { ...previous, cloudinaryImages: urls, mediaRevision: expectedMediaRevision + 1 };
      await recordMediaHistory(db, 'products', previous, next, actor, reason, session);
      await db.collection('products').updateOne({ _id: previous._id }, { $set: { cloudinaryImages: urls, mediaRevision: next.mediaRevision } }, { session });
      result = { cloudinaryImages: urls, mediaRevision: next.mediaRevision };
      await receipts.updateOne({ _id: uploadKey }, { $set: { state: 'complete', result, completedAt: new Date() } }, { session });
    });
    return result;
  } finally { await session.endSession(); }
}
/** Second half of a direct upload: confirm with Cloudinary's authenticated API that every photo really arrived (right place, WebP, within
 *  size and pixel limits), then attach them in one transaction, exactly as the proxied upload does. Safe to repeat. */
export async function commitDirectCloudinaryImages(db: Db, id: string, actor: string, raw: unknown, config: CloudinaryConfig, transport: typeof fetch = fetch) {
  configured(config);
  const parsed = uploadRequest.safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(id) || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const { uploadKey, expectedMediaRevision, count } = parsed.data;
  const digest = createHash('sha256').update(JSON.stringify({ id, actor, expectedMediaRevision, cloud: config.cloudName, count, mode: 'direct' })).digest('hex');
  const { receipt } = await claimUpload(db, id, actor, uploadKey, digest);
  if (receipt.state === 'complete') return receipt.result;
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product || product.archivedAt) throw new HttpError(404, 'NOT_FOUND');
  if ((product.mediaRevision ?? 0) !== expectedMediaRevision) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  const signal = AbortSignal.timeout(15000);
  const urls = await Promise.all(Array.from({ length: count }, (_, index) => lookupDirectAsset(config, `almina/products/${uploadKey}-${index}`, 'webp', signal, transport)));
  return attachProductImages(db, id, actor, uploadKey, expectedMediaRevision, urls, 'Reviewed direct Cloudinary replacement');
}
export async function replaceCloudinaryImages(db: Db, id: string, actor: string, raw: unknown,
  files: Uint8Array[], config: CloudinaryConfig, transport: typeof fetch = fetch) {
  configured(config);
  const parsed = z.object({ uploadKey: z.uuid(), expectedMediaRevision: z.string().regex(/^\d{1,9}$/).transform(Number) }).strict().safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(id) || !ObjectId.isValid(actor) || !files.length || files.length > 5) throw new HttpError(400, 'INVALID_REQUEST');
  const { uploadKey, expectedMediaRevision } = parsed.data;
  const digest = createHash('sha256').update(JSON.stringify({ id, actor, expectedMediaRevision, cloud: config.cloudName,
    files: files.map(bytes => createHash('sha256').update(bytes).digest('hex')) })).digest('hex');
  const { receipt } = await claimUpload(db, id, actor, uploadKey, digest);
  if (receipt.state === 'complete') return receipt.result;
  const product = await db.collection('products').findOne({ _id: new ObjectId(id) });
  if (!product || product.archivedAt) throw new HttpError(404, 'NOT_FOUND');
  if ((product.mediaRevision ?? 0) !== expectedMediaRevision) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  const signal = AbortSignal.timeout(15000);
  const urls = await Promise.all(files.map((bytes, index) => signedRasterUpload(config, bytes, `almina/products/${uploadKey}-${index}`, signal, transport)));
  return attachProductImages(db, id, actor, uploadKey, expectedMediaRevision, urls, 'Reviewed signed Cloudinary replacement');
}
