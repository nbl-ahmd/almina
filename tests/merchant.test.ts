import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { merchantConfiguration, merchantInput, validateMerchantImages, syncMerchantSnapshot, type MerchantProvider, type MerchantSyncStore } from '../apps/api/src/modules/catalog/merchant';

const photo = 'https://res.cloudinary.com/example/image/upload/v1/shampoo.webp';
const product = { _id: 'a'.repeat(24), product_id: 'PD1', name: 'Example shampoo 100 ml', price: 10.5, stock: 3,
  category: { _id: 'b'.repeat(24), name: 'Hair care' }, brand: 'Example', description: 'Reviewed product description',
  saleUnit: 'One bottle', packLabel: '100 ml', productType: 'general', condition: 'new', contentReviewed: true,
  stockVerified: true, imageRights: 'authorized', cloudinaryImages: [photo], googleApproved: true, identifierStatus: 'assigned', gtin: '4006381333931' };
const config = { origin: 'https://shop.example.invalid', cloudName: 'example' };
const source = 'accounts/123/dataSources/456';

function fixture(previous: { offerId: string; hash?: string; refreshedAt?: Date }[] = []) {
  const calls: string[] = [];
  const provider: MerchantProvider = {
    verify: async () => { calls.push('verify'); }, owner: async () => source,
    upsert: async item => { calls.push(`upsert:${item.offerId}`); }, remove: async offerId => { calls.push(`delete:${offerId}`); },
  };
  const store: MerchantSyncStore = {
    list: async () => previous,
    pending: async id => { calls.push(`pending:${id}`); },
    saved: async (id, hash, refreshedAt) => { calls.push(`saved:${id}`); previous.push({ offerId: id, hash, refreshedAt }); },
    removed: async id => { calls.push(`removed:${id}`); }, renew: async () => { calls.push('renew'); },
  };
  return { calls, provider, store };
}

test('Merchant publication requires reviewed real owned photos and general-sale classification', () => {
  const input = merchantInput(product, config)!;
  assert.equal(input.offerId, 'PD1'); assert.equal(input.productAttributes.price.amountMicros, '10500000');
  assert.equal(input.productAttributes.imageLink, photo); assert.match(input.productAttributes.link, /^https:\/\/shop\.example\.invalid\/products\//);
  for (const patch of [
    { productType: 'otc' }, { productType: 'prescription' }, { googleApproved: false }, { contentReviewed: false },
    { stockVerified: false }, { condition: undefined }, { imageRights: 'unreviewed' }, { identifierStatus: 'unknown' },
    { cloudinaryImages: [], image: 'product-placeholder.svg' }, { cloudinaryImages: ['https://res.cloudinary.com/other/image/upload/v1/item.webp'] },
    { cloudinaryImages: ['https://evil.invalid/item.jpg'] }, { disabled: true }, { category: { ...product.category, disabled: true } },
  ]) assert.equal(merchantInput({ ...product, ...patch }, config), null);
  assert.equal(merchantInput({ ...product, stock: 0 }, config)!.productAttributes.availability, 'OUT_OF_STOCK');
});

test('Merchant credentials are disabled by default and fail closed outside production or on unsafe configuration', () => {
  assert.equal(merchantConfiguration({}), null);
  const env = { GOOGLE_MERCHANT_SYNC_ENABLED: 'true', APP_ENV: 'production', DATABASE_ENV: 'production',
    GOOGLE_MERCHANT_ACCOUNT_ID: '123', GOOGLE_MERCHANT_DATA_SOURCE_ID: '456', GROWTH_WEB_ORIGIN: config.origin, CLOUDINARY_CLOUD_NAME: 'example',
    GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: 'service_account', project_id: 'example-project', client_email: 'merchant@example-project.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----' + 'x'.repeat(100), token_uri: 'https://oauth2.googleapis.com/token' }) };
  assert.equal(merchantConfiguration(env)!.dataSource, source);
  for (const patch of [{ APP_ENV: 'development' }, { DATABASE_ENV: 'staging' }, { GROWTH_WEB_ORIGIN: 'https://user:password@example.invalid' }, { GOOGLE_MERCHANT_ACCOUNT_ID: '../other' }, { GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON: '{secret-invalid-json' }]) {
    assert.throws(() => merchantConfiguration({ ...env, ...patch }), /^Error: Merchant configuration invalid$/);
  }
});

