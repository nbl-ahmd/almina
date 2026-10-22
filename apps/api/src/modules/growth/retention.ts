import { retailAudienceFilter } from '../catalog/audience.js';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import nodemailer from 'nodemailer';
import { usesResend, resendReady, sendApplicationEmail, EmailBudgetExceeded, type EmailKind } from '../notifications/provider.js';
import { reminderInputSchema, retentionPolicySchema, type RetentionPolicy } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { customerOrderFilter } from './ownership.js';

const day = 86400000;
type RecordWithKey = Document & { _id: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const query = { maxTimeMS: 3000 };
export const retentionProviderReady = () => process.env.GROWTH_EMAIL_ENABLED === 'true'
  && (usesResend() ? resendReady(true) : Boolean(process.env.CUSTOMER_EMAIL_USER && process.env.CUSTOMER_EMAIL_PASSWORD));
export async function retentionPolicy(db: Db) {
  const row = await db.collection<RecordWithKey>('growth_settings').findOne({ _id: 'retention' }, query);
  return retentionPolicySchema.parse(Object.fromEntries(Object.keys(retentionPolicySchema.shape).flatMap(key => row?.[key] === undefined ? [] : [[key, row[key]]])));
}
export async function saveRetentionPolicy(db: Db, raw: unknown, actor: string) {
  const input = retentionPolicySchema.safeParse(raw);
  if (!input.success) throw new HttpError(400, 'INVALID_REQUEST');
  try {
    const row = await db.collection<RecordWithKey>('growth_settings').findOneAndUpdate(
      { _id: 'retention', revision: input.data.revision },
      { $set: { ...input.data, revision: input.data.revision + 1, updatedAt: new Date(), actor } },
      { upsert: input.data.revision === 0, returnDocument: 'after', ...query });
    if (!row) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  } catch (error) { if (error && typeof error === 'object' && 'code' in error && error.code === 11000) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT'); throw error; }
  return retentionPolicy(db);
}
export function reminderEnabled(policy: RetentionPolicy, kind: string) {
  return policy.enabled && ({ restock: policy.restock, 'price-drop': policy.priceDrop, replenishment: policy.replenishment, cart: policy.cartRecovery }[kind] === true);
}
export async function generalProducts(db: Db, ids: string[]) {
  return db.collection('products').aggregate<Document>([
    { $match: { _id: { $in: ids.map(id => new ObjectId(id)) }, productType: 'general', contentReviewed: true,
      disabled: { $ne: true }, ...retailAudienceFilter, published: { $ne: false }, active: { $ne: false }, archivedAt: { $exists: false },
      price: { $type: 'number', $gte: 0 }, stock: { $type: 'number', $gte: 0 } } },
    { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', pipeline: [{ $match: { archivedAt: { $exists: false }, disabled: { $ne: true } } }], as: '_category' } },
    { $match: { '_category.0': { $exists: true } } }, { $project: { _id: 1, product_id: 1, name: 1, stock: 1, price: 1, sale: 1, salePrice: 1 } },
  ], query).toArray();
}
const priceMinor = (product: Document) => Math.round((product.sale === true && typeof product.salePrice === 'number' && product.salePrice >= 0 && product.salePrice <= product.price ? product.salePrice : product.price) * 100);
export async function customerReminders(db: Db, customerId: string) {
  const rows = await db.collection<RecordWithKey>('customer_reminders').find({ customerId: new ObjectId(customerId) }, { ...query,
    projection: { kind: 1, productName: 1, state: 1, dueAt: 1, createdAt: 1, expiresAt: 1 } }).sort({ updatedAt: -1 }).limit(40).toArray();
  return rows.map(row => ({ id: row._id, kind: row.kind, productName: row.productName, state: row.expiresAt < new Date() ? 'expired' : row.state, dueAt: row.dueAt, createdAt: row.createdAt }));
}
export async function updateCustomerReminder(db: Db, customerId: string, raw: unknown, now = new Date()) {
  const parsed = reminderInputSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const input = parsed.data, owner = new ObjectId(customerId), reminders = db.collection<RecordWithKey>('customer_reminders');
  if (input.operation === 'cancel') {
    await reminders.updateOne({ _id: input.id, customerId: owner }, { $set: { state: 'cancelled', updatedAt: now }, $inc: { revision: 1 } }, query);
    return customerReminders(db, customerId);
  }
  const policy = await retentionPolicy(db);
  if (!reminderEnabled(policy, input.kind) || !retentionProviderReady()) throw new HttpError(409, 'REMINDERS_UNAVAILABLE');
  const items = input.kind === 'cart' ? input.items! : [{ id: input.productId!, quantity: 1 }];
  if (new Set(items.map(item => item.id)).size !== items.length) throw new HttpError(400, 'INVALID_REQUEST');
  const products = await generalProducts(db, items.map(item => item.id));
  if (products.length !== items.length) throw new HttpError(409, 'REMINDER_PRODUCT_INELIGIBLE');
  const product = products[0]!;
  if (input.kind === 'restock' && product.stock > 0) throw new HttpError(409, 'REMINDER_PRODUCT_INELIGIBLE');
  const id = `${customerId}:${input.kind}:${input.productId ?? 'basket'}`;
  const session = db.client.startSession();
  try { await session.withTransaction(async () => {
    // Serialize each owner's bounded set, including concurrent subscriptions to different products.
    const ownerResult = await db.collection('customers').updateOne({ _id: owner, disabled: { $ne: true } }, { $inc: { reminderRevision: 1 } }, { session });
    if (!ownerResult.matchedCount) throw new HttpError(401, 'UNAUTHORIZED');
    const existing = await reminders.findOne({ _id: id }, { session });
    if ((!existing || ['cancelled', 'sent', 'expired', 'uncertain'].includes(existing.state)) && await reminders.countDocuments({ customerId: owner, state: { $in: ['waiting', 'processing', 'sending'] } }, { session }) >= 20)
      throw new HttpError(409, 'REMINDER_LIMIT');
    await reminders.updateOne({ _id: id }, { $set: {
      customerId: owner, kind: input.kind, productName: input.kind === 'cart' ? 'Your saved basket' : String(product.name), items,
      baselineMinor: priceMinor(product), state: 'waiting', consentVersion: 'requested-reminder-v1', consentedAt: now,
      dueAt: new Date(now.getTime() + (input.kind === 'cart' ? policy.cartDelayHours * 3600000 : input.kind === 'replenishment' ? input.days! * day : 0)),
      nextCheckAt: now, createdAt: now, updatedAt: now, expiresAt: new Date(now.getTime() + (input.kind === 'replenishment' ? input.days! + 30 : 90) * day),
      unsubscribeHash: hash(randomBytes(32).toString('base64url')),
    }, $inc: { revision: 1 }, $unset: { leaseUntil: '', leaseToken: '', sentAt: '' } }, { upsert: true, session });
  }); } finally { await session.endSession(); }
  return customerReminders(db, customerId);
}
export async function restoreRecoveryCart(db: Db, customerId: string, raw: unknown) {
  const id = raw && typeof raw === 'object' && 'id' in raw && typeof raw.id === 'string' ? raw.id : '';
  if (!id || id.length > 100 || Object.keys(raw as object).some(key => key !== 'id')) throw new HttpError(400, 'INVALID_REQUEST');
  const row = await db.collection<RecordWithKey>('customer_reminders').findOne({ _id: id, customerId: new ObjectId(customerId), kind: 'cart', expiresAt: { $gt: new Date() }, state: { $nin: ['cancelled', 'expired'] } }, query);
  if (!row) throw new HttpError(404, 'NOT_FOUND');
  const products = await generalProducts(db, row.items.map((item: { id: string }) => item.id));
  return products.filter(product => product.stock > 0).map(product => ({ id: String(product._id), quantity: Math.min(99, product.stock, row.items.find((item: { id: string }) => item.id === String(product._id)).quantity) }));
}
export async function unsubscribeReminder(db: Db, token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(400, 'INVALID_REQUEST');
  await db.collection('customer_reminders').updateOne({ unsubscribeHash: hash(token) }, { $set: { state: 'cancelled', updatedAt: new Date() }, $inc: { revision: 1 } }, query);
  return { cancelled: true };
}

type Delivery = { to: string; kind: string; accountUrl: string; unsubscribeUrl: string; messageId: string };
async function sendReminder(message: Delivery, db: Db) {
  if (usesResend()) { await sendApplicationEmail(db, { kind: message.kind as EmailKind, to: message.to, eventId: message.messageId,
    variables: { ACCOUNT_URL: message.accountUrl, CANCEL_URL: message.unsubscribeUrl } }); return; }
  const transport = nodemailer.createTransport({ host: 'smtp.office365.com', port: 587, secure: false, requireTLS: true,
    auth: { user: process.env.CUSTOMER_EMAIL_USER, pass: process.env.CUSTOMER_EMAIL_PASSWORD }, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 4000, greetingTimeout: 4000, socketTimeout: 8000, disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false });
  try { await transport.sendMail({ from: process.env.CUSTOMER_EMAIL_USER, to: message.to, messageId: message.messageId,
    subject: 'Your requested Al Mina reminder',
    text: `A ${message.kind === 'cart' ? 'saved basket' : message.kind.replace('-', ' ')} reminder you requested is ready. View your account to check current products, prices and availability: ${message.accountUrl}\n\nYou are receiving this because you requested this reminder. Cancel it: ${message.unsubscribeUrl}\n\nAl Mina Pharmacy, Ras Al Khaimah.`,
  }); } finally { transport.close(); }
}

/** Opt-in, one-shot messages. Ambiguous SMTP results are never automatically resent. */
export function retentionWorker(getDb: () => Promise<Db>, options: { origin: string; send?: (message: Delivery) => Promise<void>; enabled?: boolean; intervalMs?: number; now?: () => Date; onFailure?: () => void }) {
  const origin = new URL(options.origin);
  if (origin.username || origin.password || origin.pathname !== '/' || !['http:', 'https:'].includes(origin.protocol) || origin.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(origin.hostname)) throw new Error('Invalid reminder origin');
  let stopped = false, running: Promise<void> | undefined;
  async function run() {
    if (!(options.enabled ?? retentionProviderReady())) return;
    const now = options.now?.() ?? new Date(), db = await getDb(), policy = await retentionPolicy(db);
    if (!policy.enabled) return;
    const reminders = db.collection<RecordWithKey>('customer_reminders');
    await reminders.updateMany({ state: 'sending', leaseUntil: { $lte: now } }, { $set: { state: 'uncertain', updatedAt: now } }, query);
    const leaseToken = randomUUID();
    const row = await reminders.findOneAndUpdate({ expiresAt: { $gt: now }, $or: [{ state: 'waiting', nextCheckAt: { $lte: now } }, { state: 'processing', leaseUntil: { $lte: now } }] },
      { $set: { state: 'processing', leaseToken, leaseUntil: new Date(now.getTime() + 60000), nextCheckAt: new Date(now.getTime() + 3600000) } }, { returnDocument: 'after', sort: { nextCheckAt: 1 }, ...query });
    if (!row) return;
    const predicate = { _id: row._id, state: 'processing', revision: row.revision, leaseToken };
    const wait = () => reminders.updateOne(predicate, { $set: { state: 'waiting' }, $unset: { leaseToken: '', leaseUntil: '' } }, query);
    try {
      if (!reminderEnabled(policy, row.kind) || row.dueAt > now) { await wait(); return; }
      const customer = await db.collection('customers').findOne({ _id: row.customerId, disabled: { $ne: true }, verifiedAt: { $type: 'date' } }, { ...query, projection: { email: 1 } });
      const products = await generalProducts(db, row.items.map((item: { id: string }) => item.id));
      if (!customer || products.length !== row.items.length) { await reminders.updateOne(predicate, { $set: { state: 'cancelled' } }, query); return; }
      const purchased = await db.collection('orders').findOne({ ...customerOrderFilter(String(customer.email)), createdAt: { $gte: row.consentedAt }, status: { $nin: ['cancelled', 'refunded'] },
        ...(row.kind === 'replenishment' ? { 'totals.lines.productId': { $in: row.items.map((item: { id: string }) => item.id) } } : {}) }, { ...query, projection: { _id: 1 } });
      if (purchased && ['cart', 'replenishment'].includes(row.kind)) { await reminders.updateOne(predicate, { $set: { state: 'cancelled' } }, query); return; }
      const ready = row.kind === 'restock' ? products[0]!.stock > 0 : row.kind === 'price-drop' ? products[0]!.stock > 0 && priceMinor(products[0]!) < row.baselineMinor : products.some(product => product.stock > 0);
      if (!ready) { await wait(); return; }
      const token = randomBytes(32).toString('base64url');
      const claimed = await reminders.updateOne(predicate, { $set: { state: 'sending', unsubscribeHash: hash(token), updatedAt: now } }, query);
      if (!claimed.modifiedCount) return; // Consent was cancelled or replaced while evaluating.
      try {
        await (options.send ?? (message => sendReminder(message, db)))({ to: String(customer.email), kind: row.kind, accountUrl: new URL('/account#reminders', origin).href,
          unsubscribeUrl: new URL('/unsubscribe?token=' + token, origin).href, messageId: `<${hash(row._id + ':' + row.revision)}@alminapharmacy.com>` });
        await reminders.updateOne({ _id: row._id, state: 'sending', leaseToken }, { $set: { state: 'sent', sentAt: now }, $unset: { leaseToken: '', leaseUntil: '' } }, query);
      } catch (error) {
        if (error instanceof EmailBudgetExceeded) { await reminders.updateOne({ _id: row._id, state: 'sending', leaseToken }, { $set: { state: 'waiting' }, $unset: { leaseToken: '', leaseUntil: '' } }, query); return; }
        await reminders.updateOne({ _id: row._id, state: 'sending', leaseToken }, { $set: { state: 'uncertain' } }, query); options.onFailure?.(); }
    } catch { await wait().catch(() => undefined); options.onFailure?.(); }
  }
  const tick = () => { if (stopped) return Promise.resolve(); if (!running) running = run().catch(() => { options.onFailure?.(); }).finally(() => { running = undefined; }); return running; };
  const timer = setInterval(() => { void tick(); }, options.intervalMs ?? 30000); timer.unref();
  return { tick, async stop() { stopped = true; clearInterval(timer); await running; } };
}
