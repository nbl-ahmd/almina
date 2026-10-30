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
      // Reporting depends on hydration timing; an observed error boundary is asserted in the test.
      expect(errors.length).toBeLessThanOrEqual(2);
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
  await page.reload();
  for (const [name, value] of Object.entries(customer)) {
    const field = page.locator(`[name="${name}"]`);
    if(name==='payment')continue;
    if (name === 'emirate') await field.selectOption(value);
    else await field.fill(value);
  }
  const review=page.getByRole('button',{name:'Review order',exact:true});
  if(await review.isVisible())await review.click();else await page.getByRole('button',{name:'Continue to payment',exact:true}).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
}
export async function login(page: Page, username = 'synthetic-admin') {
  await page.goto(adminOrigin + '/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('synthetic-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await streamSettled(page);
}
export async function openAdminSection(page: Page, name: string) {
  // Below 768px the administration navigation is a drawer. Open it first so the
  // test follows the same path a phone user does instead of assuming the
  // sidebar is already on screen.
  const toggle = page.getByRole('button', { name: 'Menu', exact: true });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole('link', { name, exact: true }).click();
}
// The admin pages stream: Next writes the finished page into a hidden container
// and swaps it in while the page hydrates. Until that swap lands the document
// briefly holds two copies of every control, and label queries can match the
// hidden one. Wait for load, then for a quiet DOM window so hydration and the
// streamed swap have both finished before the test starts querying.
export async function streamSettled(page: Page) {
  await page.waitForLoadState('load');
  await page.evaluate(() => new Promise<void>((settle) => {
    let quiet = window.setTimeout(finish, 300);
    const stop = window.setTimeout(finish, 10000);
    const observer = new MutationObserver(() => {
      clearTimeout(quiet);
      quiet = window.setTimeout(finish, 300);
    });
    function finish() {
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(stop);
      settle();
    }
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  }));
}
