import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient } from 'mongodb';
import { staffOrderEmailOutbox, staffOrderMessage, staffOrderRecipient } from '../apps/api/src/modules/notifications/staff-email';

const env = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;
test('the recipient defaults to the shop inbox, can be changed, and can be turned off', () => {
  assert.equal(staffOrderRecipient(env({})), 'info@alminapharmacy.com');
  assert.equal(staffOrderRecipient(env({ ORDER_ALERT_EMAIL: 'Orders@Example.com' })), 'orders@example.com');
  assert.equal(staffOrderRecipient(env({ ORDER_ALERT_EMAIL: 'off' })), undefined);
  assert.equal(staffOrderRecipient(env({ ORDER_ALERT_EMAIL: 'not an address' })), undefined);
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

test('escalation settings default to 5 and 15 minutes, can be changed or turned off, and reject nonsense', async () => {
  const { escalationMinutes } = await import('../apps/api/src/modules/notifications/staff-email');
  assert.deepEqual(escalationMinutes(env({})), [5, 15]);
  assert.deepEqual(escalationMinutes(env({ ORDER_ALERT_ESCALATION_MINUTES: '3, 10,30' })), [3, 10, 30]);
  assert.deepEqual(escalationMinutes(env({ ORDER_ALERT_ESCALATION_MINUTES: 'off' })), []);
  for (const bad of ['0', '10,5', 'a,b', '1,2,3,4,5,6', '99999']) assert.deepEqual(escalationMinutes(env({ ORDER_ALERT_ESCALATION_MINUTES: bad })), [5, 15]);
});

test('an unconfirmed order is reminded at each stage once, and a confirmed order is not reminded at all', { skip: !uri }, async () => {
  const previous = process.env.EMAIL_PROVIDER; delete process.env.EMAIL_PROVIDER;
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_staff_remind_${randomUUID().replaceAll('-', '')}`);
  const sent: string[] = [];
  try {
    await db.collection('notification_controls').insertOne({ _id: 'staff-order-email-v1' as never, enabledAt: new Date(Date.now() - 3600000) });
    const worker = await staffOrderEmailOutbox(async () => db, { onFailure: () => undefined, intervalMs: 20, escalateAfterMinutes: [1, 3],
      delivery: { smtp: async (message) => { sent.push(message.subject); } }, smtpFactory: () => { throw new Error('unused'); } });
    const waiting = await db.collection('orders').insertOne({ orderId: 'OD7', status: 'pending', totals: { totalMinor: 900 }, lines: [] });
    const handled = await db.collection('orders').insertOne({ orderId: 'OD8', status: 'pending', totals: { totalMinor: 900 }, lines: [] });
    const jobs = db.collection('order_outbox');
    await jobs.insertMany([{ orderId: waiting.insertedId, state: 'pending', createdAt: new Date() }, { orderId: handled.insertedId, state: 'pending', createdAt: new Date() }]);
    await worker.tick(); await worker.tick(); await worker.tick();
    assert.deepEqual(sent.sort(), [expect7(), expect8()].sort());
    sent.length = 0;
    await worker.tick(); assert.deepEqual(sent, []); // Too early for the first reminder.
    // Time passes: both orders are older than one minute, and OD8 is confirmed meanwhile.
    await jobs.updateMany({}, { $set: { createdAt: new Date(Date.now() - 90000) } });
    await db.collection('orders').updateOne({ _id: handled.insertedId }, { $set: { status: 'confirmed' } });
    await worker.tick(); await worker.tick(); await worker.tick();
    assert.equal(sent.length, 1); assert.match(sent[0]!, /REMINDER.*OD7/);
    await worker.tick(); assert.equal(sent.length, 1); // Each stage is sent once.
    await jobs.updateMany({}, { $set: { createdAt: new Date(Date.now() - 200000) } });
    await worker.tick(); await worker.tick();
    assert.equal(sent.length, 2); assert.match(sent[1]!, /REMINDER.*OD7/);
    await worker.tick(); await worker.tick(); assert.equal(sent.length, 2);
    await worker.stop();
  } finally { if (previous !== undefined) process.env.EMAIL_PROVIDER = previous; await db.dropDatabase(); await client.close(); }
});
const expect7 = () => 'New order OD7 · AED 9.00 · delivery area not set';
const expect8 = () => 'New order OD8 · AED 9.00 · delivery area not set';
