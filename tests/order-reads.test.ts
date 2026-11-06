import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { retainedOrderQuery, retainedOrderFilter, retainedOrderDetail, retainedOrderList } from '../apps/api/src/modules/orders/compatibility-reads';
const staff = { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', username: 'synthetic', name: 'Synthetic', role: 'user' as const, cities: [] };
test('retained order reads have bounded defaults, historical flag filters and server-owned city scope', async () => {
  assert.deepEqual(retainedOrderQuery({}), { limit: 25, offset: 0, status: undefined });
  assert.deepEqual(retainedOrderFilter({}, staff).filter['customer.city'], { $in: [] });
  const filter = retainedOrderFilter({ status: 'cancelled' }, { ...staff, cities: ['City A'] }).filter;
  assert.deepEqual(filter.$or, [{ status: 'cancelled' }, { status: { $exists: false }, canceled: true, dispatched: { $ne: true } }]);
  const db = { collection() { throw new Error('Unexpected database work'); } } as unknown as Db;
  for (const input of [{ city: 'City B' }, { role: 'admin' }, { filter: '{}' }, { limit: '0' }, { limit: '101' }, { offset: '10001' }, { status: 'invented' }, { limit: ['25'] }]) {
    assert.throws(() => retainedOrderQuery(input), { status: 400 }); await assert.rejects(retainedOrderList(db, input, staff), { status: 400 });
  }
  for (const [id, query] of [['not-an-id', {}], ['aaaaaaaaaaaaaaaaaaaaaaaa', { city: 'City B' }]] as const) await assert.rejects(retainedOrderDetail(db, id, query, staff), { status: 400 });
});
test('historical lookup overflow fails explicitly without truncating or querying a subset of order items', async () => {
  const snapshot = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', cartItems: Array.from({ length: 10001 }, () => ({ _id: new ObjectId(), quantity: 1 })) };
  const db = { collection(name: string) { assert.equal(name, 'orders'); return { findOne: async () => snapshot }; } } as unknown as Db;
  await assert.rejects(retainedOrderDetail(db, snapshot._id, {}, { ...staff, role: 'admin' }), { status: 503 });
  assert.equal(snapshot.cartItems.length, 10001);
});
test('immutable maintained order lines render independently of missing or unavailable live catalog', async () => {
  const snapshot = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', schemaVersion: 2, customer: { totalAmount: 20 },
    lines: [{ productId: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Purchased name', quantity: 1, unitPriceMinor: 2000, salePriceMinor: null }] };
  const db = { collection(name: string) { return { findOne: async () => name === 'growth_settings' ? null : snapshot }; } } as unknown as Db;
  const result = await retainedOrderDetail(db, snapshot._id, {}, { ...staff, role: 'admin' });
  assert.equal(result.snapshotAvailable, true); assert.equal(result.cartItems[0]._id.name, 'Purchased name'); assert.equal(result.cartItems[0]._id.price, 20);
});
