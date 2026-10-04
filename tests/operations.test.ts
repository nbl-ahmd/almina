import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from 'mongodb';
import { drainRetainedService, retainedReadiness } from '../apps/api/src/modules/operations/lifecycle';
import { whatsappEvent } from '../apps/api/src/modules/notifications/whatsapp-inbox';
test('WhatsApp normalization bounds signed payloads and never invents text, recipients or opt-in state', () => {
  const wrap = (value: unknown) => ({ object: 'whatsapp_business_account', entry: [{ changes: [{ value }] }] });
  assert.equal(whatsappEvent(wrap({ messages: [{ id: 'synthetic', from: '971501234567', image: { id: 'opaque' } }] }))!.kind, 'ignored');
  const normalized = whatsappEvent(wrap({ messages: [{ id: 'synthetic', from: '971501234567', text: { body: 'Text' } }], contacts: [{ profile: { name: 'Synthetic' } }] }));
  assert.equal(normalized?.kind, 'message');
  if (normalized?.kind === 'message') assert.equal(normalized.data.promotionStatus, undefined);
  for (const value of [{ messages: [{ id: 'synthetic' }] }, { messages: [{ id: 'synthetic', from: 'invalid', text: { body: 'Text' } }] },
    { messages: [{ id: 'synthetic', from: '971501234567', text: { body: 'a'.repeat(4001) } }] },
    { messages: [{ id: 'one', from: '971501234567' }, { id: 'two', from: '971501234567' }] }]) assert.throws(() => whatsappEvent(wrap(value)), { code: 'INVALID_REQUEST' });
});
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
