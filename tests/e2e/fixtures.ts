import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';
export const commerceOrigin = 'http://127.0.0.1:4730';
export const adminOrigin = 'http://127.0.0.1:4720';
export const customer = { name: 'Synthetic', mobile: '0501234567', email: 'synthetic@example.invalid',
  emirate: 'Ras al-Khaimah', city: 'City A', address: 'Synthetic address', payment: 'cash' };
export const productId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
export const test = base.extend<{ isolatedNetwork: void; expectedReactBoundaryFailure: boolean }>({
  expectedReactBoundaryFailure: [false, { option: true }],
  isolatedNetwork: [async ({ page, expectedReactBoundaryFailure }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) { await route.continue(); return; }
      if (route.request().resourceType() === 'image') {
        await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#eee"/></svg>' }); return;
      }
      await route.abort('blockedbyclient');
    });
    await use();
    if (expectedReactBoundaryFailure) {
      // React 419 reports intentional aborted SSR Suspense boundaries; every other error fails.
      expect(errors.length).toBeGreaterThan(0); expect(errors.length).toBeLessThanOrEqual(2);
      for (const error of errors) expect(error).toMatch(/^Minified React error #419; visit https:\/\/react\.dev\/errors\/419 /);
    } else expect(errors, 'Unexpected JavaScript errors').toEqual([]);
  }, { auto: true }],
});
export { expect };
export async function reset(request: APIRequestContext) {
  expect((await request.get(commerceOrigin + '/__fixture/health')).status()).toBe(200);
  expect((await request.post(commerceOrigin + '/__fixture/reset')).ok()).toBeTruthy();
}
export async function state(request: APIRequestContext): Promise<{
  stock: number; receipts: number; orders: { _id: string; orderId: string; status: string; totals: { totalMinor: number } }[];
}> { return (await request.get(commerceOrigin + '/__fixture/state')).json(); }
export const checkoutOrigin = 'http://127.0.0.1:4740';
export async function nextCheckoutPage(page: Page) {
  await page.goto(checkoutOrigin + '/checkout');
  await page.evaluate(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 2 }])), productId);
  for (const [name, value] of Object.entries(customer)) {
    const field = page.locator(`[name="${name}"]`);
    if (name === 'emirate' || name === 'payment') await field.selectOption(value);
    else await field.fill(value);
  }
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
}
export async function login(page: Page, username = 'synthetic-admin') {
  await page.goto(adminOrigin + '/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('synthetic-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
