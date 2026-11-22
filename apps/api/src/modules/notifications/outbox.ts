import { randomUUID } from 'node:crypto';
import type { Db, Document } from 'mongodb';
import { bounded } from '../operations/lifecycle.js';
import { wakeLoop, type Wake } from './wake.js';
// SMTP provides at-least-once delivery, even with a deterministic Message-ID.
export function orderOutbox(getDb: () => Promise<Db> | Db, options: {
  send: (order: Document, signal: AbortSignal) => Promise<void>; onFailure: () => void;
  sendTimeoutMs?: number; intervalMs?: number; maxAttempts?: number;
  /** When healthy, the worker ticks on order changes and only keeps a slow safety interval. */
  wake?: Wake;
}) {
  let stopped = false;
  let running: Promise<void> | undefined;
  const sendTimeoutMs = options.sendTimeoutMs ?? 15000;
  if (sendTimeoutMs < 1 || sendTimeoutMs > 30000) throw new Error('Invalid notification deadline');
  async function run() {
    let db: Db | undefined, job: Document | null = null, leaseToken: string | undefined;
    const cancellation = new AbortController();
    try {
      db = await getDb(); const now = new Date();
      job = await db.collection('order_outbox').findOne({ $or: [
        { state: 'pending', nextAttemptAt: { $exists: false } }, { state: 'pending', nextAttemptAt: { $lte: now } },
        { state: 'processing', leaseUntil: { $lte: now } },
      ] }, { sort: { createdAt: 1 }, maxTimeMS: 3000 });
      if (!job) return;
      leaseToken = randomUUID();
      const result = await db.collection('order_outbox').updateOne({ _id: job._id, state: job.state,
        ...(job.leaseToken ? { leaseToken: job.leaseToken } : {}) },
      { $set: { state: 'processing', leaseToken, leaseUntil: new Date(Date.now() + 60000) }, $inc: { attempts: 1 } });
      if (result.modifiedCount !== 1) { leaseToken = undefined; return; }
      const order = await db.collection('orders').findOne({ _id: job.orderId }, { maxTimeMS: 3000 });
      if (!order) throw new Error('Missing committed order');
      if(order.payment?.provider==='stripe'&&(order.payment.testMode!==false||order.payment.state!=='paid'||order.payment.refundRequested||['cancelled','refunded'].includes(order.status))){
        await db.collection('order_outbox').updateOne({_id:job._id,leaseToken},{$set:{state:'cancelled',pushState:'done'},$unset:{leaseToken:'',leaseUntil:''}});return;
      }
      await bounded(options.send(order, cancellation.signal), sendTimeoutMs);
      await db.collection('order_outbox').updateOne({ _id: job._id, leaseToken },
        { $set: { state: 'sent', sentAt: new Date() }, $unset: { leaseToken: '', leaseUntil: '' } });
    } catch {
      cancellation.abort(); options.onFailure();
      if (db && job && leaseToken) await db.collection('order_outbox').updateOne({ _id: job._id, leaseToken },
        { $set: { state: (job.attempts ?? 0) + 1 >= (options.maxAttempts ?? 8) ? 'failed' : 'pending',
          nextAttemptAt: new Date(Date.now() + Math.min(3600000, 10000 * 2 ** Math.min(job.attempts ?? 0, 8))) },
          $unset: { leaseToken: '', leaseUntil: '' } }).catch(() => undefined);
    }
  }
  function tick(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (!running) running = run().finally(() => { running = undefined; });
    return running;
  }
  const loop = wakeLoop(tick, { fastMs: options.intervalMs ?? 5000, slowMs: 30000, wake: options.wake });
  return { tick, async stop() { stopped = true; loop.stop(); await running; } };
}
