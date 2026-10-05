import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { retainedOrderDetail, retainedOrderList } from '../apps/api/src/modules/orders/compatibility-reads';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('maintained retained order reads preserve snapshots, historical totals/missing refs, flag parity and bounded city-authorized pages', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_order_reads_' + randomUUID().replaceAll('-', ''));
  const admin = { id: String(new ObjectId()), username: 'synthetic', name: 'Synthetic', role: 'admin' as const, cities: [] }, staff = { ...admin, role: 'user' as const, cities: ['City A'] };
  try {
    const categoryId = new ObjectId(), productId = new ObjectId(), missing = new ObjectId();
    await db.collection('categories').insertOne({ _id: categoryId, name: 'Archived category', archivedAt: new Date(), privateProviderData: 'private' });
    await db.collection('products').insertOne({ _id: productId, product_id: 'PD0001', name: 'Changed catalog name', price: 999, sale: false, category: categoryId, archivedAt: new Date(), privateProviderData: 'private' });
    const historicalId = new ObjectId();
    const historical = { _id: historicalId, orderId: 'HISTORICAL', customer: { city: 'City A', name: 'Synthetic', totalAmount: 12.34, internalSecret: 'private' }, cartItems: [{ _id: productId, quantity: 1 }, { _id: missing, quantity: 2 }], createdAt: new Date(1), internalSecret: 'private' };
    await db.collection('orders').insertOne(historical);
    const fresh = { orderId: 'FRESH', schemaVersion: 2, status: 'pending', createdAt: new Date(2), customer: { city: 'City A', totalAmount: 20 }, cartItems: [{ _id: productId, quantity: 1 }],
      lines: [{ productId: String(productId), sku: 'PD0001', name: 'Immutable purchased name', barcode: '001', quantity: 1, unitPriceMinor: 2000, salePriceMinor: null, taxMinor: 95, lineTotalMinor: 2000 }], totals: { totalMinor: 2000 } };
    const freshId = (await db.collection('orders').insertOne(fresh)).insertedId;
    const old = await retainedOrderDetail(db, String(historicalId), {}, staff);
    assert.equal(old.customer.totalAmount, 12.34); assert.equal(old.snapshotAvailable, false);
    assert.equal(old.cartItems[0]._id.name, 'Changed catalog name'); assert.equal(old.cartItems[0]._id.category.name, 'Archived category');
    assert.equal(old.cartItems[1]._id.name, 'Historical product unavailable'); assert.equal(old.cartItems[1]._id.price, null); assert.equal(String(old.cartItems[1]._id._id), String(missing));
    assert.ok(!JSON.stringify(old).includes('private'));
    const maintained = await retainedOrderDetail(db, String(freshId), {}, staff);
    assert.equal(maintained.customer.totalAmount, 20); assert.equal(maintained.cartItems[0]._id.name, 'Immutable purchased name'); assert.equal(maintained.cartItems[0]._id.price, 20);
    await assert.rejects(retainedOrderDetail(db, String(freshId), {}, { ...staff, cities: [] }), { status: 404 });
    await assert.rejects(retainedOrderDetail(db, String(freshId), {}, { ...staff, cities: ['City B'] }), { status: 404 });
    await db.collection('orders').insertMany([
      { orderId: 'LEGACY_CANCELLED', canceled: true, customer: { city: 'City A' } }, { orderId: 'LEGACY_DISPATCHED', dispatched: true, customer: { city: 'City A' } },
      { orderId: 'CONFLICT', canceled: true, dispatched: true, customer: { city: 'City A' } }, { orderId: 'OUTSIDE', status: 'cancelled', customer: { city: 'City B' } },
      ...Array.from({ length: 30 }, (_, i) => ({ orderId: 'PENDING_' + i, customer: { city: 'City A' }, createdAt: new Date(10 + i) })),
    ]);
    assert.equal((await retainedOrderList(db, {}, staff)).length, 25);
    assert.equal((await retainedOrderList(db, { offset: '25' }, staff)).length, 10);
    assert.equal((await retainedOrderList(db, { status: 'cancelled' }, staff))[0]!.orderId, 'LEGACY_CANCELLED');
    assert.equal((await retainedOrderList(db, { status: 'dispatched' }, staff))[0]!.orderId, 'LEGACY_DISPATCHED');
    assert.equal((await retainedOrderList(db, { status: 'pending', limit: '100' }, staff)).length, 32);
    assert.equal((await retainedOrderList(db, { status: 'cancelled' }, admin)).length, 2);
    assert.equal((await retainedOrderList(db, {}, { ...staff, cities: [] })).length, 0);
    assert.deepEqual(await db.collection('orders').findOne({ _id: historicalId }), historical);
  } finally { await db.dropDatabase(); await client.close(); }
});
