import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { createCommandMeter, databaseCompression } from '../apps/api/src/modules/operations/command-meter';
import { createPersistentDatabase } from '../apps/api/src/modules/operations/persistent-database';
import { retainedRuntimeConfiguration } from '../apps/api/src/modules/operations/runtime';
import { retainedCatalogQuery, retainedProductList } from '../apps/api/src/modules/catalog/compatibility-reads';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.COMMERCE_TEST_URI;
test('the production client negotiates compression with a real server and the meter sees the traffic', { skip: !uri }, async () => {
  const target = new URL(uri!);
  target.pathname = `/almina_traffic_${randomUUID().replaceAll('-', '')}`;
  const runtime = retainedRuntimeConfiguration({ APP_ENV: 'development', MONGODB_URI: target.toString(), AUTH_ALLOWED_ORIGINS: 'http://localhost:3000' });
  const meter = createCommandMeter(), database = createPersistentDatabase(runtime, undefined, { commandMeter: meter });
  await database.connect();
  const db = database.getDb();
  try {
    assert.deepEqual(await databaseCompression(db, database.requestedCompression()), { requested: ['zlib'], agreed: ['zlib'], offered: ['zstd', 'snappy', 'zlib'] });
    const plain = await new MongoClient(uri!).connect();
    try { assert.deepEqual((await databaseCompression(plain.db(db.databaseName), plain.options.compressors)).agreed, [], 'nothing is reported when nothing was agreed'); }
    finally { await plain.close(); }
    const compressed = async () => (await db.admin().command({ serverStatus: 1 })).network.compression?.zlib as { compressor: { bytesIn: number }; decompressor: { bytesIn: number; bytesOut: number } };
    const before = await compressed();
    const rows = Array.from({ length: 200 }, (_, index) => ({ index, description: 'Synthetic product description. '.repeat(100) }));
    await db.collection('traffic').insertMany(rows);
    assert.equal((await db.collection('traffic').find({}).toArray()).length, 200);
    const after = await compressed();
    assert.ok(after.compressor.bytesIn - before.compressor.bytesIn > 500_000, 'the server compressed its replies');
    const received = after.decompressor.bytesIn - before.decompressor.bytesIn, expanded = after.decompressor.bytesOut - before.decompressor.bytesOut;
    assert.ok(expanded > received * 3, 'what the client sent arrived compressed');
    const read = meter.drain().db.filter(row => (row.command === 'find' || row.command === 'getMore') && row.collection === 'traffic');
    assert.ok(read.reduce((sum, row) => sum + row.receivedMB, 0) > 0.4, 'the meter attributes both reply batches to their collection');
  } finally { await db.dropDatabase(); await database.close(); }
});

test('a browse card list leaves out long text and internal fields for shoppers only', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db(`almina_card_${randomUUID().replaceAll('-', '')}`);
  const category = new ObjectId();
  try {
    await db.collection('categories').insertOne({ _id: category, name: 'Synthetic', disabled: false });
    await db.collection('products').insertOne({ category, product_id: 'PD0001', name: 'Synthetic product', summary: 'Short', price: 10, stock: 2, disabled: false,
      cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/a.webp'], description: 'Long', ingredients: 'Long', warnings: 'Long', seoDescription: 'Long', gdriveFileIds: ['private'] });
    const query = retainedCatalogQuery({}, 'products');
    const full = (await retainedProductList(db, query))[0]!, card = (await retainedProductList(db, query, false, true))[0]!;
    assert.equal(full.description, 'Long');
    for (const field of ['description', 'ingredients', 'warnings', 'seoDescription', 'gdriveFileIds']) assert.equal(card[field], undefined, field);
    for (const field of ['name', 'summary', 'price', 'stock', 'product_id', 'cloudinaryImages', 'category']) assert.deepEqual(card[field], full[field], field);
    assert.equal((await retainedProductList(db, query, true, true))[0]!.description, 'Long', 'staff always receive full records');
  } finally { await db.dropDatabase(); await client.close(); }
});

test('database work is traced to the route that asked for it, through the real app, with one shared connection', { skip: !uri }, async () => {
  const require = createRequire(import.meta.url);
  const domain = require('../backend/commerce/dist/service.cjs');
  const { createLegacyApp } = require('../backend/app.js');
  const target = new URL(uri!);
  target.pathname = `/almina_routes_${randomUUID().replaceAll('-', '')}`;
  const runtime = domain.retainedRuntimeConfiguration({ APP_ENV: 'development', MONGODB_URI: target.toString(), AUTH_ALLOWED_ORIGINS: 'http://localhost:3000' });
  const meter = domain.createCommandMeter();
  // One pooled connection, so concurrent requests queue for it and must still be told apart.
  const database = domain.createPersistentDatabase({ ...runtime, mongoOptions: { ...runtime.mongoOptions, maxPoolSize: 1, waitQueueTimeoutMS: 5000 } }, undefined, { commandMeter: meter });
  await database.connect();
  const db = database.getDb(), category = new ObjectId(), product = new ObjectId();
  const app = createLegacyApp({ getCommerceDb: () => database.getDb(), origins: ['http://localhost:3000'], development: true });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    await db.collection('categories').insertOne({ _id: category, name: 'Synthetic', disabled: false });
    await db.collection('products').insertOne({ _id: product, category, product_id: 'PD0001', name: 'Synthetic product', price: 10, stock: 2, disabled: false });
    await db.collection('stores').insertOne({ status: 'open' });
    meter.drain();
    const responses = await Promise.all([
      ...Array.from({ length: 4 }, () => fetch(`${origin}/api/products?limit=5`)),
      ...Array.from({ length: 3 }, () => fetch(`${origin}/api/products/${product.toHexString()}`)),
      fetch(`${origin}/api/store/cart/add`, { method: 'POST', headers: { Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' }, body: '{}' }),
    ]);
    for (const response of responses) assert.ok(response.ok, `${response.url} ${response.status}`);
    await db.collection('products').countDocuments();
    const routes = Object.fromEntries(meter.drain().routes.map((row: { route: string; count: number }) => [row.route, row.count]));
    assert.equal(routes['GET /api/products'], 4, JSON.stringify(routes));
    assert.equal(routes['GET /api/products/:id'], 3, JSON.stringify(routes));
    assert.equal(routes['POST /api/store/cart/add'], 1, 'work after the request body is read still belongs to the request');
    assert.equal(routes.worker, 1, 'work outside a request is background work');
    assert.equal(JSON.stringify(routes).includes(product.toHexString()), false);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await db.dropDatabase(); await database.close(); }
});
