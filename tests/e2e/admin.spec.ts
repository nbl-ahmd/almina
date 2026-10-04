import { randomUUID } from 'node:crypto';
import { test, expect, reset, state, login, commerceOrigin, adminOrigin, customer, productId } from './fixtures';

test.beforeEach(async ({ request }) => { await reset(request); });
test('admin login persists through reload and staff access remains scoped', async ({ page }) => {
  await page.goto(adminOrigin + '/admin/orders');
  await expect(page).toHaveURL(adminOrigin + '/admin/login');
  await page.getByLabel('Username', { exact: true }).fill('synthetic-admin');
  await page.getByLabel('Password', { exact: true }).fill('wrong-synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('main')).toContainText('Invalid username or password.');
  await login(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin/login');
  await login(page, 'synthetic-staff');
  expect((await page.request.get(adminOrigin + '/api/admin/auth/users')).status()).toBe(403);
});
test('admin order update reaches the real writer and prevents cancellation after dispatch', async ({ page, request }) => {
  const created = await request.post(commerceOrigin + '/api/orders', { headers: { origin: commerceOrigin, 'x-csrf-protection': '1' },
    data: { customer, items: [{ productId, quantity: 2 }], idempotencyKey: randomUUID() } });
  expect(created.status()).toBe(201);
  const order = await created.json() as { id: string };
  await login(page);
  await page.goto(adminOrigin + '/admin/orders/' + order.id);
  await page.getByLabel('Bill number', { exact: true }).fill('12345');
  await page.getByLabel('Bill amount (AED)', { exact: true }).fill('40');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Dispatch order', exact: true }).click();
  await expect(page.getByText('Saved successfully.', { exact: true })).toBeVisible();
  expect((await state(request)).orders[0]!.status).toBe('dispatched');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await expect(page.locator('main')).toContainText('This record has changed or the action is unavailable.');
  const result = await state(request); expect(result.orders[0]!.status).toBe('dispatched'); expect(result.stock).toBe(2);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin/login');
  await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
  await login(page, 'synthetic-staff');
  expect((await page.request.get(adminOrigin + '/api/admin/orders/' + order.id)).status()).toBe(404);
});

test('admin stock adjustment requires a reason, preserves the retry receipt and rejects stale stock', async ({ page, request }) => {
  await login(page);
  await page.goto(adminOrigin + '/admin/products/' + productId);
  await page.getByLabel('Stock quantity', { exact: true }).fill('7');
  await page.getByLabel(/^Stock adjustment reason/).fill('Physical count verified');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByText('Saved successfully.', { exact: true })).toBeVisible();
  expect((await state(request)).stock).toBe(7);
  const response = await page.request.put(adminOrigin + '/api/admin/products/' + productId, {
    headers: { origin: adminOrigin, 'x-csrf-protection': '1' },
    data: { stock: 9, expectedStock: 4, stockReason: 'Outdated count', inventoryKey: randomUUID() },
  });
  expect(response.status()).toBe(409); expect((await state(request)).stock).toBe(7);
});

test('authenticated Cloudinary replacement works through the gateway and archive preserves stock', async ({ page, request }) => {
  const { createRequire } = await import('node:module'); const require = createRequire(`${process.cwd()}/package.json`);
  const sharp = require('./backend/node_modules/sharp');
  const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await login(page); await page.goto(adminOrigin + '/admin/products/' + productId);
  await page.getByLabel('Replacement raster images').setInputFiles({ name: 'reviewed.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Save Cloudinary images', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Cloudinary images saved' })).toBeVisible();
  const product = await (await page.request.get(adminOrigin + '/api/admin/products/' + productId)).json();
  expect(product.cloudinaryImages[0]).toMatch(/^https:\/\/res.cloudinary.com\/synthetic\/image\/upload\/v1\/almina\/products\//);
  expect(product.mediaRevision).toBe(1); expect((await state(request)).stock).toBe(4);
  await page.goto(adminOrigin + '/admin/products');
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Archive product', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Product inventory' })).toContainText('No records found.');
  expect((await state(request)).stock).toBe(4);
  const unpublished = await page.request.put(adminOrigin + '/api/admin/products/publish/' + productId, { headers: { origin: adminOrigin, 'x-csrf-protection': '1' }, data: {} });
  expect(unpublished.status()).toBe(409);
});
