import test from 'node:test';
import assert from 'node:assert/strict';
import { productTradeTerms, type ProductTrade } from '../apps/web/src/lib/admin/product-pricing';
const productId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const trade: ProductTrade = { ready: true, error: '', retail: true, wholesale: true, types: [], revision: 4, dirty: true, prices: [{ typeId: 'salon', unitPrice: '12.35', minimumQuantity: 6, quantityMultiple: 6, maximumQuantity: 120 }] };
test('product channel pricing converts exact AED minor units and preserves business quantities and revision', () => {
  const terms = productTradeTerms(trade, productId);
  assert.deepEqual(terms, { productId, enabled: true, revision: 4, prices: [{ typeId: 'salon', unitPriceMinor: 1235, minimumQuantity: 6, quantityMultiple: 6, maximumQuantity: 120 }] });
  assert.equal(productTradeTerms({ ...trade, retail: false }, productId).prices[0]?.unitPriceMinor, 1235);
  assert.equal(productTradeTerms({ ...trade, wholesale: false }, productId).enabled, false);
});
test('product channel pricing rejects missing channels, missing wholesale prices and invalid case quantities before mutation', () => {
  for (const invalid of [{ ...trade, ready: false }, { ...trade, retail: false, wholesale: false }, { ...trade, prices: [] }, { ...trade, prices: [{ ...trade.prices[0]!, unitPrice: '1.234' }] }, { ...trade, prices: [{ ...trade.prices[0]!, unitPrice: '0' }] }, { ...trade, prices: [{ ...trade.prices[0]!, minimumQuantity: 5 }] }]) assert.throws(() => productTradeTerms(invalid, productId));
});

test('disabling wholesale retains persisted rates and ignores incomplete inactive drafts', () => {
  const savedPrices = [{ typeId: 'salon', unitPriceMinor: 1235, minimumQuantity: 6, quantityMultiple: 6, maximumQuantity: 120 }];
  assert.deepEqual(productTradeTerms({ ...trade, wholesale: false, savedPrices, prices: [{ ...trade.prices[0]!, unitPrice: '' }] }, productId).prices, savedPrices);
});
