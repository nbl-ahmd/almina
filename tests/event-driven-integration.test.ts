import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient } from 'mongodb';
import { createLocalWriteSignal, createOutboxWake } from '../apps/api/src/modules/notifications/wake';
import { staffOrderEmailOutbox } from '../apps/api/src/modules/notifications/staff-email';
import { orderOutbox } from '../apps/api/src/modules/notifications/outbox';

const uri = process.env.COMMERCE_TEST_URI;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
test('an order is delivered the moment it is saved, a reminder fires at its due time, and then no command reaches the database', { skip: !uri }, async () => {
  const previous = process.env.EMAIL_PROVIDER; delete process.env.EMAIL_PROVIDER;
  const signal = createLocalWriteSignal();
  const client = new MongoClient(uri!, { monitorCommands: true }); signal.attach(client);
  let commands = 0; client.on('commandStarted', event => { if (!['hello', 'isMaster', 'ping'].includes(event.commandName)) commands++; });
  await client.connect();
  const db = client.db(`almina_event_${randomUUID().replaceAll('-', '')}`);
  const wake = createOutboxWake(() => db, { local: signal, coalesceMs: 10 });
  const staffMail: string[] = [], customerMail: string[] = [];
  const staff = await staffOrderEmailOutbox(async () => db, { wake, onFailure: () => undefined, escalateAfterMinutes: [0.03],
    delivery: { smtp: async message => { staffMail.push(message.subject); } }, smtpFactory: () => { throw new Error('unused'); } });
  const customer = orderOutbox(async () => db, { wake, send: async order => { customerMail.push(String(order.orderId)); }, onFailure: () => undefined });
  try {
    await wait(400); // start-up pass done
    const idleBaseline = commands; await wait(1500);
    assert.equal(commands, idleBaseline, 'nothing is sent to the database while idle');
    const order = await db.collection('orders').insertOne({ orderId: 'OD500', status: 'pending', totals: { totalMinor: 1000 }, customer: { email: 'c@example.invalid' }, lines: [] });
    await db.collection('order_outbox').insertOne({ orderId: order.insertedId, state: 'pending', createdAt: new Date() });
    for (let waited = 0; waited < 3000 && (!staffMail.length || !customerMail.length); waited += 20) await wait(20);
    assert.deepEqual(customerMail, ['OD500'], 'the customer confirmation is sent immediately');
    assert.equal(staffMail.length, 1); assert.match(staffMail[0]!, /^New order OD500/);
    // The unconfirmed reminder was scheduled for its exact moment (about 1.8 s after the order).
    for (let waited = 0; waited < 5000 && staffMail.length < 2; waited += 50) await wait(50);
    assert.equal(staffMail.length, 2, 'the reminder fires without any polling'); assert.match(staffMail[1]!, /^REMINDER/);
    await wait(1500); // the last pass after the reminder is only a few reads; give a loaded machine time to finish it
    const settled = commands; await wait(2000);
    assert.equal(commands, settled, 'after the work is done the process is silent again');
    assert.equal(staffMail.length, 2); assert.equal(customerMail.length, 1);
  } finally {
    await staff.stop(); await customer.stop(); await wake.shutdown();
    if (previous !== undefined) process.env.EMAIL_PROVIDER = previous;
    await db.dropDatabase(); await client.close();
  }
});
