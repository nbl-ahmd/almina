import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Db, Document } from 'mongodb';
import { bounded } from '../operations/lifecycle.js';
import { HttpError } from '../../errors.js';
import { wakeLoop, type Wake } from './wake.js';
import { historicalStatus } from '../orders/status.js';
import { createEmailClient, reserveEmailBudget, resendReady, usesResend } from './provider.js';
import { deliverEmail, type MailMessage, type MailTransport, type SmtpCredentials, type SmtpOptions } from './email.js';

/** Default inbox that learns about every new order even when push, WhatsApp or the admin console are unavailable. */
export const DEFAULT_STAFF_ORDER_RECIPIENT = 'info@alminapharmacy.com';
const recipientSchema = z.email().max(254);
const NON_ORDER_KINDS = ['stock-alert', 'operational-alert', 'test-notification'];

/** `ORDER_ALERT_EMAIL=off` disables the alert; an invalid value also disables it rather than guessing. */
export function staffOrderRecipient(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const raw = env.ORDER_ALERT_EMAIL?.trim();
  if (raw === undefined || raw === '') return DEFAULT_STAFF_ORDER_RECIPIENT;
  if (raw.toLowerCase() === 'off') return undefined;
  const parsed = recipientSchema.safeParse(raw);
  return parsed.success ? parsed.data.toLowerCase() : undefined;
}

