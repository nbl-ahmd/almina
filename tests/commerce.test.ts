import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { ObjectId } from 'mongodb';
import { checkoutInputSchema, type QuoteInput } from '@almina/contracts';
import { calculateQuote, createCommerceService, moneyMinor, historicalStatus } from '../apps/api/src/modules/orders/commerce.js';
import { orderDetailDto } from '../apps/api/src/modules/orders/dto.js';
import { legacyOrderDto } from '../apps/api/src/modules/orders/legacy-dto.js';
import { approvedPolicy } from '../scripts/migrations/commerce.js';

const id = new ObjectId();
const input: QuoteInput = { customer: { name: 'Synthetic', mobile: '0501234567', email: 'synthetic@example.invalid',
  emirate: 'Ras al-Khaimah', city: 'City A', address: 'Synthetic address', payment: 'cash', note: '', maplink: '', buildingname: '', flatno: '' },
  items: [{ productId: String(id), quantity: 2 }] };
const product = { _id: id, product_id: 'PD123', barcode: '123', name: 'Original name', price: 10.5, sale: true, salePrice: 10, stock: 2, vat: true };

test('server calculates inclusive VAT, discount, delivery and minimum in integer fils', () => {
  const quote = calculateQuote(input, [product], approvedPolicy);
  assert.equal(quote.subtotalMinor, 2000); assert.equal(quote.taxMinor, 95); assert.equal(quote.discountMinor, 100);
  assert.equal(quote.totalMinor, 2000); assert.equal(quote.lines[0]!.unitPriceMinor, 1050);
  assert.equal(calculateQuote({ ...input, customer: { ...input.customer, emirate: 'Dubai' } }, [product], approvedPolicy).totalMinor, 4100);
  assert.equal(calculateQuote(input, [{ ...product, sale: false, salePrice: 1 }], approvedPolicy).totalMinor, 2100);
  const exclusive = calculateQuote(input, [product], { ...approvedPolicy, vatMode: 'exclusive' });
  assert.equal(exclusive.taxMinor, 100); assert.equal(exclusive.totalMinor, 2100);
  assert.throws(() => calculateQuote(input, [{ ...product, salePrice: 4 }], approvedPolicy), { code: 'MINIMUM_ORDER' });
  assert.throws(() => calculateQuote({ ...input, customer: { ...input.customer, emirate: 'Unknown' } }, [product], approvedPolicy), { code: 'INVALID_REQUEST' });
  for (const value of [1.001, -1, NaN, Infinity, '12 AED', Number.MAX_SAFE_INTEGER]) assert.throws(() => moneyMinor(value));
  assert.equal(moneyMinor(0.29), 29);
});

test('modified price, total, delivery fee, tax, discount, minimum and stock never reach the database', async () => {
  let reached = 0;
  const service = createCommerceService(async () => { reached++; throw new Error('Unexpected database access'); });
  const intent = { ...input, idempotencyKey: randomUUID() };
  for (const field of ['price', 'salePrice', 'total', 'totalAmount', 'deliveryFee', 'vat', 'discount', 'minimumOrderAmount', 'stock', 'role']) {
    await assert.rejects(service.checkout({ ...intent, [field]: 0 }), { code: 'INVALID_REQUEST' });
    await assert.rejects(service.quote({ ...input, [field]: 0 }), { code: 'INVALID_REQUEST' });
    await assert.rejects(service.checkout({ ...intent, customer: { ...input.customer, [field]: 0 } }), { code: 'INVALID_REQUEST' });
    await assert.rejects(service.checkout({ ...intent, items: [{ ...input.items[0], [field]: 0 }] }), { code: 'INVALID_REQUEST' });
  }
  assert.equal(reached, 0);
});

test('invalid IDs, quantities, unknown payment and missing key reject; duplicate items are normalized', () => {
  for (const quantity of [-1, 0, 1.5, '1', 1001]) assert.equal(checkoutInputSchema.safeParse({ ...input, idempotencyKey: randomUUID(), items: [{ productId: String(id), quantity }] }).success, false);
  assert.equal(checkoutInputSchema.safeParse({ ...input }).success, false);
  assert.equal(checkoutInputSchema.safeParse({ ...input, idempotencyKey: randomUUID(), items: [{ productId: 'missing', quantity: 1 }] }).success, false);
  assert.equal(checkoutInputSchema.safeParse({ ...input, idempotencyKey: randomUUID(), customer: { ...input.customer, payment: 'paid' } }).success, false);
  const quote = calculateQuote({ ...input, items: [{ productId: String(id), quantity: 1 }, { productId: String(id), quantity: 1 }] }, [product], approvedPolicy);
  assert.equal(quote.lines.length, 1); assert.equal(quote.lines[0]!.quantity, 2);
});

test('invalid, disabled, unpublished, inactive, fractional stock and corrupt sale products fail closed', () => {
  assert.throws(() => calculateQuote(input, [], approvedPolicy), { code: 'PRODUCT_UNAVAILABLE' });
  for (const change of [{ disabled: true }, { active: false }, { published: false }]) assert.throws(() => calculateQuote(input, [{ ...product, ...change }], approvedPolicy), { code: 'PRODUCT_UNAVAILABLE' });
  for (const stock of [1, -1, 2.5]) assert.throws(() => calculateQuote(input, [{ ...product, stock }], approvedPolicy), { code: 'INSUFFICIENT_STOCK' });
  assert.throws(() => calculateQuote(input, [{ ...product, salePrice: undefined }], approvedPolicy));
});

test('historical rendering preserves totals, tolerates missing products and never fabricates snapshots', () => {
  const old = { _id: new ObjectId(), orderId: 'OD5001', customer: { totalAmount: 12.34 }, cartItems: [{ _id: id, quantity: 1 }, { _id: null, quantity: -1 }] };
  const detail = orderDetailDto(old);
  assert.equal(detail.totalAmount, 12.34); assert.equal(detail.snapshotAvailable, false); assert.equal(detail.lines, null);
  assert.equal(detail.items[1]!.productId, null); assert.equal(detail.items[1]!.quantity, -1);
  assert.equal(legacyOrderDto(old).cartItems[1]._id.name, 'Historical product unavailable');
  assert.equal(historicalStatus({ canceled: true, dispatched: true }), 'legacy_conflict');
  const totals = calculateQuote(input, [product], approvedPolicy);
  const fresh = { ...old, schemaVersion: 2, status: 'pending', lines: totals.lines, totals };
  assert.equal(orderDetailDto(fresh).lines![0]!.name, 'Original name');
  assert.equal(orderDetailDto(fresh).totalAmount, 20);
  assert.equal(legacyOrderDto({ ...fresh, cartItems: [{ _id: { name: 'Changed live catalog', price: 999 }, quantity: 2 }] }).cartItems[0]._id.name, 'Original name');
});
