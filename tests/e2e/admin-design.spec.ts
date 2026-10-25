import { test, expect, reset, login, streamSettled, adminOrigin, productId } from './fixtures';

test.beforeEach(async ({ request }) => { await reset(request); });

test('inventory search and view tabs preserve search scope across navigation and reload', async ({ page }) => {
  await login(page);
  const search = page.getByRole('search', { name: 'Inventory search', exact: true });
  await search.getByRole('searchbox').fill('Synthetic');
  await search.getByRole('button', { name: 'Search inventory', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products\?q=Synthetic$/);
  await streamSettled(page);
  const views = page.getByRole('navigation', { name: 'Inventory views' });
  await views.getByRole('link', { name: 'Out of stock', exact: true }).click();
  await expect(page).toHaveURL(/q=Synthetic&view=outofstock/);
  await streamSettled(page);
  await expect(views.getByRole('link', { name: 'Out of stock', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('searchbox', { name: 'Search products', exact: true })).toHaveValue('Synthetic');
  await page.reload();
  await streamSettled(page);
  await expect(views.getByRole('link', { name: 'Out of stock', exact: true })).toHaveAttribute('aria-current', 'page');
  await views.getByRole('link', { name: 'All products', exact: true }).click();
  await streamSettled(page);
  await expect(page.getByRole('table', { name: 'Product inventory' })).toContainText('Synthetic care product');
  const more = page.getByRole('button', { name: 'More actions for Synthetic care product', exact: true });
  await more.click();
  const actions = page.getByRole('dialog', { name: 'Actions for Synthetic care product', exact: true });
  await expect(actions.getByRole('button', { name: 'Toggle publishing', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(actions).toBeHidden();
  await expect(more).toBeFocused();
});

for (const width of [360, 390, 768, 1440]) test(`product tabs preserve edits at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await login(page);
  await page.goto(`${adminOrigin}/admin/products/${productId}`);
  await streamSettled(page);
  await expect(page.getByRole('tablist', { name: 'Product sections' })).toBeVisible();
  const name = page.getByRole('textbox', { name: 'Product name', exact: true });
  await name.fill('Unsaved synthetic edit');
  await expect(page.getByRole('spinbutton', { name: 'Retail price (AED)', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Variants', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Product family key (optional)', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Product family key (optional)', exact: true }).fill('unsaved-family');
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await expect(name).toHaveValue('Unsaved synthetic edit');
  await expect(page.locator('[name="expectedStock"]')).toHaveCount(1);
  await expect(page.locator('[name="inventoryKey"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('commerce overview uses actual period reports, ranked products and keyboard-readable charts', async ({ page, request }) => {
  const { randomUUID } = await import('node:crypto');
  const { commerceOrigin, customer } = await import('./fixtures');
  for (let index = 0; index < 2; index++) {
    const created = await request.post(commerceOrigin + '/api/orders', {
      headers: { origin: commerceOrigin, 'x-csrf-protection': '1' },
      data: { customer, items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID() },
    });
    expect(created.status()).toBe(201);
  }
  await login(page);
  await expect(page.getByRole('heading', { name: 'Sales overview', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Most ordered products', exact: true })).toBeVisible();
  await expect(page.locator('.commerce-products')).toContainText('Synthetic care product');
  await expect(page.locator('.commerce-products')).toContainText('2 units ordered');
  await expect(page.getByRole('heading', { name: 'System health', exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Report period', exact: true }).selectOption('7');
  await expect(page).toHaveURL(adminOrigin + '/admin?days=7');
  await streamSettled(page);
  await expect(page.getByRole('combobox', { name: 'Report period', exact: true })).toHaveValue('7');
  const chart = page.getByRole('group', { name: /^Daily order chart/ });
  await chart.focus(); await page.keyboard.press('End');
  await expect(page.locator('.commerce-chart__tooltip')).toContainText('AED');
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Line', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Orders', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orders', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('almina-orders-7-days.csv');
  await page.reload(); await streamSettled(page);
  await expect(page.locator('.commerce-products')).toContainText('2 units ordered');
});
