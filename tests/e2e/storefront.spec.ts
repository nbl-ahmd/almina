import { test, expect } from './fixtures';

test('redesigned purchase stepper clamps stock and the header reflects the saved cart', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/products/daily-care--PD0001');
  const quantity = page.getByRole('spinbutton', { name: 'Quantity', exact: true });
  const increase = page.getByRole('button', { name: 'Increase purchase quantity', exact: true });
  const decrease = page.getByRole('button', { name: 'Decrease purchase quantity', exact: true });
  await expect(decrease).toBeDisabled();
  await increase.click(); await expect(quantity).toHaveValue('2');
  await decrease.click(); await expect(quantity).toHaveValue('1');
  await quantity.fill('999'); await quantity.blur();
  await expect(quantity).toHaveValue('4'); await expect(increase).toBeDisabled();
  await page.getByRole('button', { name: 'Add to cart: Daily Care', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Your cart, 4 items', exact: true }).and(page.locator('.mobile-tab'))).toHaveCount(1);
  await page.reload(); await expect(page.getByRole('link', { name: 'Your cart, 4 items', exact: true }).and(page.locator('.mobile-tab'))).toHaveCount(1);
  await page.getByRole('link',{name:'View your cart',exact:true}).click();
  await expect(page.locator('.quantity')).toHaveText('4');
  await page.getByRole('button', { name: 'Remove Daily Care from cart' }).click();
  await expect(page.getByRole('heading', { name: 'A little room for your everyday essentials.' })).toBeVisible();
  await expect(page.getByRole('link',{name:'Cart',exact:true}).and(page.locator('.mobile-tab'))).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'Cart',exact:true})).toBeVisible();
});

test('mobile catalog exposes filters on demand and preserves applied search', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/products');
  const panel = page.getByRole('dialog',{name:'Filters',exact:true});
  await expect(panel).toBeHidden();
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await panel.getByRole('searchbox', { name: 'Search products' }).fill('Daily');
  await panel.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page).toHaveURL(/q=Daily/);
  await expect(page.getByRole('heading', { name: 'Daily Care', exact: true })).toBeVisible();
  await expect(panel).toBeHidden();
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await expect(page.getByRole('search', { name: 'Filter products' }).getByRole('searchbox')).toHaveValue('Daily');
  await page.reload();
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await expect(page.getByRole('search', { name: 'Filter products' }).getByRole('searchbox')).toHaveValue('Daily');
});

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
  await page.goto('/search?q=' + 'A'.repeat(100));
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  const filter = page.getByRole('search', { name: 'Filter products' });
  await expect(filter.getByRole('searchbox', { name: 'Search products' })).toHaveAttribute('maxlength', '80');
  await expect(filter.getByRole('searchbox', { name: 'Search products' })).toHaveValue('A'.repeat(80));
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await filter.getByRole('link', { name: 'Clear filters' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Daily Care', exact: true })).toBeVisible();
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await expect(filter.getByRole('searchbox', { name: 'Search products' })).toHaveValue('');
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

for (const [path, content] of [['/', 'Your everyday essentials'], ['/search?q=Daily', 'Daily Care'],
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
  await page.locator('.pdp-purchase').getByRole('button', { name: 'Add to cart: Daily Care', exact: true }).click();
  await expect(page.locator('main')).toContainText('Added to cart.');
  // The add button turns into the way forward instead of a second button appearing next to it.
  await expect(page.locator('.pdp-purchase').getByRole('button', { name: 'Add to cart: Daily Care', exact: true })).toHaveCount(0);
  await expect(page.locator('.pdp-purchase').getByRole('link', { name: 'View cart', exact: true })).toHaveCount(0);
  const goToCart = page.locator('.pdp-purchase').getByRole('link', { name: 'Go to cart: Daily Care', exact: true });
  await expect(goToCart).toHaveAttribute('href', '/cart');
  await expect(page.locator('.pdp-purchase').getByRole('link', { name: 'Checkout', exact: true })).toHaveAttribute('href', '/checkout');
  // Wanting more means the button goes back to adding.
  await page.getByRole('button', { name: 'Increase purchase quantity', exact: true }).click();
  await expect(page.locator('.pdp-purchase').getByRole('button', { name: 'Add to cart: Daily Care', exact: true })).toBeVisible();
  await page.goto('/cart');
  // Amounts show the dirham mark visually; the spoken alternative keeps the full AED value.
  await expect(page.locator('.cart-unit-price .sr-only').first()).toHaveText('AED 20.00');
  await expect(page.locator('.cart-unit-price').first()).toContainText('per item');
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
