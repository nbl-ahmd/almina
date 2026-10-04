import { test, expect } from './fixtures';
test('Next category preserves legacy IDs and provides keyboard pagination with reload and empty search', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/categories/aaaaaaaaaaaaaaaaaaaaaaaa?utm_source=shared');
  await expect(page).toHaveURL('/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa?utm_source=shared');
  await expect(page.getByRole('heading', { name: 'Synthetic paged product 28', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Next page', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Synthetic paged product 34', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Next page', exact: true })).toHaveCount(0);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Synthetic paged product 34', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Previous page', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Daily Care', exact: true })).toBeVisible();
  await page.goto('/search?q=No-synthetic-match'); await expect(page.getByRole('heading', { name: 'No products found.', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe('intentional server outage', () => {
  test.use({ expectedReactBoundaryFailure: true });
test('Next catalog outage renders its error boundary and keyboard retry recovers without empty success', async ({ page, request }) => {
  const fixture = 'http://127.0.0.1:4711';
  expect((await request.get(fixture + '/__fixture/failure')).status()).toBe(200);
  try {
    await page.goto('/products?page=2');
    await expect(page.getByRole('heading', { name: 'Unable to load this page', exact: true })).toBeVisible();
  } finally { expect((await request.get(fixture + '/__fixture/failure')).status()).toBe(200); }
  await page.getByRole('button', { name: 'Try again', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Synthetic paged product 34', exact: true })).toBeVisible();
});
});

for (const [path, content] of [['/', 'Featured products'], ['/search?q=Daily', 'Daily Care'],
  ['/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa', 'Daily Care'], ['/products/daily-care--PD0001', 'Daily care product description.']]) {
  test(`storefront renders and reloads ${path}`, async ({ page }) => {
    await page.goto(path!);
    await expect(page.locator('main')).toContainText(content!);
    await page.reload();
    await expect(page.locator('main')).toContainText(content!);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
}
test('add to cart, authoritative price, stock limit and persistence work on desktop and mobile', async ({ page }) => {
  await page.goto('/products/daily-care--PD0001');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(page.locator('main')).toContainText('Added to cart.');
  await page.goto('/cart');
  await expect(page.locator('main')).toContainText('AED 20.00 per item');
  for (let quantity = 2; quantity <= 4; quantity++) {
    await page.getByRole('button', { name: 'Increase Daily Care quantity' }).click();
    await expect(page.locator('.quantity')).toHaveText(String(quantity));
  }
  await page.getByRole('button', { name: 'Increase Daily Care quantity' }).click();
  await expect(page.locator('main')).toContainText('Stock is low.');
  await expect(page.locator('.quantity')).toHaveText('4');
  await page.reload();
  await expect(page.locator('.quantity')).toHaveText('4');
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.goto('/checkout');
  await expect(page.locator('main')).toContainText('Ordering is not available in this preview.');
});
