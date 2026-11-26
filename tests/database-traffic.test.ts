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
  const rows = meter.drain().db;
  assert.deepEqual(rows[0], { command: 'find', collection: 'products', count: 1, sentMB: 0, receivedMB: 2 });
  assert.deepEqual(rows.map(row => `${row.command} ${row.collection}`).sort(), ['commitTransaction -', 'find products', 'getMore products']);
  assert.equal(JSON.stringify(rows).includes('private-shopper'), false);
  assert.deepEqual(meter.drain(), { db: [], routes: [] }, 'each window starts again');
});

test('the network line carries the busiest commands and drains them even for quiet windows', () => {
  const lines: Record<string, unknown>[] = [];
  let drains = 0;
  const meter = createNetworkMeter({ minBytes: 0, log: (line: Record<string, unknown>) => lines.push(line),
    database: () => { drains++; return { db: [{ command: 'find', collection: 'products', count: 1, sentMB: 0, receivedMB: 1 }], routes: [{ route: 'worker', count: 1, sentMB: 0, receivedMB: 1 }] }; } });
  meter.flush(); meter.stop();
  assert.equal(drains, 1);
  assert.equal((lines[0]!.db as unknown[]).length, 1);
  assert.equal((lines[0]!.routes as unknown[]).length, 1);
});

test('the production database client asks for compressed traffic', () => {
  const runtime = retainedRuntimeConfiguration({ NODE_ENV: 'production', APP_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:27017/synthetic',
    AUTH_ALLOWED_ORIGINS: 'https://example.invalid', AUTH_TRUST_PROXY: '', PORT: '3000' });
  assert.deepEqual(runtime.mongoOptions.compressors, ['zlib']);
});

test('storefront caching is bounded by its window, can be switched off and never covers commerce reads', async () => {
  const { catalogReadPolicy, storefrontCacheSeconds, windowedReadPolicy, catalogContentTags } = await import('../apps/web/src/lib/catalog/cache-policy');
  assert.equal(storefrontCacheSeconds(undefined), 60);
  assert.equal(storefrontCacheSeconds('0'), 0);
  for (const invalid of ['-1', '301', 'soon', '1.5']) assert.equal(storefrontCacheSeconds(invalid), 60);
  assert.deepEqual(windowedReadPolicy(catalogContentTags.products, 0), { cache: 'no-store' });
  const first = windowedReadPolicy(catalogContentTags.products, 60, 120_000), later = windowedReadPolicy(catalogContentTags.products, 60, 179_999), next = windowedReadPolicy(catalogContentTags.products, 60, 180_000);
  assert.deepEqual(first, { cache: 'force-cache', next: { revalidate: 60, tags: ['catalog:products'] }, headers: { 'x-almina-cache-window': '2' } });
  assert.deepEqual(later, first);
  assert.notDeepEqual(next, first, 'a new window is a new cache entry, so nothing older than the window is served');
  // The default policy for a product, cart or store read is unchanged.
  for (const path of ['/api/products', '/api/products/PD0001', '/api/store/status']) assert.deepEqual(catalogReadPolicy(path, true), { cache: 'no-store' });
});

test('staff changes purge the storefront caches they affect', async () => {
  const { catalogMutationTags } = await import('../apps/web/src/lib/admin/gateway-policy');
  const id = 'a'.repeat(24);
  for (const path of ['products', `products/${id}`, `products/publish/${id}`, 'products/visibility', 'products/type', `media/products/${id}/commit`, 'catalog-import/commit', 'image-review/publish'])
    assert.ok(catalogMutationTags('POST', path).includes('catalog:products'), path);
  assert.deepEqual(catalogMutationTags('GET', 'products'), []);
  assert.deepEqual(catalogMutationTags('POST', `media/products/${id}/sign`), []);
  assert.deepEqual(catalogMutationTags('POST', 'orders'), []);
});

test('traffic is labelled with route patterns, never with identifiers, phone numbers or query strings', async () => {
  const { trafficLabel } = await import('../apps/api/src/modules/operations/traffic-context');
  const { lookupPolicy } = await import('../apps/api/src/modules/auth/retained-policy');
  const id = 'abcdefabcdefabcdefabcdef';
  assert.equal(trafficLabel('GET', `/api/products/${id}`, lookupPolicy), 'GET /api/products/:id');
  assert.equal(trafficLabel('GET', '/api/products/details/PD4309', lookupPolicy), 'GET /api/products/details/:productId');
  assert.equal(trafficLabel('GET', '/api/whatsapp/messages/971500000001', lookupPolicy), 'GET /api/whatsapp/messages/:recipient');
  assert.equal(trafficLabel('GET', '/api/v1/growth/pages', lookupPolicy), 'GET /api/v1/growth/pages');
  assert.equal(trafficLabel('PUT', `/api/v1/orders/${id}/status`, lookupPolicy), 'PUT /api/v1/orders/:x');
  assert.equal(trafficLabel('GET', '/api/v1/products/PD4309', lookupPolicy), 'GET /api/v1/products/:x');
  assert.equal(trafficLabel('GET', '/api/unknown/shopper@example.invalid', lookupPolicy), 'GET other');
  assert.equal(trafficLabel('GET', '/anything/else', lookupPolicy), 'GET other');
});
