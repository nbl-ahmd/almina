import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { migrateCommerce } from '../scripts/migrations/commerce';
import { orderOutbox } from '../apps/api/src/modules/notifications/outbox';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
const require = createRequire(new URL('../backend/package.json', import.meta.url));
test('one persistent Express stack shares both API contracts, authorization, checkout receipts, inventory, outbox, metrics and drain', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), dbName = `almina_persistent_test_${randomUUID().replaceAll('-', '')}`, db = client.db(dbName);
  const { hash } = require('bcryptjs'), { createLegacyApp } = require('./app.js');
  const origins = ['http://localhost:3000', 'http://localhost:3001'];
  const events: { name: string; payload: { _id: string; orderId: string } }[] = [];
  const app = createLegacyApp({ origins, development: true, getCommerceDb: () => db });
  app.locals.io = { emit(name: string, payload: { _id: string; orderId: string }) { events.push({ name, payload }); } };
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const url = `http://127.0.0.1:${address.port}`;
  const headers = { origin: origins[1]!, 'x-csrf-protection': '1', 'content-type': 'application/json' };
  const category = new ObjectId(), id = new ObjectId(); let worker: ReturnType<typeof orderOutbox> | undefined;
  try {
    await db.collection('categories').insertOne({ _id: category, name: 'Synthetic category' });
    await db.collection('products').insertOne({ _id: id, product_id: 'RECOVERED_01', name: 'Synthetic product', barcode: '00001', category, price: 20, stock: 4 });
    await db.collection('stores').insertOne({ status: 'open' });
    await db.collection('users').insertOne({ username: 'synthetic-admin', name: 'Synthetic Admin', role: 'admin', cities: [], password: await hash('synthetic-test-password', 4) });
    await migrateCommerce(db);
    assert.equal((await fetch(url + '/health/ready')).status, 200);
    const status = await fetch(url + '/api/v1/status'); assert.equal(status.status, 200); assert.equal((await status.json()).data.database, 'ready');
    const catalog = await fetch(url + '/api/v1/catalog/products'); assert.equal(catalog.status, 200);
    assert.equal((await catalog.json()).data.items[0].productId, 'RECOVERED_01');
    assert.equal(app.locals.operationsMetrics.snapshot().groups.catalog.count, 1); // Embedded app does not double-count.
    assert.equal((await fetch(url + '/api/v1/catalog/products', { headers: { origin: 'https://untrusted.example.invalid' } })).status, 403);
    const credentials = JSON.stringify({ username: 'synthetic-admin', password: 'synthetic-test-password' });
    const login = await fetch(url + '/api/auth/login', { method: 'POST', headers, body: credentials }); assert.equal(login.status, 200);
    const cookie = login.headers.getSetCookie()[0]!.split(';')[0]!;
    const me = await fetch(url + '/api/v1/auth/me', { headers: { cookie } }); assert.equal(me.status, 200); assert.equal((await me.json()).data.role, 'admin');
    assert.equal((await fetch(url + '/api/v1/admin/orders')).status, 401);
    const intent = { customer: { name: 'Synthetic', mobile: '0501234567', email: 'synthetic@example.invalid', emirate: 'Ras al-Khaimah', city: 'City A', address: 'Synthetic address', payment: 'cash' },
      items: [{ productId: String(id), quantity: 2 }], idempotencyKey: randomUUID() };
    const checkout = (path: string, body = intent) => fetch(url + path, { method: 'POST', headers, body: JSON.stringify(body) });
    const duplicates = await Promise.all([checkout('/api/orders'), checkout('/api/v1/checkout')]);
    assert.deepEqual(duplicates.map(value => value.status).sort(), [200, 201]);
    assert.equal(await db.collection('orders').countDocuments(), 1); assert.equal(await db.collection('checkout_requests').countDocuments(), 1);
    assert.equal((await db.collection('products').findOne({ _id: id }))!.stock, 2); assert.equal(events.length, 1);
    assert.equal(events[0]!.name, 'newOrder'); assert.equal(events[0]!.payload._id, String((await db.collection('orders').findOne())!._id));
    assert.equal(app.locals.operationsMetrics.snapshot().groups.checkout.count, 2);
    const raced = await Promise.all([checkout('/api/orders', { ...intent, idempotencyKey: randomUUID() }), checkout('/api/v1/checkout', { ...intent, idempotencyKey: randomUUID() })]);
    assert.deepEqual(raced.map(value => value.status).sort(), [201, 409]);
    assert.equal((await db.collection('products').findOne({ _id: id }))!.stock, 0); assert.equal(await db.collection('orders').countDocuments(), 2);
    assert.equal(await db.collection('order_outbox').countDocuments({ state: 'pending' }), 2); assert.equal(events.length, 2);
    const delivered: string[] = [];
    worker = orderOutbox(() => db, { intervalMs: 60000, send: async order => { delivered.push(String(order._id)); }, onFailure: () => assert.fail('Synthetic worker failed') });
    await worker.tick(); await worker.tick(); assert.equal(new Set(delivered).size, 2);
    assert.equal(await db.collection('order_outbox').countDocuments({ state: 'sent' }), 2);
    await db.collection('users').updateOne({ username: 'synthetic-admin' }, { $set: { disabled: true } });
    for (const path of ['/api/auth/me', '/api/v1/auth/me']) assert.equal((await fetch(url + path, { headers: { cookie } })).status, 401);
    app.locals.draining = true;
    assert.equal((await fetch(url + '/health/ready')).status, 503); assert.equal((await fetch(url + '/health/live')).status, 200);
    const drained = await fetch(url + '/api/v1/catalog/products'); assert.equal(drained.status, 503); assert.equal((await drained.json()).error.code, 'SERVICE_UNAVAILABLE');
    assert.equal((await fetch(url + '/api/products')).status, 503);
  } finally {
    await worker?.stop(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await db.dropDatabase(); await client.close();
  }
});
