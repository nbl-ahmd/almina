import { test, expect, checkoutPage, reset, state, commerceOrigin } from './fixtures';

test.beforeEach(async ({ request }) => { await reset(request); });
for (const width of [390, 1280]) test(`checkout at ${width}px confirms server prices and persists one intent-only order`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: 900 });
  await checkoutPage(page);
  page.once('dialog', async dialog => { expect(dialog.message()).toBe('Place order for AED 40.00? Prices are confirmed by the server.'); await dialog.accept(); });
  const submitted = page.waitForRequest(req => req.method() === 'POST' && new URL(req.url()).pathname === '/api/orders');
  await page.getByRole('button', { name: 'Place order', exact: true }).filter({ visible: true }).click();
  await expect(page.getByText('Order Placed Successfully!', { exact: true })).toBeVisible();
  const intent = (await submitted).postDataJSON() as { customer: Record<string, unknown>; items: unknown[]; idempotencyKey: string };
  expect(Object.keys(intent).sort()).toEqual(['customer', 'idempotencyKey', 'items']);
  expect(intent.items).toEqual([{ productId: 'bbbbbbbbbbbbbbbbbbbbbbbb', quantity: 2 }]);
  expect(Object.keys(intent.customer).some(key => /price|total|fee|vat|discount|stock|role/i.test(key))).toBeFalsy();
  const result = await state(request);
  expect(result.orders).toHaveLength(1); expect(result.orders[0]!.totals.totalMinor).toBe(4000);
  expect(result.stock).toBe(2); expect(result.receipts).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem('checkoutAttempt'))).toBeNull();
});
test('invalid checkout does not create an order or change stock', async ({ page, request }) => {
  await checkoutPage(page);
  await page.locator('#name').fill('');
  let quoteRequests = 0;
  page.on('request', req => { if (new URL(req.url()).pathname.startsWith('/api/orders')) quoteRequests++; });
  await page.getByRole('button', { name: 'Place order', exact: true }).filter({ visible: true }).click();
  await expect(page.locator('body')).toContainText('fill required files');
  expect(quoteRequests).toBe(0);
  const result = await state(request); expect(result.orders).toHaveLength(0); expect(result.stock).toBe(4);
});
test('stock exhaustion after quote rejects checkout without a partial order', async ({ page, request }) => {
  await checkoutPage(page);
  page.once('dialog', async dialog => {
    expect((await request.post(commerceOrigin + '/__fixture/stock', { data: { stock: 0 } })).status()).toBe(204);
    await dialog.accept();
  });
  const rejected = page.waitForResponse(res => res.request().method() === 'POST' && new URL(res.url()).pathname === '/api/orders');
  await page.getByRole('button', { name: 'Place order', exact: true }).filter({ visible: true }).click();
  expect((await rejected).status()).toBe(409);
  await expect(page.locator('body')).toContainText('Checkout could not be completed.');
  const result = await state(request); expect(result.orders).toHaveLength(0); expect(result.receipts).toBe(0); expect(result.stock).toBe(0);
  expect(await page.evaluate(() => sessionStorage.getItem('checkoutAttempt'))).toBeNull();
});
test('reload during an uncertain submission retries the same key without a second stock deduction', async ({ page, request }) => {
  await checkoutPage(page);
  await request.post(commerceOrigin + '/__fixture/delay');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Place order', exact: true }).filter({ visible: true }).click();
  await expect.poll(async () => (await state(request)).orders.length).toBe(1);
  const key = await page.evaluate(() => JSON.parse(sessionStorage.getItem('checkoutAttempt')!).idempotencyKey as string);
  await expect(page.getByRole('button', { name: 'Place order', exact: true }).filter({ visible: true })).toBeDisabled();
  await page.reload();
  await expect(page.locator('#name')).toHaveValue('Synthetic');
  const retried = page.waitForRequest(req => req.method() === 'POST' && new URL(req.url()).pathname === '/api/orders');
  const replay = page.waitForResponse(res => res.request().method() === 'POST' && new URL(res.url()).pathname === '/api/orders');
  await page.getByRole('button', { name: 'Place order', exact: true }).filter({ visible: true }).click();
  expect((await retried).postDataJSON().idempotencyKey).toBe(key);
  expect((await replay).status()).toBe(200);
  await expect(page.getByText('Order Placed Successfully!', { exact: true })).toBeVisible();
  const result = await state(request); expect(result.orders).toHaveLength(1); expect(result.stock).toBe(2); expect(result.receipts).toBe(1);
});
