import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Db } from 'mongodb';
import { drainRetainedService, retainedReadiness } from '../apps/api/src/modules/operations/lifecycle';
import { whatsappEvent } from '../apps/api/src/modules/notifications/whatsapp-inbox';
import { createOperationalMetrics, operationGroup } from '../apps/api/src/modules/operations/metrics';
test('operational counters stay bounded, retain no request identity and treat empty/warmup samples as unknown', () => {
  let clock = 0; const metrics = createOperationalMetrics('api', () => clock);
  assert.equal(metrics.snapshot().groups.checkout.failureRate, null); assert.equal(metrics.snapshot().warmupComplete, false);
  metrics.record(operationGroup('POST', '/api/v1/checkout'), 409, 300); // Expected conflicts are not checkout server failures.
  metrics.record('checkout', 503, 3100); metrics.record('checkout', 499, 1000, true); metrics.databaseError();
  const sample = metrics.snapshot();
  assert.equal(sample.groups.checkout.count, 3); assert.equal(sample.groups.checkout.failures, 1); assert.equal(sample.groups.checkout.aborted, 1);
  assert.equal(sample.groups.checkout.p95UpperBoundMs, 6000); assert.equal(sample.databaseErrors, 1);
  assert.equal(sample.clientJavaScriptErrors, null); assert.equal(sample.scope, 'this-process-only');
  assert.equal(operationGroup('GET', '/api/products/search'), 'catalog');
  assert.equal(operationGroup('GET', '/api/products/images/synthetic.webp'), 'other');
  metrics.record('other', Number.NaN, 1); metrics.record('catalog', 200, Number.NaN);
  clock = 31 * 60000; metrics.record('other', 200, 11000);
  assert.equal(metrics.snapshot().groups.checkout.count, 0); assert.equal(metrics.snapshot().groups.other.p95Over10Seconds, true);
  assert.ok(!JSON.stringify(metrics.snapshot()).includes('/api/'));
});
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
