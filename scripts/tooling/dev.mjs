import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { setTimeout, clearTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { assertExclusiveLoopbackPorts, monitorOwnedChild } from './e2e-ownership.mjs';
import { localDevPlan, localApiEnvironment } from './dev-plan.mjs';

const root = new URL('../../', import.meta.url);
const web = new URL('apps/web/', root);
const require = createRequire(new URL('package.json', web));
// Use the installed framework's env loader, including its expansion and precedence.
const nextRequire = createRequire(require.resolve('next/package.json'));
const apiOnly = process.argv.includes('--api-only');
const args = process.argv.slice(2).filter(arg => arg !== '--api-only');
nextRequire('@next/env').loadEnvConfig(fileURLToPath(web), true, { info() {}, error() {} });
const children = [];
let stopping = false;
let shutdown;
function stop() {
  if (shutdown) return shutdown;
  stopping = true;
  shutdown = Promise.all(children.map(async child => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM');
    const timeout = setTimeout(() => child.kill('SIGKILL'), 10000);
    timeout.unref();
    await exited;
    clearTimeout(timeout);
  }));
  return shutdown;
}
function launch(args, cwd, env, service = true) {
  const child = spawn(process.execPath, args, { cwd: fileURLToPath(cwd), env, stdio: ['ignore', 'inherit', 'inherit'] });
  children.push(child);
  if (service) monitorOwnedChild(child, () => stopping, () => {
    console.error('A development child stopped; shutting down this dev session.');
    process.exitCode = 1;
    void stop();
  });
  return child;
}
async function buildCommerce(env) {
  const build = launch(['scripts/tooling/build-commerce.mjs'], root, env, false);
  await new Promise((resolve, reject) => {
    build.once('exit', code => code === 0 ? resolve() : reject(new Error('Commerce build failed.')));
    build.once('error', reject);
  });
  if (stopping) throw new Error('Development startup stopped.');
}
async function checkCatalog(origin) {
  let response;
  try {
    response = await fetch(new URL('/api/category', origin), { signal: AbortSignal.timeout(8000), redirect: 'error' });
  } catch { throw new Error('Catalog API unreachable. Start the full compatibility service, or check API_ORIGIN / LEGACY_API_ORIGIN in apps/web/.env.local.'); }
  if (response.status === 404) throw new Error('Catalog routes missing: the foundation API serves /api/v1 only. Run the full compatibility service with npm run dev:api.');
  if (!response.ok) throw new Error('Catalog API unavailable. Check the compatibility service database configuration and readiness.');
  let value;
  try { value = await response.json(); } catch { throw new Error('Catalog API response invalid. LEGACY_API_ORIGIN must serve the compatibility catalog routes.'); }
  if (!Array.isArray(value)) throw new Error('Catalog API response invalid. LEGACY_API_ORIGIN must serve the compatibility catalog routes.');
}
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void stop().then(() => process.exit(process.exitCode ?? 0)); });
try {
  const plan = localDevPlan(process.env, args);
  let webEnvironment = { ...process.env, NODE_ENV: 'development' };
  const explicitlyConfigured = !apiOnly && (process.env.API_ORIGIN || process.env.LEGACY_API_ORIGIN);
  if (!explicitlyConfigured) {
    // Explicit development configuration only; never fall back to production env files.
    const configFile = [new URL('backend/.env.local', root)].find(file => existsSync(file));
    if (!configFile) throw new Error('Local API configuration missing. Set MONGODB_URI in backend/.env.local (see backend/.env.development.example), then run npm run dev. Example files are not loaded.');
    const webOrigin = process.env.WEB_ORIGIN ?? plan.webOrigin;
    // Preserve the deliberately selected development database; no implicit database naming.
    const apiEnvironment = localApiEnvironment({ PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
      ...parseEnv(readFileSync(configFile, 'utf8')) }, webOrigin);
    await buildCommerce({ PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR });
    const domain = require(fileURLToPath(new URL('backend/commerce/dist/service.cjs', root)));
    let runtime;
    try { runtime = domain.retainedRuntimeConfiguration(apiEnvironment); }
    catch { throw new Error('Local API configuration invalid. Check APP_ENV, MONGODB_URI, PORT and AUTH_ALLOWED_ORIGINS in backend/.env.local.'); }
    await assertExclusiveLoopbackPorts(apiOnly ? [runtime.port] : [plan.port, runtime.port]);
    const apiOrigin = `http://127.0.0.1:${runtime.port}`;
    const api = launch(['backend/server.js'], root, apiEnvironment);
    const deadline = Date.now() + 15000;
    let ready = false;
    while (Date.now() < deadline && !stopping && api.exitCode === null && api.signalCode === null) {
      try { await checkCatalog(apiOrigin); ready = true; break; } catch { await delay(200); }
    }
    if (!ready) throw new Error('Local API startup failed. Check the backend runtime env file and that its configured MongoDB is reachable.');
    webEnvironment = { ...webEnvironment, APP_ENV: 'development', WEB_ORIGIN: webOrigin,
      API_ORIGIN: apiOrigin, LEGACY_API_ORIGIN: apiOrigin };
    console.log(apiOnly ? 'Configured compatibility API ready (both /api and /api/v1).' : 'Configured compatibility API ready. Starting Next.js.');
  } else {
    const origin = process.env.LEGACY_API_ORIGIN ?? process.env.API_ORIGIN;
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      throw new Error('Local API configuration invalid. API origins must contain only a credential-free HTTP(S) origin.');
    }
    await checkCatalog(origin);
    console.log('Using your running compatibility API. Starting Next.js.');
  }
  if (!stopping && !apiOnly) launch([require.resolve('next/dist/bin/next'), 'dev', '--turbopack', '--hostname', plan.hostname,
    '--port', String(plan.port), ...args], web, webEnvironment);
} catch (error) {
  // Never print child environments or native/configuration error values.
  console.error(error instanceof Error && /^(Local dev|Local API|Catalog API|Catalog routes|Invalid development|E2E loopback|Commerce build|Development startup)/.test(error.message)
    ? error.message : 'Development startup failed. Check installed dependencies and local configuration.');
  process.exitCode = 1;
  await stop();
}
