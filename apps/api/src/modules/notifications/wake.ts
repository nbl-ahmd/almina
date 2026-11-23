import type { ChangeStream, Collection, Db, Document, Filter, MongoClient } from 'mongodb';

/** Event-driven wake-ups for background workers, so an idle system makes no database requests and runs no timers.
 *
 *  Source of truth for "something changed" is the API process itself: every order, product, notification and job write goes
 *  through it, and the MongoDB driver reports each committed write as a command event (no extra traffic). Workers run
 *  once at start-up (to recover anything left over from a restart), when a write they care about is committed, and at
 *  the exact moment a deferred job (retry, reminder, lease expiry) becomes due. Nothing runs "just in case".
 *
 *  Without a local signal (tests, the standalone v1 server) the previous behaviour remains: a change stream when the
 *  database offers one, otherwise a fast timer. */
export type Wake = {
  subscribe(listener: () => void): () => void;
  healthy(): boolean;
  /** True when wake-ups come from committed writes only, so workers need no interval at all. */
  eventOnly?: boolean;
  shutdown(): Promise<void>;
};

/** Collections whose committed writes are reported to the workers. Everything else is ignored by the driver hook. */
const WATCHED = new Set(['orders', 'order_outbox', 'staff_alerts', 'products', 'categories', 'stores', 'customer_reminders', 'marketing_jobs',
  'image_review_publications', 'notification_controls']);
const WRITES = new Set(['insert', 'update', 'findAndModify', 'delete']);
export type LocalWriteSignal = {
  attach(client: Pick<MongoClient, 'on'>): void;
  /** `collections` filters what the listener hears. `notification_controls:<id>` names one control document. */
  subscribe(listener: (collection: string) => void, collections?: readonly string[]): () => void;
  /** Reports a write made by code that does not go through the driver hook (tests, scripts). */
  emit(collection: string): void;
};
/** True when the server reply says the write changed or created something. A worker's lease attempt that finds nothing to lease is a
 *  write command too, but it changed nothing, and it must not wake anyone (that would be a loop). */
