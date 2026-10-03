import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const bootstrap = readFileSync('tests/fixtures/bootstrap-5.3.0-alpha1.min.css');
const integrity = 'sha384-' + createHash('sha384').update(bootstrap).digest('base64');
assert.equal(integrity, 'sha384-GLhlTQ8iRABdZLl6O3oVMWSktQOp6b7In1Zl3/Jr59b6EGGoI1aFkw7cmDA6j6gD');
assert.ok(readFileSync('frontend/index.html', 'utf8').includes(integrity), 'Keep the CSS fixture matched to legacy HTML');

export const commerceOrigin = 'http://127.0.0.1:4730';
export const adminOrigin = 'http://127.0.0.1:4720';
export const customer = { name: 'Synthetic', mobile: '0501234567', email: 'synthetic@example.invalid',
  emirate: 'Ras al-Khaimah', city: 'City A', address: 'Synthetic address', payment: 'cash' };
export const productId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
export const test = base.extend<{ isolatedNetwork: void }>({
  isolatedNetwork: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (['127.0.0.1', 'localhost'].includes(url.hostname)) { await route.continue(); return; }
      if (url.href === 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css') {
        await route.fulfill({ contentType: 'text/css', body: bootstrap, headers: { 'access-control-allow-origin': '*' } }); return;
      }
      if (url.hostname === 'overpass-api.de') {
        await route.fulfill({ json: { elements: [{ id: 1, tags: { name: 'City A' } }] } }); return;
      }
      if (route.request().resourceType() === 'image') {
        await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#eee"/></svg>' }); return;
      }
      await route.abort('blockedbyclient');
    });
    await use();
    expect(errors, 'Unexpected JavaScript errors').toEqual([]);
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
export async function checkoutPage(page: Page) {
  await page.goto(commerceOrigin);
  await page.evaluate(id => {
    localStorage.setItem('cartItems', JSON.stringify([{ _id: id, quantity: 2, name: 'Forged', price: 1, salePrice: 1, stock: 999 }]));
  }, productId);
  await page.goto(commerceOrigin + '/checkout');
  for (const [id, value] of Object.entries(customer).filter(([key]) => ['name', 'mobile', 'email', 'address'].includes(key))) await page.locator('#' + id).fill(value);
  await page.locator('#emirate').selectOption(customer.emirate);
  await expect(page.locator('#city option')).toContainText(['City A']);
  await page.locator('#city').selectOption('City A');
  await page.locator('label[for="cash"]').click();
  await expect(page.locator('#cash')).toBeChecked();
}
export async function login(page: Page, username = 'synthetic-admin') {
  await page.goto(adminOrigin + '/admin/login');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill('synthetic-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
