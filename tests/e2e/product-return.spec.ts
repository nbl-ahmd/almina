import { test, expect, checkoutOrigin, commerceOrigin, reset } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  const ar = locale === 'ar';
  test(`product-page return restores the exact filtered results, position and focus in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: baseURL! }]);
    await page.setViewportSize({ width: ar ? 1440 : 390, height: 650 });
    const source = '/search?q=Synthetic+paged+product&minPrice=1&sort=price-asc&literal=true&page=1';
    await page.goto(source);
    const choice = page.locator('main a[data-product-entry="title"]').nth(12);
    const productHref = await choice.getAttribute('href');
    await choice.scrollIntoViewIfNeeded();
    await choice.focus();
    const y = await page.evaluate(() => scrollY);
    expect(y).toBeGreaterThan(250);
    await choice.press('Enter');
    await expect(page).toHaveURL(productHref!);
    const back = page.getByRole('link', { name: ar ? 'العودة إلى النتائج' : 'Back to results', exact: true });
    await expect(back).toHaveAttribute('href', source);
    await page.setViewportSize({ width: ar ? 390 : 1440, height: 650 });
    await expect(back).toBeVisible();
    await page.setViewportSize({ width: ar ? 1440 : 390, height: 650 });
    await back.press('Enter');
    await expect(page).toHaveURL(source);
    await expect(choice).toBeFocused();
    await expect.poll(() => page.evaluate(saved => Math.abs(scrollY - saved), y)).toBeLessThan(40);
    await page.goForward();
    await expect(page).toHaveURL(productHref!);
    await expect(back).toBeVisible();
  });
}

test('variant browsing keeps its ordinary history and can return to the originating category', async ({ page, request }) => {
  await reset(request);
  expect((await request.post(commerceOrigin + '/__fixture/families')).ok()).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  const source = checkoutOrigin + '/categories/synthetic-category--aaaaaaaaaaaaaaaaaaaaaaaa?sort=price-asc';
  await page.goto(source);
  const choice = page.getByRole('link', { name: 'Choose options', exact: true });
  await choice.click();
  await expect(page).toHaveURL(/--PD8001$/);
  const first = page.url();
  const options = page.getByRole('region', { name: 'Product options' });
  await options.getByRole('link', { name: 'Large Out of stock', exact: true }).click();
  await expect(page).toHaveURL(/--PD8002$/);
  await page.goBack();
  await expect(page).toHaveURL(first);
  await options.getByRole('link', { name: 'Large Out of stock', exact: true }).click();
  await options.getByRole('link', { name: 'Chocolate', exact: true }).click();
  await expect(page).toHaveURL(/--PD8003$/);
  await page.getByRole('link', { name: 'Back to results', exact: true }).click();
  await expect(page).toHaveURL(source);
  await expect(choice).toBeFocused();
});

test('direct product URLs and separate documents keep the category fallback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products/daily-care--PD0001?returnTo=https%3A%2F%2Fexample.invalid');
  const fallback = page.getByRole('link', { name: 'Back to category', exact: true });
  await expect(fallback).toHaveAttribute('href', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa');
  await expect(page.getByRole('link', { name: 'Back to results', exact: true })).toHaveCount(0);
  await page.goto('/products?sort=name');
  await page.getByRole('link', { name: 'Daily Care', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Back to results', exact: true })).toBeVisible();
  await page.reload();
  await expect(fallback).toBeVisible();
});

test('filtered search, saved state and stock-checked purchase survive the browse and cart journey', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const source = '/search?q=Daily&inStock=true&sort=price-asc';
  await page.goto(source);
  const choice = page.getByRole('link', { name: 'Daily Care', exact: true });
  await choice.click();
  await page.getByRole('link', { name: 'Back to results', exact: true }).click();
  await expect(page).toHaveURL(source);
  await expect(choice).toBeFocused();
  await choice.press('Enter');
  const overlay = page.locator('.pdp-mobile-toolbar');
  await overlay.getByRole('button', { name: 'Save Daily Care', exact: true }).click();
  await expect(overlay.getByRole('button', { name: 'Remove Daily Care from saved products', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Increase purchase quantity', exact: true }).click();
  await page.getByRole('button', { name: 'Add to cart: Daily Care', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Added to cart.' })).toBeVisible();
  await overlay.getByRole('link', { name: 'Your cart, 2 items', exact: true }).click();
  await expect(page.locator('.quantity')).toHaveText('2');
  await page.reload();
  await expect(page.locator('.quantity')).toHaveText('2');
});