test('Merchant sync records intent before upload and retires only previously managed missing offers', async () => {
  const f = fixture([{ offerId: 'PD_OLD' }]);
  const result = await syncMerchantSnapshot([merchantInput(product, config)!], source, f.provider, f.store);
  assert.deepEqual(result, { eligible: 1, uploaded: 1, withdrawn: 1 });
  assert.ok(f.calls.indexOf('pending:PD1') < f.calls.indexOf('upsert:PD1'));
  assert.ok(f.calls.indexOf('upsert:PD1') < f.calls.indexOf('saved:PD1'));
  assert.ok(f.calls.indexOf('saved:PD1') < f.calls.indexOf('delete:PD_OLD'));
});

test('Merchant sync does not take ownership from another source or remove stale offers on upload failure', async () => {
  const input = merchantInput(product, config)!;
  const foreign = fixture([{ offerId: 'OLD' }]); foreign.provider.owner = async () => 'accounts/123/dataSources/789';
  await assert.rejects(syncMerchantSnapshot([input], source, foreign.provider, foreign.store), /another source/);
  assert.ok(!foreign.calls.some(call => /^(upsert|delete):/.test(call)));
  const failed = fixture([{ offerId: 'OLD' }]); failed.provider.upsert = async () => { throw new Error('network'); };
  await assert.rejects(syncMerchantSnapshot([input], source, failed.provider, failed.store));
  assert.ok(failed.calls.includes('pending:PD1')); assert.ok(!failed.calls.some(call => /^(saved|delete):/.test(call)));
});

test('Merchant uncertain inserts retry the same offer identity and unchanged inputs refresh daily', async () => {
  const input = merchantInput(product, config)!, at = new Date('2026-10-28T00:00:00Z'), f = fixture();
  await syncMerchantSnapshot([input], source, f.provider, f.store, at);
  f.calls.length = 0;
  const unchanged = await syncMerchantSnapshot([input], source, f.provider, f.store, new Date(at.getTime() + 60000));
  assert.equal(unchanged.uploaded, 0); assert.ok(!f.calls.some(call => call.startsWith('upsert:')));
  const refresh = fixture(await f.store.list());
  assert.equal((await syncMerchantSnapshot([input], source, refresh.provider, refresh.store, new Date(at.getTime() + 86400001))).uploaded, 1);
  const retry = fixture([{ offerId: 'PD1' }]);
  assert.equal((await syncMerchantSnapshot([input], source, retry.provider, retry.store, at)).uploaded, 1);
  assert.ok(retry.calls.includes('upsert:PD1'));
});

test('Merchant sync rejects duplicate IDs and a lost lease before any provider mutation', async () => {
  const input = merchantInput(product, config)!, f = fixture();
  await assert.rejects(syncMerchantSnapshot([input, input], source, f.provider, f.store), /snapshot invalid/);
  assert.deepEqual(f.calls, []);
  f.store.renew = async () => { throw new Error('lease lost'); };
  await assert.rejects(syncMerchantSnapshot([input], source, f.provider, f.store), /lease lost/);
  assert.ok(!f.calls.some(call => /^(pending|upsert|delete):/.test(call)));
});

test('Merchant image validation requires a readable 500px raster and never fetches outside the configured CDN', async () => {
  const input = merchantInput(product, config)!;
  const raster = async (width: number) => sharp({ create: { width, height: 500, channels: 3, background: '#fff' } }).png().toBuffer();
  const good = await raster(500), small = await raster(499);
  const transport = (bytes: Buffer) => (async () => new Response(new Uint8Array(bytes))) as typeof fetch;
  assert.equal(await validateMerchantImages(input, 'example', transport(good)), true);
  assert.equal(await validateMerchantImages(input, 'example', transport(small)), false);
  assert.equal(await validateMerchantImages(input, 'example', transport(Buffer.from('<html>placeholder</html>'))), false);
  let called = false;
  assert.equal(await validateMerchantImages(input, 'other', (async () => { called = true; return new Response(); }) as typeof fetch), false);
  assert.equal(called, false);
  await assert.rejects(validateMerchantImages(input, 'example', (async () => new Response(null, { status: 503 })) as typeof fetch), /temporarily unavailable/);
});

test('Invalid photo withdraws a managed offer; temporary photo failure prevents withdrawals', async () => {
  const input = merchantInput(product, config)!, f = fixture([{ offerId: 'PD1' }]);
  assert.deepEqual(await syncMerchantSnapshot([input], source, f.provider, f.store, new Date(), async () => false), { eligible: 0, uploaded: 0, withdrawn: 1 });
  assert.ok(f.calls.includes('delete:PD1')); assert.ok(!f.calls.includes('upsert:PD1'));
  const outage = fixture([{ offerId: 'PD1' }, { offerId: 'OLD' }]);
  await assert.rejects(syncMerchantSnapshot([input], source, outage.provider, outage.store, new Date(), async () => { throw new Error('outage'); }));
  assert.ok(!outage.calls.some(call => call.startsWith('delete:')));
});
