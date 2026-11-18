import { test, expect } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  const ar = locale === 'ar';

  test(`listing toolbar lines up, preserves keyboard focus and fits while resizing in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: baseURL! }]);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/search?q=Daily&minPrice=5&sort=price-desc');
    const panel = page.locator('#catalog-filters');
    const summary = panel.locator(':scope > summary');
    const sort = page.getByRole('combobox', { name: ar ? 'ترتيب حسب' : 'Sort by', exact: true });
    const clear = page.getByRole('navigation', { name: ar ? 'عوامل التصفية المطبقة' : 'Applied filters' }).getByRole('link');
    await expect(clear).toHaveCount(1);
    await expect(page.locator('main h1')).toContainText('Daily');
    await expect(sort).toHaveValue('price-desc');
    const [disclosure, select] = await Promise.all([summary.boundingBox(), sort.boundingBox()]);
    expect(disclosure?.y).toBe(select?.y);
    for (const box of [disclosure, select]) expect(box!.height).toBeGreaterThanOrEqual(44);

    await summary.focus();
    await page.keyboard.press('Space');
    const query = panel.getByRole('searchbox');
    await expect(query).toHaveValue('Daily');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(summary).toBeHidden();
    await expect(query).toBeFocused();
    await page.setViewportSize({ width: 667, height: 375 });
    await expect(summary).toBeFocused();
    await expect(query).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(667);
    await clear.click();
    await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ q: 'Daily', sort: 'price-desc' });
    await expect(page.locator('.product-card').first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: ar ? 'صفحات المنتجات' : 'Product pages' })).toHaveCount(0);
  });

  test(`search loading, empty and unavailable give distinct feedback in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: baseURL! }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/search?q=slow+fixture', { waitUntil: 'commit' });
    await expect(page.getByRole('status').filter({ hasText: ar ? 'جارٍ تحميل المنتجات' : 'Loading products' })).toBeVisible();
    const empty = page.getByRole('heading', { name: ar ? 'لم نعثر على منتجات مطابقة' : 'No matching products', exact: true });
    await expect(empty).toBeVisible();
    await expect(page.getByRole('navigation', { name: ar ? 'اقتراحات ذات صلة' : 'Related suggestions' })).toBeVisible();

    await page.goto('/search?q=unavailable&sort=price-desc');
    await expect(page.getByRole('heading', { name: ar ? 'البحث غير متاح مؤقتاً' : 'Search is temporarily unavailable', exact: true })).toBeVisible();
    await expect(empty).toHaveCount(0);
    await expect(page.getByRole('link', { name: ar ? 'حاول مرة أخرى' : 'Try again', exact: true }))
      .toHaveAttribute('href', '?q=unavailable&sort=price-desc');
  });
}

test('search page links retain the requested refinements and allow recovery from an empty page', async ({ page }) => {
  const original = { q: 'Synthetic paged product', maxPrice: '25', sort: 'price-asc', literal: 'true', form: 'cream' };
  await page.goto('/search?' + new URLSearchParams(original));
  const pagination = page.getByRole('navigation', { name: 'Product pages' });
  await expect(pagination.getByText('Page 1', { exact: true })).toHaveAttribute('aria-current', 'page');
  await pagination.getByRole('link', { name: 'Next page', exact: true }).click();
  await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ ...original, page: '2' });
  await expect(page.locator('.product-card')).toHaveCount(5);
  await expect(pagination.getByRole('link', { name: 'Next page', exact: true })).toHaveCount(0);
  await page.goto('/search?' + new URLSearchParams({ ...original, page: '3' }));
  await expect(page.getByRole('heading', { name: 'No matching products' })).toBeVisible();
  await pagination.getByRole('link', { name: 'Previous page', exact: true }).click();
  await expect(page.locator('.product-card')).toHaveCount(5);
});

test('a partial search outage leaves the exact identifier fallback available', async ({ page }) => {
  await page.goto('/search?q=PD0001');
  await expect(page.getByRole('status').filter({ hasText: 'Some search results may be unavailable.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Daily Care', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Search is temporarily unavailable', exact: true })).toHaveCount(0);
});

test('a phone filter opened before the client loads stays open after hydration', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const scripts = Promise.withResolvers<void>();
  await page.route('**/_next/static/**/*.js', async route => {
    await scripts.promise;
    await route.continue();
  });
  const panel = page.locator('#catalog-filters');
  try {
    await page.goto('/search?q=Daily', { waitUntil: 'commit' });
    await panel.locator(':scope > summary').click();
    await expect(panel).toHaveAttribute('open', '');
  } finally {
    scripts.resolve();
  }
  await page.waitForLoadState('load');
  await page.getByRole('button', { name: 'Choose delivery area', exact: true }).click();
  const location = page.getByRole('dialog');
  await expect(location).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(location).toBeHidden();
  await expect(panel.getByRole('searchbox')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(panel).toHaveAttribute('data-desktop', '');
  await expect(panel.getByRole('searchbox')).toBeVisible();
});
