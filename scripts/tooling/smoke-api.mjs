import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const listener = createServer();
listener.listen(0, '127.0.0.1');
await once(listener, 'listening');
const address = listener.address();
assert.ok(address && typeof address !== 'string');
await new Promise(resolve => listener.close(resolve));
const origin = `http://127.0.0.1:${address.port}`;
const child = spawn(process.execPath, ['dist/server.js'], {
  cwd: fileURLToPath(new URL('../../apps/api/', import.meta.url)),
  // No inherited secrets, dotenv files, production database or provider configuration.
  env: { APP_ENV: 'development', NODE_ENV: 'production', WEB_ORIGIN: 'http://localhost:3000',
    API_HOST: '127.0.0.1', PORT: String(address.port), DATABASE_MODE: 'disabled', LOG_LEVEL: 'error' },
  stdio: 'ignore',
});
try {
  let started = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error('API failed to start');
    try {
      started = (await fetch(`${origin}/health/live`, { signal: AbortSignal.timeout(500) })).ok;
      if (started) break;
    } catch { /* Wait for the compiled process. */ }
    await delay(100);
  }
  assert.ok(started, 'API startup deadline');
  for (const [route, status] of [['/health/live', 200], ['/health/ready', 200], ['/api/v1/status', 200],
    ['/api/v1/catalog/products', 503], ['/api/v1/catalog/products?filter=%7B%7D', 400],
    ['/api/v1/admin/orders', 401], ['/api/v1/admin/users', 401], ['/api/orders', 404]]) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, status);
    assert.ok(response.headers.has('x-request-id'));
    assert.ok(response.headers.has('content-security-policy'));
    assert.ok(response.headers.has('x-content-type-options'));
    const body = await response.json();
    assert.equal(body.requestId, response.headers.get('x-request-id'));
  }
  const forbidden = await fetch(`${origin}/api/v1/catalog/products`, { headers: { Origin: 'https://untrusted.example.invalid' } });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.headers.get('access-control-allow-origin'), null);
  const preflight = await fetch(`${origin}/api/v1/catalog/products`, { method: 'OPTIONS', headers: {
    Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Authorization' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:3000');
  const oversized = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: 'fake-sensitive-marker'.repeat(2000) }) });
  assert.equal(oversized.status, 413);
  assert.ok(!JSON.stringify(await oversized.json()).includes('fake-sensitive-marker'));
  const exit = once(child, 'exit');
  child.kill('SIGTERM');
  const result = await Promise.race([exit, delay(11000).then(() => { throw new Error('API shutdown deadline'); })]);
  assert.equal(result[0], 0);
  console.log('Compiled API smoke passed: health, validation, auth, CORS, headers, limits, disabled DB and clean shutdown.');
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM');
    await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
}
