import { createHash } from 'node:crypto';
import type { Db, Document } from 'mongodb';
import type { Staff } from '@almina/contracts';
import { branchOrderFilter, presentRouting, readOrderRouting, addressReviewScope } from './routing.js';
import { orderFilter } from './repository.js';
/** Counts are operational signals, never a substitute for the authorized, paginated order inbox. */
export async function orderReceiving(db: Db, staff: Staff) {
  const scope = await branchOrderFilter(db, staff, orderFilter({ limit: 1 }, staff));
  const pending: Document = { $and: [scope, { $or: [{ status: 'pending' }, { status: { $exists: false }, dispatched: { $ne: true }, canceled: { $ne: true } }] },
    { $or: [{ 'payment.provider': { $ne: 'stripe' } }, { 'payment.provider': 'stripe', 'payment.testMode': false, 'payment.state': 'paid' }] }] };
  const options = { maxTimeMS: 3000 };
  const [pendingCount, reviewCount, latest, oldest, policy, recent] = await Promise.all([
    db.collection('orders').countDocuments(pending, options),
    db.collection('orders').countDocuments({ $and: [pending, addressReviewScope()] }, options),
    db.collection('orders').find(pending, { ...options, projection: { _id: 1, routing: 1, 'customer.city': 1, 'customer.emirate': 1 } }).sort({ createdAt: -1, _id: -1 }).limit(10).toArray(),
    db.collection('orders').find(pending, { ...options, projection: { createdAt: 1 } }).sort({ createdAt: 1, _id: 1 }).limit(1).toArray(),
    readOrderRouting(db),
    db.collection('orders').find(scope, { ...options, projection: { _id: 1, status: 1, dispatched: 1, canceled: 1, billno: 1, billamount: 1, 'payment.state': 1, 'routing.revision': 1 } }).sort({ createdAt: -1, _id: -1 }).limit(25).toArray(),
  ]);
  const latestIds = latest.map(order => String(order._id));
  const signature = createHash('sha256').update(JSON.stringify([staff.branchId, policy.revision, recent, pendingCount, reviewCount, latest.map(order => [String(order._id), presentRouting(order, policy)])])).digest('hex');
  return { pendingCount, reviewCount, latestIds, oldestPendingAt: oldest[0]?.createdAt instanceof Date ? oldest[0].createdAt.toISOString() : null, signature };
}
