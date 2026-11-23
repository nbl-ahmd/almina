import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { ObjectId } from 'mongodb';
import { idleBackoffLoop } from '../apps/api/src/modules/operations/idle-loop';
import { createLocalWriteSignal, createOutboxWake, wakeLoop } from '../apps/api/src/modules/notifications/wake';
import { createSessionService } from '../apps/api/src/modules/auth/sessions';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('an idle worker backs off, and finding work brings it back to its fast pace', async () => {
  let runs = 0; let work = false;
  const loop = idleBackoffLoop(async () => { runs++; return work; }, { minMs: 10, maxMs: 80 });
  await wait(400);
  const idleRuns = runs;
  assert.ok(idleRuns < 400 / 10 / 2, `idle runs ${idleRuns} should be far fewer than a fixed 10 ms timer`);
  work = true; const before = runs; await wait(300);
  await loop.stop();
  assert.ok(runs - before >= 3, 'after work is found it must run at the fast pace again (the backed-off wait finishes first)');
});

class FakeClient extends EventEmitter {}
const started = (client: FakeClient, requestId: number, commandName: string, collection: string, extra: object = {}) => client.emit('commandStarted', { requestId, commandName, command: { [commandName]: collection, ...extra } });
test('local writes to orders and the outbox wake workers; other collections, failures and uncommitted transactions do not', () => {
  const client = new FakeClient(), signal = createLocalWriteSignal(); signal.attach(client as never);
  let woke = 0; signal.subscribe(() => { woke++; });
  started(client, 1, 'update', 'order_outbox'); client.emit('commandSucceeded', { requestId: 1, commandName: 'update' });
  assert.equal(woke, 1);
  started(client, 2, 'insert', 'products'); client.emit('commandSucceeded', { requestId: 2, commandName: 'insert' });
  started(client, 3, 'update', 'orders'); client.emit('commandFailed', { requestId: 3, commandName: 'update' });
  started(client, 4, 'find', 'orders'); client.emit('commandSucceeded', { requestId: 4, commandName: 'find' });
  assert.equal(woke, 1);
  started(client, 5, 'insert', 'orders', { autocommit: false }); client.emit('commandSucceeded', { requestId: 5, commandName: 'insert' });
  assert.equal(woke, 1, 'a write inside a transaction is not visible yet');
  client.emit('commandSucceeded', { requestId: 6, commandName: 'commitTransaction' });
  assert.equal(woke, 2);
  client.emit('commandSucceeded', { requestId: 7, commandName: 'commitTransaction' });
  assert.equal(woke, 2, 'a commit that carried no watched write wakes nothing');
});

test('with a local write signal workers rest on the slow interval even when the database has no change streams', async () => {
  const client = new FakeClient(), signal = createLocalWriteSignal(); signal.attach(client as never);
  const wake = createOutboxWake(() => { throw new Error('no change streams here'); }, { local: signal, coalesceMs: 5 });
  assert.equal(wake.healthy(), true);
  let ticks = 0; const loop = wakeLoop(() => { ticks++; }, { fastMs: 10, slowMs: 5000, wake });
  await wait(150); assert.equal(ticks, 0, 'no fast polling');
  started(client, 1, 'insert', 'orders'); client.emit('commandSucceeded', { requestId: 1, commandName: 'insert' });
  await wait(100); assert.equal(ticks, 1, 'a new order wakes the worker at once');
  loop.stop(); await wake.shutdown();
  assert.equal(createOutboxWake(() => { throw new Error('x'); }).healthy(), false, 'without a local source the fast cadence remains the fallback');
});

test('verified sessions are cached briefly, logout and revocation take effect at once, and the cache is off by default', async () => {
  const userId = new ObjectId(), password = '$2b$12$' + 'a'.repeat(53), token = 'T'.repeat(43);
  const digest = (value: string) => createHash('sha256').update(value).digest('hex');
  let reads = 0; const sessions = new Map<string, object>([[digest(token), { userId, passwordFingerprint: digest(password), expiresAt: new Date(Date.now() + 3600000) }]]);
  const db = { collection: (name: string) => ({
    findOne: async (filter: Record<string, unknown>) => { reads++; return name === 'api_sessions' ? (sessions.get(String(filter.tokenHash)) ?? null) : { _id: userId, username: 'staff', name: 'Staff', role: 'admin', cities: [], password }; },
    deleteOne: async (filter: Record<string, unknown>) => { sessions.delete(String(filter.tokenHash)); },
    deleteMany: async () => { sessions.clear(); },
  }) };
  const cached = createSessionService(async () => db as never, undefined, { cacheMs: 60000 });
  const first = await cached.authenticate(token); assert.equal(first.username, 'staff'); assert.equal(reads, 2);
  await cached.authenticate(token); await cached.authenticate(token); assert.equal(reads, 2, 'later requests cost no database reads');
  await cached.logout(token);
  await assert.rejects(cached.authenticate(token), { status: 401 });
  sessions.set(digest(token), { userId, passwordFingerprint: digest(password), expiresAt: new Date(Date.now() + 3600000) });
  await cached.authenticate(token); reads = 0; await cached.authenticate(token); assert.equal(reads, 0);
  await cached.revokeUser(userId);
  await assert.rejects(cached.authenticate(token), { status: 401 });
  const plain = createSessionService(async () => db as never);
  sessions.set(digest(token), { userId, passwordFingerprint: digest(password), expiresAt: new Date(Date.now() + 3600000) });
  reads = 0; await plain.authenticate(token); await plain.authenticate(token); assert.equal(reads, 4, 'no caching unless asked for');
});
