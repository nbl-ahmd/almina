import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient } from 'mongodb';
import { staffOrderEmailOutbox, staffOrderMessage, staffOrderRecipient } from '../apps/api/src/modules/notifications/staff-email';

test('the recipient defaults to the shop inbox, can be changed, and can be turned off', () => {
  assert.equal(staffOrderRecipient({}), 'info@alminapharmacy.com');
  assert.equal(staffOrderRecipient({ ORDER_ALERT_EMAIL: 'Orders@Example.com' }), 'orders@example.com');
  assert.equal(staffOrderRecipient({ ORDER_ALERT_EMAIL: 'off' }), undefined);
  assert.equal(staffOrderRecipient({ ORDER_ALERT_EMAIL: 'not an address' }), undefined);
});

test('the staff message summarises the order, escapes content and leaves out customer contact details', () => {
  const message = staffOrderMessage({ orderId: 'OD1001', totals: { totalMinor: 12550 }, payment: undefined,
    customer: { name: 'Private Person', phone: '0500000000', email: 'private@example.com', city: 'Dubai <b>' },
    lines: [{ name: 'Panadol <script>', quantity: 2 }, { name: 'Vitamin C', quantity: 1 }] }, 'info@alminapharmacy.com', 'https://admin.example.com');
  assert.match(message.subject, /^New order OD1001 · AED 125\.50 · Dubai/);
  assert.match(message.text, /2 x Panadol/);
  assert.ok(message.html.includes('&lt;script&gt;') && !message.html.includes('<script>'));
  const everything = JSON.stringify(message);
  for (const secret of ['Private Person', '0500000000', 'private@example.com']) assert.ok(!everything.includes(secret));
  assert.ok(message.text.includes('https://admin.example.com/admin/orders?status=pending'));
  assert.throws(() => staffOrderMessage({ orderId: 'bad id', totals: {}, lines: [] }, 'info@alminapharmacy.com'));
});

const uri = process.env.COMMERCE_TEST_URI;
test('each new order is e-mailed once, history is not announced, and a failed send is retried', { skip: !uri }, async () => {
  const previous = process.env.EMAIL_PROVIDER; delete process.env.EMAIL_PROVIDER;
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_staff_email_${randomUUID().replaceAll('-', '')}`);
  const sent: string[] = []; let failures = 0, failNext = false;
  try {
    const old = await db.collection('orders').insertOne({ orderId: 'OD1', totals: { totalMinor: 100 }, lines: [] });
    await db.collection('order_outbox').insertOne({ orderId: old.insertedId, state: 'sent', createdAt: new Date(Date.now() - 60000) });
    const worker = await staffOrderEmailOutbox(async () => db, { onFailure: () => { failures++; }, intervalMs: 20,
      delivery: { smtp: async (message) => { if (failNext) { failNext = false; throw new Error('provider down'); } sent.push(message.subject); } },
      smtpFactory: () => { throw new Error('unused'); } });
    await new Promise(resolve => setTimeout(resolve, 200));
    assert.deepEqual(sent, []);
    const fresh = await db.collection('orders').insertOne({ orderId: 'OD2', totals: { totalMinor: 2500 }, customer: { city: 'Ajman' }, lines: [{ name: 'Item', quantity: 1 }] });
    failNext = true;
    await db.collection('order_outbox').insertOne({ orderId: fresh.insertedId, state: 'pending', createdAt: new Date() });
    await worker.tick(); assert.equal(failures, 1); assert.equal(sent.length, 0);
    await db.collection('order_outbox').updateOne({ orderId: fresh.insertedId }, { $unset: { staffEmailNextAttemptAt: '' } });
    await worker.tick(); await worker.tick(); await worker.tick();
    assert.equal(sent.length, 1); assert.match(sent[0]!, /OD2/);
    assert.equal((await db.collection('order_outbox').findOne({ orderId: fresh.insertedId }))?.staffEmailState, 'sent');
    await worker.stop();
  } finally { if (previous !== undefined) process.env.EMAIL_PROVIDER = previous; await db.dropDatabase(); await client.close(); }
});
