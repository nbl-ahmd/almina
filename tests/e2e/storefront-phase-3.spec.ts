import { test, expect } from './fixtures';

const origin = 'http://127.0.0.1:4710';

for (const locale of ['en', 'ar'] as const) {
  test(`${locale} search to product and Back preserves result URL and scroll`, async ({ context, page }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: origin }]);
    await page.setViewportSize({ width: 390, height: 520 });
    const savedRequest = () => page.waitForResponse(response => new URL(response.url()).pathname === '/api/customer/saved');
    await Promise.all([savedRequest(), page.goto('/')]);
    const search = page.locator('[data-slot=header-search-input]');
    await search.fill('Daily');
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await Promise.all([savedRequest(), search.press('Enter')]);
    await expect(page).toHaveURL(/\/search\?q=Daily$/);
    await Promise.all([savedRequest(), page.reload()]);
    const result = page.locator('main .product-card-title a[href*="PD0001"]').first();
    await result.scrollIntoViewIfNeeded();
    const previousScroll = await page.evaluate(() => scrollY);
    expect(previousScroll).toBeGreaterThan(0);
    await result.click();
    await expect(page.locator('.pdp-page')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?q=Daily$/);
    await expect(result).toBeVisible();
    await expect.poll(() => page.evaluate(expected => Math.abs(scrollY - expected), previousScroll)).toBeLessThan(40);
  });

  test(`${locale} resized shell keeps portals scoped and the final footer link above the mobile nav`, async ({ context, page }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: origin }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const header = page.locator('[data-storefront-chrome=header]');
    const category = header.locator('[data-department-trigger]');
    await category.click();
    const popover = header.locator('.storefront-mega-panel');
    await expect(popover).toBeVisible();
    await expect(popover).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(popover).toHaveCSS('direction', locale === 'ar' ? 'rtl' : 'ltr');
    await page.keyboard.press('Escape');
    await expect(category).toBeFocused();
    await category.click();
    await page.setViewportSize({ width: 667, height: 375 });
    await expect(popover).toBeHidden();

    const delivery = header.locator('[data-slot=delivery-selector]');
    await delivery.click();
    await expect(header.locator('.delivery-area-sheet')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(delivery).toBeFocused();
    const lastLink = page.locator('footer a[href="#top"]');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const link = await lastLink.boundingBox();
    const navigation = await header.locator('.mobile-nav').boundingBox();
    expect(link && navigation && link.y >= 0 && link.y + link.height <= navigation.y).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await lastLink.click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  });
}

test('Arabic missing routes retain the appropriate shell, localized recovery and 404 status', async ({ page, context }) => {
  await context.addCookies([{ name: 'almina_lang', value: 'ar', url: origin }]);
  for (const path of ['/missing-shell-check', '/products/missing-shell-check']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'الصفحة غير موجودة', exact: true })).toBeVisible();
    await expect(page.locator('main a[href="/"]')).toHaveText('العودة إلى الرئيسية');
    const scopedHeaders = page.locator('[data-storefront-chrome=header]');
    if (path.startsWith('/products/')) await expect(scopedHeaders).toHaveCount(1);
    else await expect(scopedHeaders).toHaveCount(0);
  }
});

test('Arabic catalogue recovery retries the same results page', async ({ page, context, request }) => {
  await context.addCookies([{ name: 'almina_lang', value: 'ar', url: origin }]);
  const fixture = 'http://127.0.0.1:4711/__fixture/failure';
  expect((await request.get(fixture)).ok()).toBe(true);
  try {
    await page.goto('/products?page=2');
    await expect(page.getByRole('heading', { name: 'تعذّر تحميل المنتجات', exact: true })).toBeVisible();
  } finally {
    expect((await request.get(fixture)).ok()).toBe(true);
  }
  await page.getByRole('link', { name: 'حاول مرة أخرى', exact: true }).press('Enter');
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole('heading', { name: 'Synthetic paged product 34', exact: true })).toBeVisible();
});
