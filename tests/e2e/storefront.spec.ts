import { test, expect } from './fixtures';

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
