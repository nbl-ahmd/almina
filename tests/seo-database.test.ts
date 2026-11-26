import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient, ObjectId } from 'mongodb';
import { createCatalogRepository } from '../apps/api/src/modules/catalog/repository';
import { createServer } from 'node:http';
import { createApp } from '../apps/api/src/app';
import { createLogger } from '@almina/config/logger';
import { previewRecoveryCatalog, commitRecoveryCatalog } from '../apps/api/src/modules/recovery/catalog';
import { toggleCatalogVisibility } from '../apps/api/src/modules/media/metadata';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('reviewed recovered IDs retain exact detail namespaces and remain out of public reads/sitemaps until approved', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_recovered_urls_test_${randomUUID().replaceAll('-', '')}`);
  const actor = String(new ObjectId()), legacyId = new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb');
  const ids = ['RECOVERY--0001', String(legacyId), 'x'.repeat(80)];
  const app = createApp({ database: { mode: 'enabled', checkReadiness: async () => true }, getDb: async () => db,
    logger: createLogger({ service: 'api', environment: 'development', write: () => undefined }), development: true });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}/api/v1/catalog`;
  try {
    await db.collection('stores').insertOne({ status: 'closed' });
    await db.collection<{ _id: string }>('recovery_bootstrap').insertOne({ _id: 'empty-database-v1' });
    const rows = ids.map((product_id, index) => ({ product_id, name: `Synthetic recovered ${index}`, category: 'Synthetic recovery',
      barcode: `00000${index}`, price: '12.50', vat: false, cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/example.webp'] }));
    const preview = await previewRecoveryCatalog(db, { format: 'json', content: JSON.stringify(rows) }, 'synthetic', actor);
    assert.ok('previewId' in preview);
    await commitRecoveryCatalog(db, { previewId: preview.previewId, hash: preview.hash }, 'synthetic', actor);
    for (const id of ids) assert.equal((await fetch(`${origin}/products/by-business-id/${id}`)).status, 404);
    assert.equal((await (await fetch(`${origin}/sitemap?kind=products`)).json()).data.items.length, 0);
    assert.ok((await db.collection('products').find().toArray()).every(value => value.disabled === true && value.stock === 0));
    // Test-only review/publish fixture; never reopen the store or infer physical stock.
    for (const category of await db.collection('categories').find().toArray()) await toggleCatalogVisibility(db, 'categories', String(category._id), actor);
    for (const product of await db.collection('products').find().toArray()) await toggleCatalogVisibility(db, 'products', String(product._id), actor);
    const category = (await db.collection('categories').findOne())!._id;
    await db.collection('products').insertOne({ _id: legacyId, product_id: 'PD1', name: 'Legacy namespace fixture', category, price: 5, stock: 0 });
    for (const id of ids) {
      const response = await fetch(`${origin}/products/by-business-id/${id}`); assert.equal(response.status, 200, id);
      const result = await response.json(); assert.equal(result.data.productId, id); assert.equal(result.data.price, 12.5); assert.equal(result.data.stock, 0);
    }
    assert.equal((await (await fetch(`${origin}/products/${legacyId}`)).json()).data.productId, 'PD1');
    const sitemap = (await (await fetch(`${origin}/sitemap?kind=products`)).json()).data;
    assert.deepEqual(sitemap.items.map((value: { productId: string }) => value.productId).sort(), [...ids, 'PD1'].sort());
    for (const id of ['$where', 'x'.repeat(81), 'has%20space', 'has%2Fslash']) assert.equal((await fetch(`${origin}/products/by-business-id/${id}`)).status, 400);
    assert.equal((await db.collection('stores').findOne())!.status, 'closed');
    assert.equal(await db.collection('orders').countDocuments(), 0);
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await db.dropDatabase(); await client.close();
  }
});
test('SEO sitemap pagination against a disposable real database', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = new MongoClient(uri!);
  const db = client.db(`almina_seo_test_${randomUUID().replaceAll('-', '')}`);
  try {
    await client.connect();
    const category = new ObjectId();
    const hiddenCategory = new ObjectId();
    const emptyCategory = new ObjectId(), hiddenOnlyCategory = new ObjectId();
    await db.collection('categories').insertMany([{ _id: category, name: 'Synthetic care' }, { _id: hiddenCategory, name: 'Hidden', disabled: true },
      { _id: emptyCategory, name: 'Empty shelf' }, { _id: hiddenOnlyCategory, name: 'Only hidden products' }]);
    await db.collection('products').insertMany([{ name: 'Hidden only', product_id: 'HIDDENONLY1', category: hiddenOnlyCategory, price: 5, stock: 2, disabled: true },
      { name: 'Unpublished only', product_id: 'HIDDENONLY2', category: hiddenOnlyCategory, price: 5, stock: 2, published: false }]);
    const base = { name: 'Synthetic product', category, price: 25, stock: 4 };
    await db.collection('products').insertMany(Array.from({ length: 1002 }, (_, i) => ({ ...base, product_id: `PD${i}` })));
    await db.collection('products').insertMany([
      { ...base, product_id: 'HIDDEN', disabled: true }, { ...base, product_id: 'ORPHAN', category: new ObjectId() },
      { ...base, product_id: 'HIDDENCATEGORY', category: hiddenCategory }, { ...base, product_id: 'BADPRICE', price: -1 },
      { ...base, product_id: 'BADSTOCK', stock: 1.5 }, { ...base, product_id: 'BADSTOCKTYPE', stock: 'corrupt' },
      { ...base, product_id: 'NOSTOCK', stock: undefined }, { ...base, product_id: 'BAD/ID' },
      { ...base, product_id: 'UNPUBLISHED', published: false }, { ...base, product_id: 'INACTIVE', active: false },
    ]);
    const repo = createCatalogRepository(async () => db);
    const first = await repo.sitemap({ kind: 'products' });
    assert.equal(first.items.length, 1000);
    assert.ok(first.nextCursor);
    const second = await repo.sitemap({ kind: 'products', cursor: first.nextCursor! });
    assert.equal(second.items.length, 2);
    assert.equal(second.nextCursor, null);
    assert.equal(new Set([...first.items, ...second.items].map(item => item.productId)).size, 1002);
    assert.deepEqual(Object.keys(first.items[0]!).sort(), ['id', 'name', 'productId']);
    // Categories without a publicly visible product (empty, or only hidden products) are soft 404s and stay out.
    assert.deepEqual((await repo.sitemap({ kind: 'categories' })).items.map(item => item.id), [category.toHexString()]);
    await assert.rejects(repo.sitemap({ kind: 'categories', cursor: first.nextCursor! }), { status: 400 });
  } finally {
    await db.dropDatabase(); // Only this UUID-named database on our disposable loopback replica.
    await client.close();
  }
});
