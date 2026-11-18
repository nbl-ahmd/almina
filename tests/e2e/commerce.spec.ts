import { test, expect, nextCheckoutPage, reset, state, commerceOrigin, checkoutOrigin, productId } from './fixtures';
test.beforeEach(async ({ request }) => { await reset(request); });
test('Next imports legacy cart identifiers while discarding forged prices, names and stock', async ({ page, request }) => {
  await page.addInitScript(id => {
    localStorage.setItem('cartItems', JSON.stringify([{ _id: id, quantity: 2, name: 'Forged', price: 1, salePrice: 1, stock: 999 }]));
  }, productId);
  await page.goto(checkoutOrigin + '/cart');
  const unitPrice = page.locator('.cart-unit-price');
  await expect(unitPrice.getByRole('img')).toHaveAccessibleName('AED 20.00');
  await expect(unitPrice).toContainText('per item');
  await expect(page.locator('main')).not.toContainText('Forged');
  await page.getByRole('button', { name: 'Increase Synthetic care product quantity' }).click();
  await expect(page.getByRole('status', { name: 'Quantity for Synthetic care product: 3' })).toHaveText('3');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('almina.cart.v1')!))).toEqual([{ id: productId, quantity: 3 }]);
  await page.reload(); await expect(page.getByRole('status', { name: 'Quantity for Synthetic care product: 3' })).toHaveText('3');
  expect((await state(request)).orders).toHaveLength(0); expect((await state(request)).stock).toBe(4);
});
test('Next browser validation blocks incomplete delivery details before quote or order writes', async ({ page, request }) => {
  await nextCheckoutPage(page); await page.getByRole('textbox', { name: 'Name', exact: true }).fill('');
  let writes = 0; page.on('request', req => { if (req.method() === 'POST' && new URL(req.url()).pathname.startsWith('/api/checkout')) writes++; });
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  expect(await page.getByRole('textbox', { name: 'Name', exact: true }).evaluate((node: HTMLInputElement) => node.validity.valueMissing)).toBe(true);
  expect(writes).toBe(0); const result = await state(request); expect(result.orders).toHaveLength(0); expect(result.stock).toBe(4);
});
test('Next rejects exhausted stock after review without a partial order or stale retry intent', async ({ page, request }) => {
  await nextCheckoutPage(page);
  expect((await request.post(commerceOrigin + '/__fixture/stock', { data: { stock: 0 } })).status()).toBe(204);
  const rejected = page.waitForResponse(res => res.request().method() === 'POST' && new URL(res.url()).pathname === '/api/checkout');
  await page.getByRole('button', { name: 'Place order — AED 40.00', exact: true }).click();
  expect((await rejected).status()).toBe(409);
  await expect(page.getByRole('alert').filter({ hasText: 'Some items no longer have enough stock' })).toBeVisible();
  const result = await state(request); expect(result.orders).toHaveLength(0); expect(result.receipts).toBe(0); expect(result.stock).toBe(0);
  expect(await page.evaluate(() => sessionStorage.getItem('almina.checkout.pending.v1'))).toBeNull();
});
