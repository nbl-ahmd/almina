import { test, expect, commerceOrigin } from './fixtures';
test('retained category caller pages explicitly and supports loading, retry and keyboard load-more', async ({ page }) => {
  let failNextPage = true;
  const category = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Synthetic category' };
  await page.route(commerceOrigin + '/api/products?**', async route => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('limit')).toBe('30');
    const offset = Number(url.searchParams.get('offset'));
    if (offset === 30 && failNextPage) { failNextPage = false; await route.fulfill({ status: 503, json: { error: 'Synthetic outage' } }); return; }
    const products = Array.from({ length: offset === 0 ? 30 : 5 }, (_, index) => ({ _id: (offset + index + 1).toString(16).padStart(24, '0'),
      product_id: `SYNTHETIC_${offset + index}`, name: `Synthetic paged product ${offset + index}`, category, price: 1, stock: 0, images: ['synthetic.webp'] }));
    await route.fulfill({ json: products });
  });
  await page.route(commerceOrigin + '/api/products/images/synthetic.webp', route => route.fulfill({ contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#eee"/></svg>' }));
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(commerceOrigin + '/categories/' + category._id);
  await expect(page.getByRole('heading', { name: 'synthetic paged product 29', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load more products', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('Products could not be loaded.');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'synthetic paged product 34', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load more products', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