/** Minutes after an order arrives at which a reminder goes out if nobody has confirmed it. `ORDER_ALERT_ESCALATION_MINUTES=off` disables. */
export function escalationMinutes(env: NodeJS.ProcessEnv = process.env): number[] {
  const raw = env.ORDER_ALERT_ESCALATION_MINUTES?.trim();
  if (raw === undefined || raw === '') return [5, 15];
  if (raw.toLowerCase() === 'off') return [];
  const values = raw.split(',').map(value => Number(value.trim()));
  if (values.length > 5 || values.some((value, index) => !Number.isInteger(value) || value < 1 || value > 1440 || (index > 0 && value <= values[index - 1]!))) return [5, 15];
  return values;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : '';
const aed = (minor: unknown) => typeof minor === 'number' && Number.isFinite(minor) ? `AED ${(minor / 100).toFixed(2)}` : 'total unavailable';

/** Staff-facing summary of a committed order. Contains no phone number or e-mail: staff open the console for those. */
export function staffOrderMessage(order: Document, to: string, adminOrigin?: string, reminder?: { stage: number; waitingMinutes: number }): MailMessage & { text: string; html: string } {
  const orderId = z.string().regex(/^OD[0-9]+$/).parse(order.orderId);
  const lines = Array.isArray(order.lines) ? (order.lines as Document[]).slice(0, 30) : [];
  const total = aed(order.totals?.totalMinor);
  const area = clean(order.customer?.city, 60) || clean(order.customer?.emirate, 60) || 'delivery area not set';
  const method = order.payment?.provider === 'stripe' ? 'Paid online' : 'Cash on delivery';
  const rows = lines.map((line) => ({ name: clean(line.name, 120) || 'Item', quantity: Number.isInteger(line.quantity) ? Number(line.quantity) : 1 }));
  const link = adminOrigin && /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/.test(adminOrigin) ? `${adminOrigin}/admin/orders?status=pending` : undefined;
  const lead = reminder ? `REMINDER: order ${orderId} has waited ${reminder.waitingMinutes} min without confirmation` : `New order ${orderId}: ${total}`;
  const text = [lead, ...(reminder ? [`Total: ${total}`] : []), `Area: ${area}`, `Payment: ${method}`, '', ...rows.map((row) => `${row.quantity} x ${row.name}`),
    ...(Array.isArray(order.lines) && order.lines.length > lines.length ? [`and ${order.lines.length - lines.length} more`] : []),
    '', link ? `Open the order inbox: ${link}` : 'Open the admin order inbox to confirm it.'].join('\n');
  const html = `<p><strong>${reminder ? `Reminder: order ${escapeHtml(orderId)} has waited ${reminder.waitingMinutes} min without confirmation` : `New order ${escapeHtml(orderId)}`}</strong> &middot; ${escapeHtml(total)}</p><p>Area: ${escapeHtml(area)}<br>Payment: ${escapeHtml(method)}</p>`
    + `<ul>${rows.map((row) => `<li>${row.quantity} &times; ${escapeHtml(row.name)}</li>`).join('')}</ul>`
    + (link ? `<p><a href="${escapeHtml(link)}">Open the order inbox</a></p>` : '<p>Open the admin order inbox to confirm it.</p>');
  return { to, subject: reminder ? `REMINDER (${reminder.waitingMinutes} min): order ${orderId} is still unconfirmed` : `New order ${orderId} · ${total} · ${area}`, text, html,
    messageId: `<almina-staff-order-${orderId}${reminder ? `-r${reminder.stage}` : ''}@alminapharmacy.com>` };
}

export function staffEmailConfigured(env: NodeJS.ProcessEnv = process.env) {
  if (!staffOrderRecipient(env)) return false;
  return usesResend() ? resendReady() : Boolean(env.SMTP_USER && env.SMTP_PASSWORD);
}

type Delivery = { resend?: (db: Db, message: MailMessage, signal: AbortSignal) => Promise<void>;
  smtp?: (message: MailMessage, signal: AbortSignal) => Promise<void> };
async function sendViaResend(db: Db, message: MailMessage, signal: AbortSignal) {
  if (!resendReady() || signal.aborted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  await reserveEmailBudget(db, false);
  const key = (message.messageId ?? message.subject).replace(/[^A-Za-z0-9._-]/g, '').slice(0, 120);
  const { data, error } = await createEmailClient(process.env.RESEND_API_KEY!).emails.send({
    from: `Al Mina Orders <orders@${process.env.EMAIL_TRANSACTIONAL_DOMAIN}>`, to: [message.to], replyTo: process.env.EMAIL_REPLY_TO!,
    subject: message.subject, text: message.text!, html: message.html!, tags: [{ name: 'category', value: 'staff-order' }],
  }, { idempotencyKey: `almina/staff-order/${key}`, signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
  if (error || !data?.id) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
}
const smtpFactory = (factory: (options: SmtpOptions) => MailTransport) =>
  (message: MailMessage, signal: AbortSignal) => deliverEmail({ ...message, from: process.env.SMTP_USER },
    { user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD } satisfies SmtpCredentials, factory, signal);

/**
 * Independent safety net for new orders: one e-mail per order to the shop inbox, tracked by its own fields on the order
 * job (`staffEmail*`) so push, customer e-mail and this alert never block each other. Only orders created after the first
 * start are announced, so enabling it never floods the inbox with history. Provider acceptance is recorded before the
 * job is closed; a provider idempotency key and a deterministic Message-ID cover the unavoidable at-least-once window.
 */
export async function staffOrderEmailOutbox(getDb: () => Promise<Db> | Db, options: {
  onFailure: () => void; adminOrigin?: string; intervalMs?: number; sendTimeoutMs?: number; maxAttempts?: number; wake?: Wake;
  smtpFactory?: (options: SmtpOptions) => MailTransport; delivery?: Delivery;
  /** Minutes after arrival at which an unconfirmed order is reminded about. Defaults to ORDER_ALERT_ESCALATION_MINUTES (5 and 15). */
  escalateAfterMinutes?: number[];
}) {
  const recipient = staffOrderRecipient();
  if (!recipient) throw new Error('Staff order e-mail is not configured');
  const timeout = options.sendTimeoutMs ?? 15000, maxAttempts = options.maxAttempts ?? 8, query = { timeoutMS: 5000 };
  const initialDb = await getDb();
  const control = await initialDb.collection<Document & { _id: string }>('notification_controls').findOneAndUpdate({ _id: 'staff-order-email-v1' },
    { $setOnInsert: { enabledAt: new Date() } }, { ...query, upsert: true, returnDocument: 'after', writeConcern: { w: 'majority' } });
  if (!(control?.enabledAt instanceof Date)) throw new Error('Invalid staff e-mail activation record');
  const enabledAt = control.enabledAt;
  const resend = options.delivery?.resend ?? sendViaResend;
  const smtp = options.delivery?.smtp ?? (options.smtpFactory ? smtpFactory(options.smtpFactory) : undefined);
  const stages = options.escalateAfterMinutes ?? escalationMinutes();
  let stopped = false, running: Promise<void> | undefined;

  /** Reminders for orders nobody has confirmed. Each stage is sent at most once per order, leased like the first e-mail,
   *  and the order is re-read first so a confirmed, cancelled or unpaid order never produces a reminder. */
  async function remind() {
    if (!stages.length) return;
    let db: Db | undefined, job: Document | null = null;
    const token = randomUUID(), cancellation = new AbortController();
    try {
      db = await getDb(); const now = new Date(), jobs = db.collection('order_outbox');
      const due = stages.map((minutes, stage) => ({ staffEmailReminders: stage, createdAt: { $lte: new Date(now.getTime() - minutes * 60000) } }));
      job = await jobs.findOneAndUpdate({ createdAt: { $gte: enabledAt }, kind: { $nin: NON_ORDER_KINDS }, staffEmailState: 'sent', $and: [
        { $or: [{ staffEmailReminders: { $exists: false } }, { staffEmailReminders: { $lt: stages.length } }] },
        { $or: [{ staffReminderNextAt: { $exists: false } }, { staffReminderNextAt: { $lte: now } }] },
        { $or: [{ staffReminderLeaseUntil: { $exists: false } }, { staffReminderLeaseUntil: { $lte: now } }] },
        { $or: due.map(clause => clause.staffEmailReminders === 0 ? { $or: [{ staffEmailReminders: { $exists: false } }, { staffEmailReminders: 0 }], createdAt: clause.createdAt } : clause) },
      ] }, { $set: { staffReminderLeaseToken: token, staffReminderLeaseUntil: new Date(Date.now() + 60000) } },
      { ...query, sort: { createdAt: 1, _id: 1 }, returnDocument: 'after' });
      if (!job) return;
      const stage = Number(job.staffEmailReminders ?? 0);
      const release = { $unset: { staffReminderLeaseToken: '', staffReminderLeaseUntil: '', staffReminderNextAt: '' } };
      const order = await db.collection('orders').findOne({ _id: job.orderId }, query);
      const unpaidOnline = order?.payment?.provider === 'stripe' && (order.payment.testMode !== false || order.payment.state !== 'paid' || order.payment.refundRequested);
      if (!order || unpaidOnline || historicalStatus(order) !== 'pending') {
        await jobs.updateOne({ _id: job._id, staffReminderLeaseToken: token }, { ...release, $set: { staffEmailReminders: stages.length } }, query); return;
      }
      const waitingMinutes = Math.max(1, Math.round((now.getTime() - new Date(job.createdAt).getTime()) / 60000));
      const message = staffOrderMessage(order, recipient!, options.adminOrigin, { stage: stage + 1, waitingMinutes });
      const deliver = usesResend() ? () => resend(db!, message, cancellation.signal) : smtp ? () => smtp(message, cancellation.signal) : undefined;
      if (!deliver) throw new Error('No e-mail transport configured');
      await bounded(deliver(), timeout);
      await jobs.updateOne({ _id: job._id, staffReminderLeaseToken: token }, { ...release, $set: { staffEmailReminders: stage + 1 } }, query);
    } catch {
      cancellation.abort(); options.onFailure();
      if (db && job) await db.collection('order_outbox').updateOne({ _id: job._id, staffReminderLeaseToken: token },
        { $set: { staffReminderNextAt: new Date(Date.now() + 60000) }, $unset: { staffReminderLeaseToken: '', staffReminderLeaseUntil: '' } }, query).catch(() => undefined);
    }
  }

  async function run() {
    let db: Db | undefined, job: Document | null = null;
    const token = randomUUID(), cancellation = new AbortController();
    try {
      db = await getDb(); const now = new Date(), jobs = db.collection('order_outbox');
      job = await jobs.findOneAndUpdate({ createdAt: { $gte: enabledAt }, kind: { $nin: NON_ORDER_KINDS }, staffEmailState: { $nin: ['sent', 'failed', 'skipped'] }, $and: [
        { $or: [{ staffEmailNextAttemptAt: { $exists: false } }, { staffEmailNextAttemptAt: { $lte: now } }] },
        { $or: [{ staffEmailLeaseUntil: { $exists: false } }, { staffEmailLeaseUntil: { $lte: now } }] },
      ] }, { $set: { staffEmailLeaseToken: token, staffEmailLeaseUntil: new Date(Date.now() + 60000) }, $inc: { staffEmailAttempts: 1 } },
      { ...query, sort: { createdAt: 1, _id: 1 }, returnDocument: 'after' });
      if (!job) return;
      const release = { $unset: { staffEmailLeaseToken: '', staffEmailLeaseUntil: '', staffEmailNextAttemptAt: '' } };
      const order = await db.collection('orders').findOne({ _id: job.orderId }, query);
      const unpaidOnline = order?.payment?.provider === 'stripe' && (order.payment.testMode !== false || order.payment.state !== 'paid' || order.payment.refundRequested);
      if (!order || unpaidOnline) { await jobs.updateOne({ _id: job._id, staffEmailLeaseToken: token }, { ...release, $set: { staffEmailState: 'skipped' } }, query); return; }
      const message = staffOrderMessage(order, recipient!, options.adminOrigin);
      const deliver = usesResend() ? () => resend(db!, message, cancellation.signal) : smtp ? () => smtp(message, cancellation.signal) : undefined;
      if (!deliver) throw new Error('No e-mail transport configured');
      await bounded(deliver(), timeout);
      await jobs.updateOne({ _id: job._id, staffEmailLeaseToken: token }, { ...release, $set: { staffEmailState: 'sent', staffEmailSentAt: new Date() } }, query);
    } catch {
      cancellation.abort(); options.onFailure();
      if (db && job) {
        const attempts = Number(job.staffEmailAttempts ?? 1);
        await db.collection('order_outbox').updateOne({ _id: job._id, staffEmailLeaseToken: token },
          { $set: attempts >= maxAttempts ? { staffEmailState: 'failed' } : { staffEmailState: 'retry', staffEmailNextAttemptAt: new Date(Date.now() + Math.min(900000, 10000 * 2 ** Math.min(attempts - 1, 6))) },
            $unset: { staffEmailLeaseToken: '', staffEmailLeaseUntil: '' } }, query).catch(() => undefined);
      }
    }
  }
  function tick() { if (stopped) return Promise.resolve(); if (!running) running = run().then(remind).finally(() => { running = undefined; }); return running; }
  const loop = wakeLoop(tick, { fastMs: options.intervalMs ?? 5000, slowMs: 30000, wake: options.wake });
  return { tick, async stop() { stopped = true; loop.stop(); await running; } };
}
