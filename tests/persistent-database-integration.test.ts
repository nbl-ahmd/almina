import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { createPersistentDatabase } from '../apps/api/src/modules/operations/persistent-database';
import { retainedRuntimeConfiguration } from '../apps/api/src/modules/operations/runtime';
import { retainedReadiness } from '../apps/api/src/modules/operations/lifecycle';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('native persistent pool preserves URI database, historical documents/indexes, transaction readiness and fail-closed shutdown', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const inspector = await new MongoClient(uri!).connect(), name = 'almina_pool_test_' + randomUUID().replaceAll('-', ''), db = inspector.db(name);
  const config = retainedRuntimeConfiguration({ APP_ENV: 'development', NODE_ENV: 'development', AUTH_ALLOWED_ORIGINS: 'http://localhost:3000', MONGODB_URI: uri!.replace('/?', `/${name}?`) });
  const pool = createPersistentDatabase(config);
  try {
    await db.collection('products').insertOne({ product_id: 'OLD_01', price: 12.34, stock: 3, retainedUnknownField: 'synthetic' });
    await db.collection('products').createIndex({ product_id: 1 }, { name: 'retained_product_id', unique: true });
    const before = await db.collection('products').find().toArray(), indexes = await db.collection('products').indexes();
    const collections = (await db.listCollections().toArray()).map(value => value.name).sort();
    assert.equal(await retainedReadiness(pool.getDb, false), false);
    const [first, second] = await Promise.all([pool.connect(), pool.connect()]);
    assert.equal(first, second); assert.equal(first.databaseName, name); assert.equal(pool.getDb(), first);
    assert.equal(await retainedReadiness(pool.getDb, false), true);
    assert.deepEqual(await first.collection('products').find().toArray(), before);
    assert.deepEqual(await first.collection('products').indexes(), indexes);
    assert.deepEqual((await db.listCollections().toArray()).map(value => value.name).sort(), collections);
    await pool.close(); assert.equal(await retainedReadiness(pool.getDb, false), false);
    assert.throws(pool.getDb, { status: 503, message: 'SERVICE_UNAVAILABLE' });
    await assert.rejects(pool.connect(), { status: 503, message: 'SERVICE_UNAVAILABLE' });
  } finally { await pool.close(); await db.dropDatabase(); await inspector.close(); }
});
