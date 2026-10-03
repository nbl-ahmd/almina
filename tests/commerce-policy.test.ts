import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ObjectId } from 'mongodb';
import type { QuoteInput } from '@almina/contracts';
import { calculateQuote, moneyMinor } from '../apps/api/src/modules/orders/commerce';
import { approvedPolicy } from '../scripts/migrations/commerce';

const id = new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb');
const customer: QuoteInput['customer'] = { name: 'Synthetic', mobile: '0501234567', email: 'synthetic@example.invalid',
  emirate: 'Ras al-Khaimah', city: 'City A', address: 'Synthetic address', payment: 'cash', buildingname: '', flatno: '', note: '', maplink: '' };
const input: QuoteInput = { customer, items: [{ productId: String(id), quantity: 1 }] };
const product = { _id: id, product_id: 'PD0001', name: 'Synthetic', price: 10, stock: 1000, vat: true };

test('VAT rounds half up once per normalized line and stays embedded in inclusive prices', () => {
  for (const [price, quantity, taxMinor] of [[10, 1, 48], [10.08, 1, 48], [10.19, 1, 49], [10.5, 2, 100]]) {
    const quote = calculateQuote({ ...input, items: [{ productId: String(id), quantity: quantity! }] }, [{ ...product, price }], approvedPolicy);
    assert.equal(quote.taxMinor, taxMinor); assert.equal(quote.totalMinor, moneyMinor(price) * quantity!);
  }
  const combined = calculateQuote({ ...input, items: [{ productId: String(id), quantity: 1 }, { productId: String(id), quantity: 1 }] }, [product], approvedPolicy);
  assert.equal(combined.taxMinor, 95); // Two independently rounded 48-fils amounts would be wrong.
  assert.equal(calculateQuote(input, [{ ...product, vat: false }], approvedPolicy).taxMinor, 0);
});
test('every approved emirate alias uses the server delivery fee', () => {
  for (const { emirate, feeMinor } of approvedPolicy.delivery) {
    const quote = calculateQuote({ ...input, customer: { ...customer, emirate } }, [product], approvedPolicy);
    assert.equal(quote.deliveryFeeMinor, emirate === 'Ras al-Khaimah' ? 0 : 2100);
    assert.equal(quote.totalMinor, 1000 + feeMinor);
  }
});
test('discounted merchandise must reach the minimum before delivery or VAT is considered', () => {
  const paidDelivery = { ...input, customer: { ...customer, emirate: 'Dubai' } };
  assert.throws(() => calculateQuote(paidDelivery, [{ ...product, price: 20, sale: true, salePrice: 9.99 }], approvedPolicy), { code: 'MINIMUM_ORDER' });
  const quote = calculateQuote(paidDelivery, [{ ...product, price: 20, sale: true, salePrice: 10 }], approvedPolicy);
  assert.equal(quote.discountMinor, 1000); assert.equal(quote.subtotalMinor, 1000); assert.equal(quote.totalMinor, 3100);
  assert.throws(() => calculateQuote(input, [{ ...product, sale: true, salePrice: 10.01 }], approvedPolicy), { code: 'COMMERCE_UNAVAILABLE' });
});
test('legacy publication defaults work while malformed flags, money, stock and combined quantities fail closed', () => {
  assert.equal(calculateQuote(input, [product], approvedPolicy).totalMinor, 1000);
  for (const change of [{ disabled: 'false' }, { active: 1 }, { published: null }, { vat: 'true' }, { sale: 'false' }, { name: '' }, { product_id: '' }]) {
    assert.throws(() => calculateQuote(input, [{ ...product, ...change }], approvedPolicy), { code: 'COMMERCE_UNAVAILABLE' });
  }
  for (const stock of [0, '1000', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => calculateQuote(input, [{ ...product, stock }], approvedPolicy), { code: 'INSUFFICIENT_STOCK' });
  }
  assert.throws(() => calculateQuote({ ...input, items: [{ productId: String(id), quantity: 600 }, { productId: String(id), quantity: 401 }] }, [product], approvedPolicy), { code: 'INVALID_REQUEST' });
  assert.throws(() => calculateQuote({ ...input, items: [{ productId: String(id), quantity: 1000 }] },
    [{ ...product, price: '90071992547409.91' }], approvedPolicy), { code: 'COMMERCE_UNAVAILABLE' });
});
