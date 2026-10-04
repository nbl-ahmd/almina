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
import { createCatalogProduct, createLegacyCatalogBatch } from '../apps/api/src/modules/catalog/creation';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
const require = createRequire(new URL('../backend/package.json', import.meta.url));
test('maintained catalog creation serializes single/batch IDs and rolls back categories, initial stock and ledger together', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_creation_test_${randomUUID().replaceAll('-', '')}`);
  const actor = String(new ObjectId()), category = new ObjectId();
  const input = { name: 'Synthetic', category: String(category), barcode: '0000123', price: '12.50', stock: '2', sale: false };
  const batchRow = { name: 'Synthetic batch', category: 'New category', barcode: '0000987', price: '10.01', stock: '3', vat: 'TRUE', sale: 'FALSE' };
  try {
    await db.collection('stores').insertOne({ status: 'closed' });
    await db.collection('categories').insertOne({ _id: category, name: 'Existing category' });
    await db.collection('products').insertOne({ product_id: 'PD6000', name: 'Retained', stock: 7, price: 9.99 });
    await db.collection('products').insertOne({ product_id: 'RECOVERED_999999', name: 'Recovered', stock: 0, price: 1 });
    const outcomes = await Promise.all([
      ...Array.from({ length: 4 }, () => createCatalogProduct(db, input, actor)),
      ...Array.from({ length: 3 }, () => createLegacyCatalogBatch(db, [batchRow, batchRow], actor)),
    ]);
    assert.equal(outcomes.length, 7);
    const products = await db.collection('products').find({ product_id: { $nin: ['PD6000', 'RECOVERED_999999'] } }).toArray();
    assert.equal(products.length, 10); assert.equal(new Set(products.map(value => value.product_id)).size, 10);
    assert.deepEqual(products.map(value => Number(value.product_id.substring(2))).sort((a, b) => a - b), Array.from({ length: 10 }, (_, i) => 6001 + i));
    assert.equal(await db.collection('inventory_adjustments').countDocuments({ actor }), 10);
    assert.equal(await db.collection('categories').countDocuments({ name: 'New category' }), 1);
    assert.ok(products.every(value => ['0000123', '0000987'].includes(value.barcode)));
    assert.equal((await db.collection('products').findOne({ product_id: 'PD6000' }))!.stock, 7);
    const previousCounter = await db.collection('catalog_counters').findOne();
    await db.collection('categories').insertMany([{ name: 'Ambiguous' }, { name: 'Ambiguous' }]);
    await assert.rejects(createLegacyCatalogBatch(db, [{ ...batchRow, category: 'Must roll back' }, { ...batchRow, category: 'Ambiguous' }], actor), { code: 'IDEMPOTENCY_CONFLICT' });
    assert.equal(await db.collection('categories').countDocuments({ name: 'Must roll back' }), 0);
    assert.equal(await db.collection('products').countDocuments(), 12);
    assert.equal(await db.collection('inventory_adjustments').countDocuments(), 10);
    assert.deepEqual(await db.collection('catalog_counters').findOne(), previousCounter);
    for (const invalid of [{ price: '1.001' }, { price: '1', sale: true, salePrice: '2' }, { stock: '1.5' }, { barcode: 123 }, { category: String(new ObjectId()) }]) {
      await assert.rejects(createCatalogProduct(db, { ...input, ...invalid }, actor), { code: 'INVALID_REQUEST' });
    }
    await assert.rejects(createLegacyCatalogBatch(db, [batchRow, { ...batchRow, category: 'No partial category', price: '1.001' }], actor));
    assert.equal(await db.collection('categories').countDocuments({ name: 'No partial category' }), 0);
    await db.collection<{ _id: string }>('recovery_bootstrap').insertOne({ _id: 'empty-database-v1' });
    await assert.rejects(createLegacyCatalogBatch(db, [batchRow], actor), { code: 'RECOVERY_IMPORT_REQUIRED' });
    assert.equal((await db.collection('stores').findOne())!.status, 'closed');
  } finally { await db.dropDatabase(); await client.close(); }
});
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
        const update = new FormData(); update.set('stock', '0'); update.set('expectedStock', '2'); update.set('price', '12.50'); update.set('stockReason', 'Physical stock count'); update.set('inventoryKey', randomUUID());
        assert.equal((await fetch(legacyUrl + '/api/products/' + product._id, { method: 'PUT', headers, body: update })).status, 200);
        const detail = await (await fetch(apiUrl + '/api/v1/catalog/products/' + product._id)).json();
        assert.equal(detail.data.stock, 0); assert.equal(detail.data.price, 12.5);
        assert.equal((await fetch(legacyUrl + '/api/products/publish/' + product._id, { method: 'PUT', headers, body: '{}' })).status, 200);
        assert.equal((await fetch(apiUrl + '/api/v1/catalog/products/' + product._id)).status, 404);
        for (const query of ['filter=%7B%22%24where%22%3A%22x%22%7D', 'q[$ne]=x', 'limit=100000', 'sort=$where']) {
          assert.equal((await fetch(apiUrl + '/api/v1/catalog/products?' + query)).status, 400);
        }
        assert.equal((await fetch(legacyUrl + '/api/products/' + product._id, { method: 'DELETE', headers })).status, 200);
        assert.equal(await db.collection('products').countDocuments(), 1);
        assert.ok((await db.collection('products').findOne({ _id: new ObjectId(product._id) }))!.archivedAt);
        assert.equal((await fetch(apiUrl + '/api/v1/catalog/products/' + product._id)).status, 404);
        assert.equal((await fetch(legacyUrl + '/api/products/publish/' + product._id, { method: 'PUT', headers, body: '{}' })).status, 409);
      });
    });
  } finally {
    await mongoose.disconnect(); await db.dropDatabase(); await client.close();
  }
});

test('inventory ledger commits once, rejects stale concurrent edits and retains actor/reason and exact money', { skip: !uri }, async () => {
  const { updateProductInventory } = await import('../apps/api/src/modules/inventory/adjustments');
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_inventory_test_${randomUUID().replaceAll('-', '')}`);
  const actor = String(new ObjectId()), id = new ObjectId();
  try {
    await db.collection('products').insertOne({ _id: id, product_id: 'PD_ORIGINAL', price: 12.50, stock: 5, sale: false });
    const input = { stock: '8', expectedStock: '5', stockReason: 'Physical count verified', inventoryKey: randomUUID(), price: '12.50' };
    await assert.rejects(updateProductInventory(db, String(id), { ...input, stockReason: undefined }, actor), { status: 400 });
    await assert.rejects(updateProductInventory(db, String(id), { ...input, price: '12.501' }, actor), { status: 400 });
    await assert.rejects(updateProductInventory(db, String(id), { ...input, sale: 'true', salePrice: '13.00' }, actor), { status: 400 });
    const attempts = await Promise.allSettled([updateProductInventory(db, String(id), input, actor),
      updateProductInventory(db, String(id), { ...input, stock: '9', inventoryKey: randomUUID() }, actor)]);
    assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
    const entries = await db.collection('inventory_adjustments').find().toArray(); assert.equal(entries.length, 1);
    const entry = entries[0]!; assert.equal(entry.actor, actor); assert.equal(entry.reason, input.stockReason);
    assert.equal(entry.delta, entry.after - 5); assert.equal(entry.before, 5); assert.equal(entry.product_id, 'PD_ORIGINAL');
    const winner = entry.after === 8 ? input : { ...input, stock: '9', inventoryKey: entry._id };
    await db.collection('products').updateOne({ _id: id }, { $inc: { stock: -1 } }); // committed checkout after adjustment
    await updateProductInventory(db, String(id), winner, actor);
    assert.equal((await db.collection('products').findOne({ _id: id }))!.stock, entry.after - 1);
    assert.equal(await db.collection('inventory_adjustments').countDocuments(), 1);
    await assert.rejects(updateProductInventory(db, String(id), { ...winner, price: '12.00' }, actor), { status: 409 });
    await assert.rejects(updateProductInventory(db, String(id), winner, String(new ObjectId())), { status: 409 });
    assert.equal((await db.collection('inventory_adjustments').findOne({ _id: entry._id }))!.delta, entry.delta);
  } finally { await db.dropDatabase(); await client.close(); }
});
