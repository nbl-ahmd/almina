import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('apps/web/package.json', root));
const children = [];

async function freePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

function launch(args, cwd, env) {
  // No inherited provider/database credentials. Never launch the legacy service.
  const child = spawn(process.execPath, args, { cwd: fileURLToPath(cwd), env, stdio: 'ignore' });
  children.push(child);
  child.on('error', () => { process.exitCode = 1; });
  return child;
}

async function waitForServer(origin, child, path) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null || process.exitCode) throw new Error('Production smoke process failed to start');
    try {
      const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* Startup may still be in progress. */ }
    await delay(100);
  }
  throw new Error('Production smoke startup timed out');
}

try {
  const apiPort = await freePort();
  const webPort = await freePort();
  const apiOrigin = `http://127.0.0.1:${apiPort}`;
  const webOrigin = `http://127.0.0.1:${webPort}`;
  const env = { APP_ENV: 'development', NODE_ENV: 'production', WEB_ORIGIN: webOrigin,
    DATABASE_MODE: 'disabled', NEXT_TELEMETRY_DISABLED: '1' };
  const api = launch(['dist/server.js'], new URL('apps/api/', root), {
    ...env, API_HOST: '127.0.0.1', PORT: String(apiPort),
  });
  await waitForServer(apiOrigin, api, '/health/live');
  const web = launch([require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(webPort)],
    new URL('apps/web/', root), { ...env, API_ORIGIN: apiOrigin });
  await waitForServer(webOrigin, web, '/');
  const readiness = await fetch(`${apiOrigin}/health/ready`);
  assert.equal(readiness.status, 200);
  assert.equal((await readiness.json()).data.database, 'disabled');
  const status = await fetch(`${webOrigin}/foundation/status`);
  assert.equal(status.status, 200);
  assert.match(await status.text(), /API is available\./);
  assert.equal(status.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.equal((await fetch(`${webOrigin}/favicon.ico`)).status, 200);
  assert.equal((await fetch(`${webOrigin}/not-a-route`)).status, 404);
  assert.equal((await fetch(`${webOrigin}/_next/mcp`)).status, 404);
  assert.equal((await fetch(`${apiOrigin}/api/orders`)).status, 404);

  // A failed upstream is an expected availability state, with no raw error leak.
  api.kill('SIGTERM');
  await once(api, 'exit');
  const unavailable = await fetch(`${webOrigin}/foundation/status`);
  assert.equal(unavailable.status, 200);
  assert.match(await unavailable.text(), /API is temporarily unavailable\./);
  console.log('Production smoke passed: compiled API, SSR, upstream failure, noindex, favicon, 404s and no production MCP.');
} finally {
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    child.kill('SIGTERM');
    await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
}
