import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, copyFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoClient } from 'mongodb';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('real retained production startup uses injected config, leaves historical indexes unchanged and drains cleanly', { skip: !uri, timeout: 20000 }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const dbName = 'almina_runtime_test_' + randomUUID().replaceAll('-', ''); const db = client.db(dbName);
  const directory = await mkdtemp(join(tmpdir(), 'almina-runtime-'));
  const portProbe = createServer(); await new Promise<void>(resolve => portProbe.listen(0, '127.0.0.1', resolve));
  const address = portProbe.address(); assert.ok(address && typeof address !== 'string'); const port = address.port;
  await new Promise<void>(resolve => portProbe.close(() => resolve()));
  const historical = [{ from: '15550000001', name: 'Synthetic same historical name', messages: [] }, { from: '15550000002', name: 'Synthetic same historical name', messages: [] }];
  await db.collection('conversations').insertMany(historical);
  const before = await db.collection('conversations').find().toArray();
  // Copy only the entry point. Its __dirname is isolated: no backend .env file can be read.
  await copyFile(resolve('backend/server.js'), join(directory, 'server.js'));
  for (const name of ['node_modules', 'commerce', 'security', 'routes', 'models', 'integrations', 'diagnostics', 'app.js']) {
    await symlink(resolve('backend', name), join(directory, name));
  }
  const child = spawn(process.execPath, [join(directory, 'server.js')], { env: { NODE_ENV: 'production', APP_ENV: 'production',
    AUTH_ALLOWED_ORIGINS: 'https://shop.example.invalid', MONGODB_URI: uri!.replace('/?', `/${dbName}?`), PORT: String(port), RENDER_GIT_COMMIT: 'c'.repeat(40) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stdout.on('data', chunk => { logs = (logs + String(chunk)).slice(-8192); }); child.stderr.on('data', chunk => { logs = (logs + String(chunk)).slice(-8192); });
  const exited = new Promise<number | null>((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 70; attempt++) {
      assert.equal(child.exitCode, null, 'Isolated production runtime must remain running');
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health/ready`, { signal: AbortSignal.timeout(200) });
        if (response.status === 200) { assert.deepEqual(await response.json(), { status: 'ready', commitSha: 'c'.repeat(40) }); ready = true; break; }
      } catch { /* Wait only for this isolated child. */ }
      await delay(100);
    }
    assert.ok(ready, 'Isolated production runtime did not become ready');
    assert.equal((await fetch(`http://127.0.0.1:${port}/health/live`)).status, 200);
    const versioned = await fetch(`http://127.0.0.1:${port}/api/v1/status`);
    assert.equal(versioned.status, 200); assert.equal((await versioned.json()).data.database, 'ready');
    const catalog = await fetch(`http://127.0.0.1:${port}/api/v1/catalog/products`);
    assert.equal(catalog.status, 200); assert.deepEqual((await catalog.json()).data.items, []);
    await delay(100);
    assert.deepEqual(await db.collection('conversations').find().toArray(), before);
    assert.deepEqual((await db.collection('conversations').indexes()).map(value => value.name), ['_id_']);
    assert.ok(!logs.includes(uri!) && !logs.includes('Historical same name'));
    child.kill('SIGTERM'); assert.equal(await Promise.race([exited, delay(5000, -999, { ref: false })]), 0, 'Graceful shutdown must exit cleanly within five seconds');
  } finally {
    if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited; }
    await db.dropDatabase(); await client.close(); await rm(directory, { recursive: true });
  }
});
