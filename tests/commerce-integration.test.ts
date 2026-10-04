import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { MongoClient, ObjectId, type Document, type Db, type Filter, type UpdateFilter, type UpdateOptions } from 'mongodb';
import { hash } from 'bcryptjs';
import { createLogger } from '@almina/config/logger';
import { createApp } from '../apps/api/src/app.js';
import { createCommerceService, quoteHash } from '../apps/api/src/modules/orders/commerce.js';
import { orderDetailDto } from '../apps/api/src/modules/orders/dto.js';
import { migrateCommerce } from '../scripts/migrations/commerce.js';
import { bootstrapRecovery } from '../scripts/migrations/recovery-bootstrap.js';
import { importRecoveryCatalog, parseRecoveryCatalog } from '../scripts/migrations/recovery-catalog.js';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
const require = createRequire(import.meta.url);
const customer = { name: 'Synthetic', mobile: '0501234567', email: 'synthetic@example.invalid',
  emirate: 'Ras al-Khaimah', city: 'City A', address: 'Synthetic address', payment: 'cash' };
const admin = { id: String(new ObjectId()), username: 'synthetic', name: 'Synthetic', role: 'admin' as const, cities: [] };
const browserHeaders = { Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' };
async function serve(app: ReturnType<typeof createApp>, run: (origin: string) => Promise<void>) {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('commerce against disposable real MongoDB replica set', { skip: !uri }, async t => {
  // Tests refuse non-loopback hosts, credentials or database names from callers.
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = new MongoClient(uri!, { serverSelectionTimeoutMS: 3000 });
  await client.connect();
  const dbName = `almina_commerce_test_${randomUUID().replaceAll('-', '')}`;
  const db = client.db(dbName);
  const commerce = createCommerceService(async () => db);
  const category = new ObjectId();
  async function product(stock: number, extra: Document = {}) {
    const _id = new ObjectId();
    await db.collection('products').insertOne({ _id, product_id: `PD${Date.now()}`, name: 'Original fixture', category,
      barcode: '123', stock, price: 10.5, sale: true, salePrice: 10, vat: true, ...extra });
    return String(_id);
  }
  function intent(productId: string, quantity = 1) { return { customer, items: [{ productId, quantity }], idempotencyKey: randomUUID() }; }
  try {
    await db.collection('stores').insertOne({ status: 'open' });
    await t.test('empty database recovery is closed, idempotent and refuses populated databases', async () => {
      const recovery = client.db(dbName + '_recovery');
      const options = { username: 'recovery-admin', name: 'Recovery Admin', password: 'synthetic-recovery-password', orderNumberFloor: 900000 };
      try {
        assert.deepEqual(await bootstrapRecovery(recovery, options), { created: true, store: 'closed' });
        assert.equal(await recovery.collection('users').countDocuments(), 1);
        assert.equal((await recovery.collection('stores').findOne())!.status, 'closed');
        assert.equal((await recovery.collection('commerce_counters').findOne())!.value, 900000);
        assert.deepEqual(await bootstrapRecovery(recovery, options), { created: false, store: 'unchanged' });
        assert.equal(await recovery.collection('users').countDocuments(), 1);
        await assert.rejects(bootstrapRecovery(recovery, { ...options, orderNumberFloor: 910000 }));
        await assert.rejects(bootstrapRecovery(db, options));
        const rows = [{ product_id: 'PD_RECOVERY_001', name: 'Synthetic care', category: 'Care', barcode: '123',
          price: '25.00', vat: true, cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/care.webp'] }];
        assert.equal((await importRecoveryCatalog(recovery, rows, 'synthetic'))!.created, 1);
        const imported = (await recovery.collection('products').findOne())!;
        assert.equal(imported.stock, 0); assert.equal(imported.disabled, true);
        assert.equal((await recovery.collection('categories').findOne())!.disabled, true);
        await recovery.collection('products').updateOne({ _id: imported._id }, { $set: { stock: 7 } });
        assert.equal((await importRecoveryCatalog(recovery, rows, 'synthetic'))!.replayed, true);
        assert.equal((await recovery.collection('products').findOne())!.stock, 7);
        await assert.rejects(importRecoveryCatalog(recovery, [{ ...rows[0], name: 'Conflicting name' }], 'synthetic'));
        await assert.rejects(importRecoveryCatalog(recovery, [rows[0], { ...rows[0], product_id: 'PD_OTHER' }], 'synthetic'));
        assert.equal(await recovery.collection('products').countDocuments(), 1);
        assert.throws(() => parseRecoveryCatalog([{ ...rows[0], price: '1.001' }], 'synthetic'));
        assert.throws(() => parseRecoveryCatalog([{ ...rows[0], cloudinaryImages: ['https://res.cloudinary.com/other/image/upload/care.webp'] }], 'synthetic'));
        await recovery.collection('stores').updateOne({}, { $set: { status: 'open' } });
        await assert.rejects(importRecoveryCatalog(recovery, [{ ...rows[0], product_id: 'PD_OTHER' }], 'synthetic'));
      } finally { await recovery.dropDatabase(); }
    });
    await db.collection('categories').insertOne({ _id: category, name: 'Fixture' });
    await migrateCommerce(db);

    await t.test('closed store, missing policy and unseeded counter fail closed without partial writes', async () => {
      const productId = await product(2);
      const input = intent(productId);
      await db.collection('stores').updateOne({}, { $set: { status: 'closed' } });
      await assert.rejects(commerce.checkout(input), { code: 'COMMERCE_UNAVAILABLE' });
      await db.collection('stores').updateOne({}, { $set: { status: 'open' } });
      await db.collection('commerce_policies').updateOne({}, { $set: { active: false } });
      await assert.rejects(commerce.checkout(input), { code: 'COMMERCE_UNAVAILABLE' });
      await db.collection('commerce_policies').updateOne({}, { $set: { active: true } });
      await db.collection('commerce_counters').updateOne({}, { $set: { ready: false } });
      await assert.rejects(commerce.checkout(input), { code: 'COMMERCE_UNAVAILABLE' });
      await db.collection('commerce_counters').updateOne({}, { $set: { ready: true } });
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, 2);
      assert.equal(await db.collection('orders').countDocuments(), 0);
      assert.equal(await db.collection('checkout_requests').countDocuments(), 0);
    });

    await t.test('changed quotes require review before writes and committed retries survive repricing', async () => {
      const productId = await product(3);
      const input = intent(productId);
      const quoteInput = { customer: input.customer, items: input.items };
      const acceptedQuoteHash = quoteHash(await commerce.quote(quoteInput));
      await db.collection('products').updateOne({ _id: new ObjectId(productId) }, { $set: { salePrice: 10.25 } });
      const before = await db.collection('orders').countDocuments();
      const receipts = await db.collection('checkout_requests').countDocuments();
      await assert.rejects(commerce.checkout({ ...input, acceptedQuoteHash }), { code: 'PRICE_CHANGED' });
      assert.equal(await db.collection('orders').countDocuments(), before);
      assert.equal(await db.collection('checkout_requests').countDocuments(), receipts);
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, 3);
      const reviewed = { ...input, acceptedQuoteHash: quoteHash(await commerce.quote(quoteInput)) };
      const order = await commerce.checkout(reviewed);
      await db.collection('products').updateOne({ _id: new ObjectId(productId) }, { $set: { salePrice: 10.1 } });
      const replay = await commerce.checkout(reviewed);
      assert.equal(replay!.id, order!.id);
      assert.equal(replay!.replayed, true);
      assert.deepEqual(replay!.totals, order!.totals);
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, 2);
    });

    await t.test('concurrent checkout never oversells and order numbers remain unique', async () => {
      const productId = await product(3);
      const outcomes = await Promise.allSettled(Array.from({ length: 12 }, () => commerce.checkout(intent(productId))));
      const successes = outcomes.filter(outcome => outcome.status === 'fulfilled');
      assert.equal(successes.length, 3);
      for (const outcome of outcomes) if (outcome.status === 'rejected') assert.equal(outcome.reason.code, 'INSUFFICIENT_STOCK');
      const persisted = await db.collection('orders').find({ 'lines.productId': productId }).toArray();
      assert.equal(persisted.length, 3); assert.equal(new Set(persisted.map(order => order.orderId)).size, 3);
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, 0);
    });

    await t.test('simultaneous duplicate requests commit once; changed payload rejects and committed totals survive catalog edits', async () => {
      const productId = await product(10);
      const input = intent(productId, 2);
      const results = await Promise.all(Array.from({ length: 8 }, () => commerce.checkout(input)));
      assert.equal(new Set(results.map(result => result!.id)).size, 1);
      assert.equal(results.filter(result => result!.replayed === false).length, 1);
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, 8);
      await assert.rejects(commerce.checkout({ ...input, items: [{ productId, quantity: 1 }] }), { code: 'IDEMPOTENCY_CONFLICT' });
      await db.collection('products').updateOne({ _id: new ObjectId(productId) }, { $set: { price: 100, salePrice: 90, name: 'Changed fixture', disabled: true } });
      const replay = await commerce.checkout(input); assert.equal(replay!.totals.totalMinor, 2000);
      const doc = (await db.collection('orders').findOne({ _id: new ObjectId(replay!.id) }))!;
      assert.equal(orderDetailDto(doc).lines![0]!.name, 'Original fixture');
      assert.equal(await db.collection('order_outbox').countDocuments({ orderId: doc._id }), 1);
    });

    await t.test('insufficient/invalid/disabled/unpublished products and disabled categories cause no order or stock effects', async () => {
      const enough = await product(2);
      const scarce = await product(0);
      const before = await db.collection('orders').countDocuments();
      await assert.rejects(commerce.checkout({ ...intent(enough), items: [{ productId: enough, quantity: 1 }, { productId: scarce, quantity: 1 }] }), { code: 'INSUFFICIENT_STOCK' });
      await assert.rejects(commerce.checkout(intent(String(new ObjectId()))), { code: 'PRODUCT_UNAVAILABLE' });
      for (const extra of [{ disabled: true }, { published: false }, { active: false }]) {
        await assert.rejects(commerce.checkout(intent(await product(2, extra))), { code: 'PRODUCT_UNAVAILABLE' });
      }
      await db.collection('categories').updateOne({ _id: category }, { $set: { disabled: true } });
      await assert.rejects(commerce.checkout(intent(enough)), { code: 'PRODUCT_UNAVAILABLE' });
      await db.collection('categories').updateOne({ _id: category }, { $unset: { disabled: '' } });
      assert.equal(await db.collection('orders').countDocuments(), before);
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(enough) }))!.stock, 2);
    });

    await t.test('a conditional stock failure after the first decrement aborts the entire transaction', async () => {
      const first = await product(2); const second = await product(2);
      const faultDb = { client: db.client, collection(name: string) {
        const collection = db.collection(name);
        if (name !== 'products') return collection;
        return { find: collection.find.bind(collection),
          updateOne: async (filter: Filter<Document>, update: UpdateFilter<Document>, options: UpdateOptions) => {
            if (String(filter._id) === second) return { modifiedCount: 0 };
            return collection.updateOne(filter, update, options);
          } };
      } } as unknown as Db;
      const input = { ...intent(first), items: [{ productId: first, quantity: 1 }, { productId: second, quantity: 1 }] };
      const count = await db.collection('orders').countDocuments();
      await assert.rejects(createCommerceService(async () => faultDb).checkout(input), { code: 'INSUFFICIENT_STOCK' });
      assert.equal(await db.collection('orders').countDocuments(), count);
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(first) }))!.stock, 2);
      assert.ok(await commerce.checkout(input));
    });

    await t.test('persistence failure after stock decrement rolls back all stock, counter and idempotency writes', async () => {
      const p1 = await product(2); const p2 = await product(2);
      const input = { ...intent(p1), items: [{ productId: p1, quantity: 1 }, { productId: p2, quantity: 1 }] };
      const before = await db.collection('commerce_counters').findOne({});
      const receipts = await db.collection('checkout_requests').countDocuments();
      await db.command({ collMod: 'orders', validator: { forcedTestRejection: { $exists: true } }, validationLevel: 'strict' });
      try { await assert.rejects(commerce.checkout(input)); }
      finally { await db.command({ collMod: 'orders', validator: {} }); }
      for (const id of [p1, p2]) assert.equal((await db.collection('products').findOne({ _id: new ObjectId(id) }))!.stock, 2);
      assert.equal((await db.collection('commerce_counters').findOne({}))!.value, before!.value);
      assert.equal(await db.collection('checkout_requests').countDocuments(), receipts);
      assert.ok(await commerce.checkout(input)); // Aborted attempt did not consume its key.
    });

    await t.test('cancellation restores once, races safely with dispatch, blocks after dispatch and enforces city RBAC', async () => {
      const productId = await product(5);
      const input = intent(productId, 2);
      const order = (await commerce.checkout(input))!;
      await assert.rejects(commerce.transition(order.id, { status: 'cancelled' }, { ...admin, role: 'user', cities: ['City B'] }), { status: 404 });
      await Promise.all(Array.from({ length: 8 }, () => commerce.transition(order.id, { status: 'cancelled' }, admin)));
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, 5);
      const doc = (await db.collection('orders').findOne({ _id: new ObjectId(order.id) }))!;
      assert.equal(doc.statusHistory.filter((event: Document) => event.status === 'cancelled').length, 1);
      assert.equal((await commerce.checkout(input))!.status, 'cancelled');
      await assert.rejects(commerce.transition(order.id, { status: 'confirmed' }, admin), { code: 'INVALID_TRANSITION' });
      const race = (await commerce.checkout(intent(productId)))!;
      const results = await Promise.allSettled([
        commerce.transition(race.id, { status: 'cancelled' }, admin),
        commerce.transition(race.id, { status: 'dispatched', billno: '12345', billamount: 10 }, admin, true),
      ]);
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      const raced = (await db.collection('orders').findOne({ _id: new ObjectId(race.id) }))!;
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, raced.status === 'cancelled' ? 5 : 4);
      const dispatched = (await commerce.checkout(intent(productId)))!;
      await assert.rejects(commerce.transition(dispatched.id, { status: 'dispatched' }, admin), { code: 'INVALID_TRANSITION' });
      await commerce.transition(dispatched.id, { status: 'confirmed' }, admin);
      await commerce.transition(dispatched.id, { status: 'packed' }, admin);
      await assert.rejects(commerce.transition(dispatched.id, { status: 'dispatched', billno: '12345', billamount: 1 }, admin), { code: 'INVALID_REQUEST' });
      await commerce.transition(dispatched.id, { status: 'dispatched', billno: '12345', billamount: 10 }, admin);
      await assert.rejects(commerce.transition(dispatched.id, { status: 'cancelled' }, admin), { code: 'INVALID_TRANSITION' });
      await assert.rejects(commerce.transition(dispatched.id, { status: 'refunded' }, { ...admin, role: 'user', cities: ['City A'] }), { status: 403 });
      await commerce.transition(dispatched.id, { status: 'refunded' }, admin);
      // Refund records workflow state for delivery payment; it never assumes goods returned to stock.
      assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, raced.status === 'cancelled' ? 4 : 3);
    });

    await t.test('migration reruns preserve historical totals, missing products, contradictory flags and counter high water', async () => {
      const historical = { _id: new ObjectId(), orderId: 'OD8000', customer: { totalAmount: 12.34, totalVat: 9 },
        canceled: true, dispatched: false, cartItems: [{ _id: new ObjectId(), quantity: 1 }] };
      await db.collection('orders').insertOne(historical);
      await db.collection('orders').insertOne({ orderId: 'OD7000', canceled: true, dispatched: true });
      await migrateCommerce(db); await migrateCommerce(db);
      const migrated = (await db.collection('orders').findOne({ _id: historical._id }))!;
      assert.deepEqual(migrated.customer, historical.customer); assert.deepEqual(migrated.cartItems, historical.cartItems);
      assert.equal(migrated.lines, undefined); assert.equal(migrated.status, 'cancelled');
      assert.equal(orderDetailDto(migrated).snapshotAvailable, false);
      assert.equal((await db.collection('orders').findOne({ orderId: 'OD7000' }))!.status, 'legacy_conflict');
      const fresh = (await commerce.checkout(intent(await product(2))))!;
      assert.equal(fresh.orderId, 'OD8001');
      await migrateCommerce(db);
      assert.equal((await db.collection('commerce_counters').findOne({}))!.value, 8001);
      const historicalPending = { orderId: 'OD6000', customer, cartItems: [{ _id: new ObjectId(), quantity: 99 }] };
      const inserted = await db.collection('orders').insertOne(historicalPending);
      await commerce.transition(String(inserted.insertedId), { status: 'cancelled' }, admin);
      // Unknown historical stock effects never prevent a safe flag-only cancellation or trigger a guessed restock.
      assert.equal((await db.collection('orders').findOne({ _id: inserted.insertedId }))!.status, 'cancelled');
    });

    await t.test('both real HTTP stacks reject forged money, return authoritative prices, and preserve legacy historical reads', async () => {
      const productId = await product(10);
      const app = createApp({ database: { mode: 'enabled', checkReadiness: async () => true }, getDb: async () => db,
        logger: createLogger({ service: 'api', environment: 'development', write: () => undefined }), webOrigin: browserHeaders.Origin, development: true });
      await serve(app, async origin => {
        for (const [field, value] of [['totalAmount', 1], ['deliveryFee', 0], ['price', 1]]) {
          const response = await fetch(`${origin}/api/v1/checkout`, { method: 'POST', headers: browserHeaders, body: JSON.stringify({ ...intent(productId), [String(field)]: value }) });
          assert.equal(response.status, 400);
        }
        const response = await fetch(`${origin}/api/v1/checkout`, { method: 'POST', headers: browserHeaders, body: JSON.stringify(intent(productId)) });
        assert.equal(response.status, 201); const data = (await response.json()).data;
        assert.equal(data.totals.totalMinor, 1000); assert.equal('customer' in data, false);
        assert.equal((await fetch(`${origin}/api/v1/admin/orders/${data.id}/status`, { method: 'POST', headers: browserHeaders, body: '{"status":"cancelled"}' })).status, 401);
        await db.collection('users').insertOne({ _id: new ObjectId(admin.id), username: admin.username, name: admin.name,
          role: 'admin', cities: [], password: await hash('synthetic-password', 4) });
        const login = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: browserHeaders, body: '{"username":"synthetic","password":"synthetic-password"}' });
        assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
        const result = await fetch(`${origin}/api/v1/admin/orders/${data.id}/status`, { method: 'POST', headers: { ...browserHeaders, Cookie: cookie }, body: '{"status":"cancelled"}' });
        assert.equal(result.status, 200);
      });
      const mongoose = require('../backend/node_modules/mongoose');
      await mongoose.connect(uri!, { dbName });
      try {
        const { createLegacyApp } = require('../backend/app.js');
        const legacy = createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth: { authenticate: async () => admin } });
        await serve(legacy, async origin => {
          const productUrl = `${origin}/api/products/${productId}`;
          const before = (await db.collection('products').findOne({ _id: new ObjectId(productId) }))!;
          await commerce.checkout(intent(productId));
          const stale = await fetch(productUrl, { method: 'PUT', headers: browserHeaders,
            body: JSON.stringify({ stock: 99, expectedStock: before.stock, name: 'Stale' }) });
          assert.equal(stale.status, 409);
          assert.equal((await stale.json()).code, 'STOCK_CHANGED');
          assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.name, before.name);
          const live = (await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock;
          const zero = await fetch(productUrl, { method: 'PUT', headers: browserHeaders, body: JSON.stringify({ stock: 0, expectedStock: live, price: 0, sale: false, salePrice: 0, stockReason: 'Physical count verified', inventoryKey: randomUUID() }) });
          assert.equal(zero.status, 200);
          assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, 0);
          const invalid = await fetch(productUrl, { method: 'PUT', headers: browserHeaders, body: '{"price":"10.001"}' });
          assert.equal(invalid.status, 400);
          const noVersion = await fetch(productUrl, { method: 'PUT', headers: browserHeaders, body: '{"stock":4}' });
          assert.equal(noVersion.status, 400);
          await db.collection('products').updateOne({ _id: new ObjectId(productId) }, { $set: { stock: 10, price: before.price, sale: before.sale, salePrice: before.salePrice } });
          const input = intent(productId);
          const created = await fetch(`${origin}/api/orders`, { method: 'POST', headers: browserHeaders, body: JSON.stringify(input) });
          assert.equal(created.status, 201); const result = await created.json();
          assert.equal(result.totals.totalMinor, 1000);
          const replay = await fetch(`${origin}/api/orders`, { method: 'POST', headers: browserHeaders, body: JSON.stringify(input) });
          assert.equal(replay.status, 200);
          const forged = await fetch(`${origin}/api/orders`, { method: 'POST', headers: browserHeaders,
            body: JSON.stringify({ customer: { ...customer, totalAmount: 1, deliveryFee: 0 }, cartItems: [{ _id: productId, quantity: 1, price: 1 }] }) });
          assert.equal(forged.status, 400);
          const mutable = await fetch(`${origin}/api/orders/edit/${result.id}`, { method: 'PUT', headers: browserHeaders, body: '{"customer":{"totalAmount":1}}' });
          assert.equal(mutable.status, 400);
          const read = await fetch(`${origin}/api/orders/${result.id}`, { headers: browserHeaders });
          assert.equal(read.status, 200); const body = await read.json();
          assert.equal(body.cartItems[0]._id.name, 'Original fixture'); assert.equal(body.snapshotAvailable, true);
          for (const query of ['limit=0', 'limit=101', 'offset=-1', 'filter=%7B%22%24where%22%3A%22x%22%7D', 'status=invalid']) assert.equal((await fetch(`${origin}/api/orders?${query}`, { headers: browserHeaders })).status, 400);
          const page = await fetch(`${origin}/api/orders?limit=1&offset=0&status=pending`, { headers: browserHeaders });
          assert.equal(page.status, 200); const listed = await page.json(); assert.equal(listed.length, 1); assert.equal(listed[0].status, 'pending');
          const cancelled = await fetch(`${origin}/api/orders/cancel/${result.id}`, { method: 'PUT', headers: browserHeaders, body: '{"cancelled":true}' });
          assert.equal(cancelled.status, 200);
        });
      } finally { await mongoose.disconnect(); }
    });

    await t.test('every lifecycle transition follows the approved state machine and failed transitions are immutable', async () => {
      const allowed: Record<string, readonly string[]> = {
        pending: ['confirmed', 'cancelled'], confirmed: ['packed', 'cancelled'], packed: ['dispatched', 'cancelled'],
        dispatched: ['refunded'], cancelled: [], refunded: [],
      };
      for (const from of Object.keys(allowed)) for (const to of Object.keys(allowed)) {
        const productId = await product(2);
        const created = await commerce.checkout(intent(productId));
        const _id = new ObjectId(created.id);
        await db.collection('orders').updateOne({ _id }, { $set: { status: from,
          dispatched: ['dispatched', 'refunded'].includes(from), canceled: from === 'cancelled' } });
        const before = await db.collection('orders').findOne({ _id });
        const command = { status: to, ...(to === 'dispatched' ? { billno: '12345', billamount: 10 } : {}) };
        if (from === to || allowed[from]!.includes(to)) {
          assert.equal((await commerce.transition(created.id, command, admin)).status, to, `${from} -> ${to}`);
          if (from === to) assert.deepEqual(await db.collection('orders').findOne({ _id }), before);
        } else {
          await assert.rejects(commerce.transition(created.id, command, admin), { code: 'INVALID_TRANSITION' }, `${from} -> ${to}`);
          assert.deepEqual(await db.collection('orders').findOne({ _id }), before);
          assert.equal((await db.collection('products').findOne({ _id: new ObjectId(productId) }))!.stock, 1);
        }
      }
    });

    await t.test('notification failure retries durable jobs independently of order persistence', async () => {
      const { startOrderOutbox } = require('../backend/commerce/outbox.cjs');
      let calls = 0;
      const worker = startOrderOutbox(async () => db, { send: async () => { calls++; throw new Error('Synthetic outage'); }, onFailure: () => undefined });
      try { await worker.tick(); }
      finally { worker.stop(); }
      assert.equal(calls, 1);
      const job = await db.collection('order_outbox').findOne({ nextAttemptAt: { $exists: true } });
      assert.equal(job!.state, 'pending'); assert.equal(job!.attempts, 1);
      assert.ok(await db.collection('orders').findOne({ _id: job!.orderId }));
    });
  } finally {
    // Only the random fixture database created by this test is removed.
    assert.match(dbName, /^almina_commerce_test_[a-f0-9]{32}$/);
    await db.dropDatabase(); await client.close();
  }
});
