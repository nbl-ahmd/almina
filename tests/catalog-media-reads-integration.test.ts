import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { catalogUploadTarget, retainedBannerList, retainedCatalogAsset } from '../apps/api/src/modules/media/compatibility-reads';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('native catalog media reads preserve paired current/history/archive references and bounded visible banners', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_media_reads_' + randomUUID().replaceAll('-', ''));
  try {
    const id = new ObjectId();
    const product = { _id: id, images: ['one.webp', 'two.webp'], gdriveFileIds: ['synthetic-one', 'synthetic-two'], archivedAt: new Date(), stock: 7 };
    await db.collection('products').insertOne(product);
    await db.collection('media_history').insertOne({ collection: 'products', entityId: id, previousAssets: { image: 'old.jpeg', gdriveFileId: 'synthetic-old' }, createdAt: new Date() });
    assert.equal(await retainedCatalogAsset(db, 'products', 'two.webp', {}), 'synthetic-two');
    assert.equal(await retainedCatalogAsset(db, 'products', 'old.jpeg', {}), 'synthetic-old');
    await assert.rejects(retainedCatalogAsset(db, 'products', 'missing.webp', {}), { status: 404 });
    await assert.rejects(catalogUploadTarget(db, 'products', String(id)), { status: 409 });
    await db.collection('categories').insertOne({ image: 'category.webp', gdriveFileId: 'synthetic-category', archivedAt: new Date() });
    assert.equal(await retainedCatalogAsset(db, 'categories', 'category.webp', {}), 'synthetic-category');
    await db.collection('banners').insertMany([
      ...Array.from({ length: 31 }, (_, i) => ({ image: `banner_${i}.webp`, gdriveFileId: `synthetic-${i}`, name: 'Synthetic', link: '/products', privateProviderData: 'private' })),
      { image: 'archived.webp', gdriveFileId: 'synthetic-archived', archivedAt: new Date() },
    ]);
    assert.equal((await retainedBannerList(db, {})).length, 25); assert.equal((await retainedBannerList(db, { offset: '25' })).length, 6);
    assert.ok(!JSON.stringify(await retainedBannerList(db, {})).includes('private'));
    assert.equal(await retainedCatalogAsset(db, 'banners', 'archived.webp', {}), 'synthetic-archived');
    assert.deepEqual(await db.collection('products').findOne({ _id: id }), product);
    assert.equal(await db.collection('media_history').countDocuments(), 1); assert.equal(await db.collection('banners').countDocuments(), 32);
  } finally { await db.dropDatabase(); await client.close(); }
});
