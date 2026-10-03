import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiClientError, createApiClient } from '@almina/contracts/client';

const requestId = '0d614be8-7697-4c01-87e6-32b153bc1ee8';
const data = { service: 'almina-api', contractVersion: '1', database: 'disabled' };

test('client validates responses and uses bounded uncached credential-free requests', async () => {
  const client = createApiClient({ origin: 'https://api.example.invalid', fetch: async (url, init) => {
    assert.equal(String(url), 'https://api.example.invalid/api/v1/status');
    assert.equal(init?.cache, 'no-store');
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal instanceof AbortSignal);
    return Response.json({ data, requestId });
  } });
  assert.deepEqual(await client.getStatus(), data);
});

test('upstream error details and secrets are never exposed by the client', async () => {
  const client = createApiClient({ origin: 'http://localhost:4000', fetch: async () => Response.json({
    error: { code: 'INTERNAL_ERROR', message: 'fake-sensitive-marker' }, requestId,
  }, { status: 500 }) });
  await assert.rejects(client.getStatus(), (error: unknown) => {
    assert.ok(error instanceof ApiClientError);
    assert.equal(error.status, 500);
    assert.equal(error.requestId, requestId);
    assert.ok(!error.message.includes('fake-sensitive-marker'));
    return true;
  });
});

for (const [label, response] of [
  ['HTML', new Response('<html>fake-sensitive-marker</html>')],
  ['invalid JSON', new Response('{', { headers: { 'content-type': 'application/json' } })],
  ['invalid contract', Response.json({ data: { password: 'fake-sensitive-marker' }, requestId })],
] as const) {
  test(`client rejects ${label}`, async () => {
    const client = createApiClient({ origin: 'http://localhost:4000', fetch: async () => response.clone() });
    await assert.rejects(client.getStatus(), (error: unknown) => error instanceof ApiClientError && error.code === 'INVALID_RESPONSE');
  });
}

test('client translates network/abort errors and honors caller cancellation', async () => {
  const client = createApiClient({ origin: 'http://localhost:4000', timeoutMs: 10, fetch: async (_url, init) => {
    assert.ok(init?.signal?.aborted);
    throw new Error('fake-sensitive-marker');
  } });
  await assert.rejects(client.getStatus(AbortSignal.abort()), (error: unknown) => error instanceof ApiClientError && error.code === 'NETWORK_ERROR');
});

test('unsafe origins and unbounded timeouts fail before any HTTP request', () => {
  for (const origin of ['file:///tmp/test', 'https://user:fake-sensitive-marker@example.invalid', 'https://api.example.invalid/path']) {
    assert.throws(() => createApiClient({ origin }));
  }
  assert.throws(() => createApiClient({ origin: 'http://localhost:4000', timeoutMs: 0 }));
});
