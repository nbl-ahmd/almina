import { createHash, randomUUID } from 'node:crypto';
import { ObjectId, type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
const recipient = z.string().regex(/^\+?[0-9]{1,20}$/);
const textInput = z.object({ recipient, name: z.string().max(100), text: z.string().min(1).max(4000).refine(value => Boolean(value.trim())) }).strict();
const templateInput = z.object({ recipient, template: z.string().regex(/^[a-z0-9_]{1,100}$/), link: z.string().max(2048).refine(value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !/[\s\\]/.test(value); } catch { return false; }
}) }).strict();
export type WhatsappInput = { kind: 'text'; recipient: string; name: string; text: string } | { kind: 'template'; recipient: string; template: string; link: string };
type Receipt = { _id: string; digest: string; actor: string; input: WhatsappInput; state: 'sending' | 'uncertain' | 'accepted' | 'completed';
  createdAt: Date; schemaVersion: number; providerId?: string; acceptedAt?: Date; failedAt?: Date; completedAt?: Date };
type Message = { content: string; timestamp: Date; sender: 'admin'; providerEventId: string; outboundReceiptId: string };
type Conversation = { from: string; name: string; promotionStatus?: string; messages: Message[] };
export function whatsappOutboundInput(raw: unknown, kind: 'text' | 'template'): WhatsappInput {
  const parsed = (kind === 'text' ? textInput : templateInput).safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  return { kind, ...parsed.data } as WhatsappInput;
}
export function whatsappPayload(input: WhatsappInput) {
  const base = { messaging_product: 'whatsapp', to: input.recipient, type: input.kind };
  return input.kind === 'text' ? { ...base, preview_url: false, recipient_type: 'individual', text: { body: input.text } }
    : { ...base, template: { name: input.template, language: { code: 'en_US' }, components: [{ type: 'header', parameters: [{ type: 'image', image: { link: input.link } }] }] } };
}
export function createWhatsappSender(configuration: { token?: string | undefined; version?: string | undefined; phoneNumberId?: string | undefined },
  options: { fetch?: typeof fetch; deadlineMs?: number } = {}) {
  const parsed = z.object({ token: z.string().min(1).max(8192).regex(/^[A-Za-z0-9_.-]+$/), version: z.string().regex(/^v[1-9][0-9]?\.0$/), phoneNumberId: z.string().regex(/^[0-9]{6,30}$/) }).strict().safeParse(configuration);
  if (!parsed.success) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const { token, version, phoneNumberId } = parsed.data, deadlineMs = options.deadlineMs ?? 10000;
  if (!Number.isInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 15000) throw new Error('Invalid WhatsApp deadline');
  let active = 0;
  return async (raw: WhatsappInput, signal?: AbortSignal) => {
    const { kind, ...fields } = raw; const input = whatsappOutboundInput(fields, kind);
    if (active >= 4 || signal?.aborted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    active++;
    const controller = new AbortController(); const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new HttpError(503, 'SERVICE_UNAVAILABLE')), { once: true });
      timer = setTimeout(abort, deadlineMs);
    });
    const operation = (async () => {
      if (controller.signal.aborted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
      const response = await (options.fetch ?? fetch)(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(whatsappPayload(input)),
      });
      if (!response.ok || !response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        await response.body?.cancel(); throw new HttpError(503, 'SERVICE_UNAVAILABLE');
      }
      const reader = response.body?.getReader(); if (!reader) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
      const stop = () => { void reader.cancel().catch(() => undefined); }; controller.signal.addEventListener('abort', stop, { once: true });
      let length = 0; const chunks: Uint8Array[] = [];
      try {
        while (true) {
          if (controller.signal.aborted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
          const chunk = await reader.read(); if (chunk.done) break;
          length += chunk.value.byteLength; if (length > 65536) throw new HttpError(503, 'SERVICE_UNAVAILABLE'); chunks.push(chunk.value);
        }
        if (controller.signal.aborted) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
        const result = z.object({ messaging_product: z.literal('whatsapp'), messages: z.array(z.object({ id: z.string().min(1).max(512) })).length(1) }).passthrough()
          .safeParse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        if (!result.success) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
        return { providerId: result.data.messages[0]!.id };
      } finally { controller.signal.removeEventListener('abort', stop); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    })().finally(() => { active--; });
    try { return await Promise.race([operation, timeout]); }
    catch { throw new HttpError(503, 'SERVICE_UNAVAILABLE'); }
    finally { if (timer) clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort(); }
  };
}

