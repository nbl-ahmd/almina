import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { MongoClient, ObjectId } from 'mongodb';
import { seedDemoDatabase, demoDatabaseName, demoProducts } from '../scripts/tooling/demo-data';
import { createCommerceService } from '../apps/api/src/modules/orders/commerce';

test('demo seeding refuses unrelated data and reruns preserve committed checkout, receipts and changed stock', { skip: !process.env.COMMERCE_TEST_URI }, async () => {
  const replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', ...(process.env.TEST_MONGOD_PATH ? { systemBinary: process.env.TEST_MONGOD_PATH } : {}) },
    replSet: { count: 1, name: 'almina_demo', ip: '127.0.0.1', storageEngine: 'wiredTiger' } });
  const client = await new MongoClient(replica.getUri()).connect();
  try {
    await assert.rejects(seedDemoDatabase(client.db('unrelated')), /database name/);
    const db = client.db(demoDatabaseName);
    await db.collection('unrelated').insertOne({ protected: true });
    await assert.rejects(seedDemoDatabase(db), /Empty unmarked/);
    assert.equal(await db.collection('products').countDocuments(), 0);
    // This database is a new temporary loopback process owned by this test.
    await db.dropDatabase();
    assert.deepEqual(await seedDemoDatabase(db), { created: true });
    const commerce = createCommerceService(async () => db);
    const input = { customer: { name: 'Demo Tester', mobile: '971500000000', email: 'tester@example.invalid', emirate: 'Dubai', city: 'Dubai',
      address: 'Synthetic test address', payment: 'cash' }, items: [{ productId: demoProducts[0]!.id, quantity: 2 }], idempotencyKey: randomUUID() };
    const order = await commerce.checkout(input);
    assert.equal(order.totals.totalMinor, 6100);
    assert.deepEqual(await seedDemoDatabase(db), { created: false });
    assert.equal((await db.collection('products').findOne({ _id: new ObjectId(demoProducts[0]!.id) }))?.stock, 10);
    assert.equal(await db.collection('orders').countDocuments(), 1);
    assert.equal(await db.collection('checkout_requests').countDocuments(), 1);
    assert.equal((await commerce.checkout(input)).id, order.id);
  } finally { await client.close(); await replica.stop(); }
});
