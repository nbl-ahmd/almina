import { createHash, randomUUID } from 'node:crypto';
import { JWT } from 'google-auth-library';
import sharp from 'sharp';
import { z } from 'zod';
import type { Db, Document } from 'mongodb';
import { cloudinaryImage } from '@almina/contracts';
// Pure catalogue modules shared with the existing feed/preparation tooling.
// These imports contain no Next.js, browser, or server-only runtime dependency.
import { readProduct, type Product } from '../../../../web/src/lib/catalog/model.js';
import { feedProduct } from '../../../../web/src/lib/catalog/feed.js';
import { merchantProductInput, type MerchantProductInput } from '../../../../web/src/lib/catalog/merchant-api.js';
import { catalogExportPage } from './export.js';

const scope = 'https://www.googleapis.com/auth/content';
const id = z.string().regex(/^\d{1,20}$/);
const credentialsSchema = z.object({
  type: z.literal('service_account'), project_id: z.string().regex(/^[a-z][a-z0-9-]{4,62}$/),
  client_email: z.string().regex(/^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/),
  private_key: z.string().min(100).max(12000).startsWith('-----BEGIN PRIVATE KEY-----'),
  token_uri: z.literal('https://oauth2.googleapis.com/token'),
});
export type MerchantConfiguration = {
  account: string; dataSource: string; origin: string; cloudName: string;
  credentials: z.infer<typeof credentialsSchema>;
};
export function merchantConfiguration(source: Readonly<Record<string, string | undefined>>): MerchantConfiguration | null {
  if (source.GOOGLE_MERCHANT_SYNC_ENABLED !== 'true') return null;
  try {
    if (source.APP_ENV !== 'production' || source.DATABASE_ENV !== 'production') throw new Error();
    const account = id.parse(source.GOOGLE_MERCHANT_ACCOUNT_ID);
    const dataSourceId = id.parse(source.GOOGLE_MERCHANT_DATA_SOURCE_ID);
    const origin = new URL(source.GROWTH_WEB_ORIGIN ?? source.WEB_ORIGIN ?? '');
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error();
    const cloudName = z.string().regex(/^[A-Za-z0-9_-]+$/).parse(source.CLOUDINARY_CLOUD_NAME);
    const raw = source.GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON;
    if (!raw || raw.length > 20000) throw new Error();
    const credentials = credentialsSchema.parse(JSON.parse(raw));
    if (!credentials.client_email.endsWith(`@${credentials.project_id}.iam.gserviceaccount.com`)) throw new Error();
    return { account, dataSource: `accounts/${account}/dataSources/${dataSourceId}`, origin: origin.origin, cloudName, credentials };
  } catch { throw new Error('Merchant configuration invalid'); }
}

export function merchantImages(product: Product, cloudName: string): string[] {
  // The reviewed Cloudinary publication pipeline owns rights and real raster
  // images. Do not publish unverified legacy CDN files or placeholder URLs.
  return [...new Set((product.cloudinaryImages ?? []).flatMap(value => {
    const image = cloudinaryImage(value, cloudName);
    return image ? [image] : [];
  }))];
}
export function merchantInput(raw: unknown, config: Pick<MerchantConfiguration, 'origin' | 'cloudName'>): MerchantProductInput | null {
  const product = readProduct(raw);
  // UAE launch excludes medicines. General classification alone never bypasses
  // explicit content, rights, identifier, stock and Google approval review.
  if (!product || product.productType !== 'general') return null;
  const row = feedProduct(config.origin, product, merchantImages(product, config.cloudName), 'google');
  return row ? merchantProductInput(row, 'AE') : null;
}

export async function validateMerchantImages(input: MerchantProductInput, cloudName: string, transport: typeof fetch = fetch): Promise<boolean> {
  for (const image of [input.productAttributes.imageLink, ...(input.productAttributes.additionalImageLinks ?? [])]) {
    if (!cloudinaryImage(image, cloudName)) return false;
    const response = await transport(image, { redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Accept: 'image/webp,image/png,image/jpeg' } });
    if (response.status === 404) return false;
    if (!response.ok) throw new Error('Merchant image temporarily unavailable');
    const reader = response.body?.getReader();
    if (!reader) return false;
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for (;;) {
        const next = await reader.read(); if (next.done) break;
        size += next.value.byteLength;
        if (size > 16_000_000) return false;
        chunks.push(next.value);
      }
    } finally { await reader.cancel(); }
    try {
      const metadata = await sharp(Buffer.concat(chunks), { limitInputPixels: 64_000_000 }).metadata();
      // Enforce the announced January 2027 minimum now, without upscaling.
      if (!['jpeg', 'png', 'webp'].includes(metadata.format) || metadata.width < 500 || metadata.height < 500 || (metadata.pages ?? 1) !== 1) return false;
    } catch { return false; }
  }
  return true;
}

