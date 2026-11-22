import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { createOutboxWake, wakeLoop, type Wake } from '../apps/api/src/modules/notifications/wake';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
class FakeStream extends EventEmitter { closed = false; async close() { this.closed = true; this.emit('close'); } }
function fakeDb() {
  const streams: FakeStream[] = []; const pipelines: unknown[] = [];
  return { streams, pipelines, db: { watch: (pipeline: unknown) => { pipelines.push(pipeline); const stream = new FakeStream(); streams.push(stream); return stream; } } };
}
function manualWake(healthy: boolean) {
  const listeners = new Set<() => void>(); let ok = healthy;
  const wake: Wake = { subscribe: l => { listeners.add(l); return () => listeners.delete(l); }, healthy: () => ok, shutdown: async () => undefined };
  return { wake, fire: () => listeners.forEach(l => l()), set: (value: boolean) => { ok = value; } };
}

test('without a healthy wake source a worker keeps its fast cadence; with one it only keeps the slow safety interval', async () => {
  let fast = 0; const a = wakeLoop(() => { fast++; }, { fastMs: 10, slowMs: 1000 }); await wait(75); a.stop();
  assert.ok(fast >= 4);
  let slow = 0; const { wake } = manualWake(true); const b = wakeLoop(() => { slow++; }, { fastMs: 10, slowMs: 1000, wake }); await wait(75); b.stop();
  assert.equal(slow, 0);
});

test('a wake ticks immediately, and a wake during a running tick causes exactly one more', async () => {
  const { wake, fire } = manualWake(true); let runs = 0, release!: () => void;
  const loop = wakeLoop(() => { runs++; return runs === 1 ? new Promise<void>(resolve => { release = resolve; }) : undefined; }, { fastMs: 5, slowMs: 1000, wake });
  fire(); await wait(5); assert.equal(runs, 1);
  fire(); fire(); fire(); await wait(5); assert.equal(runs, 1);
  release(); await wait(30); assert.equal(runs, 2);
  loop.stop();
});

test('losing the wake source returns workers to the fast cadence', async () => {
  const { wake, set } = manualWake(true); let runs = 0;
  const loop = wakeLoop(() => { runs++; }, { fastMs: 10, slowMs: 1000, wake });
  await wait(30); assert.equal(runs, 0); set(false);
  loop.stop(); const again = wakeLoop(() => { runs++; }, { fastMs: 10, slowMs: 1000, wake }); await wait(60); again.stop();
  assert.ok(runs >= 3);
});

test('one database change stream, limited to orders and the outbox, wakes every worker once per burst', async () => {
  const { db, streams, pipelines } = fakeDb(); let a = 0, b = 0;
  const wake = createOutboxWake(async () => db as never, { coalesceMs: 5 });
  await wait(5); assert.equal(streams.length, 1); assert.equal(wake.healthy(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(pipelines[0])), [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] }, 'ns.coll': { $in: ['orders', 'order_outbox'] } } }, { $project: { operationType: 1 } }]);
  wake.subscribe(() => { a++; }); wake.subscribe(() => { b++; });
  for (let index = 0; index < 4; index++) streams[0]!.emit('change', {});
  await wait(30); assert.equal(a, 1); assert.equal(b, 1);
  await wake.shutdown(); assert.equal(streams[0]!.closed, true);
});

test('unsupported change streams leave workers on the fast cadence; transient errors wake once and reopen', async () => {
  const first = fakeDb(); const unsupported = createOutboxWake(async () => first.db as never, { coalesceMs: 5 });
  await wait(5); first.streams[0]!.emit('error', { code: 40573 }); await wait(10);
  assert.equal(unsupported.healthy(), false); await unsupported.shutdown();
  const second = fakeDb(); let wakes = 0; const transient = createOutboxWake(async () => second.db as never, { coalesceMs: 5 }); transient.subscribe(() => { wakes++; });
  await wait(5); second.streams[0]!.emit('error', { code: 6 }); await wait(30);
  assert.equal(wakes, 1); assert.equal(transient.healthy(), false); await wait(2300);
  assert.equal(second.streams.length, 2); assert.equal(transient.healthy(), true); await transient.shutdown();
});
