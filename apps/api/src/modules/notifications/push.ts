import { createECDH, ECDH } from 'node:crypto';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
const hosts = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', 'wns.windows.com'];
const key = (length: number, bytes: number) => z.string().length(length).regex(/^[A-Za-z0-9_-]+$/).refine(value => {
  const decoded = Buffer.from(value, 'base64url'); return decoded.length === bytes && decoded.toString('base64url') === value;
});
const schema = z.object({ endpoint: z.string().max(2048).refine(value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash
    && hosts.some(host => url.hostname === host || url.hostname.endsWith('.' + host)); } catch { return false; }
}), expirationTime: z.number().nonnegative().nullable().optional(), keys: z.object({ p256dh: key(87, 65), auth: key(22, 16) }).strict() }).strict();
export type PushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };
export function pushSubscription(raw: unknown): PushSubscription {
  const parsed = schema.safeParse(raw); if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  try { ECDH.convertKey(Buffer.from(parsed.data.keys.p256dh, 'base64url'), 'prime256v1'); }
  catch { throw new HttpError(400, 'INVALID_REQUEST'); }
  return { endpoint: new URL(parsed.data.endpoint).href, keys: parsed.data.keys };
}
export class PushFailure extends Error {
  constructor(readonly kind: 'expired' | 'retryable' | 'uncertain' | 'invalid') { super('Push delivery unavailable'); }
}
type Vapid = { subject: string; publicKey: string; privateKey: string };
export type PushRequestFactory = (subscription: PushSubscription, payload: undefined, options: { TTL: number; topic: string; urgency: 'low'; vapidDetails: Vapid }) => { endpoint: string; method: string; headers: Record<string, string | number>; body?: Buffer };
// Standard library generates VAPID; this module owns cancellable network transport, no payload/PII or retry.
export function createPushSender(raw: unknown, generate: PushRequestFactory, options: { fetch?: typeof fetch; deadlineMs?: number } = {}) {
  const parsed = z.object({ subject: z.string().max(254).refine(value => value.startsWith('mailto:') && z.email().safeParse(value.slice(7)).success), publicKey: key(87, 65), privateKey: key(43, 32) }).strict().safeParse(raw);
  if (!parsed.success) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  try {
    const ecdh = createECDH('prime256v1'); ecdh.setPrivateKey(Buffer.from(parsed.data.privateKey, 'base64url'));
    if (ecdh.getPublicKey().toString('base64url') !== parsed.data.publicKey) throw new Error('Invalid key pair');
  } catch { throw new HttpError(503, 'SERVICE_UNAVAILABLE'); }
  const deadlineMs = options.deadlineMs ?? 10000;
  if (!Number.isInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 15000) throw new Error('Invalid push deadline');
  let active = 0;
  return async (rawSubscription: unknown, signal?: AbortSignal) => {
    let subscription: PushSubscription;
    try { subscription = pushSubscription(rawSubscription); } catch { throw new PushFailure('invalid'); }
    if (signal?.aborted || active >= 4) throw new PushFailure('uncertain');
    active++; const controller = new AbortController(); const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new PushFailure('uncertain')), { once: true }); timer = setTimeout(abort, deadlineMs);
    });
    const operation = (async () => {
      if (controller.signal.aborted) throw new PushFailure('uncertain');
      let details: ReturnType<PushRequestFactory>;
      try { details = generate(subscription, undefined, { TTL: 600, topic: 'almina-orders', urgency: 'low', vapidDetails: parsed.data }); }
      catch { throw new PushFailure('invalid'); }
      if (details.endpoint !== subscription.endpoint || details.method !== 'POST' || details.body?.length) throw new PushFailure('invalid');
      const response = await (options.fetch ?? fetch)(details.endpoint, { method: 'POST', redirect: 'error', signal: controller.signal,
        headers: Object.fromEntries(Object.entries(details.headers).map(([name, value]) => [name, String(value)])) });
      void response.body?.cancel().catch(() => undefined);
      if ([201, 202].includes(response.status)) return;
      if ([404, 410].includes(response.status)) throw new PushFailure('expired');
      if (response.status === 429 || response.status >= 500) throw new PushFailure('retryable');
      throw new PushFailure('invalid');
    })().finally(() => { active--; });
    try { await Promise.race([operation, timeout]); }
    catch (error) { throw error instanceof PushFailure ? error : new PushFailure('uncertain'); }
    finally { if (timer) clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort(); }
  };
}