export type MerchantProvider = {
  verify: () => Promise<void>;
  owner: (offerId: string) => Promise<string | null>;
  upsert: (input: MerchantProductInput) => Promise<void>;
  remove: (offerId: string) => Promise<void>;
};
export function createMerchantProvider(config: MerchantConfiguration): MerchantProvider {
  const client = new JWT({ email: config.credentials.client_email, key: config.credentials.private_key, scopes: [scope] });
  async function request(path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown, missing = false) {
    try {
      const response = await client.request<unknown>({ url: `https://merchantapi.googleapis.com/${path}`, method,
        ...(body === undefined ? {} : { data: body }), timeout: 20000, retry: false, maxRedirects: 0,
        maxContentLength: 2 * 1024 * 1024 });
      return response.data;
    } catch (error) {
      if (missing && (error as { response?: { status?: number } }).response?.status === 404) return null;
      // SDK errors can contain authorization headers and entire request bodies.
      throw new Error('Merchant API request failed');
    }
  }
  const resource = (offerId: string) => encodeURIComponent(`en~AE~${offerId}`);
  return {
    async verify() {
      const raw = await request(`datasources/v1/${config.dataSource}`, 'GET');
      const parsed = z.object({ name: z.literal(config.dataSource), input: z.literal('API'),
        primaryProductDataSource: z.object({ countries: z.array(z.string()), feedLabel: z.string().optional(), contentLanguage: z.string().optional(), legacyLocal: z.boolean().optional() }) }).safeParse(raw);
      if (!parsed.success) throw new Error('Merchant data source invalid');
      const source = parsed.data.primaryProductDataSource;
      if (source.countries.length !== 1 || source.countries[0] !== 'AE' || source.legacyLocal || source.feedLabel && source.feedLabel !== 'AE' || source.contentLanguage && source.contentLanguage !== 'en') throw new Error('Merchant data source targeting invalid');
    },
    async owner(offerId) {
      const raw = await request(`products/v1/accounts/${config.account}/products/${resource(offerId)}`, 'GET', undefined, true);
      if (raw === null) return null;
      const parsed = z.object({ dataSource: z.string() }).safeParse(raw);
      if (!parsed.success) throw new Error('Merchant product ownership unknown');
      return parsed.data.dataSource;
    },
    async upsert(input) {
      await request(`products/v1/accounts/${config.account}/productInputs:insert?dataSource=${encodeURIComponent(config.dataSource)}`, 'POST', input);
    },
    async remove(offerId) {
      await request(`products/v1/accounts/${config.account}/productInputs/${resource(offerId)}?dataSource=${encodeURIComponent(config.dataSource)}`, 'DELETE', undefined, true);
    },
  };
}

type Managed = { offerId: string; hash?: string; refreshedAt?: Date };
export type MerchantSyncStore = {
  list: () => Promise<Managed[]>;
  pending: (offerId: string) => Promise<void>;
  saved: (offerId: string, hash: string, at: Date) => Promise<void>;
  removed: (offerId: string) => Promise<void>;
  renew: () => Promise<void>;
};
export async function syncMerchantSnapshot(inputs: MerchantProductInput[], dataSource: string, provider: MerchantProvider, store: MerchantSyncStore, now = new Date(), checkImages: (input: MerchantProductInput) => Promise<boolean> = async () => true) {
  if (inputs.length > 20000 || new Set(inputs.map(input => input.offerId)).size !== inputs.length) throw new Error('Merchant snapshot invalid');
  await provider.verify();
  const previous = await store.list(), byId = new Map(previous.map(item => [item.offerId, item]));
  if (previous.length > 20000) throw new Error('Merchant managed product bound exceeded');
  const seen = new Set<string>(); let uploaded = 0, withdrawn = 0;
  for (const input of inputs) {
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex'), prior = byId.get(input.offerId);
    if (prior?.hash === hash && prior.refreshedAt && now.getTime() - prior.refreshedAt.getTime() < 86400000) { seen.add(input.offerId); continue; }
    await store.renew();
    if (!await checkImages(input)) continue;
    seen.add(input.offerId);
    const owner = await provider.owner(input.offerId);
    if (owner !== null && owner !== dataSource) throw new Error('Merchant product belongs to another source');
    // Persist intent first: an uncertain insert is retried with the same stable
    // product ID and remains eligible for later withdrawal, even after a crash.
    await store.pending(input.offerId);
    await provider.upsert(input);
    await store.saved(input.offerId, hash, now);
    uploaded++;
  }
  // Only a fully read, validated and successfully uploaded snapshot can remove
  // previously managed items. Never delete products from another data source.
  for (const prior of previous) if (!seen.has(prior.offerId)) {
    await store.renew();
    await provider.remove(prior.offerId);
    await store.removed(prior.offerId);
    withdrawn++;
  }
  return { eligible: seen.size, uploaded, withdrawn };
}

