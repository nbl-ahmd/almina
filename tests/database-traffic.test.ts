import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import test from 'node:test';
import { createCommandMeter } from '../apps/api/src/modules/operations/command-meter';
import { retainedRuntimeConfiguration } from '../apps/api/src/modules/operations/runtime';

const { createNetworkMeter } = createRequire(import.meta.url)('../backend/diagnostics/network-usage.cjs');

test('the command meter totals bytes per command and collection and never keeps values', () => {
  const client = new EventEmitter(), meter = createCommandMeter();
  meter.attach(client as never);
  client.emit('commandStarted', { requestId: 1, commandName: 'find', command: { find: 'products', filter: { name: 'private-shopper@example.invalid' } } });
  client.emit('commandSucceeded', { requestId: 1, commandName: 'find', reply: { cursor: { firstBatch: [{ description: 'x'.repeat(2 * 1024 * 1024) }] } } });
  client.emit('commandStarted', { requestId: 2, commandName: 'getMore', command: { getMore: 7, collection: 'products' } });
  client.emit('commandFailed', { requestId: 2 });
  client.emit('commandStarted', { requestId: 3, commandName: 'commitTransaction', command: { commitTransaction: 1 } });
  const rows = meter.drain();
  assert.deepEqual(rows[0], { command: 'find', collection: 'products', count: 1, sentMB: 0, receivedMB: 2 });
  assert.deepEqual(rows.map(row => `${row.command} ${row.collection}`).sort(), ['commitTransaction -', 'find products', 'getMore products']);
  assert.equal(JSON.stringify(rows).includes('private-shopper'), false);
  assert.deepEqual(meter.drain(), [], 'each window starts again');
});

test('the network line carries the busiest commands and drains them even for quiet windows', () => {
  const lines: Record<string, unknown>[] = [];
  let drains = 0;
  const meter = createNetworkMeter({ minBytes: 0, log: (line: Record<string, unknown>) => lines.push(line),
    database: () => { drains++; return [{ command: 'find', collection: 'products', count: 1, sentMB: 0, receivedMB: 1 }]; } });
  meter.flush(); meter.stop();
  assert.equal(drains, 1);
  assert.equal((lines[0]!.db as unknown[]).length, 1);
});

test('the production database client asks for compressed traffic', () => {
  const runtime = retainedRuntimeConfiguration({ NODE_ENV: 'production', APP_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:27017/synthetic',
    AUTH_ALLOWED_ORIGINS: 'https://example.invalid', AUTH_TRUST_PROXY: '', PORT: '3000' });
  assert.deepEqual(runtime.mongoOptions.compressors, ['zlib']);
});
