import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createECDH, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { ObjectId, type MongoClient, type Db, type Document } from 'mongodb';
import { staffPushOutbox } from '../apps/api/src/modules/notifications/push-outbox';
import { PushFailure } from '../apps/api/src/modules/notifications/push';
import { operationsSnapshot } from '../apps/api/src/modules/operations/snapshot';
import { createOperationalMetrics } from '../apps/api/src/modules/operations/metrics';
import { operationsSnapshotSchema } from '@almina/contracts';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
function subscription(suffix = 'synthetic') {
  const curve = createECDH('prime256v1'); curve.generateKeys();
  return { endpoint: 'https://fcm.googleapis.com/' + suffix, keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
}
async function fixture() {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  // Exercise the retained driver's separate BSON constructors, as production native getDb does.
  const require = createRequire(new URL('../backend/package.json', import.meta.url));
  const NativeClient = require('mongodb').MongoClient as typeof MongoClient;
  const client = await new NativeClient(uri!).connect(), db = client.db('almina_push_' + randomUUID().replaceAll('-', ''));
  const workers: Awaited<ReturnType<typeof staffPushOutbox>>[] = [];
  return { db, workers, async close() { for (const worker of workers) await worker.stop(); await db.dropDatabase(); await client.close(); } };
}
async function seed(db: Db, id = 'confirmation:synthetic') {
  const orderId = new ObjectId();
  await db.collection('orders').insertOne({ _id: orderId, customer: { city: 'City A', name: 'synthetic-private' } });
  await db.collection<Document & { _id: string }>('order_outbox').insertOne({ _id: id, orderId, state: 'sent', attempts: 2, createdAt: new Date() });
  return orderId;
}
test('push derives only new committed jobs, scopes current staff, deduplicates competing workers and drains an active send', { skip: !uri }, async () => {
  const f = await fixture(); let calls = 0, release!: () => void, entered!: () => void;
  try {
    await f.db.collection<Document & { _id: string }>('order_outbox').insertOne({ _id: 'historical', createdAt: new Date(0), state: 'sent' });
    const blocked = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { entered = resolve; });
    const send = async () => { calls++; entered(); await blocked; };
    const a = await staffPushOutbox(() => f.db, { send, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(a);
    const b = await staffPushOutbox(() => f.db, { send, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(b);
    const activation = await f.db.collection('notification_controls').findOne(); assert.ok(activation!.enabledAt instanceof Date);
    await seed(f.db);
    await f.db.collection('users').insertMany([
      { role: 'admin', subscription: subscription('admin') }, { role: 'user', cities: ['City A'], subscription: subscription('city') },
      { role: 'user', cities: ['City B'], subscription: subscription('outside') }, { role: 'admin', disabled: true, subscription: subscription('disabled') },
      { role: 'owner', subscription: subscription('unrecognized-role') },
    ]);
    const tick = a.tick(); await started; await b.tick(); assert.equal(calls, 1);
    let drained = false; const stopping = a.stop().then(() => { drained = true; }); await Promise.resolve(); assert.equal(drained, false);
    release(); await tick; await stopping; for (let i = 0; i < 4; i++) await b.tick();
    assert.equal(calls, 2); assert.equal(await f.db.collection('staff_push_deliveries').countDocuments({ state: 'accepted' }), 2);
    const job = await f.db.collection('order_outbox').findOne({ orderId: { $exists: true } });
    assert.equal(job!.pushState, 'done'); assert.equal(job!.state, 'sent'); assert.equal(job!.attempts, 2);
    assert.equal(await f.db.collection('orders').countDocuments(), 1); assert.equal(await f.db.collection('notification_controls').countDocuments(), 1);
    assert.ok(!JSON.stringify(await f.db.collection('staff_push_deliveries').find().toArray()).includes('fcm.googleapis'));
    assert.ok(!(await f.db.collection('order_outbox').findOne({ createdAt: new Date(0) }))!.pushState);
  } finally { await f.close(); }
});
test('known push outage backs off eight bounded attempts, while unknown response is quarantined without resend', { skip: !uri }, async () => {
  const f = await fixture(); let calls = 0, unknown = false;
  try {
    const worker = await staffPushOutbox(() => f.db, { send: async () => { calls++; throw new PushFailure(unknown ? 'uncertain' : 'retryable'); }, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(worker);
    await f.db.collection('users').insertOne({ role: 'admin', subscription: subscription() }); await seed(f.db);
    await worker.tick(); const jobs = f.db.collection<Document & { _id: string }>('order_outbox');
    assert.ok((await jobs.findOne({ _id: 'confirmation:synthetic' }))!.pushNextAttemptAt > new Date());
    await worker.tick(); assert.equal(calls, 1);
    for (let i = 1; i < 8; i++) { await jobs.updateOne({ _id: 'confirmation:synthetic' }, { $set: { pushNextAttemptAt: new Date(0) } }); await worker.tick(); }
    await worker.tick(); await worker.tick(); assert.equal(calls, 8);
    assert.equal((await f.db.collection('staff_push_deliveries').findOne())!.state, 'failed');
    unknown = true; await seed(f.db, 'confirmation:unknown'); await worker.tick(); await worker.tick(); await worker.tick(); assert.equal(calls, 9);
    assert.equal(await f.db.collection('staff_push_deliveries').countDocuments({ state: 'uncertain' }), 1);
    assert.equal(await f.db.collection('orders').countDocuments(), 2);
    const snapshot = operationsSnapshotSchema.parse(await operationsSnapshot(f.db, createOperationalMetrics('retained-api')));
    assert.ok(snapshot.alerts.includes('PUSH_DELIVERY_REVIEW')); assert.equal(snapshot.database.pushJobsNeedingReview, 2);
    assert.ok(!JSON.stringify(snapshot).includes('synthetic-private')); assert.ok(!JSON.stringify(snapshot).includes('fcm.googleapis'));
  } finally { await f.close(); }
});
test('expired push conditionally removes only the exact old subscription, retaining a concurrent replacement', { skip: !uri }, async () => {
  const f = await fixture(); const old = subscription('old'), replacement = subscription('replacement'), userId = new ObjectId(); let replace = true;
  try {
    const worker = await staffPushOutbox(() => f.db, { send: async () => {
      if (replace) await f.db.collection('users').updateOne({ _id: userId }, { $set: { subscription: replacement } });
      throw new PushFailure('expired');
    }, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(worker);
    await f.db.collection('users').insertOne({ _id: userId, role: 'admin', subscription: old }); await seed(f.db);
    await worker.tick(); assert.deepEqual((await f.db.collection('users').findOne({ _id: userId }))!.subscription, replacement); await worker.tick();
    replace = false; await seed(f.db, 'confirmation:second'); await worker.tick();
    assert.equal((await f.db.collection('users').findOne({ _id: userId }))!.subscription, undefined);
  } finally { await f.close(); }
});
test('accepted push persists before cursor failure and resumes without provider replay; stalled sender drains to uncertain', { skip: !uri }, async () => {
  const f = await fixture(); let failCursor = true, calls = 0;
  const faulty = new Proxy(f.db, { get(target, property) {
    if (property === 'collection') return (name: string) => {
      const collection = target.collection(name);
      return new Proxy(collection, { get(c, op) {
        if (name === 'order_outbox' && op === 'updateOne') return async (...args: unknown[]) => {
          const update = args[1] as { $set?: { pushCursor?: unknown } };
          if (failCursor && update.$set?.pushCursor) { failCursor = false; throw new Error('Synthetic cursor persistence outage'); }
          return Reflect.apply(c.updateOne, c, args);
        };
        const value = Reflect.get(c, op, c); return typeof value === 'function' ? value.bind(c) : value;
      } });
    };
    const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
  try {
    const worker = await staffPushOutbox(() => faulty, { send: async () => { calls++; }, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(worker);
    await f.db.collection('users').insertOne({ role: 'admin', subscription: subscription() }); await seed(f.db);
    await worker.tick(); assert.equal((await f.db.collection('staff_push_deliveries').findOne())!.state, 'accepted');
    await f.db.collection('order_outbox').updateMany({}, { $set: { pushNextAttemptAt: new Date(0) } }); await worker.tick(); await worker.tick(); assert.equal(calls, 1);
    let aborted = false;
    const stalled = await staffPushOutbox(() => f.db, { send: async (_sub, signal) => { signal.addEventListener('abort', () => { aborted = true; }); return new Promise(() => {}); }, onFailure: () => {}, intervalMs: 60000, sendTimeoutMs: 15 }); f.workers.push(stalled);
    await seed(f.db, 'confirmation:stall'); await stalled.tick(); await stalled.stop(); assert.equal(aborted, true);
    assert.equal(await f.db.collection('staff_push_deliveries').countDocuments({ state: 'uncertain' }), 1);
    await worker.tick(); await worker.tick(); assert.equal(calls, 1);
  } finally { await f.close(); }
});