export async function processMerchantSync(db: Db, config: MerchantConfiguration, provider = createMerchantProvider(config), checkImages = (input: MerchantProductInput) => validateMerchantImages(input, config.cloudName)) {
  const jobs = db.collection<Document & { _id: string }>('merchant_jobs'), owner = randomUUID();
  const jobId = config.dataSource;
  try { await jobs.updateOne({ _id: jobId }, { $setOnInsert: { leaseUntil: new Date(0) } }, { upsert: true, maxTimeMS: 3000 }); }
  catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  const lease = await jobs.findOneAndUpdate({ _id: jobId, leaseUntil: { $lte: new Date() } }, { $set: { owner, leaseUntil: new Date(Date.now() + 300000) } }, { returnDocument: 'after', maxTimeMS: 3000 });
  if (!lease) return null;
  let succeeded = false;
  try {
    await db.collection('merchant_products').createIndex({ dataSource: 1, offerId: 1 }, { unique: true, name: 'merchant_source_offer_unique' });
    const inputs: MerchantProductInput[] = []; let cursor: string | undefined; let scanned = 0;
    do {
      const page = await catalogExportPage(db, { channel: 'google', ...(cursor ? { cursor } : {}) });
      if (!page.storeOpen || !page.policyReady) throw new Error('Merchant catalogue not ready');
      scanned += page.products.length;
      if (scanned > 20000) throw new Error('Merchant catalogue bound exceeded');
      for (const row of page.products) {
        // HTTP catalogue reads stringify ObjectIds; this worker reads the same
        // projection directly from MongoDB and must normalize that boundary.
        const category = row.category && typeof row.category === 'object' ? row.category : {};
        const normalized = { ...row, _id: String(row._id), category: { ...category, _id: String(category._id) } };
        // An unreadable approved projection is a broken snapshot, not proof
        // that an otherwise managed offer should be deleted from Google.
        if (!readProduct(normalized)) throw new Error('Merchant catalogue product invalid');
        const input = merchantInput(normalized, config);
        if (input) inputs.push(input);
      }
      if (page.nextCursor && cursor && page.nextCursor <= cursor) throw new Error('Merchant catalogue cursor invalid');
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    const products = db.collection<Document & { _id: string }>('merchant_products');
    const key = (offerId: string) => `${config.dataSource}/${offerId}`;
    const result = await syncMerchantSnapshot(inputs, config.dataSource, provider, {
      list: async () => (await products.find({ dataSource: config.dataSource }, { maxTimeMS: 3000 }).limit(20001).toArray()).map(row => ({ offerId: String(row.offerId), ...(typeof row.hash === 'string' ? { hash: row.hash } : {}), ...(row.refreshedAt instanceof Date ? { refreshedAt: row.refreshedAt } : {}) })),
      pending: async offerId => { await products.updateOne({ _id: key(offerId) }, { $set: { dataSource: config.dataSource, offerId, state: 'pending' } }, { upsert: true, maxTimeMS: 3000 }); },
      saved: async (offerId, hash, at) => { await products.updateOne({ _id: key(offerId) }, { $set: { hash, refreshedAt: at, state: 'synced' } }, { maxTimeMS: 3000 }); },
      removed: async offerId => { await products.deleteOne({ _id: key(offerId), dataSource: config.dataSource }, { maxTimeMS: 3000 }); },
      renew: async () => { const result = await jobs.updateOne({ _id: jobId, owner, leaseUntil: { $gt: new Date() } }, { $set: { leaseUntil: new Date(Date.now() + 300000) } }, { maxTimeMS: 3000 }); if (result.matchedCount !== 1) throw new Error('Merchant lease lost'); },
    }, new Date(), checkImages);
    await jobs.updateOne({ _id: jobId, owner }, { $set: { ...result, lastSuccessAt: new Date(), state: 'ready' } }, { maxTimeMS: 3000 });
    succeeded = true;
    return result;
  } finally {
    await jobs.updateOne({ _id: jobId, owner }, { $set: { leaseUntil: new Date(Date.now() + (succeeded ? 1800000 : 300000)), ...(succeeded ? {} : { state: 'retry', lastFailureAt: new Date() }) }, $unset: { owner: '' } }, { maxTimeMS: 3000 });
  }
}

export function merchantSyncWorker(getDb: () => Db | Promise<Db>, source: Readonly<Record<string, string | undefined>> = process.env) {
  let config: MerchantConfiguration | null;
  try { config = merchantConfiguration(source); }
  catch { console.error('Merchant configuration invalid; sync disabled'); return undefined; }
  if (!config) return undefined;
  const provider = createMerchantProvider(config); let stopped = false, running: Promise<unknown> | undefined;
  const tick = () => {
    if (stopped || running) return;
    running = Promise.resolve().then(() => getDb()).then(db => processMerchantSync(db, config, provider))
      .then(result => { if (result) console.info(JSON.stringify({ event: 'merchant_sync_completed', ...result })); })
      .catch(() => console.error('Merchant sync failed; will retry')).finally(() => { running = undefined; });
  };
  // A product feed only needs to follow catalogue edits within the hour; checking whether a run is due costs two writes.
  const timer = setInterval(tick, 300000); timer.unref(); tick();
  return { stop: async () => { stopped = true; clearInterval(timer); await running; } };
}
