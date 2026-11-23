import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOrderAlarm, type AlarmContext } from '../apps/web/src/lib/admin/order-alarm';

function harness(options: { running?: boolean; stored?: Record<string, string>; maxRingMs?: number } = {}) {
  let clock = 0, audioTime = 0; const timers = new Map<number, () => void>(); let timerId = 0;
  const store = new Map(Object.entries(options.stored ?? {}));
  const started: { at: number; frequency: number; stopped: boolean }[] = [];
  let state = options.running === false ? 'suspended' : 'running'; let locks = 0, released = 0;
  const context = {
    get state() { return state; }, get currentTime() { return audioTime; }, destination: {},
    resume: async () => { state = 'running'; }, close: async () => undefined,
    createGain: () => ({ gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
    createOscillator: () => { const record = { at: 0, frequency: 0, stopped: false }; const node = { type: '', frequency: { value: 0 }, onended: null as (() => void) | null, connect() {}, disconnect() {},
      start(at: number) { record.at = at; record.frequency = node.frequency.value; started.push(record); }, stop() { record.stopped = true; } }; return node; },
  } as unknown as AlarmContext;
  const alarm = createOrderAlarm({ createContext: () => context, storage: { getItem: key => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); }, removeItem: key => { store.delete(key); } },
    setTimer: callback => { timers.set(++timerId, callback); return timerId; }, clearTimer: handle => { timers.delete(handle as number); }, now: () => clock,
    requestWakeLock: async () => { locks++; return { release: async () => { released++; } }; }, ...(options.maxRingMs ? { maxRingMs: options.maxRingMs } : {}) });
  alarm.init();
  return { alarm, started, store, timers, advance: (seconds: number) => { clock += seconds * 1000; audioTime += seconds; }, locks: () => ({ locks, released }),
    fire: () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } }, suspend: () => { state = 'suspended'; } };
}

test('the alarm is off until armed by a tap, remembers the choice, and cannot ring while sound is blocked', async () => {
  const { alarm, store } = harness({ running: false });
  assert.equal(alarm.status(), 'off'); assert.equal(alarm.ring(), false);
  assert.equal(await alarm.arm(), true); assert.equal(alarm.status(), 'armed'); assert.equal(store.get('almina:order-alarm'), '1');
  // A later visit starts blocked (browsers demand a tap) until the first tap resumes it.
  const later = harness({ running: false, stored: { 'almina:order-alarm': '1' } });
  assert.equal(later.alarm.status(), 'needs-tap'); assert.equal(later.alarm.ring(), false, 'blocked sound falls back to the notification');
  await later.alarm.resume(); assert.equal(later.alarm.status(), 'armed'); assert.equal(later.alarm.ring(), true);
  alarm.disarm(); assert.equal(alarm.status(), 'off'); assert.equal(store.has('almina:order-alarm'), false);
});

test('ringing loops the telephone pattern on the audio clock, refills ahead of time, and stops at once on silence', async () => {
  const { alarm, started, timers, advance, fire } = harness();
  await alarm.arm(); started.length = 0; // ignore the confirmation chime
  assert.equal(alarm.ring(), true); assert.equal(alarm.status(), 'ringing');
  const first = started.length; assert.ok(first >= 6 * 5, 'about twelve seconds of rings are scheduled up front');
  assert.deepEqual([...new Set(started.map(beep => beep.frequency))].sort(), [660, 880]);
  assert.equal(timers.size, 1, 'one refill timer while ringing');
  advance(6); fire(); assert.ok(started.length > first, 'the refill adds more rings before the first batch runs out');
  alarm.ring(); assert.equal(timers.size, 1, 'ringing again while ringing changes nothing');
  alarm.silence();
  assert.equal(alarm.status(), 'armed'); assert.ok(started.every(beep => beep.stopped), 'every scheduled beep is cancelled'); assert.equal(timers.size, 0, 'no timer remains');
  const before = started.length; advance(60); fire(); assert.equal(started.length, before, 'nothing rings after silence');
});

test('the alarm gives up after its limit and ordinary alerts only chime while it is not ringing', async () => {
  const { alarm, started, advance, fire } = harness({ maxRingMs: 20000 });
  await alarm.arm(); started.length = 0;
  alarm.chime(); assert.equal(started.length, 2, 'two short beeps');
  alarm.ring(); const rung = started.length; alarm.chime(); assert.equal(started.length, rung, 'the chime never interrupts the alarm');
  advance(21); fire(); assert.equal(alarm.status(), 'armed', 'stopped by itself');
});

test('keeping the screen awake is requested while armed and released when the alarm is turned off', async () => {
  const { alarm, locks } = harness();
  alarm.setKeepAwake(true); await alarm.arm(); await Promise.resolve();
  assert.equal(locks().locks, 1); alarm.disarm(); await Promise.resolve(); await Promise.resolve();
  assert.equal(locks().released, 1);
});
