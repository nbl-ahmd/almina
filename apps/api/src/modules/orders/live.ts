import { randomUUID } from 'node:crypto';
import type { ChangeStream, Db } from 'mongodb';
import type { LocalWriteSignal } from '../notifications/wake.js';

/** Tiny, data-free "orders or alerts changed" signal for staff browsers.
 *
 *  One MongoDB change stream per API process feeds every connected staff stream, so an idle system issues no
 *  timed reads. The cursor opens when the first browser connects and closes shortly after the last one leaves.
 *  If change streams are unavailable (standalone MongoDB) it degrades to a slow invalidation timer that only
 *  runs while somebody is connected. Messages carry no order data; each browser refetches through its own
 *  authorised reads. */
export type LiveListener = (revision: string) => void;
type Options = {
  getDb: () => Promise<Db>;
  /** Largest number of simultaneous browser streams held by this process. */
  maxSubscribers?: number;
  /** Largest number held for one signed-in user (several tabs or devices). */
  maxPerKey?: number;
  /** Bursts of changes collapse into one message per window. */
  coalesceMs?: number;
  /** Keep the cursor this long after the last subscriber leaves, so a reconnect does not reopen it. */
  idleGraceMs?: number;
  /** Fallback invalidation period when change streams are unsupported. */
  fallbackMs?: number;
  log?: (message: string, detail?: Record<string, unknown>) => void;
  /** Committed writes made by this process. When given, no change stream or timer is used at all: while browsers are connected the feed
   *  listens to the driver's own write events (no database requests), and with nobody connected it listens to nothing. */
  local?: LocalWriteSignal;
};

export function createOrderLiveFeed(options: Options) {
  const { getDb, maxSubscribers = 200, maxPerKey = 6, coalesceMs = 500, idleGraceMs = 30000, fallbackMs = 15000, log = () => undefined, local } = options;
  let unlisten: (() => void) | undefined;
  const boot = randomUUID().slice(0, 8);
  const listeners = new Map<LiveListener, string>();
  const perKey = new Map<string, number>();
  let counter = 0;
  let stream: ChangeStream | undefined;
  let opening = false;
  let unsupported = false;
  let coalesce: ReturnType<typeof setTimeout> | undefined;
  let idle: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let fallback: ReturnType<typeof setInterval> | undefined;
  let backoff = 2000;

  const revision = () => `${boot}.${counter}`;
  function emit() {
    counter += 1;
    const current = revision();
    for (const listener of [...listeners.keys()]) { try { listener(current); } catch { /* A broken client stream must not stop the others. */ } }
  }
  function changed() {
    if (coalesce) return;
    coalesce = setTimeout(() => { coalesce = undefined; emit(); }, coalesceMs);
  }
  async function close() {
    clearTimeout(retry); retry = undefined;
    if (fallback) { clearInterval(fallback); fallback = undefined; }
    const current = stream; stream = undefined;
    try { await current?.close(); } catch { /* Already closed. */ }
  }
  function startFallback() {
    if (fallback) return;
    fallback = setInterval(emit, fallbackMs);
    fallback.unref?.();
  }
  async function open() {
    if (stream || opening || unsupported || !listeners.size) return;
    opening = true;
    try {
      const db = await getDb();
      // Orders and staff alerts (stock, payment) share one signal; each browser refetches only the reads it is authorised for.
      const opened = db.watch(
        [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] }, 'ns.coll': { $in: ['orders', 'staff_alerts'] } } }, { $project: { operationType: 1 } }],
        { maxAwaitTimeMS: 10000 },
      );
      stream = opened;
      opened.on('change', changed);
      opened.on('error', (error: { code?: number }) => {
        if (stream !== opened) return;
        stream = undefined; void opened.close().catch(() => undefined);
        // Code 40573: change streams need a replica set. Anything else is treated as transient.
        if (error?.code === 40573 || error?.code === 115 || error?.code === 303) { unsupported = true; log('order live feed: change streams unsupported, using slow invalidation'); startFallback(); return; }
        log('order live feed: change stream failed, reopening', { code: error?.code });
        // Anything may have changed while it was down.
        changed();
        retry = setTimeout(() => { retry = undefined; void open(); }, backoff);
        retry.unref?.();
        backoff = Math.min(backoff * 2, 30000);
      });
      opened.on('close', () => { if (stream === opened) stream = undefined; });
      backoff = 2000;
    } catch (error) {
      log('order live feed: could not open change stream', { message: error instanceof Error ? error.message : 'unknown' });
      retry = setTimeout(() => { retry = undefined; void open(); }, backoff);
      retry.unref?.();
      backoff = Math.min(backoff * 2, 30000);
    } finally { opening = false; }
  }
  return {
    revision,
    size: () => listeners.size,
    active: () => Boolean(stream) || Boolean(fallback) || Boolean(unlisten),
    /** Returns undefined when the process or this user already holds the maximum number of streams. */
    subscribe(listener: LiveListener, key: string) {
      if (listeners.size >= maxSubscribers || (perKey.get(key) ?? 0) >= maxPerKey) return undefined;
      listeners.set(listener, key);
      perKey.set(key, (perKey.get(key) ?? 0) + 1);
      clearTimeout(idle); idle = undefined;
      if (local) unlisten ??= local.subscribe(changed, ['orders', 'staff_alerts']);
      else if (unsupported) startFallback(); else void open();
      let done = false;
      return () => {
        if (done) return;
        done = true;
        listeners.delete(listener);
        const left = (perKey.get(key) ?? 1) - 1;
        if (left <= 0) perKey.delete(key); else perKey.set(key, left);
        if (!listeners.size && local) { unlisten?.(); unlisten = undefined; }
        else if (!listeners.size) { idle = setTimeout(() => { idle = undefined; if (!listeners.size) void close(); }, idleGraceMs); idle.unref?.(); }
      };
    },
    /** For graceful shutdown and tests. */
    async shutdown() { clearTimeout(coalesce); clearTimeout(idle); coalesce = idle = undefined; unlisten?.(); unlisten = undefined; listeners.clear(); perKey.clear(); await close(); },
  };
}
export type OrderLiveFeed = ReturnType<typeof createOrderLiveFeed>;
