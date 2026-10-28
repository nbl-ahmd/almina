import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { processMerchantSync, type MerchantConfiguration, type MerchantProvider } from '../apps/api/src/modules/catalog/merchant';

const uri = process.env.COMMERCE_TEST_URI;
test('Merchant job leases, publishes reviewed items, refreshes stock, and withdraws revoked approvals without changing commerce', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db(`merchant_${randomUUID().replaceAll('-', '')}`);
  const config = { account: '123', dataSource: 'accounts/123/dataSources/456', origin: 'https://shop.example.invalid', cloudName: 'synthetic', credentials: {} } as MerchantConfiguration;
  const calls: string[] = [];
  const provider: MerchantProvider = {
    verify: async () => { calls.push('verify'); }, owner: async () => null,
    upsert: async input => { calls.push(`upsert:${input.offerId}:${input.productAttributes.availability}`); },
    remove: async offerId => { calls.push(`remove:${offerId}`); },
  };
  async function release() { await db.collection('merchant_jobs').updateMany({}, { $set: { leaseUntil: new Date(0) } }); }
  try {
    const category = new ObjectId();
    await db.collection('categories').insertOne({ _id: category, name: 'Synthetic care' });
    await db.collection('stores').insertOne({ status: 'open' });
    await db.collection('commerce_policies').insertOne({ active: true, vatMode: 'inclusive', vatRateBps: 500 });
    const product = { _id: new ObjectId(), product_id: 'PD1', category, name: 'Synthetic cleanser 100 ml', price: 20, stock: 4,
      brand: 'Synthetic', description: 'Reviewed synthetic information', saleUnit: 'Bottle', packLabel: '100 ml', productType: 'general',
      condition: 'new', contentReviewed: true, stockVerified: true, imageRights: 'authorized', googleApproved: true,
      identifierStatus: 'assigned', gtin: '4006381333931', cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/cleanser.webp'] };
    await db.collection('products').insertMany([product, { ...product, _id: new ObjectId(), product_id: 'PD2', cloudinaryImages: [] }, { ...product, _id: new ObjectId(), product_id: 'PD3', productType: 'otc' }]);
    const first = await Promise.all([processMerchantSync(db, config, provider, async () => true), processMerchantSync(db, config, provider, async () => true)]);
    assert.equal(first.filter(Boolean).length, 1); assert.equal(first.find(Boolean)!.uploaded, 1);
    assert.equal(calls.filter(call => call.startsWith('upsert:')).length, 1);
    assert.equal(await db.collection('merchant_products').countDocuments(), 1);
    assert.equal((await db.collection('products').findOne({ _id: product._id }))!.price, 20);
    assert.equal((await db.collection('products').findOne({ _id: product._id }))!.stock, 4);
    assert.equal(await db.collection('orders').countDocuments(), 0);
    await release(); await db.collection('products').updateOne({ _id: product._id }, { $set: { stock: 0 } });
    await processMerchantSync(db, config, provider, async () => true);
    assert.ok(calls.includes('upsert:PD1:OUT_OF_STOCK'));
    await release(); await db.collection('products').updateOne({ _id: product._id }, { $set: { googleApproved: false } });
    await processMerchantSync(db, config, provider, async () => true);
    assert.ok(calls.includes('remove:PD1')); assert.equal(await db.collection('merchant_products').countDocuments(), 0);
    const state = await db.collection('merchant_jobs').findOne({});
    assert.equal(state!.eligible, 0); assert.equal(state!.withdrawn, 1); assert.equal(state!.state, 'ready');
    await release(); await db.collection('stores').updateOne({}, { $set: { status: 'closed' } });
    calls.length = 0;
    await assert.rejects(processMerchantSync(db, config, provider, async () => true), /not ready/);
    assert.deepEqual(calls, []); assert.equal((await db.collection('merchant_jobs').findOne({}))!.state, 'retry');
  } finally { await db.dropDatabase(); await client.close(); }
});
