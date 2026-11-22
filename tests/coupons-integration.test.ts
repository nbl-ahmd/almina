import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { listCoupons, saveCoupon } from '../apps/api/src/modules/coupons/service';
import { createCommerceService, quoteHash } from '../apps/api/src/modules/orders/commerce';
import { approvedPolicy } from '../scripts/migrations/commerce';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1');
test('campaign coupon pricing, configuration and transactional usage', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db('coupons_' + randomUUID().replaceAll('-', ''));
  const category = new ObjectId(), care = new ObjectId(), medicine = new ObjectId(), actor = String(new ObjectId());
  const definition = {
    code: 'Care-10', enabled: true, discount: { type: 'percent', basisPoints: 1000, capMinor: 375 },
    minimumMinor: 4000, maximumUses: 1, startsAt: null, endsAt: null, revision: 0,
  };
  const customer = { name: 'Synthetic', mobile: '0501234567', email: 'synthetic@example.invalid',
    emirate: 'Ras al-Khaimah', city: 'City', address: 'Synthetic address', payment: 'cash' };
  const items = [{ productId: String(care), quantity: 1 }, { productId: String(medicine), quantity: 1 }];
  const input = { items, customer, couponCode: 'care-10' };
  try {
    await db.collection('categories').insertOne({ _id: category, name: 'Care' });
    const product = { category, price: 60, stock: 8, vat: true, contentReviewed: true };
    await db.collection('products').insertMany([
      { ...product, _id: care, name: 'Reviewed care', product_id: 'PD01', sale: true, salePrice: 50, productType: 'general' },
      { ...product, _id: medicine, name: 'OTC medicine', product_id: 'PD02', productType: 'otc' },
    ]);
    await db.collection('stores').insertOne({ status: 'open' });
    await db.collection('commerce_policies').insertOne({ _id: 'checkout' as never, ...approvedPolicy });
    await db.collection('commerce_counters').insertOne({ _id: 'orders' as never, ready: true, value: 5000 });

    const first = await saveCoupon(db, definition, actor);
    assert.equal(first.code, 'CARE-10');
    await assert.rejects(saveCoupon(db, definition, actor), { code: 'IDEMPOTENCY_CONFLICT' });
    const service = createCommerceService(async () => db);
    await assert.rejects(service.previewCoupon({ couponCode: first.code, items: items.slice(1) }), { code: 'COUPON_UNAVAILABLE' });
    await assert.rejects(service.quote({ ...input, voucherCode: 'AM-'+'A'.repeat(24) }), { code: 'COUPON_COMBINATION' });
    const preview = await service.previewCoupon({ couponCode: 'care-10', items });
    assert.deepEqual(preview, { code: 'CARE-10', discountMinor: 375 });
    const quote = await service.quote(input);
    assert.deepEqual(quote.coupon, preview);
    assert.equal(quote.subtotalMinor, 11000);
    assert.equal(quote.lines.find(line => line.productId === String(care))!.couponDiscountMinor, 375);
    assert.equal(quote.lines.find(line => line.productId === String(medicine))!.couponDiscountMinor, 0);
    assert.equal(quote.lines.find(line => line.productId === String(care))!.taxMinor, 220);
    assert.equal(quote.totalMinor, (await service.quote({ items, customer })).totalMinor - 375);
    await assert.rejects(service.checkout({ ...input, idempotencyKey: randomUUID() }), { code: 'INVALID_REQUEST' });
    await assert.rejects(service.checkout({ ...input, idempotencyKey: randomUUID(), acceptedQuoteHash: 'a'.repeat(64) }), { code: 'PRICE_CHANGED' });
    assert.equal((await listCoupons(db)).items[0]!.uses, 0);

    const intents = Array.from({ length: 2 }, () => ({ ...input, idempotencyKey: randomUUID(), acceptedQuoteHash: quoteHash(quote) }));
    const attempts = await Promise.allSettled(intents.map(intent => service.checkout(intent)));
    const winner = attempts.findIndex(row => row.status === 'fulfilled');
    const success = attempts[winner]!;
    assert.ok(success.status === 'fulfilled');
    assert.equal(attempts.filter(row => row.status === 'fulfilled').length, 1);
    assert.equal((await service.checkout(intents[winner]!)).id, success.value.id);
    assert.equal((await listCoupons(db)).items[0]!.uses, 1);
    assert.equal(await db.collection('orders').countDocuments(), 1);
    assert.equal((await db.collection('products').findOne({ _id: care }))!.stock, 7);
    await service.transition(success.value.id, { status: 'cancelled' }, { id: actor, role: 'admin' } as never);
    await service.transition(success.value.id, { status: 'cancelled' }, { id: actor, role: 'admin' } as never);
    assert.equal((await listCoupons(db)).items[0]!.uses, 0);
    assert.deepEqual((await db.collection('orders').findOne({ _id: new ObjectId(success.value.id) }))!.totals.coupon, preview);

    const update = { ...definition, revision: first.revision, discount: { type: 'fixed', amountMinor: 6000 }, minimumMinor: 6000 };
    const saved = await saveCoupon(db, update, actor);
    await assert.rejects(service.quote(input), { code: 'COUPON_MINIMUM' });
    await assert.rejects(saveCoupon(db, update, actor), { code: 'IDEMPOTENCY_CONFLICT' });
    const expired = await saveCoupon(db, { ...update, revision: saved.revision, endsAt: '2000-01-01T00:00:00Z' }, actor);
    await assert.rejects(service.quote(input), { code: 'COUPON_UNAVAILABLE' });
    await saveCoupon(db, { ...update, revision: expired.revision, minimumMinor: 0 }, actor);
    assert.equal((await service.quote(input)).coupon?.discountMinor, 5000);
  } finally {
    await db.dropDatabase();
    await client.close();
  }
});
