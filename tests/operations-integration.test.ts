import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { orderOutbox } from '../apps/api/src/modules/notifications/outbox';
import { retainedReadiness } from '../apps/api/src/modules/operations/lifecycle';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('real notification workers claim once, drain active sends, back off outages and bound exhausted retries', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(); const db = client.db('almina_operations_test_' + randomUUID().replaceAll('-', ''));
  const orderId = new ObjectId(); let deliveries = 0, failures = 0;
  const workers: ReturnType<typeof orderOutbox>[] = [];
  try {
    assert.equal(await retainedReadiness(() => db, false), true);
    await db.collection('orders').insertOne({ _id: orderId, orderId: 'OD99999' });
    await db.collection('order_outbox').insertOne({ orderId, state: 'pending', createdAt: new Date() });
    let release!: () => void, entered!: () => void;
    const sending = new Promise<void>(resolve => { entered = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const send = async () => { deliveries++; entered(); await held; };
    const options = { send, onFailure: () => { failures++; }, intervalMs: 60000 };
    const first = orderOutbox(() => db, options), second = orderOutbox(() => db, options); workers.push(first, second);
    const running = first.tick(); await sending; await second.tick(); assert.equal(deliveries, 1);
    let drained = false; const stop = first.stop().then(() => { drained = true; });
    await Promise.resolve(); assert.equal(drained, false); release(); await running; await stop;
    assert.equal((await db.collection('order_outbox').findOne({ orderId }))!.state, 'sent');
    await first.tick(); await second.tick(); assert.equal(deliveries, 1); await second.stop();
    const failing = orderOutbox(() => db, { send: async () => { throw new Error('Synthetic outage'); }, onFailure: () => { failures++; }, intervalMs: 60000, maxAttempts: 2 }); workers.push(failing);
    await db.collection('order_outbox').updateOne({ orderId }, { $set: { state: 'pending', attempts: 0 } });
    await failing.tick(); const retry = (await db.collection('order_outbox').findOne({ orderId }))!;
    assert.equal(retry.state, 'pending'); assert.equal(retry.attempts, 1); assert.ok(retry.nextAttemptAt > new Date());
    await failing.tick(); assert.equal(failures, 1);
    await db.collection('order_outbox').updateOne({ orderId }, { $set: { nextAttemptAt: new Date(0) } });
    await failing.tick(); assert.equal((await db.collection('order_outbox').findOne({ orderId }))!.state, 'failed');
    await failing.tick(); assert.equal(failures, 2);
    let aborted = false;
    const stalled = orderOutbox(() => db, { send: async (_order, signal) => { signal.addEventListener('abort', () => { aborted = true; }); await new Promise(() => {}); }, onFailure: () => {}, intervalMs: 60000, sendTimeoutMs: 10 }); workers.push(stalled);
    await db.collection('order_outbox').updateOne({ orderId }, { $set: { state: 'pending', attempts: 0, nextAttemptAt: new Date(0) } });
    await stalled.tick(); await stalled.stop(); assert.equal(aborted, true);
    assert.equal(await db.collection('orders').countDocuments(), 1); assert.equal((await db.collection('order_outbox').findOne({ orderId }))!.state, 'pending');
  } finally { for (const worker of workers) await worker.stop(); await db.dropDatabase(); await client.close(); }
});

test('retained health probes fail closed on database outage/drain without requiring admin credentials', { skip: !uri }, async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../backend/package.json', import.meta.url));
  const { createLegacyApp } = require('./app.js');
  const { createServer } = await import('node:http');
  const client = await new MongoClient(uri!).connect(); const db = client.db('almina_ready_test_' + randomUUID().replaceAll('-', ''));
  let outage = false;
  const app = createLegacyApp({ routers: {}, origins: ['http://localhost:3000'], development: true,
    getCommerceDb: () => { if (outage) throw new Error('Synthetic outage'); return db; } });
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(origin + '/health/live')).status, 200);
    assert.equal((await fetch(origin + '/health/ready')).status, 200);
    outage = true; const failed = await fetch(origin + '/health/ready'); assert.equal(failed.status, 503);
    assert.deepEqual(await failed.json(), { status: 'unavailable', commitSha: null });
    outage = false; app.locals.draining = true;
    assert.equal((await fetch(origin + '/health/ready')).status, 503);
    assert.equal((await fetch(origin + '/api/products')).status, 503);
    assert.equal((await fetch(origin + '/health/live')).status, 200);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await client.close(); }
});
