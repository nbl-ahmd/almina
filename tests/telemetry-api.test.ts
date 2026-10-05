import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createLogger } from '@almina/config/logger';
import { createApp } from '../apps/api/src/app';
import { createOperationalMetrics } from '../apps/api/src/modules/operations/metrics';
const webOrigin = 'http://localhost:3000';
async function fixture(enabled: boolean, run: (origin: string, metrics: ReturnType<typeof createOperationalMetrics>, logs: string[]) => Promise<void>) {
  const logs: string[] = [], metrics = createOperationalMetrics('api', Date.now, enabled);
  const server = createServer(createApp({ database: { mode: 'disabled', checkReadiness: async () => true },
    logger: createLogger({ service: 'api', environment: 'development', write: line => logs.push(line) }), webOrigin,
    commerceTelemetryEnabled: enabled, metrics, getDb: async () => { assert.fail('Telemetry must never query the database'); } }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`, metrics, logs); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
test('HTTP telemetry remains disabled by default and reports unknown client coverage', async () => {
  await fixture(false, async (origin, metrics) => {
    const result = await fetch(origin + '/api/v1/commerce-events', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: webOrigin }, body: '{}' });
    assert.equal(result.status, 404); assert.equal(metrics.snapshot().clientJavaScriptErrors, null);
  });
});
test('HTTP telemetry enforces origin, CSRF, privacy, bounded strict input and no PII logging or database access', async () => {
  await fixture(true, async (origin, metrics, logs) => {
    const post = (body: unknown, extra: Record<string, string> = {}, query = '') => fetch(origin + '/api/v1/commerce-events' + query,
      { method: 'POST', headers: { Origin: webOrigin, 'X-CSRF-Protection': '1', 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body) });
    const valid = { event: 'client_error', consent: true };
    for (const headers of [{ Origin: 'https://other.invalid' }, { 'X-CSRF-Protection': '0' }, { DNT: '1' }, { 'Sec-GPC': '1' }]) assert.equal((await post(valid, headers)).status, 403);
    for (const body of [{ ...valid, email: 'synthetic-sensitive-marker' }, { ...valid, consent: false }, { ...valid, event: 'other' }]) assert.equal((await post(body)).status, 400);
    assert.equal((await post({ ...valid, text: 'x'.repeat(200) })).status, 413);
    assert.equal((await post(valid, {}, '?identity=synthetic-sensitive-marker')).status, 400);
    assert.equal(metrics.snapshot().clientJavaScriptErrors, 0);
    for (const event of ['cart_updated', 'checkout_reviewed', 'checkout_confirmed', 'checkout_failed', 'client_error']) {
      const result = await post({ event, consent: true }); assert.equal(result.status, 204); assert.equal(result.headers.get('set-cookie'), null);
    }
    assert.equal(metrics.snapshot().clientJavaScriptErrors, 1);
    assert.deepEqual(Object.values(metrics.snapshot().commerceEvents!), [1, 1, 1, 1, 1]);
    assert.ok(!logs.join('').includes('synthetic-sensitive-marker'));
    assert.equal((await fetch(origin + '/api/v1/admin/operations')).status, 401);
  });
});
