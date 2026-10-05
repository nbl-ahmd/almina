import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { commerceEventSchema, operationsSnapshotSchema } from '@almina/contracts';
import { createCommerceReporter } from '../apps/web/src/lib/telemetry/reporter';
import { commerceEventRequest } from '../apps/web/src/lib/telemetry/gateway';
import { createOperationalMetrics } from '../apps/api/src/modules/operations/metrics';
const origin = 'http://localhost:3000';
const valid = { event: 'client_error', consent: true };
const request = (body: unknown = valid, headers: Record<string, string> = {}, path = '') => new Request(origin + '/api/commerce-events' + path, {
  method: 'POST', headers: { Origin: origin, 'X-CSRF-Protection': '1', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});
test('telemetry strictly excludes identities, product/order details, prices, URLs and error messages', () => {
  assert.equal(commerceEventSchema.safeParse(valid).success, true);
  for (const field of ['productId', 'orderId', 'email', 'url', 'stack', 'amount', 'userId']) assert.equal(commerceEventSchema.safeParse({ ...valid, [field]: 'synthetic' }).success, false);
  for (const body of [{ ...valid, consent: false }, { ...valid, event: 'unknown' }, { event: 'client_error' }]) assert.equal(commerceEventSchema.safeParse(body).success, false);
});
test('reporter defaults off, checks privacy again before dispatch and cancels pending reports on withdrawal', async () => {
  const sent: unknown[] = []; let allowed = true;
  const reporter = createCommerceReporter({ allowed: () => allowed, send: async body => { sent.push(body); } });
  reporter.record('cart_updated'); await delay(0); assert.deepEqual(sent, []);
  reporter.enable(true); allowed = false; reporter.record('cart_updated'); await delay(0); assert.deepEqual(sent, []);
  allowed = true; reporter.record('cart_updated'); reporter.enable(false); await delay(0); assert.deepEqual(sent, []);
  reporter.enable(true); reporter.record('cart_updated'); await delay(0); assert.deepEqual(sent, [{ event: 'cart_updated', consent: true }]);
  reporter.enable(false);
});
test('reporter bounds concurrent sends/rate, aborts active work and never throws provider/storage errors', async () => {
  let calls = 0, clock = 0; const signals: AbortSignal[] = [];
  const reporter = createCommerceReporter({ now: () => clock, allowed: () => true, send: async (_body, signal) => { calls++; signals.push(signal); throw new Error('synthetic transport failure'); } });
  reporter.enable(true);
  for (let i = 0; i < 30; i++) { reporter.record('client_error'); await delay(0); }
  assert.equal(calls, 20); clock = 60000; reporter.record('client_error'); await delay(0); assert.equal(calls, 21);
  let finish!: () => void; const pending = new Promise<void>(resolve => { finish = resolve; });
  const busy = createCommerceReporter({ allowed: () => true, send: async (_body, signal) => { signals.push(signal); await pending; } });
  busy.enable(true); for (let i = 0; i < 5; i++) busy.record('client_error'); await delay(0);
  assert.equal(signals.length, 23); busy.enable(false); assert.ok(signals.slice(-2).every(signal => signal.aborted)); finish();
  const broken = createCommerceReporter({ allowed: () => { throw new Error('blocked storage'); }, send: async () => assert.fail() });
  broken.enable(true); assert.doesNotThrow(() => broken.record('cart_updated'));
});
test('collector validates before effects and forwards only the fixed anonymous contract', async () => {
  let calls = 0;
  const options = { enabled: true, webOrigin: origin, apiOrigin: 'http://localhost:4000', fetch: (async (url, init) => {
    calls++; assert.equal(String(url), 'http://localhost:4000/api/v1/commerce-events');
    assert.deepEqual(init!.headers, { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', Origin: origin });
    assert.equal(init!.credentials, 'omit'); assert.equal(init!.redirect, 'error'); assert.equal(init!.referrerPolicy, 'no-referrer');
    assert.deepEqual(JSON.parse(String(init!.body)), valid); return new Response(null, { status: 204 });
  }) as typeof fetch };
  assert.equal((await commerceEventRequest(request(), { ...options, enabled: false })).status, 404);
  for (const headers of [{ Origin: 'https://other.invalid' }, { 'X-CSRF-Protection': '0' }, { DNT: '1' }, { 'Sec-GPC': '1' }]) assert.equal((await commerceEventRequest(request(valid, headers), options)).status, 403);
  for (const body of [{ ...valid, email: 'synthetic@example.invalid' }, { ...valid, consent: false }, { ...valid, text: 'x'.repeat(129) }]) assert.equal((await commerceEventRequest(request(body), options)).status, 400);
  assert.equal((await commerceEventRequest(request(valid, {}, '?product=one'), options)).status, 400);
  assert.equal(calls, 0);
  const response = await commerceEventRequest(request(valid, { Cookie: 'synthetic', Authorization: 'synthetic', Referer: origin + '/products/private' }), options);
  assert.equal(response.status, 204); assert.equal(calls, 1); assert.match(response.headers.get('cache-control')!, /no-store/);
});
test('collector bounds stalled input and redacts provider failures without retry', async () => {
  let cancelled = false, calls = 0;
  const options = { enabled: true, webOrigin: origin, apiOrigin: 'http://localhost:4000', deadlineMs: 5,
    fetch: (async () => { calls++; throw new Error('synthetic provider detail'); }) as typeof fetch };
  const stalled = new Request(origin + '/api/commerce-events', { method: 'POST', headers: { Origin: origin, 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' },
    body: new ReadableStream({ cancel() { cancelled = true; } }), duplex: 'half' } as RequestInit);
  assert.equal((await commerceEventRequest(stalled, options)).status, 503); assert.equal(cancelled, true); assert.equal(calls, 0);
  const response = await commerceEventRequest(request(), options); assert.equal(response.status, 503); assert.equal(await response.text(), ''); assert.equal(calls, 1);
});
test('anonymous operational counters are bounded, expire and distinguish disabled from partial reporting', () => {
  let clock = 0; const disabled = createOperationalMetrics('api');
  const legacy = { ...disabled.snapshot() } as Record<string, unknown>; delete legacy.clientJavaScriptCoverage; delete legacy.commerceEvents;
  assert.equal(operationsSnapshotSchema.shape.http.parse(legacy).clientJavaScriptCoverage, 'not-configured');
  assert.equal(disabled.recordCommerceEvent('client_error'), false); assert.equal(disabled.snapshot().clientJavaScriptErrors, null);
  const metrics = createOperationalMetrics('api', () => clock, true);
  for (let i = 0; i < 10000; i++) assert.equal(metrics.recordCommerceEvent('client_error'), true);
  assert.equal(metrics.recordCommerceEvent('client_error'), false); assert.equal(metrics.snapshot().clientJavaScriptErrors, 10000);
  assert.equal(metrics.snapshot().clientJavaScriptCoverage, 'consented-reports-only');
  clock = 5 * 60000; assert.equal(metrics.snapshot().clientJavaScriptErrors, 0); assert.equal(metrics.snapshot(10).clientJavaScriptErrors, 10000);
  clock = 31 * 60000; metrics.recordCommerceEvent('cart_updated'); assert.equal(metrics.snapshot().commerceEvents!.cart_updated, 1);
});
