import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer, get } from 'node:http';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, createWriteStream } from 'node:fs';

const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('apps/web/package.json', root));
const children = [];
await new Promise((resolve, reject) => mkdir(new URL('.verification-results/', root), { recursive: true }, error => error ? reject(error) : resolve()));
const log = createWriteStream(new URL('.verification-results/e2e-servers.log', root));
const cleanEnvironment = Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
  TEST_MONGOD_PATH: process.env.TEST_MONGOD_PATH, AL_MINA_ISOLATED_BUILD: process.env.AL_MINA_ISOLATED_BUILD,
  APP_ENV: 'development', DATABASE_MODE: 'disabled', NEXT_TELEMETRY_DISABLED: '1', NODE_ENV: 'production',
}).filter(([, value]) => value !== undefined));
function launch(args, cwd, env = {}) {
  const child = spawn(process.execPath, args, { cwd: fileURLToPath(cwd), env: { ...cleanEnvironment, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
  child.on('error', () => { process.exitCode = 1; });
  children.push(child); return child;
}
async function wait(url, child, expected) {
  for (let attempt = 0; attempt < 600; attempt++) {
    if (child.exitCode !== null || process.exitCode) throw new Error('E2E server exited; inspect .verification-results/e2e-servers.log');
    try {
      const response = await new Promise((resolve, reject) => {
        const request = get(url, { headers: { connection: 'close' }, timeout: 1000 }, response => {
          let body = ''; response.setEncoding('utf8'); response.on('data', chunk => { body += chunk; });
          response.on('end', () => resolve({ status: response.statusCode, body })); response.on('error', reject);
        });
        request.on('timeout', () => request.destroy(new Error('Startup probe timeout'))); request.on('error', reject);
      });
      if (response.status === 200 && (!expected || response.body === expected)) return;
    } catch { /* Startup only. */ }
    await delay(100);
  }
  throw new Error('E2E server startup timed out');
}
let ready;
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  ready?.closeAllConnections(); ready?.close();
  await Promise.all(children.map(async child => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(10000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }));
  log.end();
}
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { void stop().then(() => process.exit(0)); });
try {
  const catalog = launch(['scripts/tooling/storefront-fixture.mjs'], root, { PORT: '4711', PAGINATED_FIXTURE: '1' });
  const commerce = launch(['--import', 'tsx', 'scripts/tooling/e2e-commerce-fixture.mts'], root);
  await Promise.all([wait('http://127.0.0.1:4711/__fixture/health', catalog, 'almina-synthetic-catalog'),
    wait('http://127.0.0.1:4730/__fixture/health', commerce, 'almina-verification-commerce')]);
  const next = require.resolve('next/dist/bin/next');
  const storefront = launch([next, 'start', '--hostname', '127.0.0.1', '--port', '4710'], new URL('apps/web/', root), {
    WEB_ORIGIN: 'http://127.0.0.1:4710', API_ORIGIN: 'http://127.0.0.1:4711', LEGACY_API_ORIGIN: 'http://127.0.0.1:4711', STOREFRONT_REDIRECTS_VERIFIED: 'true',
  });
  const admin = launch([next, 'start', '--hostname', '127.0.0.1', '--port', '4720'], new URL('apps/web/', root), {
    WEB_ORIGIN: 'http://127.0.0.1:4720', API_ORIGIN: 'http://127.0.0.1:4730', LEGACY_API_ORIGIN: 'http://127.0.0.1:4730',
  });
  const checkout = launch([next, 'start', '--hostname', '127.0.0.1', '--port', '4740'], new URL('apps/web/', root), {
    WEB_ORIGIN: 'http://127.0.0.1:4740', API_ORIGIN: 'http://127.0.0.1:4730', LEGACY_API_ORIGIN: 'http://127.0.0.1:4730', CHECKOUT_ENABLED: 'true',
  });
  await Promise.all([wait('http://127.0.0.1:4710/cart', storefront), wait('http://127.0.0.1:4720/admin/login', admin), wait('http://127.0.0.1:4740/checkout', checkout)]);
  ready = createServer((_req, res) => res.end('almina-e2e-ready')).listen(4709, '127.0.0.1');
} catch (error) { console.error(error.message); await stop(); process.exitCode = 1; }
