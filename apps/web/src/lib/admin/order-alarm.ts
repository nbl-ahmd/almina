/** Loud, looping "new order" alarm for a staff screen that has the console open.
 *
 *  It needs no polling: the server pushes the news (live stream or a Web Push message reaching the page) and the ring itself is a
 *  local audio loop with no network. Browsers only allow sound after a tap, so the alarm must be armed once per page load; until
 *  then it reports `needs-tap` and the normal push notification (and its system sound) is the fallback. When the app is closed
 *  nothing here runs and the operating system's notification sound plays instead. */
export type AlarmStatus = 'off' | 'needs-tap' | 'armed' | 'ringing';

type Param = { setValueAtTime(value: number, time: number): unknown; linearRampToValueAtTime(value: number, time: number): unknown; value: number };
type Node = { connect(target: unknown): unknown; disconnect?(): unknown };
type Oscillator = Node & { frequency: { value: number }; type: string; start(time?: number): void; stop(time?: number): void; onended: (() => void) | null };
type Gain = Node & { gain: Param };
export type AlarmContext = { state: string; currentTime: number; destination: unknown; resume(): Promise<void>; close(): Promise<void>;
  createOscillator(): Oscillator; createGain(): Gain };
type Lock = { release(): Promise<void> };
export type AlarmDeps = {
  createContext?: () => AlarmContext;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  now?: () => number;
  requestWakeLock?: () => Promise<Lock>;
  visible?: () => boolean;
  /** The ring stops by itself after this long; a missed order is still covered by notifications and reminder e-mails. */
  maxRingMs?: number;
};

const ENABLED_KEY = 'almina:order-alarm', AWAKE_KEY = 'almina:order-alarm-awake';
/** One ring cycle: six alternating beeps, then a pause, like a telephone. */
const CYCLE_S = 2.4, BEEP_S = 0.25, BEEPS = [[0, 880], [0.3, 660], [0.6, 880], [0.9, 660], [1.2, 880], [1.5, 660]] as const;
const LEVEL = 0.55, AHEAD_S = 12, REFILL_MS = 6000;

