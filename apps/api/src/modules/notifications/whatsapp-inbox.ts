import { createHash } from 'node:crypto';
import { type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
const identifier = z.string().min(1).max(512);
const recipient = z.string().regex(/^\d{1,20}$/);
const message = z.object({ id: identifier, from: recipient, text: z.object({ body: z.string().max(4000) }).optional(),
  button: z.object({ text: z.string().min(1).max(200) }).optional() });
const status = z.object({ id: identifier, status: z.string().min(1).max(50), timestamp: z.string().regex(/^\d{1,13}$/), recipient_id: recipient,
  errors: z.array(z.object({ title: z.string().max(1000).optional(), error_data: z.object({ details: z.string().max(2000).optional() }).optional() })).max(10).optional() });
const envelope = z.object({ object: z.literal('whatsapp_business_account'), entry: z.array(z.object({ changes: z.array(z.object({ value: z.object({
  messages: z.array(message).max(1).optional(), statuses: z.array(status).max(1).optional(),
  contacts: z.array(z.object({ profile: z.object({ name: z.string().min(1).max(100) }).optional() })).max(1).optional(),
}) })).length(1) })).length(1) });
type Event = { id: string; kind: 'message'; data: { from: string; name?: string; content: string; promotionStatus?: string } }
  | { id: string; kind: 'status'; data: { messageStatus: string; error: string; errorDetails: string; recipient: string } }
  | { id: string; kind: 'ignored'; data: Record<string, never> };
type MessageEntry = { content: string; timestamp: Date; sender: 'user' | 'admin'; providerEventId?: string };
type Conversation = { from: string; name?: string; promotionStatus?: string; messages: MessageEntry[] };
type Broadcast = Extract<Event, { kind: 'status' }>['data'] & { providerEventId?: string };
export function whatsappEvent(raw: unknown): Event | undefined {
  const parsed = envelope.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const value = parsed.data.entry[0]!.changes[0]!.value;
  if (value.messages?.length && value.statuses?.length) throw new HttpError(400, 'INVALID_REQUEST');
  const incoming = value.messages?.[0], delivery = value.statuses?.[0];
  if (incoming) {
    const content = incoming.text?.body ?? incoming.button?.text;
    if (content === undefined) return { id: incoming.id, kind: 'ignored', data: {} };
    const name = value.contacts?.[0]?.profile?.name;
    return { id: incoming.id, kind: 'message', data: { from: incoming.from, content,
      ...(name ? { name } : {}), ...(incoming.button ? { promotionStatus: incoming.button.text } : {}) } };
  }
  if (delivery) return { id: `${delivery.id}:${delivery.status}:${delivery.timestamp}`, kind: 'status', data: {
    messageStatus: delivery.status, error: delivery.errors?.[0]?.title ?? '', errorDetails: delivery.errors?.[0]?.error_data?.details ?? '', recipient: delivery.recipient_id,
  } };
  return undefined;
}
export async function receiveWhatsappEvent(db: Db, raw: unknown) {
  const event = whatsappEvent(raw);
  if (!event) return undefined;
  const digest = createHash('sha256').update(JSON.stringify(event)).digest('hex');
  const receipts = db.collection<Document & { _id: string }>('webhook_receipts');
  try { await receipts.insertOne({ _id: event.id, digest, event, state: 'pending', receivedAt: new Date(), schemaVersion: 2 }); }
  catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
    const previous = await receipts.findOne({ _id: event.id }, { maxTimeMS: 3000 });
    // Old at-most-once receipts are retained. Their effects are unknown and must not be guessed/replayed.
    if (!previous || previous.state === undefined) return undefined;
    if (previous.digest !== digest) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
    if (previous.state === 'processed') return undefined;
    if (previous.state !== 'pending') throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  }
  return event.id;
}
export async function processWhatsappEvent(db: Db, id: string) {
  if (typeof id !== 'string' || !id.length || id.length > 600) throw new HttpError(400, 'INVALID_REQUEST');
  const receipts = db.collection<Document & { _id: string }>('webhook_receipts');
  const control = db.collection<Document & { _id: string }>('notification_controls');
  const conversations = db.collection<Conversation>('conversations');
  const reports = db.collection<{ broadcast: Broadcast[] }>('whatsappbulkreports');
  // This contains no message/customer data. Initialize before transactions so first concurrent events share a lock.
  await control.updateOne({ _id: 'whatsapp-inbox' }, { $setOnInsert: { revision: 0 } }, { upsert: true, maxTimeMS: 3000 });
  const session = db.client.startSession();
  let notification: { name: string; payload: Document } | undefined;
  try {
    await session.withTransaction(async () => {
      notification = undefined;
      await control.updateOne({ _id: 'whatsapp-inbox' }, { $inc: { revision: 1 } }, { session });
      const receipt = await receipts.findOne({ _id: id }, { session });
      if (!receipt) throw new HttpError(404, 'NOT_FOUND');
      if (receipt.state === 'processed' || receipt.state === undefined) return;
      if (receipt.state !== 'pending' || receipt.schemaVersion !== 2) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      const event = receipt.event as Event;
      if (createHash('sha256').update(JSON.stringify(event)).digest('hex') !== receipt.digest) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      if (event.kind === 'message') {
        const existing = await conversations.findOne({ from: event.data.from }, { session });
        const fields = { ...(event.data.promotionStatus ? { promotionStatus: event.data.promotionStatus } : {}) };
        const entry: MessageEntry = { content: event.data.content, timestamp: new Date(), sender: 'user', providerEventId: id };
        if (existing) await conversations.updateOne({ _id: existing._id }, { $push: { messages: entry }, $set: fields }, { session });
        else {
          if (!event.data.name) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
          await conversations.insertOne({ from: event.data.from, name: event.data.name, promotionStatus: event.data.promotionStatus ?? 'true', messages: [entry] }, { session });
        }
        notification = { name: 'newMessage', payload: { recipient: event.data.from,
          promotionStatus: event.data.promotionStatus ?? existing?.promotionStatus ?? 'true', message: { content: event.data.content, sender: 'user' } } };
      } else if (event.kind === 'status') {
        const existing = await reports.findOne({ 'broadcast.recipient': event.data.recipient }, { session });
        const entry = { ...event.data, providerEventId: id };
        if (existing) await reports.updateOne({ _id: existing._id }, { $push: { broadcast: entry } }, { session });
        else await reports.insertOne({ broadcast: [entry] }, { session });
        notification = { name: 'newBroadcast', payload: { broadcast: event.data } };
      } else if (event.kind !== 'ignored') throw new HttpError(400, 'INVALID_REQUEST');
      await receipts.updateOne({ _id: id, state: 'pending' }, { $set: { state: 'processed', processedAt: new Date() } }, { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return notification;
  } finally { await session.endSession(); }
}
