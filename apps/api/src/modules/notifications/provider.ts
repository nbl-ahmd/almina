import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import { z } from 'zod';
import type { Db, Document } from 'mongodb';
import { HttpError } from '../../errors.js';

export type EmailKind = 'signin' | 'order' | 'wholesale-invite' | 'cart' | 'restock' | 'price-drop' | 'replenishment';
/** Fully rendered content for kinds that are built in code instead of by a hosted Resend template (the order confirmation). */
export type RenderedContent = { subject: string; html: string; text: string };
export type ApplicationEmail = { kind: EmailKind; to: string; eventId: string; variables: Record<string, string | number>; content?: RenderedContent };
const address = z.email().max(254);
export const emailHash = (value: string) => createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
export const usesResend = () => process.env.EMAIL_PROVIDER === 'resend';
export function resendReady(marketing = false) {
  const key = process.env[marketing ? 'RESEND_MARKETING_API_KEY' : 'RESEND_API_KEY'];
  const domain = process.env[marketing ? 'EMAIL_MARKETING_DOMAIN' : 'EMAIL_TRANSACTIONAL_DOMAIN'];
  return usesResend() && Boolean(key?.startsWith('re_') && domain && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)
    && !domain.endsWith('.resend.dev') && (!marketing || /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/.test(process.env.EMAIL_PUBLIC_API_ORIGIN ?? '')) && address.safeParse(process.env.EMAIL_REPLY_TO).success);
}
export function customerEmailReady() {
  return usesResend() ? resendReady() : Boolean(process.env.CUSTOMER_EMAIL_USER && process.env.CUSTOMER_EMAIL_PASSWORD);
}
export class EmailBudgetExceeded extends Error { constructor() { super('EMAIL_BUDGET_EXCEEDED'); } }
export function emailBudgetQuery(day: string, marketing: boolean) {
  return { $expr: { $and: [
    { $lt: [{ $ifNull: ['$total', 0] }, 3000] },
    { $lt: [{ $ifNull: [`$days.${day}.total`, 0] }, 100] },
    ...(marketing ? [{ $lt: [{ $ifNull: ['$marketing', 0] }, 500] },
      { $lt: [{ $ifNull: [`$days.${day}.marketing`, 0] }, 20] }] : []),
  ] } };
}
/** Conservative attempt budget shared by all API instances; failed sends also consume capacity.
 * Resend dashboard sends/inbound traffic are outside this application's counters.
 */
export async function reserveEmailBudget(db: Db, marketing: boolean, now = new Date()) {
  const month = now.toISOString().slice(0, 7), day = now.toISOString().slice(0, 10).replaceAll('-', '');
  const usage = db.collection<Document & { _id: string }>('email_usage');
  try { await usage.updateOne({ _id: month }, { $setOnInsert: { createdAt: now } }, { upsert: true, maxTimeMS: 3000 }); }
  catch (error) { if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 11000) throw error; }
  const result = await usage.updateOne({ _id: month, ...emailBudgetQuery(day, marketing) },
    { $inc: { total: 1, [`days.${day}.total`]: 1, ...(marketing ? { marketing: 1, [`days.${day}.marketing`]: 1 } : {}) } }, { maxTimeMS: 3000 });
  if (!result.modifiedCount) throw new EmailBudgetExceeded();
}
export function oneClickUrl(cancelUrl: string) {
  const origin = new URL(process.env.EMAIL_PUBLIC_API_ORIGIN ?? '');
  const token = new URL(cancelUrl).searchParams.get('token');
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || !token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  return new URL('/api/v1/email/unsubscribe/' + token, origin).href;
}
export function applicationEmailRequest(message: ApplicationEmail) {
  const marketing = !['signin', 'order', 'wholesale-invite'].includes(message.kind);
  const domain = process.env[marketing ? 'EMAIL_MARKETING_DOMAIN' : 'EMAIL_TRANSACTIONAL_DOMAIN'];
  const sender = message.kind === 'signin' ? 'Al Mina Accounts <noreply' : ['order', 'wholesale-invite'].includes(message.kind) ? 'Al Mina Orders <orders' : 'Al Mina Pharmacy <offers';
  if (!address.safeParse(message.to).success || !message.eventId || message.eventId.length > 240) throw new HttpError(400, 'INVALID_REQUEST');
  return { from: `${sender}@${domain}>`, to: [message.to], replyTo: process.env.EMAIL_REPLY_TO!,
    ...(message.content ? { subject: message.content.subject, html: message.content.html, text: message.content.text } : { template: { id: `almina-${message.kind}-v1`, variables: message.variables } }),
    tags: [{ name: 'category', value: message.kind }],
    ...(marketing ? { headers: { 'List-Unsubscribe': `<${oneClickUrl(String(message.variables.CANCEL_URL))}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
  };
}
export function createEmailClient(key: string) {
  const client = new Resend(key);
  // Pinned SDK logs full API diagnostics in development. Silence that logger in every environment.
  Object.defineProperty(client, 'logError', { value: () => undefined });
  return client;
}
export async function sendApplicationEmail(db: Db, message: ApplicationEmail, signal?: AbortSignal,
  clientFactory = createEmailClient) {
  const marketing = !['signin', 'order', 'wholesale-invite'].includes(message.kind);
  if (!resendReady(marketing) || signal?.aborted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const request = applicationEmailRequest(message);
  const blocked = await db.collection<Document & { _id: string }>('email_suppressions').findOne({ _id: emailHash(message.to),
    ...(marketing ? {} : { hardBounce: true }) }, { projection: { _id: 1 }, maxTimeMS: 3000 });
  if (blocked) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const key = process.env[marketing ? 'RESEND_MARKETING_API_KEY' : 'RESEND_API_KEY']!;
  const idempotencyKey = `almina/${message.kind}/${createHash('sha256').update(message.eventId).digest('hex')}`;
  const deadline = signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000);
  // A retry keeps the same event ID and payload. Provider deduplication lasts 24 hours.
  try {
    let accepted: string | undefined;
    for (let attempt = 0; attempt < (marketing ? 1 : 2); attempt++) {
      await reserveEmailBudget(db, marketing);
      const { data, error, headers } = await clientFactory(key).emails.send(request, { idempotencyKey, signal: deadline });
      if (!error && data?.id) { accepted = data.id; break; }
      const retryAfter = Number(headers?.['retry-after'] ?? 0);
      const retryable = error && (error.statusCode === null || error.statusCode === 429 || (error.statusCode ?? 0) >= 500);
      if (!retryable || attempt > 0 || !Number.isFinite(retryAfter) || retryAfter > 1) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
      await delay(Math.max(250, retryAfter * 1000), undefined, { signal: deadline });
    }
    if (!accepted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    await db.collection<Document & { _id: string }>('email_delivery').updateOne({ _id: accepted },
      { $set: { kind: message.kind, recipientHash: emailHash(message.to), acceptedAt: new Date(), eventHash: createHash('sha256').update(message.eventId).digest('hex') }, $setOnInsert: { createdAt: new Date() } }, { upsert: true, maxTimeMS: 3000 });
    return accepted;
  } catch (error) { if (error instanceof EmailBudgetExceeded) throw error; throw new HttpError(503, 'SERVICE_UNAVAILABLE'); } // Never expose provider diagnostics/recipient/OTP.
}
