import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoClient } from 'mongodb';

// Start a brand-new loopback-only replica set. Never read an application URI or dotenv file.
const mongodPath = process.argv[2] ?? 'mongod';
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
  const tests = spawn(process.execPath, ['--import', 'tsx', '--test', ...(process.argv.slice(3).length ? process.argv.slice(3) : ['tests/commerce-integration.test.ts'])], {
    stdio: 'inherit', env: { ...process.env, COMMERCE_TEST_URI: uri },
  });
  const code = await new Promise(resolve => tests.on('exit', resolve));
  process.exitCode = code ?? 1;
} finally {
  await client.close();
  child.kill('SIGTERM');
  if (child.exitCode === null && !failure) await new Promise(resolve => child.once('exit', resolve));
  await rm(directory, { recursive: true, force: true });
}
