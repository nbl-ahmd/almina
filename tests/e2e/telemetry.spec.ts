import { test, expect, checkoutOrigin, nextCheckoutPage, reset, state, commerceOrigin } from './fixtures';
const key = 'almina.optional-usage.v2';
test.beforeEach(async ({ request }) => { await reset(request); });
for (const width of [360, 390, 768, 1280]) test(`optional usage at ${width}px requires consent and withdrawal stops reports`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: 900 });
  const reports: unknown[] = [];
  page.on('request', req => { if (new URL(req.url()).pathname === '/api/commerce-events') reports.push(req.postDataJSON()); });
  await nextCheckoutPage(page);
  expect(reports).toEqual([]);
  const allow = page.getByRole('button', { name: 'Allow optional reports', exact: true });
  await allow.focus(); await page.keyboard.press('Enter');
  await expect(page.getByText('Optional usage reports: on.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const received = page.waitForResponse(res => new URL(res.url()).pathname === '/api/commerce-events' && res.status() === 204);
  await page.getByRole('button', { name: 'Place order — AED 40.00', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  await received;
  expect(reports).toEqual([{ event: 'checkout_confirmed', consent: true }]);
  expect((await state(request)).orders).toHaveLength(1);
  await page.getByRole('button', { name: 'Usage preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Decline optional reports', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('error')));
  await page.reload(); await expect(page.getByText('Optional usage reports: off.', { exact: true })).toBeVisible();
  expect(await page.evaluate(storageKey => localStorage.getItem(storageKey), key)).toBe('declined');
  await page.evaluate(() => window.dispatchEvent(new Event('error')));
  expect(reports).toHaveLength(1);
});
test('browser privacy signal overrides stored opt-in and blocks collection', async ({ page }) => {
  await page.addInitScript(storageKey => { localStorage.setItem(storageKey, 'allowed'); Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }); }, key);
  const reports: unknown[] = [];
  page.on('request', req => { if (new URL(req.url()).pathname === '/api/commerce-events') reports.push(req.postDataJSON()); });
  await page.goto(checkoutOrigin + '/cart');
  await expect(page.getByText('Optional usage reports: off.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Usage preferences', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Allow optional reports', exact: true })).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event('error')));
  expect(reports).toEqual([]);
});
test('consented client errors expose only a coarse enum and storage withdrawal is honored', async ({ page }) => {
  await page.goto(checkoutOrigin + '/cart');
  await page.getByRole('button', { name: 'Allow optional reports', exact: true }).click();
  const received = page.waitForResponse(res => new URL(res.url()).pathname === '/api/commerce-events');
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'synthetic private order marker' })));
  const response = await received; expect(response.status()).toBe(204);
  expect(response.request().postDataJSON()).toEqual({ event: 'client_error', consent: true });
  await page.evaluate(storageKey => { localStorage.removeItem(storageKey); window.dispatchEvent(new StorageEvent('storage', { key: storageKey })); }, key);
  await expect(page.getByRole('button', { name: 'Allow optional reports', exact: true })).toBeVisible();
});
test('default-off storefront provides no analytics controls and rejects collector requests', async ({ page, request }) => {
  await page.goto('/'); await expect(page.getByRole('region', { name: 'Optional usage reports' })).toHaveCount(0);
  expect((await request.post('http://127.0.0.1:4710/api/commerce-events', { data: { event: 'client_error', consent: true } })).status()).toBe(404);
});
test('consented cart, quote and checkout failure events never replace authoritative order state', async ({ page, request }) => {
  await nextCheckoutPage(page);
  await page.getByRole('button', { name: 'Allow optional reports', exact: true }).click();
  const reports: unknown[] = [];
  page.on('request', req => { if (new URL(req.url()).pathname === '/api/commerce-events') reports.push(req.postDataJSON()); });
  await page.goto(checkoutOrigin + '/cart');
  const cart = page.waitForResponse(res => new URL(res.url()).pathname === '/api/commerce-events' && res.request().postDataJSON().event === 'cart_updated');
  await page.getByRole('button', { name: 'Decrease Synthetic care product quantity', exact: true }).click();
  expect((await cart).status()).toBe(204);
  await nextCheckoutPage(page);
  expect((await request.post(commerceOrigin + '/__fixture/price')).status()).toBe(204);
  const failure = page.waitForResponse(res => new URL(res.url()).pathname === '/api/commerce-events' && res.request().postDataJSON().event === 'checkout_failed');
  await page.getByRole('button', { name: 'Place order — AED 40.00', exact: true }).click();
  await expect(page.locator('[role="alert"]').first()).toContainText('Prices or delivery have changed');
  expect((await failure).status()).toBe(204);
  // Consented navigation may also report page_viewed; retain strict commerce sequencing
  // without depending on the hydration timer winning the reporter's consent setup.
  const commerceReports=reports.filter(report=>report&&typeof report==='object'&&'event' in report&&['cart_updated','checkout_reviewed','checkout_failed'].includes(String(report.event)));
  expect(commerceReports).toEqual([{ event: 'cart_updated', consent: true }, { event: 'checkout_reviewed', consent: true }, { event: 'checkout_failed', consent: true }]);
  for(const report of reports){expect(report).toMatchObject({consent:true});expect(Object.keys(report as object).sort()).toEqual(['consent','event']);}
  expect((await state(request)).orders).toHaveLength(0); expect((await state(request)).stock).toBe(4);
});
