import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from 'mongodb';
import { drainRetainedService, retainedReadiness } from '../apps/api/src/modules/operations/lifecycle';
test('retained readiness requires a transaction-capable writable primary and stops during drain', async () => {
  let checks = 0;
  const db = { command: async (input: { ping?: number }) => { checks++; return input.ping ? { ok: 1 } : { isWritablePrimary: true, setName: 'synthetic' }; } } as unknown as Db;
  assert.equal(await retainedReadiness(() => db, false), true);
  assert.equal(await retainedReadiness(() => db, true), false); assert.equal(checks, 2);
  assert.equal(await retainedReadiness(() => { throw new Error('Synthetic provider secret'); }, false), false);
  assert.equal(await retainedReadiness(() => ({ command: async () => ({ isWritablePrimary: true }) }) as unknown as Db, false), false);
});
test('drain awaits active HTTP and workers before closing the database; deadline forces connections', async () => {
  const events: string[] = [];
  let finishWorker!: () => void;
  const worker = new Promise<void>(resolve => { finishWorker = resolve; });
  const resources = { markDraining: () => { events.push('draining'); }, closeHttp: async () => { events.push('http'); },
    stopWorkers: async () => { await worker; events.push('worker'); }, closeDatabase: async () => { events.push('database'); },
    forceConnections: () => { events.push('force'); } };
  const done = drainRetainedService(resources); await Promise.resolve();
  assert.equal(events.includes('database'), false); finishWorker(); await done;
  assert.deepEqual(events, ['draining', 'http', 'worker', 'database']);
  await assert.rejects(drainRetainedService({ ...resources, stopWorkers: () => new Promise(() => {}) }, 5), /deadline/);
  assert.equal(events.at(-1), 'force');
});
