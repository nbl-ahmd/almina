import type { Db, Document } from 'mongodb';
import { HttpError } from '../../errors.js';
import { bounded } from './lifecycle.js';
import type { OperationalMetrics } from './metrics.js';
export async function operationsSnapshot(db: Db, metrics: OperationalMetrics) {
  try {
    const query = { maxTimeMS: 3000 };
    const [stock, duplicates, orphanReceipts, missingReceipts, missingJobs, outbox, inbox, push, pushJobs] = await bounded(Promise.all([
      db.collection('products').aggregate([{ $match: { $expr: { $eq: [{ $cond: [{ $isNumber: '$stock' },
        { $and: [{ $gte: ['$stock', 0] }, { $lte: ['$stock', Number.MAX_SAFE_INTEGER] }, { $eq: ['$stock', { $trunc: '$stock' }] }] }, false] }, false] } } }, { $count: 'count' }], query).toArray(),
      db.collection('orders').aggregate([{ $match: { orderId: { $type: 'string' } } },
        { $group: { _id: '$orderId', count: { $sum: 1 }, maintained: { $max: { $cond: [{ $eq: ['$schemaVersion', 2] }, 1, 0] } } } },
        { $match: { count: { $gt: 1 } } }, { $group: { _id: null, maintained: { $sum: '$maintained' }, legacy: { $sum: { $subtract: [1, '$maintained'] } } } }], query).toArray(),
      db.collection('checkout_requests').aggregate([{ $lookup: { from: 'orders', localField: 'orderId', foreignField: '_id', as: 'order' } },
        { $match: { 'order.0': { $exists: false } } }, { $count: 'count' }], query).toArray(),
      db.collection('orders').aggregate([{ $match: { schemaVersion: 2 } },
        { $lookup: { from: 'checkout_requests', localField: '_id', foreignField: 'orderId', as: 'receipt' } },
        { $match: { 'receipt.0': { $exists: false } } }, { $count: 'count' }], query).toArray(),
      db.collection('orders').aggregate([{ $match: { schemaVersion: 2 } },
        { $addFields: { confirmationId: { $concat: ['confirmation:', { $toString: '$_id' }] } } },
        { $lookup: { from: 'order_outbox', localField: 'confirmationId', foreignField: '_id', as: 'job' } },
        { $match: { 'job.0': { $exists: false } } }, { $count: 'count' }], query).toArray(),
      db.collection('order_outbox').aggregate([{ $match: { state: { $in: ['pending', 'processing', 'failed'] } } },
        { $group: { _id: '$state', count: { $sum: 1 }, oldest: { $min: '$createdAt' } } }], query).toArray(),
      db.collection('webhook_receipts').aggregate([{ $match: { state: 'pending' } },
        { $group: { _id: null, count: { $sum: 1 }, oldest: { $min: '$receivedAt' } } }], query).toArray(),
      db.collection('staff_push_deliveries').aggregate([{ $match: { state: { $in: ['sending', 'retry', 'failed', 'uncertain'] } } },
        { $group: { _id: '$state', count: { $sum: 1 }, oldest: { $min: '$createdAt' } } }], query).toArray(),
      db.collection('order_outbox').aggregate([
        { $lookup: { from: 'notification_controls', pipeline: [{ $match: { _id: 'staff-order-push-v1' } }, { $project: { enabledAt: 1 } }], as: 'pushControl' } },
        { $unwind: '$pushControl' }, { $match: { $expr: { $gte: ['$createdAt', '$pushControl.enabledAt'] }, $or: [
          { pushState: 'failed' }, { pushIssues: { $gt: 0 } }, { pushState: { $ne: 'done' }, createdAt: { $lt: new Date(Date.now() - 600000) } },
        ] } }, { $count: 'count' },
      ], query).toArray(),
    ]), 4000);
    const count = (values: Document[]) => Number(values[0]?.count ?? 0);
    const age = (value: unknown) => value instanceof Date ? Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000)) : null;
    const database = { invalidStockValues: count(stock), maintainedDuplicateOrderNumbers: Number(duplicates[0]?.maintained ?? 0),
      legacyDuplicateOrderNumbers: Number(duplicates[0]?.legacy ?? 0), orphanCheckoutReceipts: count(orphanReceipts),
      ordersMissingReceipts: count(missingReceipts), ordersMissingConfirmationJobs: count(missingJobs),
      outbox: outbox.map(value => ({ state: String(value._id), count: Number(value.count), oldestAgeSeconds: age(value.oldest) })),
      pendingWebhookEvents: count(inbox), oldestPendingWebhookAgeSeconds: age(inbox[0]?.oldest),
      pushDeliveries: push.map(value => ({ state: String(value._id), count: Number(value.count), oldestAgeSeconds: age(value.oldest) })),
      pushJobsNeedingReview: count(pushJobs),
      stockOrderReconciliation: 'operator-required' as const };
    const five = metrics.snapshot(5), ten = metrics.snapshot(10), alerts: string[] = [];
    if (ten.clientJavaScriptErrors !== null && ten.clientJavaScriptErrors > 0) alerts.push('CLIENT_ERROR_REPORTS');
    const total = Object.values(five.groups).reduce((sum, value) => sum + value.count, 0);
    const failures = Object.values(five.groups).reduce((sum, value) => sum + value.failures, 0);
    if (five.warmupComplete && total >= 100 && failures / total > .01) alerts.push('HTTP_5XX_THRESHOLD');
    if (five.warmupComplete && five.groups.checkout.count >= 20 && (five.groups.checkout.failures + five.groups.checkout.aborted) / five.groups.checkout.count > .02) alerts.push('CHECKOUT_FAILURE_THRESHOLD');
    for (const [group, threshold] of [['catalog', 1500], ['checkout', 3000]] as const) {
      if (ten.warmupComplete && ten.groups[group].count >= 20 && (ten.groups[group].p95Over10Seconds || (ten.groups[group].p95UpperBoundMs ?? 0) > threshold)) alerts.push(`${group.toUpperCase()}_LATENCY_THRESHOLD`);
    }
    if (database.invalidStockValues || database.maintainedDuplicateOrderNumbers || database.orphanCheckoutReceipts || database.ordersMissingReceipts || database.ordersMissingConfirmationJobs) alerts.push('COMMERCE_INTEGRITY_REVIEW');
    if (database.pendingWebhookEvents && (database.oldestPendingWebhookAgeSeconds ?? 0) > 300) alerts.push('WEBHOOK_BACKLOG');
    if (database.outbox.some(value => value.state === 'failed' || (value.oldestAgeSeconds ?? 0) > 600)) alerts.push('OUTBOX_REVIEW');
    if (database.pushJobsNeedingReview || database.pushDeliveries.some(value => ['failed', 'uncertain'].includes(value.state) || (value.oldestAgeSeconds ?? 0) > 600)) alerts.push('PUSH_DELIVERY_REVIEW');
    if (five.databaseErrors) alerts.push('DATABASE_ERRORS');
    return { http: five, latency: ten, database, alerts, measurement: 'bounded-read-candidates; reconcile before action' as const };
  } catch { throw new HttpError(503, 'SERVICE_UNAVAILABLE'); }
}
