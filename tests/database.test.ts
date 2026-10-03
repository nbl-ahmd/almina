import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Db } from 'mongodb';
import { createDatabase } from '../apps/api/src/database.js';

const config = { mode: 'enabled' as const, uri: 'mongodb://example.invalid', name: 'isolated_test' };
// Minimal driver doubles; no test opens a MongoDB connection.
const mockDb = (command: () => Promise<unknown>) => ({ command }) as unknown as Db;

test('disabled database never constructs a driver or opens a connection', async () => {
  const db = createDatabase({ mode: 'disabled' }, () => { assert.fail('must not connect'); });
  assert.equal(await db.checkReadiness(), true);
  await assert.rejects(db.getDb(), /disabled/);
  await db.close();
  assert.equal(await db.checkReadiness(), false);
});

test('connections are lazy and concurrent callers reuse one pool', async () => {
  let connections = 0;
  let closes = 0;
  const handle = mockDb(async () => ({ ok: 1 }));
  const db = createDatabase(config, () => ({
    connect: async () => { connections++; return handle; }, close: async () => { closes++; },
  }));
  assert.equal(connections, 0);
  assert.deepEqual(await Promise.all([db.getDb(), db.getDb()]), [handle, handle]);
  assert.equal(connections, 1);
  assert.equal(await db.checkReadiness(), true);
  await db.close();
  await db.close();
  assert.equal(closes, 1);
  await assert.rejects(db.getDb(), /closed/);
});

test('failed connections are closed and can retry without leaking URI/errors', async () => {
  let attempts = 0;
  let closes = 0;
  const db = createDatabase(config, () => ({
    connect: async () => {
      if (++attempts === 1) throw new Error('fake-sensitive-marker');
      return mockDb(async () => ({ ok: 1 }));
    }, close: async () => { closes++; },
  }));
  await assert.rejects(db.getDb(), { message: 'Database connection unavailable' });
  assert.equal(closes, 1);
  assert.equal(await db.checkReadiness(), true);
  await db.close();
});

test('readiness reports unavailable on driver construction/ping failure', async () => {
  const invalid = createDatabase(config, () => { throw new Error('fake-sensitive-marker'); });
  await assert.rejects(invalid.getDb(), { message: 'Database connection unavailable' });
  assert.equal(await invalid.checkReadiness(), false);
  const failed = createDatabase(config, () => ({
    connect: async () => mockDb(async () => { throw new Error('fake-sensitive-marker'); }), close: async () => undefined,
  }));
  assert.equal(await failed.checkReadiness(), false);
  await failed.close();
});
