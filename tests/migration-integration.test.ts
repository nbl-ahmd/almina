import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ObjectId, MongoClient } from 'mongodb';
import { setStoreStatus, storeStatus } from '../apps/api/src/modules/store/service.js';
import { previewRecoveryCatalog, commitRecoveryCatalog } from '../apps/api/src/modules/recovery/catalog.js';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
const require = createRequire(import.meta.url);
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database required');
test('maintained store domain preserves closed/open contract and fails closed on invalid input', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_migration_test_${randomUUID().replaceAll('-', '')}`);
  try {
    await assert.rejects(storeStatus(db), { status: 404 });
    for (const raw of [{ status: 'open' }, { status: true, role: 'admin' }, null]) await assert.rejects(setStoreStatus(db, raw), { status: 400 });
    await setStoreStatus(db, { status: false });
    assert.equal(await storeStatus(db), 'closed');
    await setStoreStatus(db, { status: true });
    assert.equal(await storeStatus(db), 'open');
    assert.equal(await db.collection('stores').countDocuments(), 1);
    await db.collection('stores').updateOne({}, { $set: { status: 'corrupt' } });
    await assert.rejects(storeStatus(db), { status: 503 });
  } finally { await db.dropDatabase(); await client.close(); }
});

test('authenticated recovery preview/commit is actor/hash bound, transactional, no-overwrite and closed-store only', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_migration_test_${randomUUID().replaceAll('-', '')}`);
  const actor = String(new ObjectId());
  const row = { product_id: 'PD_ORIGINAL', name: 'Recovered', category: 'Care', barcode: '000001234567890123', price: '12.50', vat: true,
    cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/care.webp'] };
  const input = { format: 'json', content: JSON.stringify([row]) };
  // CSV optional blanks must not become BSON null and invalidate the approved rows.
  const csvInput = { format: 'csv', content: 'product_id,name,category,barcode,price,salePrice,vat,featured,description,cloudinaryImages\nPD_ORIGINAL,Recovered,Care,000001234567890123,12.50,,true,false,,https://res.cloudinary.com/synthetic/image/upload/v1/care.webp\n' };
  try {
    await db.collection('stores').insertOne({ status: 'closed' });
    await db.collection<{ _id: string }>('recovery_bootstrap').insertOne({ _id: 'empty-database-v1' });
    const preview = await previewRecoveryCatalog(db, csvInput, 'synthetic', actor);
    assert.equal(await db.collection('products').countDocuments(), 0);
    const approval = { previewId: preview.previewId, hash: preview.hash };
    await assert.rejects(commitRecoveryCatalog(db, approval, 'synthetic', String(new ObjectId())), { status: 409 });
    await assert.rejects(commitRecoveryCatalog(db, { ...approval, hash: 'a'.repeat(64) }, 'synthetic', actor), { status: 409 });
    await assert.rejects(commitRecoveryCatalog(db, { ...approval, rows: [row] }, 'synthetic', actor), { status: 400 });
    const results = await Promise.all([commitRecoveryCatalog(db, approval, 'synthetic', actor), commitRecoveryCatalog(db, approval, 'synthetic', actor)]);
    assert.equal(results.reduce((sum, value) => sum + value.created, 0), 1);
    assert.equal(await db.collection('recovery_catalog_batches').countDocuments(), 1);
    const product = (await db.collection('products').findOne())!;
    assert.equal(product.barcode, row.barcode); assert.equal(product.stock, 0); assert.equal(product.disabled, true); assert.equal(product.published, false);
    await db.collection('products').updateOne({ _id: product._id }, { $set: { stock: 4 } });
    assert.equal((await commitRecoveryCatalog(db, approval, 'synthetic', actor)).replayed, true);
    assert.equal((await db.collection('products').findOne())!.stock, 4);
    assert.ok((await previewRecoveryCatalog(db, input, 'synthetic', actor)).errors.length);
    const second = await previewRecoveryCatalog(db, { ...input, content: JSON.stringify([{ ...row, product_id: 'PD_SECOND' }]) }, 'synthetic', actor);
    await db.collection('stores').updateOne({}, { $set: { status: 'open' } });
    await assert.rejects(commitRecoveryCatalog(db, { previewId: second.previewId, hash: second.hash }, 'synthetic', actor), { status: 409 });
    assert.equal(await db.collection('products').countDocuments(), 1);
    await db.collection('stores').updateOne({}, { $set: { status: 'closed' } });
    await db.collection('recovery_catalog_previews').updateOne({}, { $set: { expiresAt: new Date(0) } });
    // API boundary rejects anonymous/staff/CSRF before parser/domain effects; old batch blocked before multer.
    const { createLegacyApp } = require('../backend/app.js');
    let identity: { id: string; role: string; cities: string[] } | null = null;
    const app = createLegacyApp({ origins: ['http://localhost:3000'], development: true, recoveryAllowed: true, recoveryCloudName: 'synthetic',
      getCommerceDb: async () => db, auth: { authenticate: async () => { if (!identity) throw Object.assign(new Error(), { status: 401 }); return identity; } } });
    const server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    try {
      const headers = { origin: 'http://localhost:3000', 'x-csrf-protection': '1', 'content-type': 'application/json' };
      const request = () => fetch(origin + '/api/recovery/preview', { method: 'POST', headers, body: JSON.stringify(input) });
      assert.equal((await request()).status, 401);
      identity = { id: actor, role: 'user', cities: [] }; assert.equal((await request()).status, 403);
      identity.role = 'admin';
      assert.equal((await fetch(origin + '/api/recovery/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 403);
      assert.equal((await fetch(origin + '/api/batch', { method: 'POST', headers, body: '{}' })).status, 409);
      assert.equal((await request()).status, 200);
    } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  } finally { await db.dropDatabase(); await client.close(); }
});
