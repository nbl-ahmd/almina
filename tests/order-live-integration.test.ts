import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient } from 'mongodb';
import { createOrderLiveFeed } from '../apps/api/src/modules/orders/live';

const uri = process.env.COMMERCE_TEST_URI;
test('a real MongoDB change stream signals an inserted order once and stays quiet when idle', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_live_${randomUUID().replaceAll('-', '')}`);
  const feed = createOrderLiveFeed({ getDb: async () => db, coalesceMs: 50, idleGraceMs: 50 });
  try {
    await db.createCollection('orders');
    const seen: string[] = [];
    const leave = feed.subscribe(revision => seen.push(revision), 'staff')!;
    await new Promise(resolve => setTimeout(resolve, 1200));
    assert.equal(seen.length, 0);
    await db.collection('orders').insertOne({ orderId: 'LIVE-1', status: 'pending', customer: { name: 'Private' } });
    for (let waited = 0; waited < 5000 && !seen.length; waited += 100) await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(seen.length, 1);
    assert.ok(!JSON.stringify(seen).includes('Private'));
    // Staff alerts (stock, payment) share the signal.
    const before = seen.length;
    await db.collection('staff_alerts').insertOne({ kind: 'stock', eventId: 'alert-1', resolved: false });
    for (let waited = 0; waited < 5000 && seen.length === before; waited += 100) await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(seen.length, before + 1);
    // Unrelated collections never wake the browsers.
    await db.collection('something_else').insertOne({ value: 1 });
    await new Promise(resolve => setTimeout(resolve, 900));
    assert.equal(seen.length, before + 1);
    leave();
    await new Promise(resolve => setTimeout(resolve, 400));
    assert.equal(feed.active(), false);
  } finally { await feed.shutdown(); await db.dropDatabase(); await client.close(); }
});
