import { test, expect, reset, login, streamSettled, adminOrigin, productId } from './fixtures';

test.beforeEach(async ({ request }) => { await reset(request); });

test('inventory search and view tabs preserve search scope across navigation and reload', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Quick search', exact: true }).click();
  const search = page.getByRole('dialog', { name: 'Quick search', exact: true }).getByRole('textbox', { name: 'Quick search', exact: true });
  await search.fill('Synthetic');
  await search.press('Enter');
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
  const actions = page.getByRole('menu');
  await expect(actions.getByRole('menuitem', { name: 'Edit product', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(actions).toBeHidden();
  await expect(more).toBeFocused();
});

for (const width of [360, 390, 768, 1440]) test(`product editor preserves edits when extra fields close and reopen at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await login(page);
  await page.goto(`${adminOrigin}/admin/products/${productId}`);
  await streamSettled(page);
  const extra = page.locator('summary').filter({ hasText: 'More details' });
  await expect(extra).toBeVisible();
  const name = page.getByRole('textbox', { name: 'Product name', exact: true });
  await name.fill('Unsaved synthetic edit');
  await expect(page.getByRole('spinbutton', { name: 'Price (AED)', exact: true })).toBeVisible();
  await extra.focus();
  await page.keyboard.press('Enter');
  const family = page.getByRole('textbox', { name: 'Product family key (optional)', exact: true });
  await expect(family).toBeVisible();
  await family.fill('unsaved-family');
  await extra.click();
  await expect(family).toBeHidden();
  await expect(name).toHaveValue('Unsaved synthetic edit');
  await extra.click();
  await expect(family).toHaveValue('unsaved-family');
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
  const salesHeading = page.getByRole('heading', { name: 'Sales overview', exact: true });
  const rankedHeading = page.getByRole('heading', { name: 'Most ordered products', exact: true });
  await expect(salesHeading).toBeVisible();
  await expect(rankedHeading).toBeVisible();
  const sales = salesHeading.locator('xpath=ancestor::section[1]');
  const ranked = rankedHeading.locator('xpath=ancestor::section[1]');
  await expect(ranked).toContainText('Synthetic care product');
  await expect(ranked).toContainText('2 units ordered');
  await expect(page.getByRole('heading', { name: 'System health', exact: true })).toHaveCount(0);
  const period = page.getByRole('combobox', { name: 'Report period', exact: true });
  await period.click();
  await page.getByRole('option', { name: 'Last 7 days', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin?days=7');
  await streamSettled(page);
  await expect(period).toContainText('Last 7 days');
  const chart = sales.getByRole('application');
  await chart.focus();
  await page.keyboard.press('ArrowRight');
  await expect(sales.locator('.recharts-tooltip-wrapper')).toContainText('AED');
  await page.getByRole('button', { name: 'Line', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Line', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Orders', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Orders', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('almina-orders-7-days.csv');
  await page.reload(); await streamSettled(page);
  await expect(ranked).toContainText('2 units ordered');
});
