import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ObjectId, type Db } from 'mongodb';
import { id } from '../apps/api/src/modules/dto-values';
import { createPersistentDatabase } from '../apps/api/src/modules/operations/persistent-database';
import { retainedRuntimeConfiguration } from '../apps/api/src/modules/operations/runtime';
const config = retainedRuntimeConfiguration({ APP_ENV: 'development', NODE_ENV: 'development', AUTH_ALLOWED_ORIGINS: 'http://localhost:3000', MONGODB_URI: 'mongodb://127.0.0.1:27017/synthetic' });
const unavailable = { message: 'SERVICE_UNAVAILABLE', status: 503 };
test('persistent pool is lazy, shared, URI-selected and cannot reopen after shutdown', async () => {
  let constructed = 0, connections = 0, closes = 0, selections = 0;
  const db = { databaseName: 'synthetic' } as Db;
  const pool = createPersistentDatabase(config, (uri, options) => {
    constructed++; assert.equal(uri, config.mongoUri);
    assert.deepEqual(options, { ...config.mongoOptions, appName: 'almina-persistent-api' });
    return { async connect() { connections++; }, db(...args: unknown[]) { assert.equal(args.length, 0); selections++; return db; }, async close() { closes++; } };
  });
  assert.equal(constructed, 0); assert.throws(pool.getDb, unavailable);
  const result = await Promise.all([pool.connect(), pool.connect()]);
  assert.equal(result[0], db); assert.equal(result[1], db); assert.equal(pool.getDb(), db);
  assert.equal(constructed, 1); assert.equal(connections, 1); assert.equal(selections, 1);
  await Promise.all([pool.close(), pool.close()]); assert.equal(closes, 1);
  assert.throws(pool.getDb, unavailable); await assert.rejects(pool.connect(), unavailable);
});
test('constructor and synchronous/asynchronous connection failures are redacted and never expose a database', async () => {
  for (const phase of ['construct', 'connect-sync', 'connect-async', 'select']) {
    let closes = 0;
    const pool = createPersistentDatabase(config, () => {
      if (phase === 'construct') throw new Error('synthetic private connection diagnostic');
      return { connect() { if (phase === 'connect-sync') throw new Error('synthetic private connection diagnostic');
        return phase === 'connect-async' ? Promise.reject(new Error('synthetic private connection diagnostic')) : Promise.resolve(); },
      db() { throw new Error('synthetic private connection diagnostic'); }, async close() { closes++; } };
    });
    await assert.rejects(pool.connect(), unavailable); assert.throws(pool.getDb, unavailable);
    if (phase !== 'construct') assert.equal(closes, 1);
    await pool.close();
  }
});
test('shutdown during pending startup rejects late connections and never exposes their database', async () => {
  let resolve!: () => void, selections = 0, closes = 0;
  const gate = new Promise<void>(done => { resolve = done; });
  const pool = createPersistentDatabase(config, () => ({ connect: () => gate, db() { selections++; return {} as Db; }, async close() { closes++; } }));
  const startup = pool.connect(); await Promise.resolve();
  await pool.close(); resolve(); await assert.rejects(startup, unavailable);
  assert.equal(selections, 0); assert.ok(closes >= 1); assert.throws(pool.getDb, unavailable);
  await assert.rejects(pool.connect(), unavailable);
});

test('database IDs normalize bounded BSON shapes without accepting strings, arbitrary objects or throwing methods', () => {
  const value = new ObjectId(); assert.equal(id(value), value.toHexString());
  assert.equal(id({ _bsontype: 'ObjectId', toHexString: () => value.toHexString() }), value.toHexString());
  for (const invalid of [value.toHexString(), null, {}, { toHexString: () => value.toHexString() },
    { _bsontype: 'ObjectId', toHexString: () => 'invalid' }, { _bsontype: 'ObjectId', toHexString: () => { throw new Error('synthetic'); } }]) assert.equal(id(invalid), null);
});
