// Real legacy HTTP/driver stack, restricted to a new disposable loopback replica set.
import { createRequire } from 'node:module';
import { fixtureHealth } from './e2e-ownership.mjs';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import { MongoClient, ObjectId } from 'mongodb';
import { hash } from 'bcryptjs';
import type { Express } from 'express';
import { migrateCommerce } from '../migrations/commerce.js';
import { requestEmailCode } from '../../apps/api/src/modules/growth/customers.js';
import { cloudinarySignature } from '../../apps/api/src/modules/media/cloudinary.js';

const require = createRequire(import.meta.url);
const express = require('../../backend/node_modules/express');
const { createLegacyApp } = require('../../backend/app.js');
const origin = 'http://127.0.0.1:4730';
process.env.CUSTOMER_AUTH_SECRET='synthetic-loopback-customer-test-secret-32-characters';
const replica = await MongoMemoryReplSet.create({
  binary: { version: '8.0.17', ...(process.env.TEST_MONGOD_PATH ? { systemBinary: process.env.TEST_MONGOD_PATH } : {}) },
  replSet: { count: 1, name: 'almina_test', ip: '127.0.0.1', storageEngine: 'wiredTiger' },
});
const uri = replica.getUri();
if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/.test(uri)) throw new Error('Non-loopback fixture refused');
const dbName = `almina_e2e_test_${randomUUID().replaceAll('-', '')}`;
const client = await new MongoClient(uri).connect();
const db = client.db(dbName);
const password = await hash('synthetic-test-password', 4);
let delayNext = false;
let fixtureCase = 0;
let whatsappSends = 0, whatsappFailure = false;
const mediaAssets = new Map<string, object>();
const timers = new Set<ReturnType<typeof setTimeout>>();
async function reset() {
  if (!/^almina_e2e_test_[a-f0-9]{32}$/.test(dbName)) throw new Error('Unsafe fixture database');
  await db.dropDatabase();
  delayNext = false;
  whatsappSends = 0; whatsappFailure = false;
  fixtureCase++; mediaAssets.clear();
  const category = new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');
  await db.collection('categories').insertOne({ _id: category, name: 'Synthetic category', disabled: false });
  await db.collection('products').insertOne({ _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'), product_id: 'PD0001',
    category, name: 'Synthetic care product', barcode: '123', description: 'Synthetic product',
    price: 25, sale: true, salePrice: 20, vat: true, stock: 4, disabled: false, images: [] });
  await db.collection('stores').insertOne({ status: 'open' });
  await db.collection('conversations').insertOne({ from: '971500000001', name: 'Synthetic Recipient', promotionStatus: 'true', messages: [] });
  await db.collection('users').insertMany([
    { username: 'synthetic-admin', name: 'Synthetic Admin', role: 'admin', cities: ['City A'], password },
    { username: 'synthetic-staff', name: 'Synthetic Staff', role: 'user', cities: ['City B'], password },
  ]);
  await migrateCommerce(db);
}
await reset();
const app = express() as Express;
app.use(express.json({ limit: '128kb' }));
app.get('/__fixture/health', (_req, res) => res.send(fixtureHealth('almina-verification-commerce', process.env.AL_MINA_FIXTURE_RUN_ID)));
app.post('/__fixture/reset', async (_req, res, next) => { try { await reset(); res.json({ ready: true }); } catch (error) { next(error); } });
app.post('/__fixture/marketing-product', async (_req,res,next)=>{try{await db.collection('products').updateOne({_id:new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb')},{$set:{contentReviewed:true,productType:'general'}});res.json({ready:true});}catch(error){next(error);}});
app.post('/__fixture/customer-challenge', async (_req,res,next)=>{try{let code='';const challenge=await requestEmailCode(db,{email:'shopper@example.invalid'},async(_email,value)=>{code=value;});res.json({...challenge,code});}catch(error){next(error);}});
app.post('/__fixture/families', async (_req, res, next) => {
  try {
    const category = new ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');
    const family = { familyKey:'synthetic-options',familyName:'Synthetic family',familyBrand:'Synthetic',familyForm:'Daily care',familyStrength:'not-applicable' };
    const variants = [
      { _id:new ObjectId('ccccccccccccccccccccccc1'), product_id:'PD8001',variantSize:'Small',variantFlavour:'Vanilla',price:30,stock:4 },
      { _id:new ObjectId('ccccccccccccccccccccccc2'), product_id:'PD8002',variantSize:'Large',variantFlavour:'Vanilla',price:40,stock:0 },
      { _id:new ObjectId('ccccccccccccccccccccccc3'), product_id:'PD8003',variantSize:'Large',variantFlavour:'Chocolate',price:35,stock:2 },
    ].map(variant=>({...family,...variant,category,name:'Synthetic family',barcode:'shared-synthetic',vat:false,disabled:false,images:[]}));
    await db.collection('products').insertMany(variants);
    await db.collection('products').insertOne({_id:new ObjectId('ccccccccccccccccccccccc4'),product_id:'PD8004',category,name:'Synthetic medicine 20mg',barcode:'other',price:25,stock:2,vat:false,disabled:false});
    res.json({ ready:true });
  } catch(error) { next(error); }
});
app.post('/__fixture/whatsapp/failure', (_req, res) => { whatsappFailure = true; res.sendStatus(204); });
app.post('/__fixture/whatsapp/history', async (_req, res, next) => {
  try { await db.collection('conversations').updateOne({ from: '971500000001' }, { $set: { messages: Array.from({ length: 61 }, (_, i) => ({ content: `Synthetic history ${i}`, sender: 'user', timestamp: new Date(i * 1000), providerId: 'private-provider' })) } }); res.sendStatus(204); } catch (error) { next(error); }
});
app.get('/__fixture/whatsapp/state', async (_req, res, next) => {
  try { res.json({ sends: whatsappSends, receipts: await db.collection('whatsapp_outbound').countDocuments(),
    messages: (await db.collection('conversations').findOne({ from: '971500000001' }))?.messages.length }); } catch (error) { next(error); }
});
app.post('/__fixture/stock', async (req, res, next) => {
  try {
    if (!Number.isSafeInteger(req.body?.stock) || req.body.stock < 0 || req.body.stock > 100) { res.sendStatus(400); return; }
    await db.collection('products').updateOne({ _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb') }, { $set: { stock: req.body.stock } });
    res.sendStatus(204);
  } catch (error) { next(error); }
});
app.post('/__fixture/recovery', async (_req, res, next) => {
  try {
    await reset();
    await db.collection('stores').updateOne({}, { $set: { status: 'closed' } });
    await db.collection<{ _id: string }>('recovery_bootstrap').insertOne({ _id: 'empty-database-v1' });
    res.sendStatus(204);
  } catch (error) { next(error); }
});
app.post('/__fixture/delay', (_req, res) => { delayNext = true; res.sendStatus(204); });
app.post('/__fixture/price', async (_req, res, next) => {
  try {
    await db.collection('products').updateOne({ _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb') }, { $set: { salePrice: 19 } });
    res.sendStatus(204);
  } catch (error) { next(error); }
});
app.get('/__fixture/state', async (_req, res, next) => {
  try {
    const product = await db.collection('products').findOne({ _id: new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb') });
    const orders = await db.collection('orders').find({}, { projection: { orderId: 1, status: 1, totals: 1, inventory: 1, 'customer.maplink': 1, 'customer.address': 1, 'customer.city': 1, 'customer.emirate': 1 } }).toArray();
    res.json({ stock: product?.stock, orders, receipts: await db.collection('checkout_requests').countDocuments() });
  } catch (error) { next(error); }
});
app.use((req, res, next) => {
  // Each reset is a distinct synthetic client. Preserve real quotas without accumulating
  // unrelated test cases on one loopback IP; never accept a caller's forwarded identity.
  req.headers['x-forwarded-for'] = `127.0.1.${fixtureCase % 250 + 1}`;
  if (req.method === 'POST' && ['/api/orders', '/api/v1/checkout'].includes(req.path) && delayNext) {
    delayNext = false;
    const send = res.json.bind(res);
    res.json = body => {
      const timer = setTimeout(() => { timers.delete(timer); if (!res.destroyed) send(body); }, 5000);
      timers.add(timer); return res;
    };
  }
  next();
});
// Maintained compatibility writes and fixture inspection share the native MongoDB database.
const mediaTransport: typeof fetch = async (url, options) => {
  if (options?.method !== 'POST') { const publicId = decodeURIComponent(String(url).split('/upload/')[1]!); return mediaAssets.has(publicId) ? Response.json(mediaAssets.get(publicId)) : new Response('{}', { status: 404 }); }
  const form = options.body as FormData, publicId = String(form.get('public_id'));
  const asset = { public_id: publicId, version: 1, resource_type: 'image', type: 'upload', format: 'webp', width: 500, height: 500, bytes: 100,
    secure_url: `https://res.cloudinary.com/synthetic/image/upload/v1/${publicId}.webp` };
  mediaAssets.set(publicId, asset); return Response.json({ ...asset, signature: cloudinarySignature({ public_id: publicId, version: '1' }, 'synthetic-not-a-secret') });
};
const location = { enabled: true, endpoint: 'https://geocoder.example.invalid/reverse', userAgent: 'AlMinaSyntheticTest/1', dailyLimit: 100, fetch: async () => Response.json({ display_name: 'Synthetic street, Synthetic area, Ras Al Khaimah, United Arab Emirates', address: { country_code: 'ae', state: 'Ras Al Khaimah Emirate', suburb: 'Synthetic area', city: 'Ras Al Khaimah', road: 'Synthetic street' } }) };
const legacy = createLegacyApp({ location, commerceTelemetryEnabled: process.env.COMMERCE_TELEMETRY_ENABLED === 'true', getCommerceDb: () => db, whatsappSender: async () => { whatsappSends++; if (whatsappFailure) throw new Error('Synthetic uncertain send'); return { providerId: `synthetic-message-${whatsappSends}` }; }, mediaTransport, cloudinaryUploads: { cloudName: 'synthetic', apiKey: '1234', apiSecret: 'synthetic-not-a-secret' }, trustProxy: ['127.0.0.1'], recoveryAllowed: true, recoveryCloudName: 'synthetic', origins: [origin, 'http://127.0.0.1:4720', 'http://127.0.0.1:4740', 'http://127.0.0.1:4760'], development: true });
app.use('/api', (req, res, next) => {
  // Preserve the full path expected by the actual authorization boundary.
  req.url = '/api' + req.url; legacy(req, res, next);
});
const server = createServer(app).listen(4730, '127.0.0.1');
async function stop() {
  for (const timer of timers) clearTimeout(timer);
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await client.close(); await replica.stop();
}
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => { void stop().then(() => process.exit(0)); });
console.log('Disposable real commerce browser fixture ready on loopback :4730');
