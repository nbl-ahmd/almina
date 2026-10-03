const { randomUUID } = require('node:crypto');
const { sendOrderConfirmation } = require('../integrations/order-email.cjs');
// SMTP is at-least-once: a crash after provider acceptance can send a duplicate. Never creates orders.
function startOrderOutbox(getDb, { send = sendOrderConfirmation, onFailure = () => console.error('Order notification delivery failed') } = {}) {
  let active = false;
  let stopped = false;
  async function tick() {
    if (active || stopped) return;
    active = true;
    let db, job, leaseToken;
    try {
      db = await getDb();
      const now = new Date();
      job = await db.collection('order_outbox').findOne({ $or: [
        { state: 'pending', nextAttemptAt: { $exists: false } }, { state: 'pending', nextAttemptAt: { $lte: now } },
        { state: 'processing', leaseUntil: { $lte: now } },
      ] }, { sort: { createdAt: 1 }, maxTimeMS: 3000 });
      if (!job) return;
      leaseToken = randomUUID();
      const result = await db.collection('order_outbox').updateOne({ _id: job._id, state: job.state,
        ...(job.leaseToken ? { leaseToken: job.leaseToken } : {}) },
      { $set: { state: 'processing', leaseToken, leaseUntil: new Date(Date.now() + 60000) }, $inc: { attempts: 1 } });
      if (result.modifiedCount !== 1) return;
      const order = await db.collection('orders').findOne({ _id: job.orderId });
      if (!order) throw new Error('Missing committed order');
      await send(order);
      await db.collection('order_outbox').updateOne({ _id: job._id, leaseToken }, { $set: { state: 'sent', sentAt: new Date() }, $unset: { leaseToken: '', leaseUntil: '' } });
    } catch {
      onFailure();
      if (db && job && leaseToken) await db.collection('order_outbox').updateOne({ _id: job._id, leaseToken },
        { $set: { state: 'pending', nextAttemptAt: new Date(Date.now() + Math.min(3600000, 10000 * 2 ** Math.min(job.attempts ?? 0, 8))) },
          $unset: { leaseToken: '', leaseUntil: '' } }).catch(() => undefined);
    } finally { active = false; }
  }
  const timer = setInterval(() => { void tick(); }, 5000); timer.unref();
  return { tick, stop() { stopped = true; clearInterval(timer); } };
}
module.exports = { startOrderOutbox };
