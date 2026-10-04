import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { MongoClient, ObjectId } from 'mongodb';
import { createDriveMedia } from '../apps/api/src/modules/media/drive';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
const require = createRequire(new URL('../backend/package.json', import.meta.url));
test('all retained Drive writers preserve folders, raster URLs, archived references and data on uncertain upload', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const dbName = `almina_drive_test_${randomUUID().replaceAll('-', '')}`, db = client.db(dbName);
  const mongoose = require('mongoose'), sharp = require('sharp');
  const { createLegacyApp } = require('./app.js');
  await mongoose.connect(uri, { dbName, autoIndex: false, autoCreate: false });
  const assets = new Map<string, Buffer>(), folders: string[] = [];
  let uncertain = false;
  const driveMedia = createDriveMedia({ files: {
    create: async (input, options) => {
      assert.equal(options.retry, false);
      const chunks: Buffer[] = []; for await (const chunk of input.media.body) chunks.push(Buffer.from(chunk));
      const id = `synthetic-${assets.size + 1}`; assets.set(id, Buffer.concat(chunks)); folders.push(input.requestBody.parents[0]!);
      if (uncertain) throw new Error('Synthetic provider secret must not escape');
      return { data: { id } };
    },
    get: async input => { const bytes = assets.get(input.fileId); assert.ok(bytes); return { data: Readable.from([bytes]) }; },
  } });
  const app = createLegacyApp({ origins: ['http://localhost:3000'], development: true, driveMedia,
    auth: { authenticate: async () => ({ id: String(new ObjectId()), role: 'admin', cities: [] }) } });
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const headers = { origin: 'http://localhost:3000', 'x-csrf-protection': '1' };
  const png: Buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#008577' } }).png().toBuffer();
  async function write(path: string, fields: Record<string, string>, field = 'image', method = 'POST') {
    const body = new FormData(); Object.entries(fields).forEach(([key, value]) => body.set(key, value));
    body.set(field, new Blob([new Uint8Array(png)], { type: 'image/png' }), 'synthetic.png');
    return fetch(origin + path, { method, headers, body });
  }
  async function image(path: string, fileId: string) {
    const response = await fetch(origin + path); assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type')!, /^image\/(webp|jpeg)/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), assets.get(fileId));
  }
  try {
    await db.collection('stores').insertOne({ status: 'closed' });
    assert.equal((await write('/api/category', { name: 'Synthetic category' })).status, 201);
    const category = await db.collection('categories').findOne({ name: 'Synthetic category' }); assert.ok(category);
    const response = await write('/api/products', { name: 'Synthetic product', category: String(category._id), barcode: '00001', price: '12.50', stock: '0' }, 'images');
    assert.equal(response.status, 201); const product = (await response.json()).product;
    assert.equal(product.barcode, '00001'); assert.equal(product.price, 12.5); assert.equal(product.stock, 0);
    assert.equal((await write('/api/banners', { name: 'Synthetic banner', link: '/products' })).status, 201);
    assert.equal((await write('/api/whatsapp/image', {})).status, 201);
    const banner = await db.collection('banners').findOne(), poster = await db.collection('whatsappposters').findOne(); assert.ok(banner && poster);
    assert.deepEqual(folders, ['1EFfxTRU7EamU46cCl-NXrSnMz7H-Ivh4', '1I8HpwJ_iaOx_r7ZsOOETYcQbpMFpLUH6', '10jn65wQMomVYMAAy4TuH8iVgiFa8IhxJ', '11wB-C-ZmixvTLZnrFVkRfokTQmBmLlmv']);
    const references = [[`/api/category/images/${category.image}`, category.gdriveFileId], [`/api/products/images/${product.images[0]}`, product.gdriveFileIds[0]],
      [`/api/banners/images/${banner.image}`, banner.gdriveFileId], [`/api/whatsapp/image/${poster.image}`, poster.gdriveFileId]];
    for (const [path, id] of references) await image(path!, id!);
    assert.equal((await write(`/api/category/${category._id}`, { name: 'Renamed' }, 'image', 'PUT')).status, 200);
    await image(references[0]![0]!, category.gdriveFileId); // Historical filename resolves through media history.
    for (const path of [`/api/products/${product._id}`, `/api/banners/${banner._id}`, `/api/whatsapp/image/${poster._id}`]) {
      assert.equal((await fetch(origin + path, { method: 'DELETE', headers })).status, 200);
    }
    for (const [path, id] of references) await image(path!, id!); // Archive retains surviving images.
    const before = await db.collection('categories').findOne({ _id: category._id });
    const history = await db.collection('media_history').countDocuments(); const count = assets.size;
    uncertain = true;
    const failed = await write(`/api/category/${category._id}`, { name: 'Must not commit' }, 'image', 'PUT');
    assert.equal(failed.status, 503); assert.equal((await failed.text()).includes('secret'), false);
    assert.equal(assets.size, count + 1); // One uncertain acceptance, no retry or automatic deletion.
    assert.deepEqual(await db.collection('categories').findOne({ _id: category._id }), before);
    assert.equal(await db.collection('media_history').countDocuments(), history);
    assert.equal((await db.collection('stores').findOne())!.status, 'closed');
    assert.equal(await db.collection('products').countDocuments(), 1);
    assert.equal(await db.collection('inventory_adjustments').countDocuments(), 1);
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await mongoose.disconnect(); await db.dropDatabase(); await client.close();
  }
});
