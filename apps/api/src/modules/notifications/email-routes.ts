import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import { Resend } from 'resend';
import { z } from 'zod';
import type { Db, Document } from 'mongodb';
import { HttpError } from '../../errors.js';
import { emailHash } from './provider.js';
import { unsubscribeReminder } from '../growth/retention.js';
const envelope = z.object({ type: z.enum(['email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.complained', 'email.failed', 'email.suppressed']),
  created_at: z.string().max(100), data: z.object({ email_id: z.string().uuid(), to: z.array(z.email().max(254)).min(1).max(1) }).passthrough() }).passthrough();
export async function recordEmailEvent(db: Db, raw: unknown, eventId: string) {
  const parsed = envelope.safeParse(raw);
  if (!parsed.success || !/^msg_[A-Za-z0-9]+$/.test(eventId) || eventId.length > 120) throw new HttpError(400, 'INVALID_REQUEST');
  const event = parsed.data, recipientHash = emailHash(event.data.to[0]!);
  // Only retain operational fields, never subject, message body, tokens or raw webhook payloads.
  await db.collection<Document & { _id: string }>('email_events').updateOne({ _id: eventId },
    { $setOnInsert: { emailId: event.data.email_id, type: event.type, receivedAt: new Date() } }, { upsert: true, maxTimeMS: 3000 });
  if (event.type === 'email.bounced' || event.type === 'email.complained' || event.type === 'email.suppressed') {
    await db.collection<Document & { _id: string }>('email_suppressions').updateOne({ _id: recipientHash },
      { $set: { ...(event.type === 'email.bounced' ? { hardBounce: true } : { marketingBlocked: true }), updatedAt: new Date() } }, { upsert: true, maxTimeMS: 3000 });
  }
  // Delivery events can arrive out of order. Preserve each timestamp instead of overwriting a final status.
  await db.collection<Document & { _id: string }>('email_delivery').updateOne({ _id: event.data.email_id },
    { $set: { [`events.${event.type.slice(6)}`]: event.created_at }, $setOnInsert: { createdAt: new Date(), recipientHash } }, { upsert: true, maxTimeMS: 3000 });
}
export function installEmailRoutes(app: Express, getDb: () => Promise<Db>) {
  const limiter = rateLimit({ windowMs: 60000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });
  app.post('/api/v1/email/webhook', limiter, express.raw({ type: 'application/json', limit: '32kb', inflate: false }), async (req, res) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret || !Buffer.isBuffer(req.body)) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    let event: unknown;
    try { event = new Resend('webhook-verification-only').webhooks.verify({ payload: req.body.toString('utf8'), webhookSecret: secret,
      headers: { id: String(req.headers['svix-id'] ?? ''), timestamp: String(req.headers['svix-timestamp'] ?? ''), signature: String(req.headers['svix-signature'] ?? '') } }); }
    catch { throw new HttpError(403, 'FORBIDDEN'); }
    await recordEmailEvent(await getDb(), event, String(req.headers['svix-id']));
    res.status(204).end();
  });
  // RFC 8058: possession of the unguessable token authenticates this one action; no session/CSRF cookie is needed.
  app.post('/api/v1/email/unsubscribe/:token', limiter, express.urlencoded({ extended: false, limit: '1kb', inflate: false }), async (req, res) => {
    if (!z.object({ 'List-Unsubscribe': z.literal('One-Click') }).strict().safeParse(req.body).success) throw new HttpError(400, 'INVALID_REQUEST');
    await unsubscribeReminder(await getDb(), String(req.params.token));
    res.status(204).end();
  });
}
