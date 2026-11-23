import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { test } from 'node:test';
import { createOrderLiveFeed } from '../apps/api/src/modules/orders/live';

class FakeStream extends EventEmitter { closed = false; async close() { this.closed = true; this.emit('close'); } }
function harness(options: Partial<Parameters<typeof createOrderLiveFeed>[0]> = {}) {
  const streams: FakeStream[] = []; const pipelines: unknown[] = [];
  const db = { watch: (pipeline: unknown) => { pipelines.push(pipeline); const stream = new FakeStream(); streams.push(stream); return stream; } };
  const feed = createOrderLiveFeed({ getDb: async () => db as never, coalesceMs: 5, idleGraceMs: 20, fallbackMs: 15, ...options });
  return { feed, streams, pipelines };
}
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('one change stream serves every browser, opens on demand and carries no order data', async () => {
  const { feed, streams, pipelines } = harness();
  assert.equal(streams.length, 0);
  const seen: string[][] = [[], []];
  const a = feed.subscribe(revision => seen[0]!.push(revision), 'user-a')!;
  const b = feed.subscribe(revision => seen[1]!.push(revision), 'user-b')!;
  await wait(5);
  assert.equal(streams.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(pipelines[0])), [{ $match: { operationType: { $in: ['insert', 'update', 'replace'] }, 'ns.coll': { $in: ['orders', 'staff_alerts'] } } }, { $project: { operationType: 1 } }]);
  // A burst of changes becomes one message per browser.
  for (let index = 0; index < 5; index++) streams[0]!.emit('change', { operationType: 'insert', fullDocument: { customer: 'private' } });
  await wait(30);
  assert.equal(seen[0]!.length, 1); assert.equal(seen[1]!.length, 1);
  assert.match(seen[0]![0]!, /^[a-f0-9]{8}\.1$/); assert.ok(!JSON.stringify(seen).includes('private'));
  a(); b(); await feed.shutdown();
});

test('the cursor closes shortly after the last browser leaves and reopens for the next one', async () => {
  const { feed, streams } = harness();
  const leave = feed.subscribe(() => undefined, 'u')!;
  await wait(5); leave();
  assert.equal(streams[0]!.closed, false);
  await wait(60);
  assert.equal(streams[0]!.closed, true); assert.equal(feed.active(), false);
  feed.subscribe(() => undefined, 'u'); await wait(5);
  assert.equal(streams.length, 2); await feed.shutdown();
});

test('a reconnect inside the grace period reuses the open cursor', async () => {
  const { feed, streams } = harness({ idleGraceMs: 200 });
  const leave = feed.subscribe(() => undefined, 'u')!; await wait(5); leave();
  const again = feed.subscribe(() => undefined, 'u')!; await wait(250);
  assert.equal(streams.length, 1); assert.equal(streams[0]!.closed, false); again(); await feed.shutdown();
});

test('stream counts are bounded per user and per process', async () => {
  const { feed } = harness({ maxSubscribers: 3, maxPerKey: 2 });
  assert.ok(feed.subscribe(() => undefined, 'a')); assert.ok(feed.subscribe(() => undefined, 'a'));
  assert.equal(feed.subscribe(() => undefined, 'a'), undefined);
  assert.ok(feed.subscribe(() => undefined, 'b'));
  assert.equal(feed.subscribe(() => undefined, 'c'), undefined);
  await feed.shutdown();
});

test('an unsupported deployment falls back to a slow invalidation that only runs while someone is connected', async () => {
  const { feed, streams } = harness();
  let count = 0; const leave = feed.subscribe(() => { count++; }, 'u')!;
  await wait(5); streams[0]!.emit('error', { code: 40573 });
  await wait(60); assert.ok(count >= 2);
  leave(); await wait(60); const after = count; await wait(50);
  assert.equal(count, after); await feed.shutdown();
});

test('a transient failure invalidates once (changes may have been missed) and reopens', async () => {
  const { feed, streams } = harness();
  let count = 0; feed.subscribe(() => { count++; }, 'u'); await wait(5);
  streams[0]!.emit('error', { code: 6 }); await wait(30);
  assert.equal(count, 1); await wait(2300);
  assert.equal(streams.length, 2); await feed.shutdown();
});

import { SERVER_SOCKET_TIMEOUT_MS, STREAM_HEARTBEAT_MS } from '../apps/api/src/modules/orders/live';
test('event streams send a keep-alive well inside the idle-socket timeout, so they are not cut and re-ticketed every 15 seconds', () => {
  assert.ok(STREAM_HEARTBEAT_MS * 1.4 <= SERVER_SOCKET_TIMEOUT_MS, `heartbeat ${STREAM_HEARTBEAT_MS} ms must leave a safety margin under ${SERVER_SOCKET_TIMEOUT_MS} ms`);
});
