import { removePushDevice, pushDevices, subscriptionDigest, pushReceiptId } from './push-devices.js';
import { routingRecipients } from '../orders/routing.js';
import { randomUUID } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import { bounded } from '../operations/lifecycle.js';
import { PushFailure, type PushSubscription } from './push.js';

type RecordDocument = Document & { _id: string };
function cursorId(value: unknown): ObjectId | undefined {
  // The persistent service has its own installed BSON constructor; instanceof crosses neither package copy.
  if (!value || typeof value !== 'object' || !('_bsontype' in value) || value._bsontype !== 'ObjectId' || !('toHexString' in value) || typeof value.toHexString !== 'function') return;
  try { const hex: unknown = value.toHexString(); return typeof hex === 'string' && /^[a-f0-9]{24}$/.test(hex) ? new ObjectId(hex) : undefined; } catch { return; }
}
// Independent fields on committed confirmation jobs preserve the SMTP contract.
// Provider acceptance is durable before advancing the cursor. Unknown outcomes never resend.
export async function staffPushOutbox(getDb: () => Promise<Db> | Db, options: {
  send: (subscription: PushSubscription, signal: AbortSignal) => Promise<void>;
  onFailure: () => void; intervalMs?: number; sendTimeoutMs?: number;
}) {
  const interval = options.intervalMs ?? 1000, deadline = options.sendTimeoutMs ?? 10000;
  if (!Number.isInteger(interval) || interval < 1 || interval > 60000 || !Number.isInteger(deadline) || deadline < 1 || deadline > 15000) throw new Error('Invalid push worker bounds');
  const initialDb = await getDb(), query = { timeoutMS: 3000 };
  const controls = initialDb.collection<RecordDocument>('notification_controls');
  const control = await controls.findOneAndUpdate({ _id: 'staff-order-push-v1' }, { $setOnInsert: { enabledAt: new Date() } },
    { ...query, upsert: true, returnDocument: 'after', writeConcern: { w: 'majority' } });
  if (!(control?.enabledAt instanceof Date)) throw new Error('Invalid push activation record');
  const enabledAt = control.enabledAt;
  let stopped = false, running: Promise<void> | undefined;
  async function run() {
    let db: Db | undefined, job: RecordDocument | null = null;
    const token = randomUUID(), cancellation = new AbortController();
    try {
      db = await getDb(); const now = new Date(), jobs = db.collection<RecordDocument>('order_outbox');
      job = await jobs.findOneAndUpdate({ createdAt: { $gte: enabledAt }, pushState: { $nin: ['done', 'failed'] }, $and: [
        { $or: [{ pushNextAttemptAt: { $exists: false } }, { pushNextAttemptAt: { $lte: now } }] },
        { $or: [{ pushLeaseUntil: { $exists: false } }, { pushLeaseUntil: { $lte: now } }] },
      ] }, { $set: { pushLeaseToken: token, pushLeaseUntil: new Date(Date.now() + 60000) } },
      { ...query, sort: { createdAt: 1, _id: 1 }, returnDocument: 'after' });
      if (!job) return;
      const release = { $unset: { pushLeaseToken: '', pushLeaseUntil: '', pushNextAttemptAt: '' } };
      const order = await db.collection('orders').findOne({ _id: job.orderId }, { ...query, projection: { deliveryAssignment: 1, 'customer.city': 1, 'customer.emirate': 1, routing: 1, payment:1, status:1 } });
      if (!order) {
        await jobs.updateOne({ _id: job._id, pushLeaseToken: token }, { ...release, $set: { pushState: 'failed' } }, query); options.onFailure(); return;
      }
      if(order.payment?.provider==='stripe'&&(order.payment.testMode!==false||order.payment.state!=='paid'||order.payment.refundRequested||['cancelled','refunded'].includes(order.status))){
        await jobs.updateOne({_id:job._id,pushLeaseToken:token},{...release,$set:{pushState:'done'}},query);return;
      }
      const scope = await routingRecipients(db, order);
      const cursor = cursorId(job.pushCursor);
      if (job.pushCursor !== undefined && !cursor) throw new Error('Invalid push cursor');
      const user = await db.collection('users').findOne({ ...scope, ...(cursor ? { _id: { $gt: cursor } } : {}) },
        { ...query, sort: { _id: 1 }, projection: { _id: 1, subscription: 1, pushSubscriptions:1 } });
      if (!user) { await jobs.updateOne({ _id: job._id, pushLeaseToken: token }, { ...release, $set: { pushState: 'done' } }, query); return; }
      if (!cursorId(user._id)) {
        await jobs.updateOne({ _id: job._id, pushLeaseToken: token }, { ...release, $set: { pushState: 'failed' } }, query); options.onFailure(); return;
      }
      const receipts = db.collection<RecordDocument>('staff_push_deliveries');
      const devices=pushDevices(user);
      const receiptIds=devices.map(device=>pushReceiptId(job!._id,user._id,device));
      const terminal=['accepted','failed','uncertain','skipped'];
      const advance = async (issue: boolean) => {
        const finished=await receipts.countDocuments({_id:{$in:receiptIds},state:{$in:terminal}},query);
        await jobs.updateOne({ _id:job!._id,pushLeaseToken:token },{...release,...(finished===devices.length?{$set:{pushCursor:user._id}}:{}),...(issue?{$inc:{pushIssues:1}}:{})},query);
      };
      if(!devices.length){ options.onFailure();await advance(true);return; }
      const completed=await receipts.find({_id:{$in:receiptIds},state:{$in:terminal}},{...query,projection:{_id:1}}).toArray();
      const subscription=devices.find(device=>!completed.some(row=>row._id===pushReceiptId(job!._id,user._id,device)));
      if(!subscription){await advance(false);return;}
      const digest=subscriptionDigest(subscription),id=pushReceiptId(job._id,user._id,subscription);
      try { await receipts.insertOne({ _id: id, jobId: job._id, userId: user._id, subscriptionDigest: digest, state: 'pending', attempts: 0, createdAt: now }, { ...query, writeConcern: { w: 'majority' } }); }
      catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error; }
      const receipt = await receipts.findOne({ _id: id }, query);
      if (!receipt) throw new Error('Missing push receipt');
      if (receipt.state === 'accepted') { await advance(false); return; }
      if (receipt.state !== 'pending' && receipt.state !== 'retry') {
        if (receipt.state === 'sending') await receipts.updateOne({ _id: id, state: 'sending' }, { $set: { state: 'uncertain' } }, query);
        await advance(true); return;
      }
      // Authorization/subscription can change between selection and send. Never target a replacement subscription with an old receipt.
      const current = await db.collection('users').findOne({ ...await routingRecipients(db, order), _id: user._id,
        $and:[{ $or:[{pushSubscriptions:{$elemMatch:subscription}},{pushSubscriptions:{$exists:false},'subscription.endpoint':subscription.endpoint,'subscription.keys.p256dh':subscription.keys.p256dh,'subscription.keys.auth':subscription.keys.auth}] }] }, { ...query, projection: { _id: 1 } });
      if (!current) { await receipts.updateOne({ _id: id }, { $set: { state: 'skipped' } }, query); await advance(false); return; }
      const claim = await receipts.updateOne({ _id: id, state: receipt.state, attempts: receipt.attempts },
        { $set: { state: 'sending' }, $inc: { attempts: 1 } }, { ...query, writeConcern: { w: 'majority' } });
      if (claim.modifiedCount !== 1) throw new Error('Push receipt concurrency');
      try { await bounded(options.send(subscription, cancellation.signal), deadline); }
      catch (error) {
        cancellation.abort(); options.onFailure();
        const kind = error instanceof PushFailure ? error.kind : 'uncertain', attempts = Number(receipt.attempts) + 1;
        if (kind === 'expired') await db.collection('users').updateOne({ _id: user._id,
          $or:[{pushSubscriptions:{$elemMatch:subscription}},{pushSubscriptions:{$exists:false},'subscription.endpoint':subscription.endpoint,'subscription.keys.p256dh':subscription.keys.p256dh,'subscription.keys.auth':subscription.keys.auth}] }, removePushDevice(subscription.endpoint), query);
        const retry = kind === 'retryable' && attempts < 8;
        await receipts.updateOne({ _id: id, state: 'sending' }, { $set: { state: retry ? 'retry' : kind === 'uncertain' ? 'uncertain' : 'failed' } }, { ...query, writeConcern: { w: 'majority' } });
        if (retry) await jobs.updateOne({ _id: job._id, pushLeaseToken: token }, { $set: { pushNextAttemptAt: new Date(Date.now() + Math.min(3600000, 10000 * 2 ** Math.min(attempts - 1, 8))) },
          $unset: { pushLeaseToken: '', pushLeaseUntil: '' } }, query);
        else await advance(true);
        return;
      }
      await receipts.updateOne({ _id: id, state: 'sending' }, { $set: { state: 'accepted', acceptedAt: new Date() } }, { ...query, writeConcern: { w: 'majority' } });
      await advance(false);
    } catch {
      cancellation.abort(); options.onFailure();
      // Preserve sending/accepted receipts through DB outages. Lease expiry permits recovery, never a blind resend.
      if (db && job) await db.collection<RecordDocument>('order_outbox').updateOne({ _id: job._id, pushLeaseToken: token },
        { $set: { pushNextAttemptAt: new Date(Date.now() + 10000) }, $unset: { pushLeaseToken: '', pushLeaseUntil: '' } }, query).catch(() => undefined);
    }
  }
  function tick() { if (stopped) return Promise.resolve(); if (!running) running = run().finally(() => { running = undefined; }); return running; }
  const timer = setInterval(() => { void tick(); }, interval); timer.unref();
  return { tick, async stop() { stopped = true; clearInterval(timer); await running; } };
}
