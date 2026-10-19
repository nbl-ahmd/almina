import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import {
  retentionPolicy, saveRetentionPolicy, customerReminders, updateCustomerReminder,
  restoreRecoveryCart, unsubscribeReminder, retentionWorker,
} from '../apps/api/src/modules/growth/retention';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database required');

/** Only explicitly requested reminders may be delivered; the programme stays off by default. */
test('requested reminders are owner-scoped, one-shot and consent-driven on a disposable replica set', { skip: !uri }, async t => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db('retention_test_' + randomUUID().replaceAll('-', ''));
  const previous = { enabled: process.env.GROWTH_EMAIL_ENABLED, user: process.env.CUSTOMER_EMAIL_USER, pass: process.env.CUSTOMER_EMAIL_PASSWORD };
  process.env.GROWTH_EMAIL_ENABLED = 'true';
  process.env.CUSTOMER_EMAIL_USER = 'synthetic@example.invalid';
  process.env.CUSTOMER_EMAIL_PASSWORD = 'synthetic-only';
  try {
    const actor = String(new ObjectId());
    const category = new ObjectId();
    await db.collection('categories').insertOne({ _id: category, name: 'Synthetic general' });
    const general = (name: string, stock: number, extra: Record<string, unknown> = {}) => ({
      _id: new ObjectId(), name, product_id: name.toUpperCase().replace(/\W/g, '-'), category, productType: 'general',
      contentReviewed: true, published: true, stock, price: 10, ...extra });
    const visible = await db.collection('products').insertOne(general('Visible care', 0));
    const pricey = await db.collection('products').insertOne(general('Pricey care', 5));
    const hidden = await db.collection('products').insertOne(general('Hidden care', 0, { published: false }));
    const medicine = await db.collection('products').insertOne(general('Medicine care', 0, { productType: 'medicine', contentReviewed: false }));
    const owner = new ObjectId();
    const other = new ObjectId();
    await db.collection('customers').insertMany([
      { _id: owner, email: 'owner@example.invalid', emailHash: 'retention-owner', verifiedAt: new Date() },
      { _id: other, email: 'other@example.invalid', emailHash: 'retention-other', verifiedAt: new Date() },
    ]);
    const id = (row: { insertedId: ObjectId }) => String(row.insertedId);
    const subscribe = (customer: ObjectId, body: unknown, now?: Date) => updateCustomerReminder(db, String(customer), body, now);

    await t.test('policy is inactive by default and rejects stale revisions', async () => {
      const policy = await retentionPolicy(db);
      assert.equal(policy.enabled, false);
      const saved = await saveRetentionPolicy(db, { revision: 0, enabled: true, restock: true, priceDrop: true, replenishment: true, cartRecovery: true }, actor);
      assert.equal(saved.enabled, true);
      await assert.rejects(saveRetentionPolicy(db, { revision: 0, enabled: false }, actor), { code: 'IDEMPOTENCY_CONFLICT' });
      assert.equal((await retentionPolicy(db)).restock, true);
    });

    await t.test('only visible general products of the right state can be subscribed', async () => {
      await assert.rejects(subscribe(owner, { operation: 'subscribe', kind: 'restock', consent: true, productId: id(hidden) }), { code: 'REMINDER_PRODUCT_INELIGIBLE' });
      await assert.rejects(subscribe(owner, { operation: 'subscribe', kind: 'restock', consent: true, productId: id(medicine) }), { code: 'REMINDER_PRODUCT_INELIGIBLE' });
      await assert.rejects(subscribe(owner, { operation: 'subscribe', kind: 'restock', consent: true, productId: id(pricey) }), { code: 'REMINDER_PRODUCT_INELIGIBLE' });
      const rows = await subscribe(owner, { operation: 'subscribe', kind: 'restock', consent: true, productId: id(visible) });
      assert.equal(rows.length, 1);
      assert.equal(rows[0]!.kind, 'restock');
      assert.equal(rows[0]!.state, 'waiting');
    });

    await t.test('a customer cannot read, cancel or reset another owner reminder', async () => {
      const foreign = await customerReminders(db, String(other));
      assert.equal(foreign.length, 0);
      await subscribe(other, { operation: 'cancel', id: `${owner}:restock:${id(visible)}` });
      assert.equal((await customerReminders(db, String(owner)))[0]!.state, 'waiting');
    });

    await t.test('one-shot delivery sends exactly once and an ambiguous result is never resent', async () => {
      const sent: string[] = [];
      const worker = retentionWorker(async () => db, { origin: 'http://localhost:3000', enabled: true, now: () => new Date(), send: async message => { sent.push(message.to); if (message.to === 'uncertain@example.invalid') throw new Error('synthetic SMTP outage'); } });
      try {
        await db.collection('products').updateOne({ _id: visible.insertedId }, { $set: { stock: 5 } });
        await worker.tick();
        assert.deepEqual(sent, ['owner@example.invalid']);
        assert.equal((await customerReminders(db, String(owner)))[0]!.state, 'sent');
        await worker.tick();
        assert.equal(sent.length, 1);
        const second = await subscribe(other, { operation: 'subscribe', kind: 'price-drop', consent: true, productId: id(pricey) });
        assert.equal(second[0]!.kind, 'price-drop');
        // A price-drop only fires below its baseline; an ambiguous send must move the row to uncertain and stop.
        await db.collection('products').updateOne({ _id: pricey.insertedId }, { $set: { price: 5 } });
        await db.collection('customers').updateOne({ _id: other }, { $set: { email: 'uncertain@example.invalid' } });
        await worker.tick();
        assert.equal((await customerReminders(db, String(other)))[0]!.state, 'uncertain');
        await worker.tick();
        assert.equal((await customerReminders(db, String(other)))[0]!.state, 'uncertain');
      } finally { await worker.stop(); }
    });

    await t.test('re-subscribing after a send is allowed and the active limit is enforced', async () => {
      const rows = await subscribe(owner, { operation: 'subscribe', kind: 'replenishment', consent: true, productId: id(pricey), days: 14 });
      assert.equal(rows.length, 2);
      for (let index = 0; index < 19; index++) {
        const product = await db.collection('products').insertOne(general('Bulk care ' + index, 0));
        await subscribe(owner, { operation: 'subscribe', kind: 'restock', consent: true, productId: String(product.insertedId) });
      }
      const extra = await db.collection('products').insertOne(general('Bulk overflow', 0));
      await assert.rejects(subscribe(owner, { operation: 'subscribe', kind: 'restock', consent: true, productId: String(extra.insertedId) }), { code: 'REMINDER_LIMIT' });
    });

    await t.test('basket recovery keeps consent, restores only in-stock items and unsubscribe wins', async () => {
      const purchaser = new ObjectId();
      await db.collection('customers').insertOne({ _id: purchaser, email: 'basket@example.invalid', emailHash: 'retention-basket', verifiedAt: new Date() });
      const rows = await subscribe(purchaser, { operation: 'subscribe', kind: 'cart', consent: true, items: [{ id: id(visible), quantity: 2 }, { id: id(pricey), quantity: 3 }] });
      const cart = rows.find(row => row.kind === 'cart')!;
      assert.equal(cart.state, 'waiting');
      await db.collection('products').updateOne({ _id: pricey.insertedId }, { $set: { stock: 0 } });
      assert.deepEqual(await restoreRecoveryCart(db, String(purchaser), { id: cart.id }), [{ id: id(visible), quantity: 2 }]);
      await assert.rejects(restoreRecoveryCart(db, String(owner), { id: cart.id }), { code: 'NOT_FOUND' });
      const token = 'A'.repeat(43);
      await db.collection<{ _id: string }>('customer_reminders').updateOne({ _id: cart.id }, { $set: { unsubscribeHash: createHash('sha256').update(token).digest('hex') } });
      await unsubscribeReminder(db, token);
      assert.equal((await customerReminders(db, String(purchaser))).find(row => row.id === cart.id)!.state, 'cancelled');
      await saveRetentionPolicy(db, { ...(await retentionPolicy(db)), enabled: false }, actor);
      await assert.rejects(subscribe(owner, { operation: 'subscribe', kind: 'restock', consent: true, productId: id(visible) }), { code: 'REMINDERS_UNAVAILABLE' });
    });
  } finally {
    if (previous.enabled === undefined) delete process.env.GROWTH_EMAIL_ENABLED; else process.env.GROWTH_EMAIL_ENABLED = previous.enabled;
    if (previous.user === undefined) delete process.env.CUSTOMER_EMAIL_USER; else process.env.CUSTOMER_EMAIL_USER = previous.user;
    if (previous.pass === undefined) delete process.env.CUSTOMER_EMAIL_PASSWORD; else process.env.CUSTOMER_EMAIL_PASSWORD = previous.pass;
    await db.dropDatabase();
    await client.close();
  }
});
