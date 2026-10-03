import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import type { Express } from 'express';
import { createApp } from '../apps/api/src/app';
import { createLogger } from '@almina/config/logger';
import { migrateCommerce } from '../scripts/migrations/commerce';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
const require = createRequire(new URL('../backend/package.json', import.meta.url));
async function serve(app: Express, run: (url: string) => Promise<void>) {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
test('real catalog reads and legacy product mutations preserve validation, visibility and stock rules', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const dbName = `almina_catalog_test_${randomUUID().replaceAll('-', '')}`;
  const db = client.db(dbName);
  const mongoose = require('mongoose');
  const { createLegacyApp } = require('./app.js');
  await mongoose.connect(uri, { dbName });
  try {
    const category = new ObjectId();
    await db.collection('categories').insertOne({ _id: category, name: 'Synthetic category' });
    await db.collection('stores').insertOne({ status: 'open' });
    await migrateCommerce(db);
    const admin = { id: String(new ObjectId()), role: 'admin', cities: [] };
    const legacy = createLegacyApp({ origins: ['http://localhost:3000'], development: true, auth: { authenticate: async () => admin } });
    const api = createApp({ database: { mode: 'enabled', checkReadiness: async () => true }, getDb: async () => db,
      webOrigin: 'http://localhost:3000', development: true,
      logger: createLogger({ service: 'api', environment: 'development', write: () => undefined }) });
    await serve(legacy, async legacyUrl => {
      const headers = { origin: 'http://localhost:3000', 'x-csrf-protection': '1' };
      const body = new FormData();
      for (const [key, value] of Object.entries({ name: 'Synthetic tablet', category: String(category), barcode: '123', price: '10.50', stock: '2' })) body.set(key, value);
      const created = await fetch(legacyUrl + '/api/products', { method: 'POST', headers, body });
      assert.equal(created.status, 201);
      const product = (await created.json()).product as { _id: string; product_id: string };
      await serve(api, async apiUrl => {
        const list = await (await fetch(apiUrl + '/api/v1/catalog/products?limit=1')).json();
        assert.equal(list.data.items.length, 1); assert.equal(list.data.items[0].id, product._id);
        const searched = await (await fetch(apiUrl + '/api/v1/catalog/products?q=tablet')).json();
        assert.equal(searched.data.items[0].productId, product.product_id);
        for (const stock of ['-1', '1.5', 'Infinity']) {
          const bad = new FormData(); bad.set('stock', stock);
          assert.equal((await fetch(legacyUrl + '/api/products/' + product._id, { method: 'PUT', headers, body: bad })).status, 400);
        }
        assert.equal((await db.collection('products').findOne({ _id: new ObjectId(product._id) }))!.stock, 2);
        const update = new FormData(); update.set('stock', '0'); update.set('price', '12.50');
        assert.equal((await fetch(legacyUrl + '/api/products/' + product._id, { method: 'PUT', headers, body: update })).status, 200);
        const detail = await (await fetch(apiUrl + '/api/v1/catalog/products/' + product._id)).json();
        assert.equal(detail.data.stock, 0); assert.equal(detail.data.price, 12.5);
        assert.equal((await fetch(legacyUrl + '/api/products/publish/' + product._id, { method: 'PUT', headers, body: '{}' })).status, 200);
        assert.equal((await fetch(apiUrl + '/api/v1/catalog/products/' + product._id)).status, 404);
        for (const query of ['filter=%7B%22%24where%22%3A%22x%22%7D', 'q[$ne]=x', 'limit=100000', 'sort=$where']) {
          assert.equal((await fetch(apiUrl + '/api/v1/catalog/products?' + query)).status, 400);
        }
        assert.equal((await fetch(legacyUrl + '/api/products/' + product._id, { method: 'DELETE', headers })).status, 200);
        assert.equal(await db.collection('products').countDocuments(), 0);
      });
    });
  } finally {
    await mongoose.disconnect(); await db.dropDatabase(); await client.close();
  }
});