function changedSomething(name: string, reply: Record<string, unknown> | undefined): boolean {
  if (!reply) return false;
  if (name === 'findAndModify') { const last = reply.lastErrorObject as { n?: number } | undefined; return (last?.n ?? 0) > 0; }
  if (name === 'update') return Number(reply.nModified ?? 0) > 0 || Array.isArray(reply.upserted);
  return Number(reply.n ?? 0) > 0; // insert, delete
}
export function createLocalWriteSignal(): LocalWriteSignal {
  const listeners = new Map<(collection: string) => void, Set<string> | undefined>();
  const pending = new Map<number, { label: string; transaction: boolean }>();
  const transactional = new Set<string>();
  const fire = (collection: string) => {
    for (const [listener, filter] of [...listeners]) {
      if (filter && !filter.has(collection) && !(collection.includes(':') && filter.has(collection.split(':')[0]!))) continue;
      try { listener(collection); } catch { /* One worker must not stop the others. */ }
    }
  };
  const label = (collection: string, command: Record<string, unknown>) => {
    if (collection !== 'notification_controls') return collection;
    const updates = command.updates, first = Array.isArray(updates) ? updates[0] as { q?: { _id?: unknown } } | undefined : undefined;
    const filter = (command.query ?? first?.q) as { _id?: unknown } | undefined;
    return typeof filter?._id === 'string' ? `${collection}:${filter._id}` : collection;
  };
  return {
    attach(client) {
      const listen = client.on.bind(client) as (event: string, handler: (event: Record<string, unknown>) => void) => void;
      listen('commandStarted', event => {
        const name = event.commandName, command = event.command as Record<string, unknown> | undefined;
        if (typeof name !== 'string' || !WRITES.has(name) || !command) return;
        const collection = command[name];
        if (typeof collection !== 'string' || !WATCHED.has(collection)) return;
        pending.set(event.requestId as number, { label: label(collection, command), transaction: command.autocommit === false });
      });
      listen('commandSucceeded', event => {
        if (event.commandName === 'commitTransaction') { const names = [...transactional]; transactional.clear(); for (const named of names) fire(named); return; }
        const entry = pending.get(event.requestId as number);
        if (!entry) return;
        pending.delete(event.requestId as number);
        if (!changedSomething(String(event.commandName), event.reply as Record<string, unknown> | undefined)) return;
        // A write inside a transaction becomes visible at commit, not now.
        if (entry.transaction) transactional.add(entry.label); else fire(entry.label);
      });
      listen('commandFailed', event => { pending.delete(event.requestId as number); if (event.commandName === 'abortTransaction') transactional.clear(); });
    },
    subscribe(listener, collections) { listeners.set(listener, collections ? new Set(collections) : undefined); return () => { listeners.delete(listener); }; },
    emit: fire,
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
  // A change stream keeps a long-poll open and costs requests all day. With a local signal it is not needed at all.
  if (!local) void open();
  const unsubscribeLocal = local?.subscribe(fire, ['orders', 'order_outbox']);
  return {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    healthy: () => healthyNow || local !== undefined,
    ...(local ? { eventOnly: true } : {}),
    async shutdown() {
      stopped = true; healthyNow = false; clearTimeout(coalesce); clearTimeout(retry); listeners.clear(); unsubscribeLocal?.();
      const current = stream; stream = undefined;
      try { await current?.close(); } catch { /* Already closed. */ }
    },
  };
}

const MAX_TIMER_MS = 2 ** 31 - 1;
/** The soonest future instant among deferred-work markers, for arming one timer. `specs` name a field and the filter
 *  that selects rows whose field is still in the future. Returns null when nothing is pending. */
export async function earliestDue<T extends Document>(collection: Collection<T>, specs: readonly { filter: Filter<T>; field: string }[], now = new Date()): Promise<Date | null> {
  let best: Date | null = null;
  for (const spec of specs) {
    const row = await collection.find({ $and: [spec.filter, { [spec.field]: { $gt: now } }] } as Filter<T>, { projection: { [spec.field]: 1 }, maxTimeMS: 3000 }).sort({ [spec.field]: 1 } as never).limit(1).next();
    const value = row ? (spec.field.split('.').reduce<unknown>((current, key) => (current as Record<string, unknown> | undefined)?.[key], row)) : undefined;
    if (value instanceof Date && (!best || value < best)) best = value;
  }
  return best;
}

/** Runs `tick` when woken, once at start-up, and at the moment `nextDue` says deferred work becomes due.
 *  A wake that arrives while a tick is running schedules exactly one more tick afterwards.
 *  Without an event-only wake source it keeps the older timer behaviour (fast without a healthy source, slow with one). */
export function wakeLoop(tick: () => Promise<unknown> | void, options: { fastMs: number; slowMs: number; wake?: Wake | undefined; nextDue?: (() => Promise<Date | null>) | undefined }) {
  const { fastMs, slowMs, wake, nextDue } = options;
  const eventOnly = wake?.eventOnly === true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false, busy = false, again = false;
  async function run() {
    if (stopped) return;
    if (busy) { again = true; return; }
    busy = true; clearTimeout(timer);
    try { await tick(); } catch { /* The worker reports its own failures. */ }
    finally {
      busy = false;
      if (again) { again = false; void run(); } else void schedule();
    }
  }
  async function schedule() {
    if (stopped || busy) return;
    clearTimeout(timer);
    if (!eventOnly) { timer = setTimeout(() => { void run(); }, wake?.healthy() ? slowMs : fastMs); timer.unref?.(); return; }
    let due: Date | null = null;
    try { due = (await nextDue?.()) ?? null; } catch { due = null; }
    if (stopped || busy || !due) return;
    clearTimeout(timer);
    timer = setTimeout(() => { void run(); }, Math.min(MAX_TIMER_MS, Math.max(250, due.getTime() - Date.now())));
    timer.unref?.();
  }
  const unsubscribe = wake?.subscribe(() => { void run(); });
  if (eventOnly) void run(); else void schedule();
  return { stop() { stopped = true; clearTimeout(timer); unsubscribe?.(); } };
}
