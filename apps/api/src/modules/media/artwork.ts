import { createHash } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import { artworkCommitSchema, artworkSignSchema, type ArtworkKind } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { lookupDirectAsset, signedTickets, type CloudinaryConfig } from './cloudinary.js';
import { categoryMetadataInput, mediaMetadataInput, saveDirectMedia } from './metadata.js';
import { replaceCategory } from './retention.js';

/** Where each kind of artwork may be stored. WhatsApp only accepts JPEG or PNG in a template header, so posters are JPEG. */
function targets(kind: ArtworkKind, uploadKey: string, count: number): { publicIds: string[]; format: 'webp' | 'jpg' } {
  if (kind === 'banner') return { publicIds: ['desktop', 'mobile'].slice(0, count).map(size => `almina/banners/${uploadKey}-${size}`), format: 'webp' };
  if (kind === 'marketing') return { publicIds: [`almina/products/${uploadKey}-0`], format: 'webp' };
  return { publicIds: [`almina/${kind === 'category' ? 'categories' : 'posters'}/${uploadKey}`], format: kind === 'poster' ? 'jpg' : 'webp' };
}
/** Marketing artwork is staff work; banners, categories and posters change the shop and are administrator work. */
function permitted(kind: ArtworkKind, role: string) {
  if (role !== 'admin' && !(kind === 'marketing' && role === 'user')) throw new HttpError(403, 'FORBIDDEN');
}
export function artworkTickets(config: CloudinaryConfig, raw: unknown, role: string) {
  const parsed = artworkSignSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  permitted(parsed.data.kind, role);
  const { publicIds, format } = targets(parsed.data.kind, parsed.data.uploadKey, parsed.data.count);
  return signedTickets(config, publicIds, format);
}
type Receipt = Document & { _id: string; digest: string; state: 'pending' | 'complete'; result?: { image: string } };
/** Second half of a direct artwork upload: verify every file with the provider, then record it once. Repeating a request,
 *  including after a lost response, returns the first result without creating a second record. */
export async function commitArtwork(db: Db, raw: unknown, actor: string, role: string, config: CloudinaryConfig, transport: typeof fetch = fetch) {
  const parsed = artworkCommitSchema.safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const input = parsed.data;
  permitted(input.kind, role);
  // Check the details before touching storage, so a rejected form leaves no half-finished receipt.
  const banner = input.kind === 'banner' ? mediaMetadataInput('banners', { name: input.name, link: input.link, ...(input.locale ? { locale: input.locale } : {}) }) : null;
  const category = input.kind === 'category'
    ? categoryMetadataInput({ ...(input.name === undefined ? {} : { name: input.name }), ...(input.color ? { color: input.color } : {}) }, Boolean(input.categoryId)) : null;
  const receipts = db.collection<Receipt>('media_uploads');
  const digest = createHash('sha256').update(JSON.stringify({ actor, cloud: config.cloudName, input })).digest('hex');
  try { await receipts.insertOne({ _id: input.uploadKey, digest, actor, state: 'pending', createdAt: new Date() }); }
  catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error; }
  const receipt = await receipts.findOne({ _id: input.uploadKey });
  if (!receipt || receipt.digest !== digest) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  if (receipt.state === 'complete' && receipt.result) return receipt.result;
  const { publicIds, format } = targets(input.kind, input.uploadKey, input.kind === 'banner' ? input.count : 1);
  const signal = AbortSignal.timeout(15000);
  const urls = await Promise.all(publicIds.map(publicId => lookupDirectAsset(config, publicId, format, signal, transport)));
  const result = { image: urls[0]! };
  if (input.kind === 'marketing') {
    await db.collection<Document & { _id: string }>('marketing_assets').updateOne({ _id: input.uploadKey },
      { $setOnInsert: { image: result.image, actor, createdAt: new Date() } }, { upsert: true });
  } else {
    // The stored file name stays unique per upload: a record already carrying it means an earlier attempt saved it.
    const collection = input.kind === 'banner' ? 'banners' as const : input.kind === 'category' ? 'categories' as const : 'whatsappposters' as const;
    const image = `${input.kind}-${input.uploadKey}.${format === 'jpg' ? 'jpeg' : 'webp'}`;
    if (!await db.collection(collection).findOne({ image }, { projection: { _id: 1 } })) {
      if (input.kind === 'category' && input.categoryId) await replaceCategory(db, input.categoryId, { ...category, image, cloudinaryImages: urls }, actor);
      else await saveDirectMedia(db, collection, { ...(banner ?? {}), ...(category ? { color: '198, 229, 214', ...category } : {}), image, cloudinaryImages: urls }, actor);
    }
  }
  await receipts.updateOne({ _id: input.uploadKey }, { $set: { state: 'complete', result, completedAt: new Date() } });
  return result;
}
