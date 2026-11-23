import type { LocalWriteSignal } from '../notifications/wake.js';

const MAX_TIMER_MS = 2 ** 31 - 1;
/** A background job that runs only because something happened. There is no polling interval.
 *
 *  It runs when: it starts (`bootRun`, to finish what a restart interrupted); a write it cares about is committed (after
 *  `debounceMs`, so a burst is one run); the previous run reported more work (`true`, after `drainMs`); or a deferred item
 *  becomes due (`nextDue`). While nothing happens it holds no timer and makes no request, so an idle system costs nothing.
 *  Runs never overlap. `run` returns true when it did work and more may remain. */
export function createEventWorker(run: () => Promise<boolean | void>, options: {
  local?: LocalWriteSignal | undefined; collections?: readonly string[]; debounceMs?: number; drainMs?: number;
  nextDue?: (() => Promise<Date | null>) | undefined; bootRun?: boolean; onError?: () => void;
}) {
  const { local, collections, debounceMs = 1000, drainMs = 1000, nextDue, bootRun = true, onError } = options;
  let stopped = false, active: Promise<void> | undefined, timer: ReturnType<typeof setTimeout> | undefined, queued = false;
  function arm(ms: number) {
    if (stopped || timer) return;
    timer = setTimeout(() => { timer = undefined; void go(); }, Math.min(MAX_TIMER_MS, Math.max(0, ms)));
    timer.unref?.();
  }
  async function rearm() {
    if (stopped) return;
    let due: Date | null = null;
    try { due = (await nextDue?.()) ?? null; } catch { due = null; }
    if (due && !stopped) { clearTimeout(timer); timer = undefined; arm(Math.max(250, due.getTime() - Date.now())); }
  }
  function go(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (active) { queued = true; return active; }
    active = (async () => {
      let more = false;
      try { more = (await run()) === true; } catch { onError?.(); }
      finally {
        active = undefined;
        if (queued && !stopped) { queued = false; arm(debounceMs); }
        else if (more) arm(drainMs);
        else if (!timer) void rearm();
      }
    })();
    return active;
  }
  const unsubscribe = local?.subscribe(() => { if (active) queued = true; else arm(debounceMs); }, collections);
  if (bootRun) void go();
  return {
    /** Runs now (after any run in progress); for tests and for callers that just created the work. */
    tick: () => go(),
    kick: () => { if (active) queued = true; else arm(debounceMs); },
    async stop() { stopped = true; clearTimeout(timer); timer = undefined; unsubscribe?.(); await active; },
  };
}
