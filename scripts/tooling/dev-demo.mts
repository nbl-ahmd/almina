import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { MongoClient } from 'mongodb';
import { assertExclusiveLoopbackPorts } from './e2e-ownership.mjs';
import { demoDatabaseName, demoPassword, seedDemoDatabase } from './demo-data.js';
import { indexPlan } from '../../apps/api/src/database/indexes.js';

const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('apps/web/package.json', root));
const children: ChildProcess[] = [];
let replica: MongoMemoryReplSet | undefined;
let client: MongoClient | undefined;
let stopping = false;
let shutdown: Promise<void> | undefined;
const clean: NodeJS.ProcessEnv = { NODE_ENV: 'development', ...Object.fromEntries(Object.entries({ PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR }).filter(([, value]) => value !== undefined)) };
function launch(args: string[], cwd: URL, env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, args, { cwd: fileURLToPath(cwd), env, stdio: 'inherit' });
  children.push(child);
  child.on('error', () => { process.exitCode = 1; void stop(); });
  return child;
}
function stop(): Promise<void> {
  if (shutdown) return shutdown;
  stopping = true;
  shutdown = (async () => {
    await Promise.all(children.map(async child => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
      child.kill('SIGTERM');
      const timeout = setTimeout(() => child.kill('SIGKILL'), 10000);
      await exited; clearTimeout(timeout);
    }));
    await client?.close();
    await replica?.stop({ doCleanup: false, force: false });
  })();
  return shutdown;
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void stop().then(() => process.exit(process.exitCode ?? 0)); });
try {
  if (process.argv.length > 2) throw new Error('Demo accepts no URI or target arguments');
  await assertExclusiveLoopbackPorts([4760, 4770, 4781]);
  const storage = new URL('.local-demo/mongo/', root);
  await mkdir(storage, { recursive: true });
  // Explicit blank file prevents the full runtime from loading backend/.env.local.
  const envFile = new URL('.local-demo/empty.env', root);
  await writeFile(envFile, '# Isolated demo runtime; all configuration is injected.\n', { mode: 0o600 });
  const build = launch(['scripts/tooling/build-commerce.mjs'], root, clean);
  if (await new Promise(resolve => build.once('exit', resolve)) !== 0) throw new Error('Demo build failed');
  replica = await MongoMemoryReplSet.create({ binary: { version: '8.0.17', ...(process.env.TEST_MONGOD_PATH ? { systemBinary: process.env.TEST_MONGOD_PATH } : {}) },
    instanceOpts: [{ port: 4781, dbPath: fileURLToPath(storage) }],
    replSet: { count: 1, name: 'almina_demo', ip: '127.0.0.1', storageEngine: 'wiredTiger' } });
  client = await new MongoClient(replica.getUri(demoDatabaseName)).connect();
  await seedDemoDatabase(client.db(demoDatabaseName));
  for (const collection of ['geocoding_cache', 'geocoding_limits']) {
    await client.db(demoDatabaseName).collection(collection).createIndexes([...indexPlan[collection]!]);
  }
  const api = launch(['backend/server.js'], root, { ...clean, APP_ENV: 'development', NODE_ENV: 'development', PORT: '4770',
    AUTH_ALLOWED_ORIGINS: 'http://127.0.0.1:4760', MONGODB_URI: replica.getUri(demoDatabaseName),
    ALMINA_RUNTIME_ENV_FILE: fileURLToPath(envFile), ADMIN_PUSH_ENABLED: 'false', COMMERCE_TELEMETRY_ENABLED: 'false' });
  let ready = false;
  for (let attempt = 0; attempt < 150 && !stopping && api.exitCode === null; attempt++) {
    try { ready = (await fetch('http://127.0.0.1:4770/health/ready', { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Startup only. */ }
    if (ready) break;
    await delay(100);
  }
  if (!ready || stopping) throw new Error('Demo API failed to start');
  const web = launch([require.resolve('next/dist/bin/next'), 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', '4760'], new URL('apps/web/', root), {
    ...clean, APP_ENV: 'development', NODE_ENV: 'development', WEB_ORIGIN: 'http://127.0.0.1:4760',
    API_ORIGIN: 'http://127.0.0.1:4770', LEGACY_API_ORIGIN: 'http://127.0.0.1:4770', CHECKOUT_ENABLED: 'true',
    NEXT_TELEMETRY_DISABLED: '1', ALMINA_LOCAL_DEMO: '1', COMMERCE_TELEMETRY_ENABLED: 'false' });
  for (const child of [api, web]) child.once('exit', () => { if (!stopping) { process.exitCode = 1; void stop(); } });
  console.log(`Local demo: http://127.0.0.1:4760 — demo-admin / ${demoPassword}; demo-staff uses the same synthetic password.`);
  console.log('Demo orders/stock persist under .local-demo. Real providers have no credentials; no notifications are delivered.');
} catch {
  console.error('Demo startup failed. Check dependencies and free ports 4760, 4770, 4781. Existing demo data is preserved.');
  process.exitCode = 1;
  await stop();
}
