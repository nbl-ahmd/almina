import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { orderOutbox } from '../apps/api/src/modules/notifications/outbox';
import { retainedReadiness } from '../apps/api/src/modules/operations/lifecycle';
import { createOperationalMetrics } from '../apps/api/src/modules/operations/metrics';
import { operationsSnapshot } from '../apps/api/src/modules/operations/snapshot';
import { operationsSnapshotSchema } from '@almina/contracts';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('operations snapshot identifies integrity/backlog candidates without returning PII or changing data', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(); const db = client.db('almina_snapshot_test_' + randomUUID().replaceAll('-', ''));
  let clock = Date.now() - 11 * 60000; const metrics = createOperationalMetrics('retained-api', () => clock); clock += 11 * 60000;
  const first = new ObjectId(), second = new ObjectId();
  try {
    await db.collection('products').insertMany([{ stock: -1 }, { stock: 1.5 }, { stock: '2' }, { name: 'synthetic-private-product' }, { stock: 7 }]);
    await db.collection('orders').insertMany([{ _id: first, schemaVersion: 2, orderId: 'SAME', customer: { name: 'synthetic-private-name' } },
      { _id: second, schemaVersion: 2, orderId: 'SAME' }, { orderId: 'LEGACY_SAME' }, { orderId: 'LEGACY_SAME' }]);
    await db.collection('checkout_requests').insertMany([{ orderId: first }, { orderId: new ObjectId() }]);
    await db.collection<{ _id: string; state: string; receivedAt: Date }>('webhook_receipts').insertOne({ _id: 'synthetic-pending', state: 'pending', receivedAt: new Date(Date.now() - 6 * 60000) });
    await db.collection<{ _id: string; state: string; createdAt: Date }>('order_outbox').insertMany([
      { _id: `confirmation:${first}`, state: 'pending', createdAt: new Date(Date.now() - 15 * 60000) }, { _id: 'synthetic-failed', state: 'failed', createdAt: new Date() }]);
    for (let i = 0; i < 100; i++) metrics.record('catalog', i < 3 ? 503 : 200, 1501);
    for (let i = 0; i < 20; i++) metrics.record('checkout', i === 0 ? 503 : 200, 3001);
    metrics.databaseError();
    const snapshot = operationsSnapshotSchema.parse(await operationsSnapshot(db, metrics));
    assert.equal(snapshot.database.invalidStockValues, 4); assert.equal(snapshot.database.maintainedDuplicateOrderNumbers, 1);
    assert.equal(snapshot.database.legacyDuplicateOrderNumbers, 1); assert.equal(snapshot.database.orphanCheckoutReceipts, 1);
    assert.equal(snapshot.database.ordersMissingReceipts, 1); assert.equal(snapshot.database.ordersMissingConfirmationJobs, 1);
    assert.equal(snapshot.database.pendingWebhookEvents, 1); assert.equal(snapshot.database.stockOrderReconciliation, 'operator-required');
    for (const alert of ['COMMERCE_INTEGRITY_REVIEW', 'HTTP_5XX_THRESHOLD', 'CHECKOUT_FAILURE_THRESHOLD', 'CATALOG_LATENCY_THRESHOLD', 'CHECKOUT_LATENCY_THRESHOLD', 'WEBHOOK_BACKLOG', 'OUTBOX_REVIEW', 'DATABASE_ERRORS']) assert.ok(snapshot.alerts.includes(alert as typeof snapshot.alerts[number]));
    assert.ok(!JSON.stringify(snapshot).includes('synthetic-private')); assert.ok(!JSON.stringify(snapshot).includes('SAME'));
    assert.equal(await db.collection('orders').countDocuments(), 4); assert.equal((await db.collection('products').findOne({ stock: -1 }))!.stock, -1);
    assert.throws(() => operationsSnapshotSchema.parse({ ...snapshot, customer: 'untrusted' }));
    const unavailable = new Proxy(db, { get(target, property) {
      if (property === 'collection') return () => { throw new Error('Synthetic database outage'); };
      const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
    await assert.rejects(operationsSnapshot(unavailable, metrics), { code: 'SERVICE_UNAVAILABLE' });
  } finally {
    await db.dropDatabase(); await client.close();
  }
});
test('signed WhatsApp events retry failed transactions, deduplicate concurrent deliveries and preserve opt-outs and legacy receipts', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const { createRequire } = await import('node:module');
  const require = createRequire(new URL('../backend/package.json', import.meta.url));
  const { createLegacyApp } = require('./app.js');
  const { createServer } = await import('node:http');
  const client = await new MongoClient(uri!).connect(); const db = client.db('almina_whatsapp_test_' + randomUUID().replaceAll('-', ''));
  let failed = false, events = 0, failingCollection = 'conversations';
  const faultDb = new Proxy(db, { get(target, property) {
    if (property === 'collection') return (name: string) => {
      const collection = target.collection(name);
      return new Proxy(collection, { get(targetCollection, operation) {
        if (name === failingCollection && operation === 'insertOne' && !failed) return async () => { failed = true; throw new Error('Synthetic persistence outage'); };
        const value = Reflect.get(targetCollection, operation, targetCollection);
        return typeof value === 'function' ? value.bind(targetCollection) : value;
      } });
    };
    const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
  const secret = 'synthetic-webhook-secret';
  const app = createLegacyApp({ origins: ['http://localhost:3000'], development: true, webhookSecret: secret, getWebhookDb: () => faultDb,
    routers: { whatsapp: require('./routes/whatsapp.js') } });
  app.locals.io = { emit: () => { events++; } };
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  async function sendValue(value: unknown) {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ value }] }] });
    return fetch(origin + '/api/whatsapp/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json',
      'X-Hub-Signature-256': 'sha256=' + createHmac('sha256', secret).update(body).digest('hex') }, body });
  }
  async function send(id: string, text = 'Synthetic text', button?: string) {
    return sendValue({ contacts: [{ profile: { name: 'Synthetic contact' } }],
      messages: [{ id, from: '971501234567', ...(button ? { button: { text: button } } : { text: { body: text } }) }] });
  }
  try {
    await db.collection('products').insertOne({ stock: 7 }); await db.collection('orders').insertOne({ orderId: 'SYNTHETIC_RETAINED' });
    assert.equal((await send('event-1')).status, 500);
    assert.equal((await db.collection('webhook_receipts').findOne())!.state, 'pending');
    assert.equal(await db.collection('conversations').countDocuments(), 0);
    for (let i = 0; i < 2; i++) assert.equal((await send('event-1')).status, 200);
    assert.equal((await db.collection('conversations').findOne())!.messages.length, 1); assert.equal(events, 1);
    assert.equal((await send('event-1', 'Changed payload')).status, 409);
    assert.equal((await send('opt-out', '', 'Stop promotions')).status, 200);
    assert.ok((await Promise.all([send('event-2'), send('event-2'), send('event-3')])).every(result => result.status === 200));
    const conversation = (await db.collection('conversations').findOne())!;
    assert.equal(conversation.messages.length, 4); assert.equal(conversation.promotionStatus, 'Stop promotions');
    assert.equal(await db.collection('conversations').countDocuments(), 1); assert.equal(events, 4);
    await db.collection<{ _id: string }>('webhook_receipts').insertOne({ _id: 'legacy-event' });
    assert.equal((await send('legacy-event')).status, 200);
    assert.equal((await db.collection('conversations').findOne())!.messages.length, 4);
    failingCollection = 'whatsappbulkreports'; failed = false;
    const status = { statuses: [{ id: 'synthetic-delivery', status: 'failed', timestamp: '1791072000', recipient_id: '971501234567', errors: [{ title: 'Synthetic delivery outage' }] }] };
    assert.equal((await sendValue(status)).status, 500);
    assert.equal(await db.collection('whatsappbulkreports').countDocuments(), 0);
    assert.ok((await Promise.all([sendValue(status), sendValue(status)])).every(result => result.status === 200));
    assert.equal((await db.collection('whatsappbulkreports').findOne())!.broadcast.length, 1);
    assert.equal(events, 5);
    assert.equal((await db.collection('products').findOne())!.stock, 7); assert.equal(await db.collection('orders').countDocuments(), 1);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await db.dropDatabase(); await client.close(); }
});
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
