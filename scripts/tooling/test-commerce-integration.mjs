import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoClient } from 'mongodb';
import { MongoBinary } from 'mongodb-memory-server-core';

// Start a brand-new loopback-only replica set. Never read an application URI or dotenv file.
const args = process.argv.slice(2);
const explicitBinary = args[0] && !args[0].endsWith('.test.ts') ? args.shift() : process.env.TEST_MONGOD_PATH;
// Download a pinned test-only binary on demand; installation/build never starts MongoDB.
const mongodPath = explicitBinary ?? await MongoBinary.getPath({ version: '8.0.17' });
const directory = await mkdtemp(join(tmpdir(), 'almina-commerce-test-'));
const probe = createServer();
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const uri = `mongodb://127.0.0.1:${port}/?replicaSet=almina_test`;
const child = spawn(mongodPath, ['--dbpath', directory, '--bind_ip', '127.0.0.1', '--port', String(port),
  '--replSet', 'almina_test', '--logpath', join(directory, 'mongod.log')], { stdio: 'ignore' });
let failure;
child.on('error', error => { failure = error; });
const client = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
try {
  const deadline = Date.now() + 20000;
  while (true) {
    if (failure || child.exitCode !== null) throw new Error('Disposable mongod could not start');
    try { await client.connect(); await client.db('admin').command({ ping: 1 }); break; }
    catch { if (Date.now() > deadline) throw new Error('Disposable mongod not ready'); await delay(100); }
  }
  await client.db('admin').command({ replSetInitiate: { _id: 'almina_test', members: [{ _id: 0, host: `127.0.0.1:${port}` }] } });
  while (!(await client.db('admin').command({ hello: 1 })).isWritablePrimary) {
    if (Date.now() > deadline) throw new Error('Disposable primary not ready');
    await delay(100);
  }
  const tests = spawn(process.execPath, ['--import', 'tsx', '--test', ...(args.length ? args : [
    'tests/migration-integration.test.ts', 'tests/commerce-integration.test.ts', 'tests/wholesale-integration.test.ts', 'tests/seo-database.test.ts', 'tests/catalog-integration.test.ts', 'tests/catalog-import-integration.test.ts', 'tests/performance-api.test.ts', 'tests/operations-integration.test.ts', 'tests/media-integration.test.ts', 'tests/staff-administration-integration.test.ts', 'tests/retained-runtime-integration.test.ts', 'tests/drive-integration.test.ts', 'tests/whatsapp-outbound-integration.test.ts', 'tests/persistent-api-integration.test.ts', 'tests/push-integration.test.ts', 'tests/whatsapp-reads-integration.test.ts', 'tests/order-reads-integration.test.ts', 'tests/catalog-media-reads-integration.test.ts', 'tests/persistent-database-integration.test.ts', 'tests/demo-data-integration.test.ts', 'tests/location-integration.test.ts', 'tests/growth-integration.test.ts', 'tests/development-completion-integration.test.ts', 'tests/customer-signin-integration.test.ts', 'tests/campaigns-integration.test.ts', 'tests/rewards-integration.test.ts', 'tests/retention-integration.test.ts', 'tests/resend-integration.test.ts',
  ])], {
    stdio: 'inherit', env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
      COMMERCE_TEST_URI: uri, REQUIRE_DATABASE_TESTS: '1' },
  });
  const code = await new Promise((resolve, reject) => { tests.on('exit', resolve); tests.on('error', reject); });
  process.exitCode = code ?? 1;
} finally {
  await client.close();
  if (child.exitCode === null && child.signalCode === null && !failure) {
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL'); await new Promise(resolve => child.once('exit', resolve));
    }
  }
  await rm(directory, { recursive: true, force: true });
}
