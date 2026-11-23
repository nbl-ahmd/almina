import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient } from 'mongodb';
import { consumeStreamTicket, issueStreamTicket, TICKET_TTL_MS } from '../apps/api/src/modules/orders/stream-tickets';
import { createFrameParser } from '../apps/web/src/lib/admin/order-stream-client';

test('the stream parser reads ids, events and comments across arbitrary chunk boundaries', () => {
  const frames: { event: string; id: string | null }[] = [];
  const parse = createFrameParser(frame => frames.push(frame));
  const text = 'retry: 1000\nid: ab12cd34.3\nevent: orders\ndata: {}\n\n: keep-alive\n\nid: ab12cd34.4\nevent: ready\r\ndata: {}\r\n\r\n';
  for (let i = 0; i < text.length; i += 7) parse(text.slice(i, i + 7));
  assert.deepEqual(frames, [{ event: 'orders', id: 'ab12cd34.3' }, { event: 'ready', id: 'ab12cd34.4' }]);
});

const uri = process.env.COMMERCE_TEST_URI;
test('a stream ticket works once, expires, is stored hashed and rejects malformed values', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_tickets_${randomUUID().replaceAll('-', '')}`);
  try {
    const first = await issueStreamTicket(db, 'user-1');
    assert.match(first.ticket, /^[A-Za-z0-9_-]{43}$/);
    assert.ok(!JSON.stringify(await db.collection('stream_tickets').find().toArray()).includes(first.ticket));
    assert.equal(await consumeStreamTicket(db, first.ticket), 'user-1');
    assert.equal(await consumeStreamTicket(db, first.ticket), undefined);
    const stale = await issueStreamTicket(db, 'user-2', new Date(Date.now() - TICKET_TTL_MS - 1000));
    assert.equal(await consumeStreamTicket(db, stale.ticket), undefined);
    for (const bad of [undefined, '', 'short', 'x'.repeat(43) + '!', { $ne: '' }, 12345]) assert.equal(await consumeStreamTicket(db, bad), undefined);
    const indexes = await db.collection('stream_tickets').indexes();
    assert.ok(indexes.some(index => index.expireAfterSeconds === 0));
  } finally { await db.dropDatabase(); await client.close(); }
});
