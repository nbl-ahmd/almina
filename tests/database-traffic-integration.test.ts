import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createCommandMeter } from '../apps/api/src/modules/operations/command-meter';
import { createPersistentDatabase } from '../apps/api/src/modules/operations/persistent-database';
import { retainedRuntimeConfiguration } from '../apps/api/src/modules/operations/runtime';

const uri = process.env.COMMERCE_TEST_URI;
test('the production client negotiates compression with a real server and the meter sees the traffic', { skip: !uri }, async () => {
  const target = new URL(uri!);
  target.pathname = `/almina_traffic_${randomUUID().replaceAll('-', '')}`;
  const runtime = retainedRuntimeConfiguration({ APP_ENV: 'development', MONGODB_URI: target.toString(), AUTH_ALLOWED_ORIGINS: 'http://localhost:3000' });
  const meter = createCommandMeter(), database = createPersistentDatabase(runtime, undefined, { commandMeter: meter });
  await database.connect();
  const db = database.getDb();
  try {
    const compressed = async () => (await db.admin().command({ serverStatus: 1 })).network.compression?.zlib as { compressor: { bytesIn: number }; decompressor: { bytesIn: number; bytesOut: number } };
    const before = await compressed();
    const rows = Array.from({ length: 200 }, (_, index) => ({ index, description: 'Synthetic product description. '.repeat(100) }));
    await db.collection('traffic').insertMany(rows);
    assert.equal((await db.collection('traffic').find({}).toArray()).length, 200);
    const after = await compressed();
    assert.ok(after.compressor.bytesIn - before.compressor.bytesIn > 500_000, 'the server compressed its replies');
    const received = after.decompressor.bytesIn - before.decompressor.bytesIn, expanded = after.decompressor.bytesOut - before.decompressor.bytesOut;
    assert.ok(expanded > received * 3, 'what the client sent arrived compressed');
    const read = meter.drain().filter(row => (row.command === 'find' || row.command === 'getMore') && row.collection === 'traffic');
    assert.ok(read.reduce((sum, row) => sum + row.receivedMB, 0) > 0.4, 'the meter attributes both reply batches to their collection');
  } finally { await db.dropDatabase(); await database.close(); }
});