// Never resend a durable sending/uncertain receipt. Provider acceptance and local commit are separate stages.
export async function sendWhatsapp(db: Db, raw: unknown, kind: 'text' | 'template', actor: string, requestKey: unknown,
  send: (input: WhatsappInput) => Promise<{ providerId: string }>) {
  const input = whatsappOutboundInput(raw, kind);
  const key = requestKey === undefined ? randomUUID() : requestKey;
  if (!ObjectId.isValid(actor) || typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new HttpError(400, 'INVALID_REQUEST');
  const id = createHash('sha256').update(`${actor}:${key}`).digest('hex'), digest = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const receipts = db.collection<Receipt>('whatsapp_outbound');
  let inserted = false;
  const existingReceipt = await receipts.findOne({ _id: id }, { maxTimeMS: 3000 });
  // Respect an explicit recorded opt-out. CSV input never bypasses it.
  if (!existingReceipt && kind === 'template') {
    const optedOut = await db.collection('conversations').findOne({ from: { $in: [input.recipient, input.recipient.replace(/^\+/, '')] }, promotionStatus: { $exists: true, $nin: ['true', 'Yes'] } }, { projection: { _id: 1 }, maxTimeMS: 3000 });
    if (optedOut) throw new HttpError(403, 'FORBIDDEN');
  }
  try {
    await receipts.insertOne({ _id: id, digest, actor, input, state: 'sending', createdAt: new Date(), schemaVersion: 1 }, { writeConcern: { w: 'majority' } }); inserted = true;
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
  }
  let previous = await receipts.findOne({ _id: id }, { maxTimeMS: 3000 });
  if (!previous || previous.schemaVersion !== 1 || previous.digest !== digest || previous.actor !== actor) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  if (previous.state === 'completed') return { recipient: input.recipient, replay: true };
  if (inserted) {
    let accepted: { providerId: string };
    try { accepted = await send(input); }
    catch {
      await receipts.updateOne({ _id: id, state: 'sending' }, { $set: { state: 'uncertain', failedAt: new Date() } }, { writeConcern: { w: 'majority' } }).catch(() => undefined);
      throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    }
    if (typeof accepted.providerId !== 'string' || !accepted.providerId.length || accepted.providerId.length > 512) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
    await receipts.updateOne({ _id: id, state: 'sending' }, { $set: { state: 'accepted', providerId: accepted.providerId, acceptedAt: new Date() } }, { writeConcern: { w: 'majority' } });
    previous = await receipts.findOne({ _id: id }, { maxTimeMS: 3000 });
  }
  if (previous?.state !== 'accepted') throw new HttpError(409, 'DELIVERY_UNCERTAIN');
  const controls = db.collection<Document & { _id: string }>('notification_controls');
  await controls.updateOne({ _id: 'whatsapp-inbox' }, { $setOnInsert: { revision: 0 } }, { upsert: true, maxTimeMS: 3000 });
  const session = db.client.startSession(); let notification: { name: string; payload: Document } | undefined;
  try {
    await session.withTransaction(async () => {
      notification = undefined;
      await controls.updateOne({ _id: 'whatsapp-inbox' }, { $inc: { revision: 1 } }, { session });
      const receipt = await receipts.findOne({ _id: id }, { session });
      if (receipt?.state === 'completed') return;
      if (receipt?.state !== 'accepted' || receipt.digest !== digest || !receipt.providerId || !(receipt.acceptedAt instanceof Date)) throw new HttpError(409, 'DELIVERY_UNCERTAIN');
      if (input.kind === 'text') {
        const from = input.recipient.replace(/^\+/, ''); const conversations = db.collection<Conversation>('conversations');
        const entry: Message = { content: input.text, timestamp: receipt.acceptedAt, sender: 'admin', providerEventId: receipt.providerId, outboundReceiptId: id };
        const existing = await conversations.findOne({ from }, { session });
        if (existing) await conversations.updateOne({ _id: existing._id }, { $push: { messages: entry } }, { session });
        else await conversations.insertOne({ from, name: input.name || from, promotionStatus: 'false', messages: [entry] }, { session });
        notification = { name: 'newMessage', payload: { recipient: from, message: { content: input.text, sender: 'admin' } } };
      }
      await receipts.updateOne({ _id: id, state: 'accepted' }, { $set: { state: 'completed', completedAt: new Date() } }, { session });
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
    return { recipient: input.recipient, replay: false, notification };
  } finally { await session.endSession(); }
}
