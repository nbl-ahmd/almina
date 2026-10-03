import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { MongoClient, ObjectId } from 'mongodb';
import { createApp } from '../apps/api/src/app';
import { createLogger } from '@almina/config/logger';
import { migrateCommerce } from '../scripts/migrations/commerce';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
const customer = { name: 'Synthetic', mobile: '0501234567', email: 'synthetic@example.invalid', emirate: 'Dubai', city: 'City A', address: 'Synthetic address', payment: 'cash' };
test('bounded real API load: catalog listing, search, details, checkout and concurrent inventory purchase', { skip: !uri, timeout: 120000 }, async t => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_performance_test_${randomUUID().replaceAll('-', '')}`);
  const server = createServer(createApp({ database: { mode: 'enabled', checkReadiness: async () => true }, getDb: async () => db,
    webOrigin: 'http://localhost:3000', development: true, rateLimit: 500,
    logger: createLogger({ service: 'api', environment: 'development', write: () => undefined }) }));
  const report: Record<string, { samples: number; concurrency: number; p95Ms: number; maxMs: number; budgetMs: number }> = {};
  try {
    const category = new ObjectId();
    await db.collection('categories').insertOne({ _id: category, name: 'Synthetic category' });
    await db.collection('stores').insertOne({ status: 'open' });
    await migrateCommerce(db);
    const product = { _id: new ObjectId(), product_id: 'PD0001', category, name: 'Synthetic tablet', description: 'Synthetic tablet fixture', price: 20, stock: 100, vat: true };
    await db.collection('products').insertMany([product, ...Array.from({ length: 499 }, (_, index) => ({ ...product, _id: new ObjectId(), product_id: `PD${index + 2}` }))]);
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    const headers = { origin: 'http://localhost:3000', 'x-csrf-protection': '1', 'content-type': 'application/json' };
    async function measured(name: string, samples: number, concurrency: number, budgetMs: number, run: () => Promise<void>) {
      const times: number[] = [];
      for (let i = 0; i < 3; i++) await run(); // Explicit warm-up excluded from measurements.
      for (let offset = 0; offset < samples; offset += concurrency) {
        await Promise.all(Array.from({ length: Math.min(concurrency, samples - offset) }, async () => {
          const started = performance.now(); await run(); times.push(performance.now() - started);
        }));
      }
      times.sort((a, b) => a - b);
      const p95Ms = Math.round(times[Math.ceil(times.length * 0.95) - 1]!);
      report[name] = { samples, concurrency, p95Ms, maxMs: Math.round(times.at(-1)!), budgetMs };
      assert.ok(p95Ms < budgetMs, `${name}: p95 ${p95Ms}ms exceeds synthetic CI budget ${budgetMs}ms`);
    }
    for (const [name, path] of [['catalog', '/api/v1/catalog/products?limit=25'], ['search', '/api/v1/catalog/products?q=tablet&limit=25'], ['details', '/api/v1/catalog/products/' + product._id]]) {
      await t.test(name!, async () => measured(name!, 30, 3, 1500, async () => {
        const response = await fetch(origin + path, { signal: AbortSignal.timeout(10000) });
        assert.equal(response.status, 200); const body = await response.json();
        if (name === 'details') assert.equal(body.data.id, String(product._id));
        else assert.equal(body.data.items.length, 25);
      }));
    }
    function intent(id: ObjectId) { return JSON.stringify({ customer, items: [{ productId: String(id), quantity: 1 }], idempotencyKey: randomUUID() }); }
    await t.test('checkout', async () => measured('checkout', 15, 1, 3000, async () => {
      const response = await fetch(origin + '/api/v1/checkout', { method: 'POST', headers, body: intent(product._id), signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 201); assert.equal((await response.json()).data.totals.totalMinor, 4100);
    }));
    await t.test('concurrent inventory purchase', async () => {
      const contested = new ObjectId();
      await db.collection('products').insertOne({ ...product, _id: contested, product_id: 'PD9999', stock: 5 });
      const times: number[] = [];
      const responses = await Promise.all(Array.from({ length: 20 }, async () => {
        const started = performance.now();
        const response = await fetch(origin + '/api/v1/checkout', { method: 'POST', headers, body: intent(contested), signal: AbortSignal.timeout(10000) });
        await response.arrayBuffer(); times.push(performance.now() - started); return response.status;
      }));
      assert.equal(responses.filter(status => status === 201).length, 5);
      assert.equal(responses.filter(status => status === 409).length, 15);
      assert.equal((await db.collection('products').findOne({ _id: contested }))!.stock, 0);
      assert.equal(await db.collection('orders').countDocuments({ 'lines.productId': String(contested) }), 5);
      times.sort((a, b) => a - b);
      const p95Ms = Math.round(times[18]!);
      report.concurrentInventory = { samples: 20, concurrency: 20, p95Ms, maxMs: Math.round(times.at(-1)!), budgetMs: 5000 };
      assert.ok(p95Ms < 5000, 'Concurrent checkout exceeds synthetic 5000ms p95 budget');
    });
  } finally {
    await mkdir('.verification-results', { recursive: true });
    await writeFile('.verification-results/performance-api.json', JSON.stringify({ fixture: '500 synthetic products; disposable loopback MongoDB 8.0.17', report }, null, 2) + '\n');
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await db.dropDatabase(); await client.close();
  }
});
