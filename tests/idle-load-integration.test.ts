import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient } from 'mongodb';
import { createLocalWriteSignal, createOutboxWake } from '../apps/api/src/modules/notifications/wake';

const uri = process.env.COMMERCE_TEST_URI;
test('a real order write wakes the workers through the driver events even when change streams are unavailable', { skip: !uri }, async () => {
  const signal = createLocalWriteSignal();
  const client = new MongoClient(uri!, { monitorCommands: true }); signal.attach(client); await client.connect();
  const db = client.db(`almina_idle_${randomUUID().replaceAll('-', '')}`);
  // The same database, but opening a change stream fails the way an unsupported tier does.
  const noStreams = new Proxy(db, { get: (target, key) => key === 'watch' ? () => { throw Object.assign(new Error('unsupported'), { code: 40573 }); } : Reflect.get(target, key).bind?.(target) ?? Reflect.get(target, key) });
  const wake = createOutboxWake(() => noStreams as never, { local: signal, coalesceMs: 20 });
  let woke = 0; wake.subscribe(() => { woke++; });
  try {
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(woke, 0); assert.equal(wake.healthy(), true);
    await db.collection('orders').insertOne({ orderId: 'OD1', status: 'pending' });
    for (let waited = 0; waited < 2000 && !woke; waited += 20) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(woke, 1, 'an order insert wakes the workers');
    await db.collection('order_outbox').insertOne({ orderId: 'OD1', state: 'pending' });
    for (let waited = 0; waited < 2000 && woke < 2; waited += 20) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(woke, 2, 'an outbox job wakes them too');
    await db.collection('products').insertOne({ name: 'unrelated' }); await db.collection('orders').find({}).toArray();
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.equal(woke, 2, 'reads and unrelated writes wake nothing');
    // A transaction wakes them only when it commits.
    const session = client.startSession();
    await session.withTransaction(async () => { await db.collection('orders').insertOne({ orderId: 'OD2' }, { session }); await new Promise(resolve => setTimeout(resolve, 200)); assert.equal(woke, 2, 'not before the commit'); });
    await session.endSession();
    for (let waited = 0; waited < 2000 && woke < 3; waited += 20) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(woke, 3, 'the committed transaction wakes them');
  } finally { await wake.shutdown(); await db.dropDatabase(); await client.close(); }
});
