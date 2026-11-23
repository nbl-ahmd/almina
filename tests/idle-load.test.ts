import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { ObjectId } from 'mongodb';
import { createEventWorker } from '../apps/api/src/modules/operations/event-worker';
import { createLocalWriteSignal, createOutboxWake, wakeLoop } from '../apps/api/src/modules/notifications/wake';
import { createSessionService } from '../apps/api/src/modules/auth/sessions';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('an event worker runs at start, once per burst of writes, while work remains, and at a due time, and never on a clock', async () => {
  const client = new EventEmitter(), signal = createLocalWriteSignal(); signal.attach(client as never);
  let runs = 0, backlog = 0, due: Date | null = null;
  const worker = createEventWorker(async () => { runs++; if (backlog > 0) { backlog--; return true; } return false; },
    { local: signal, collections: ['products'], debounceMs: 30, drainMs: 20, nextDue: async () => { const next = due; due = null; return next; } });
  await wait(150); assert.equal(runs, 1, 'one run at start, then silence');
  await wait(300); assert.equal(runs, 1, 'no timer and no polling while idle');
  for (let index = 0; index < 5; index++) signal.emit('products'); signal.emit('orders');
  await wait(120); assert.equal(runs, 2, 'a burst of writes is one run, and unrelated collections are ignored');
  backlog = 2; signal.emit('products'); await wait(250); assert.equal(runs, 5, 'it keeps going while the run reports more work, then stops');
  due = new Date(Date.now() + 80); signal.emit('products'); await wait(400);
  assert.equal(runs, 7, 'a write runs it, and the deferred item then runs at its due time');
  await wait(300); assert.equal(runs, 7);
  await worker.stop(); signal.emit('products'); await wait(100); assert.equal(runs, 7, 'stopped workers stay stopped');
});

class FakeClient extends EventEmitter {}
const started = (client: FakeClient, requestId: number, commandName: string, collection: string, extra: object = {}) => client.emit('commandStarted', { requestId, commandName, command: { [commandName]: collection, ...extra } });
test('local writes to orders and the outbox wake workers; other collections, failures and uncommitted transactions do not', () => {
  const client = new FakeClient(), signal = createLocalWriteSignal(); signal.attach(client as never);
  let woke = 0; signal.subscribe(() => { woke++; }, ['orders', 'order_outbox']);
  started(client, 1, 'update', 'order_outbox'); client.emit('commandSucceeded', { requestId: 1, commandName: 'update', reply: { n: 1, nModified: 1 } });
  assert.equal(woke, 1);
  started(client, 2, 'insert', 'products'); client.emit('commandSucceeded', { requestId: 2, commandName: 'insert', reply: { n: 1 } });
  started(client, 3, 'update', 'orders'); client.emit('commandFailed', { requestId: 3, commandName: 'update' });
  started(client, 4, 'find', 'orders'); client.emit('commandSucceeded', { requestId: 4, commandName: 'find' });
  assert.equal(woke, 1);
  started(client, 5, 'insert', 'orders', { autocommit: false }); client.emit('commandSucceeded', { requestId: 5, commandName: 'insert', reply: { n: 1 } });
  assert.equal(woke, 1, 'a write inside a transaction is not visible yet');
  client.emit('commandSucceeded', { requestId: 6, commandName: 'commitTransaction' });
  assert.equal(woke, 2);
  client.emit('commandSucceeded', { requestId: 7, commandName: 'commitTransaction' });
  assert.equal(woke, 2, 'a commit that carried no watched write wakes nothing');
  // A lease attempt that matched nothing is a write command that changed nothing: it must never wake workers (that would be a loop).
  started(client, 8, 'findAndModify', 'order_outbox'); client.emit('commandSucceeded', { requestId: 8, commandName: 'findAndModify', reply: { lastErrorObject: { n: 0, updatedExisting: false }, value: null } });
  started(client, 9, 'update', 'orders'); client.emit('commandSucceeded', { requestId: 9, commandName: 'update', reply: { n: 1, nModified: 0 } });
  assert.equal(woke, 2);
  started(client, 10, 'findAndModify', 'order_outbox'); client.emit('commandSucceeded', { requestId: 10, commandName: 'findAndModify', reply: { lastErrorObject: { n: 1, updatedExisting: true }, value: {} } });
  assert.equal(woke, 3);
});

test('with a local write signal workers rest on the slow interval even when the database has no change streams', async () => {
  const client = new FakeClient(), signal = createLocalWriteSignal(); signal.attach(client as never);
  const wake = createOutboxWake(() => { throw new Error('no change streams here'); }, { local: signal, coalesceMs: 5 });
  assert.equal(wake.healthy(), true);
  let ticks = 0; const loop = wakeLoop(() => { ticks++; }, { fastMs: 10, slowMs: 5000, wake });
  await wait(150); assert.equal(ticks, 1, 'one start-up pass, no fast polling');
  started(client, 1, 'insert', 'orders'); client.emit('commandSucceeded', { requestId: 1, commandName: 'insert', reply: { n: 1 } });
  await wait(100); assert.equal(ticks, 2, 'a new order wakes the worker at once');
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

test('an event-only wake loop ticks at start, on a committed write and at the exact due time, and otherwise holds no timer', async () => {
  const signal = createLocalWriteSignal();
  const wake = createOutboxWake(() => { throw new Error('no change stream is ever opened'); }, { local: signal, coalesceMs: 5 });
  let ticks = 0, due: Date | null = null;
  const loop = wakeLoop(() => { ticks++; }, { fastMs: 10, slowMs: 20, wake, nextDue: async () => { const next = due; due = null; return next; } });
  await wait(300); assert.equal(ticks, 1, 'start-up pass only; the fast and slow intervals do not exist in event-only mode');
  signal.emit('order_outbox'); await wait(100); assert.equal(ticks, 2);
  signal.emit('products'); await wait(100); assert.equal(ticks, 2, 'collections the order workers do not use never wake them');
  due = new Date(Date.now() + 120); signal.emit('orders'); await wait(450);
  assert.equal(ticks, 4, 'the write, then the deferred retry at its due time');
  await wait(300); assert.equal(ticks, 4);
  loop.stop(); await wake.shutdown();
});

test('control documents are reported by name so only the rules change wakes the alert sweep', () => {
  const client = new EventEmitter(), signal = createLocalWriteSignal(); signal.attach(client as never);
  const heard: string[] = []; signal.subscribe(name => heard.push(name), ['notification_controls:staff-alert-rules']);
  const write = (id: number, controlId: string) => { client.emit('commandStarted', { requestId: id, commandName: 'update', command: { update: 'notification_controls', updates: [{ q: { _id: controlId } }] } }); client.emit('commandSucceeded', { requestId: id, commandName: 'update', reply: { n: 1, nModified: 1 } }); };
  write(1, 'staff-alert-maintenance'); write(2, 'staff-alert-rules'); write(3, 'staff-order-email-v1');
  assert.deepEqual(heard, ['notification_controls:staff-alert-rules']);
});
