import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { rakDeliveryAreas, resolveDeliveryArea, type Staff } from '@almina/contracts';
import { saveOrderRouting } from '../apps/api/src/modules/orders/routing-admin';
import { assignStaffBranch } from '../apps/api/src/modules/auth/administration';
import { retainedOrderList, retainedOrderDetail } from '../apps/api/src/modules/orders/compatibility-reads';
import { repairOrderArea, routingRecipients, legacyAreaExpression } from '../apps/api/src/modules/orders/routing';
import { createCommerceService } from '../apps/api/src/modules/orders/commerce';
import { backfillOrderAreas } from '../scripts/migrations/order-routing';
import { deactivateStaff } from '../apps/api/src/modules/auth/administration';
import { orderOutbox } from '../apps/api/src/modules/notifications/outbox';
import { orderReceiving } from '../apps/api/src/modules/orders/receiving';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('branch routing partitions typed and GPS areas, sends every unknown to fallback, retains administrator access and checks every mutation', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_routing_' + randomUUID().replaceAll('-', ''));
  const adminId = new ObjectId(), localId = new ObjectId(), fallbackId = new ObjectId(), a = randomUUID(), b = randomUUID();
  const identity = (id: ObjectId, role: 'admin' | 'user', branchId?: string): Staff => ({ id: String(id), username: 'synthetic', name: 'Synthetic', role, cities: ['City A'], ...(branchId ? { branchId } : {}) });
  const admin = identity(adminId, 'admin'), local = identity(localId, 'user', a), fallback = identity(fallbackId, 'user', b);
  const first = rakDeliveryAreas.find(area => area.name.toLowerCase().includes('nakheel')) ?? rakDeliveryAreas[0]!;
  const second = rakDeliveryAreas.find(area => area.id !== first.id)!;
  const branches = [{ id: a, name: 'Local', areaIds: [first.id] }, { id: b, name: 'Rest of areas', areaIds: [] }];
  try {
    await db.collection('users').insertMany([{ _id: adminId, role: 'admin', subscription: {} }, { _id: localId, role: 'user', cities: ['City A'], subscription: {} }, { _id: fallbackId, role: 'user', cities: [], subscription: {} }]);
    await saveOrderRouting(db, { active: false, revision: 0, branches, fallbackBranchId: b }, admin.id);
    await assert.rejects(saveOrderRouting(db, { active: true, revision: 1, branches, fallbackBranchId: b }, admin.id), { code: 'INVALID_TRANSITION' });
    await assignStaffBranch(db, local.id, { branchId: a, expectedBranchId: null, reason: 'Synthetic branch assignment' }, admin.id);
    await assignStaffBranch(db, fallback.id, { branchId: b, expectedBranchId: null, reason: 'Synthetic fallback assignment' }, admin.id);
    await assert.rejects(assignStaffBranch(db, local.id, { branchId: b, expectedBranchId: null, reason: 'Stale assignment must fail' }, admin.id), { code: 'IDEMPOTENCY_CONFLICT' });
    await assert.rejects(saveOrderRouting(db, { active: true, revision: 1, branches, fallbackBranchId: b }, local.id), { code: 'FORBIDDEN' });
    await saveOrderRouting(db, { active: true, revision: 1, branches, fallbackBranchId: b }, admin.id);
    const resolverSamples = rakDeliveryAreas.flatMap(area => [area.name, ...area.aliases].map(city => ({ customer: { city, emirate: 'RAK' } })));
    await db.collection('routing_resolver_samples').insertMany(resolverSamples);
    const projected = await db.collection('routing_resolver_samples').aggregate<{ customer: { city: string; emirate: string }; resolved: string | null }>([{ $project: { customer: 1, resolved: legacyAreaExpression() } }]).toArray();
    for (const sample of projected) assert.equal(sample.resolved, resolveDeliveryArea(sample.customer), sample.customer.city);
    const customers = [
      { city: first.name, emirate: 'Ras al-Khaimah' },
      { city: first.name.toUpperCase().replaceAll(' ', '-'), emirate: 'RAK' },
      { city: second.name, emirate: 'Ras al-Khaimah' },
      { city: 'Nakhheel misspelled', emirate: 'Ras al-Khaimah' },
      { city: first.name, emirate: 'Dubai' },
      { city: 'Nonexistent locality', emirate: 'Ras al-Khaimah' },
    ];
    // Half historical, half new. Both paths must make the same deterministic decision.
    const orders = customers.map((customer, index) => ({ _id: new ObjectId(), schemaVersion: 2, lines: [], orderId: 'TEST' + index, status: 'pending', customer: { ...customer, name: 'Synthetic', totalAmount: 20 }, createdAt: new Date(), ...(index % 2 ? { routing: { version: 1, areaId: resolveDeliveryArea(customer), revision: 0 } } : {}) }));
    await db.collection('orders').insertMany(orders);
    const l = await retainedOrderList(db, {}, local), r = await retainedOrderList(db, {}, fallback), all = await retainedOrderList(db, {}, admin);
    assert.equal(l.length, 2); assert.equal(r.length, 4); assert.equal(all.length, 6);
    assert.equal(new Set([...l, ...r].map(order => String(order._id))).size, 6);
    assert.equal((await orderReceiving(db, admin)).reviewCount, 2);
    assert.equal((await orderReceiving(db, fallback)).pendingCount, 4);
    assert.equal((await orderReceiving(db, local)).pendingCount, 2);
    assert.equal((await retainedOrderList(db, { review: '1' }, local)).length, 0);
    assert.equal((await retainedOrderList(db, { review: '1' }, fallback)).length, 2);
    await assert.rejects(retainedOrderDetail(db, String(orders[3]!._id), {}, local), { code: 'NOT_FOUND' });
    assert.equal((await retainedOrderList(db, {}, { ...local, branchId: undefined })).length, 0);
    const receivers = await db.collection('users').find(await routingRecipients(db, orders[3]!)).toArray();
    assert.deepEqual(receivers.map(user => String(user._id)).sort(), [admin.id, fallback.id].sort());
    await assert.rejects(repairOrderArea(db, String(orders[3]!._id), { areaId: first.id, revision: 0, reason: 'Synthetic customer confirmation' }, local.id), { code: 'FORBIDDEN' });
    await repairOrderArea(db, String(orders[3]!._id), { areaId: first.id, revision: 0, reason: 'Synthetic customer confirmation' }, admin.id);
    await assert.rejects(repairOrderArea(db, String(orders[3]!._id), { areaId: second.id, revision: 0, reason: 'Stale review cannot overwrite' }, admin.id), { code: 'IDEMPOTENCY_CONFLICT' });
    assert.equal((await retainedOrderList(db, {}, local)).length, 3);
    assert.equal((await retainedOrderList(db, {}, fallback)).length, 3);
    assert.equal((await db.collection('orders').findOne({ _id: orders[3]!._id }))!.customer.city, 'Nakhheel misspelled');
    assert.equal(await db.collection('order_routing_audit').countDocuments({ orderId: orders[3]!._id }), 1);
    const alert = await db.collection('order_outbox').findOne({ orderId: orders[3]!._id });
    assert.equal(alert!.state, 'not_required'); assert.equal(alert!.pushState, 'pending');
    let customerEmails = 0, emailFailures = 0;
    const email = orderOutbox(() => db, { intervalMs: 60000, send: async () => { customerEmails++; }, onFailure: () => { emailFailures++; } });
    await email.tick(); await email.stop();
    assert.equal(customerEmails, 0); assert.equal(emailFailures, 0);
    const reviewed = (await db.collection('orders').findOne({ _id: orders[3]!._id }))!;
    assert.deepEqual((await db.collection('users').find(await routingRecipients(db, reviewed)).toArray()).map(row => String(row._id)).sort(), [admin.id, local.id].sort());
    await repairOrderArea(db, String(orders[5]!._id), { areaId: null, revision: 0, reason: 'Verified unlisted area with customer' }, admin.id);
    assert.equal((await orderReceiving(db, admin)).reviewCount, 0);
    assert.equal((await retainedOrderList(db, {}, fallback)).length, 3);
    const commerce = createCommerceService(async () => db);
    await assert.rejects(commerce.transition(String(orders[0]!._id), { status: 'confirmed' }, fallback), { code: 'NOT_FOUND' });
    await commerce.transition(String(orders[0]!._id), { status: 'confirmed' }, local);
    await commerce.transition(String(orders[0]!._id), { status: 'confirmed' }, local);
    assert.equal((await db.collection('orders').findOne({ _id: orders[0]!._id }))!.statusHistory.length, 1);
    await commerce.transition(String(orders[0]!._id), { status: 'packed' }, local);
    await assert.rejects(deactivateStaff(db, local.id, admin.id), { code: 'INVALID_TRANSITION' });
    const firstBackfill = await backfillOrderAreas(db), secondBackfill = await backfillOrderAreas(db);
    assert.ok(firstBackfill.changed > 0); assert.equal(secondBackfill.changed, 0);
    assert.equal((await retainedOrderList(db, {}, admin)).length, 6);
    const moved = [{ ...branches[0]!, areaIds: [] }, { ...branches[1]!, areaIds: [first.id] }];
    const race = await Promise.allSettled([saveOrderRouting(db, { active: true, revision: 2, branches: moved, fallbackBranchId: b }, admin.id), saveOrderRouting(db, { active: true, revision: 2, branches, fallbackBranchId: b }, admin.id)]);
    assert.equal(race.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await retainedOrderList(db, {}, admin)).length, 6);
    await assert.rejects(assignStaffBranch(db, local.id, { branchId: null, expectedBranchId: a, reason: 'Cannot unassign active staff' }, admin.id), { code: 'INVALID_REQUEST' });
  } finally { await db.dropDatabase(); await client.close(); }
});
