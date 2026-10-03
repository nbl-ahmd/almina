import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient, ObjectId } from 'mongodb';
import { createCatalogRepository } from '../apps/api/src/modules/catalog/repository';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('SEO sitemap pagination against a disposable real database', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = new MongoClient(uri!);
  const db = client.db(`almina_seo_test_${randomUUID().replaceAll('-', '')}`);
  try {
    await client.connect();
    const category = new ObjectId();
    const hiddenCategory = new ObjectId();
    await db.collection('categories').insertMany([{ _id: category, name: 'Synthetic care' }, { _id: hiddenCategory, name: 'Hidden', disabled: true }]);
    const base = { name: 'Synthetic product', category, price: 25, stock: 4 };
    await db.collection('products').insertMany(Array.from({ length: 1002 }, (_, i) => ({ ...base, product_id: `PD${i}` })));
    await db.collection('products').insertMany([
      { ...base, product_id: 'HIDDEN', disabled: true }, { ...base, product_id: 'ORPHAN', category: new ObjectId() },
      { ...base, product_id: 'HIDDENCATEGORY', category: hiddenCategory }, { ...base, product_id: 'BADPRICE', price: -1 },
      { ...base, product_id: 'BADSTOCK', stock: 1.5 }, { ...base, product_id: 'BADSTOCKTYPE', stock: 'corrupt' },
      { ...base, product_id: 'NOSTOCK', stock: undefined }, { ...base, product_id: 'BAD/ID' },
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
    assert.equal((await repo.sitemap({ kind: 'categories' })).items.length, 1);
    await assert.rejects(repo.sitemap({ kind: 'categories', cursor: first.nextCursor! }), { status: 400 });
  } finally {
    await db.dropDatabase(); // Only this UUID-named database on our disposable loopback replica.
    await client.close();
  }
});
