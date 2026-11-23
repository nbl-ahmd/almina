import type { ChangeStream, Db, MongoClient } from 'mongodb';

/** Wakes background workers when order data changes, so they stop asking the database "anything new?" on a timer.
 *
 *  One database-level change stream (orders and the notification outbox) feeds every worker. While it is healthy the
 *  workers only keep a slow safety interval for retries and lease recovery. If change streams are unavailable, or the
 *  stream is down, `healthy()` is false and workers keep their original fast cadence. Nothing is ever skipped: a wake
 *  only makes an ordinary worker tick happen sooner. */
export type Wake = { subscribe(listener: () => void): () => void; healthy(): boolean; shutdown(): Promise<void> };

/** Knows about order writes made by this very process, from the database driver's own command events (no extra traffic).
 *  All order and notification writes go through the one API process, so this wakes the workers instantly even when the
 *  database offers no change streams (Atlas free tier filters, outages, standalone servers). Writes made by other
 *  processes are still caught by the workers' slow safety interval and by the change stream when it is available. */
export type LocalWriteSignal = { attach(client: Pick<MongoClient, 'on'>): void; subscribe(listener: () => void): () => void };
const WATCHED = new Set(['orders', 'order_outbox']);
const WRITES = new Set(['insert', 'update', 'findAndModify', 'delete']);
export function createLocalWriteSignal(): LocalWriteSignal {
  const listeners = new Set<() => void>();
  const pending = new Map<number, true>();
  let transactional = false;
  const fire = () => { for (const listener of [...listeners]) { try { listener(); } catch { /* One worker must not stop the others. */ } } };
  return {
    attach(client) {
      const listen = client.on.bind(client) as (event: string, handler: (event: Record<string, unknown>) => void) => void;
      listen('commandStarted', event => {
        const name = event.commandName, command = event.command as Record<string, unknown> | undefined;
        if (typeof name !== 'string' || !WRITES.has(name) || !command) return;
        const collection = command[name];
        if (typeof collection !== 'string' || !WATCHED.has(collection)) return;
        // Writes inside a transaction become visible at commit, not now.
        if (command.autocommit === false) transactional = true; else pending.set(event.requestId as number, true);
      });
      listen('commandSucceeded', event => {
        if (event.commandName === 'commitTransaction') { if (transactional) { transactional = false; fire(); } return; }
        if (pending.delete(event.requestId as number)) fire();
      });
      listen('commandFailed', event => { pending.delete(event.requestId as number); if (event.commandName === 'abortTransaction') transactional = false; });
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

export function createOutboxWake(getDb: () => Promise<Db> | Db, options: { coalesceMs?: number; log?: (message: string) => void; local?: LocalWriteSignal } = {}): Wake {
  const { coalesceMs = 150, log = () => undefined, local } = options;
  const listeners = new Set<() => void>();
  let stream: ChangeStream | undefined;
  let healthyNow = false;
  let stopped = false;
  let coalesce: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let backoff = 2000;
  let unsupported = false;

  function fire() {
    if (coalesce) return;
    coalesce = setTimeout(() => { coalesce = undefined; for (const listener of [...listeners]) { try { listener(); } catch { /* One worker must not stop the others. */ } } }, coalesceMs);
    coalesce.unref?.();
  }
  async function open() {
    if (stopped || unsupported || stream) return;
    try {
      const db = await getDb();
      const opened = db.watch(
        [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] }, 'ns.coll': { $in: ['orders', 'order_outbox'] } } }, { $project: { operationType: 1 } }],
        { maxAwaitTimeMS: 10000 },
      );
      stream = opened;
      opened.on('change', fire);
      opened.on('error', (error: { code?: number }) => {
        if (stream !== opened) return;
        stream = undefined; healthyNow = false; void opened.close().catch(() => undefined);
        if (error?.code === 40573 || error?.code === 115 || error?.code === 303) { unsupported = true; log('worker wake: change streams unsupported; workers keep their fast cadence'); return; }
        // Workers return to their fast cadence now; anything may have changed while the stream was down.
        fire();
        retry = setTimeout(() => { retry = undefined; void open(); }, backoff); retry.unref?.();
        backoff = Math.min(backoff * 2, 30000);
      });
      opened.on('close', () => { if (stream === opened) { stream = undefined; healthyNow = false; } });
      healthyNow = true; backoff = 2000;
    } catch {
      healthyNow = false;
      retry = setTimeout(() => { retry = undefined; void open(); }, backoff); retry.unref?.();
      backoff = Math.min(backoff * 2, 30000);
    }
  }
  void open();
  const unsubscribeLocal = local?.subscribe(fire);
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    // With a local write signal the workers can always rest on their slow safety interval.
    healthy: () => healthyNow || local !== undefined,
    async shutdown() {
      stopped = true; healthyNow = false; clearTimeout(coalesce); clearTimeout(retry); listeners.clear(); unsubscribeLocal?.();
      const current = stream; stream = undefined;
      try { await current?.close(); } catch { /* Already closed. */ }
    },
  };
}

/** Runs `tick` on a timer, sooner when woken. Fast cadence without a healthy wake source, slow with one.
 *  A wake that arrives while a tick is running schedules exactly one more tick afterwards. */
export function wakeLoop(tick: () => Promise<unknown> | void, options: { fastMs: number; slowMs: number; wake?: Wake | undefined }) {
  const { fastMs, slowMs, wake } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false, busy = false, again = false;
  async function run() {
    if (stopped) return;
    if (busy) { again = true; return; }
    busy = true; clearTimeout(timer);
    try { await tick(); } catch { /* The worker reports its own failures. */ }
    finally {
      busy = false;
      if (again) { again = false; void run(); } else schedule();
    }
  }
  function schedule() {
    if (stopped || busy) return;
    clearTimeout(timer);
    timer = setTimeout(() => { void run(); }, wake?.healthy() ? slowMs : fastMs);
    timer.unref?.();
  }
  const unsubscribe = wake?.subscribe(() => { void run(); });
  schedule();
  return { stop() { stopped = true; clearTimeout(timer); unsubscribe?.(); } };
}
