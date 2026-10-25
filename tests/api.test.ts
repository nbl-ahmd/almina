import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { apiErrorSchema, statusResponseSchema } from '@almina/contracts';
import { createApiClient } from '@almina/contracts/client';
import { createLogger } from '@almina/config/logger';
import { createApp } from '../apps/api/src/app.js';
import type { DatabaseProbe } from '../apps/api/src/database.js';

async function fixture(probe: DatabaseProbe, run: (origin: string, logs: string[]) => Promise<void>) {
  const logs: string[] = [];
  const logger = createLogger({ service: 'api', environment: 'development', write: (line) => logs.push(line) });
  const server = createServer(createApp({ database: probe, logger }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`, logs); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('external uptime ping supports GET/HEAD without database access', async () => {
  await fixture({ mode: 'enabled', checkReadiness: async () => { throw new Error('Database must not be called'); } }, async (origin) => {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(`${origin}/api/ping`, { method });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match(response.headers.get('content-type') ?? '', /^text\/plain/);
      assert.equal(await response.text(), method === 'GET' ? 'pong' : '');
    }
  });
});

test('live API and shared client agree on envelopes, health and correlation', async () => {
  await fixture({ mode: 'disabled', checkReadiness: async () => true }, async (origin) => {
    for (const route of ['/health/live', '/health/ready', '/api/v1/status']) {
      const response = await fetch(`${origin}${route}`, { headers: { 'X-Request-ID': 'fake-sensitive-marker', Origin: 'https://untrusted.example.invalid' } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(response.headers.get('x-powered-by'), null);
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      const body = statusResponseSchema.parse(await response.json());
      assert.equal(body.requestId, response.headers.get('x-request-id'));
      assert.equal(body.data.database, 'disabled');
    }
    assert.equal((await createApiClient({ origin }).getReadiness()).service, 'almina-api');
  });
});

test('liveness never probes DB; failed readiness/status return redacted 503 with retry hint', async () => {
  let probes = 0;
  await fixture({ mode: 'enabled', checkReadiness: async () => { probes++; return false; } }, async (origin) => {
    const live = await fetch(`${origin}/health/live`);
    assert.equal(live.status, 200);
    assert.equal(probes, 0);
    assert.equal(statusResponseSchema.parse(await live.json()).data.database, 'not_checked');
    for (const route of ['/health/ready', '/api/v1/status']) {
      const response = await fetch(`${origin}${route}`);
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('retry-after'), '5');
      assert.equal(apiErrorSchema.parse(await response.json()).error.code, 'SERVICE_UNAVAILABLE');
    }
  });
});

test('unknown legacy/private routes are unavailable and arbitrary filters are rejected', async () => {
  await fixture({ mode: 'disabled', checkReadiness: async () => true }, async (origin) => {
    for (const route of ['/api/orders', '/api/auth/users', '/api/products', '/api/v1/status?filter=%7B%22%24where%22%3A%22fake-sensitive-marker%22%7D']) {
      const response = await fetch(`${origin}${route}`);
      assert.equal(response.status, route.includes('?') ? 400 : 404);
      apiErrorSchema.parse(await response.json());
    }
  });
});

test('invalid/oversized JSON and unsupported methods return JSON errors without reflecting input', async () => {
  await fixture({ mode: 'disabled', checkReadiness: async () => true }, async (origin, logs) => {
    for (const body of ['{"fake-sensitive-marker":', JSON.stringify({ marker: 'fake-sensitive-marker'.repeat(2000) })]) {
      const response = await fetch(`${origin}/api/v1/status`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
      assert.equal(response.status, body.length > 16384 ? 413 : 400);
      assert.ok(!JSON.stringify(await response.json()).includes('fake-sensitive-marker'));
    }
    const response = await fetch(`${origin}/api/v1/status`, { method: 'POST' });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
    assert.ok(!logs.join('').includes('fake-sensitive-marker'));
  });
});

test('unexpected async errors are contained with no exception text/stack', async () => {
  await fixture({ mode: 'enabled', checkReadiness: async () => { throw new Error('fake-sensitive-marker'); } }, async (origin, logs) => {
    const response = await fetch(`${origin}/health/ready`);
    assert.equal(response.status, 500);
    assert.equal(apiErrorSchema.parse(await response.json()).error.code, 'INTERNAL_ERROR');
    assert.ok(!logs.join('').includes('fake-sensitive-marker'));
  });
});