export function createOrderAlarm(deps: AlarmDeps = {}) {
  const storage = deps.storage, setTimer = deps.setTimer ?? ((callback, ms) => setTimeout(callback, ms)), clearTimer = deps.clearTimer ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const now = deps.now ?? (() => Date.now()), maxRingMs = deps.maxRingMs ?? 5 * 60000, visible = deps.visible ?? (() => true);
  const read = (key: string) => { try { return storage?.getItem(key) === '1'; } catch { return false; } };
  const write = (key: string, value: boolean) => { try { if (value) storage?.setItem(key, '1'); else storage?.removeItem(key); } catch { /* Preference simply is not remembered. */ } };
  let enabled = read(ENABLED_KEY), keepAwake = read(AWAKE_KEY);
  let context: AlarmContext | undefined, ringing = false, ringUntil = 0, nextAt = 0, refill: unknown, lock: Lock | undefined, snapshot: AlarmStatus = 'off';
  const nodes: Oscillator[] = [], listeners = new Set<() => void>();

  const compute = (): AlarmStatus => !enabled ? 'off' : context?.state !== 'running' ? 'needs-tap' : ringing ? 'ringing' : 'armed';
  function publish() { const next = compute(); if (next === snapshot) return; snapshot = next; for (const listener of [...listeners]) listener(); }
  async function ensureContext(): Promise<boolean> {
    try {
      context ??= deps.createContext?.();
      if (!context) return false;
      if (context.state !== 'running') await context.resume();
    } catch { return false; }
    return context.state === 'running';
  }
  function beep(at: number, frequency: number, length: number, level: number) {
    const ctx = context!, oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = 'square'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(level, at + 0.01); gain.gain.setValueAtTime(level, at + length - 0.03); gain.gain.linearRampToValueAtTime(0, at + length);
    oscillator.connect(gain); gain.connect(ctx.destination);
    oscillator.onended = () => { const index = nodes.indexOf(oscillator); if (index >= 0) nodes.splice(index, 1); oscillator.disconnect?.(); gain.disconnect?.(); };
    nodes.push(oscillator); oscillator.start(at); oscillator.stop(at + length + 0.02);
  }
  function schedule() {
    if (!ringing || !context) return;
    if (now() >= ringUntil) { stopRinging(); return; }
    // Sound is scheduled on the audio clock a few seconds ahead, so a throttled page timer cannot make it stutter.
    let at = Math.max(nextAt, context.currentTime + 0.05);
    const horizon = context.currentTime + AHEAD_S;
    while (at < horizon) { for (const [offset, frequency] of BEEPS) beep(at + offset, frequency, BEEP_S, LEVEL); at += CYCLE_S; }
    nextAt = at;
    refill = setTimer(schedule, REFILL_MS);
  }
  function stopRinging() {
    ringing = false; clearTimer(refill); refill = undefined; nextAt = 0;
    for (const oscillator of nodes.splice(0)) { try { oscillator.stop(); } catch { /* Already stopped. */ } }
    publish();
  }
  async function syncWakeLock() {
    const wanted = keepAwake && enabled && visible() && !!deps.requestWakeLock;
    if (!wanted && lock) { const held = lock; lock = undefined; try { await held.release(); } catch { /* Released by the browser. */ } }
    else if (wanted && !lock) { try { lock = await deps.requestWakeLock!(); } catch { lock = undefined; } }
  }

  const api = {
    status: () => snapshot,
    keepAwake: () => keepAwake,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** Must run from a tap or key press. Remembers the choice for next time. */
    async arm(): Promise<boolean> {
      enabled = true; write(ENABLED_KEY, true);
      const ok = await ensureContext();
      publish(); void syncWakeLock();
      if (ok) api.chime();
      return ok;
    },
    disarm() { enabled = false; write(ENABLED_KEY, false); stopRinging(); publish(); void syncWakeLock(); },
    /** For a returning visit: any later tap or key press can unlock sound that was armed before. */
    async resume(): Promise<void> { if (!enabled || context?.state === 'running') return; await ensureContext(); publish(); void syncWakeLock(); },
    /** Starts the loop if sound is armed. Returns false when sound is blocked or off, so the caller can rely on the notification. */
    ring(): boolean {
      if (compute() === 'ringing') return true;
      if (compute() !== 'armed') return false;
      ringing = true; ringUntil = now() + maxRingMs; nextAt = 0; schedule(); publish();
      return true;
    },
    silence() { if (ringing) stopRinging(); },
    /** One short beep pair for ordinary alerts; never interrupts the alarm. */
    chime() { if (compute() !== 'armed' || !context) return; const at = context.currentTime + 0.02; beep(at, 660, 0.18, 0.35); beep(at + 0.22, 880, 0.22, 0.35); },
    /** A short sample of the real alarm so staff can set the volume. */
    test(ms = 3500) { if (api.ring()) setTimer(() => { api.silence(); }, ms); },
    setKeepAwake(value: boolean) { keepAwake = value; write(AWAKE_KEY, value); void syncWakeLock(); },
    /** Call when the page becomes visible or hidden. */
    visibilityChanged() { void syncWakeLock(); void api.resume(); },
    /** Initial status for a page that remembers an earlier choice. */
    init() { snapshot = compute(); return snapshot; },
  };
  return api;
}
export type OrderAlarm = ReturnType<typeof createOrderAlarm>;

let shared: OrderAlarm | undefined;
/** The one alarm for this browser page. Created on first use in the browser. */
export function getOrderAlarm(): OrderAlarm {
  if (!shared) {
    const lockApi = typeof navigator !== 'undefined' ? (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Lock> } }).wakeLock : undefined;
    const Context = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
    shared = createOrderAlarm({
      createContext: Context ? () => new Context() as unknown as AlarmContext : () => { throw new Error('Audio is not available'); },
      storage: typeof localStorage !== 'undefined' ? safeStorage() : undefined,
      ...(lockApi ? { requestWakeLock: () => lockApi.request('screen') } : {}),
      visible: () => typeof document === 'undefined' || document.visibilityState === 'visible',
    });
    shared.init();
  }
  return shared;
}
function safeStorage(): Storage | undefined { try { return localStorage; } catch { return undefined; } }
