import { test, expect, productId } from './fixtures';

const publicPages = [
  '/about', '/contact', '/shipping', '/returns', '/privacy', '/terms', '/ras-al-khaimah',
  '/categories', '/brands', '/collections/skin-essentials', '/health-guides', '/foundation/status', '/unsubscribe',
];

for (const locale of ['en', 'ar'] as const) {
  const ar = locale === 'ar';
  test(`${locale} customer information routes use the shared storefront layout`, async ({ page, context }) => {
    test.setTimeout(90000);
    await context.addCookies([{ name: 'almina_lang', value: locale, url: 'http://127.0.0.1:4710' }]);
    await page.setViewportSize({ width: 390, height: 840 });
    for (const path of publicPages) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      const surface = page.locator('main [data-storefront-information]');
      await expect(surface).toHaveAttribute('dir', ar ? 'rtl' : 'ltr');
      await expect(surface.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(surface).toHaveCSS('background-color', 'rgb(250, 251, 251)');
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(390);
      if (ar && ['/shipping', '/returns', '/privacy', '/terms'].includes(path)) {
        await expect(surface.locator('article')).toHaveAttribute('lang', 'en');
        await expect(surface.getByText('النص المنشور لهذه السياسة باللغة الإنجليزية.')).toBeVisible();
      }
    }

    await page.goto('/contact#delivery');
    const link = page.getByRole('link', { name: ar ? 'راجع سلتك' : 'Review your cart', exact: true });
    await link.focus();
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 840 });
      await expect(link).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await link.press('Enter');
    await expect(page).toHaveURL(/\/cart$/);
  });

  test(`${locale} saved products distinguish a fetch failure from an empty list and retry`, async ({ page, context }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: 'http://127.0.0.1:4710' }]);
    await page.setViewportSize({ width: 320, height: 780 });
    await page.addInitScript(id => {
      if (localStorage.getItem('almina.saved-products.v1') === null) {
        localStorage.setItem('almina.saved-products.v1', JSON.stringify([id]));
      }
    }, productId);
    let available = false;
    await page.route('**/api/saved-products', route => available ? route.fallback() : route.fulfill({ status: 503, json: {} }));
    await page.goto('/saved');

    const surface = page.locator('main');
    const empty = surface.getByRole('heading', { name: ar ? 'لا توجد منتجات محفوظة بعد' : 'No saved products yet' });
    await expect(surface.getByRole('alert')).toHaveText(ar ? 'تعذّر تحميل المنتجات المحفوظة' : 'Saved products could not load');
    await expect(empty).toHaveCount(0);
    available = true;
    await surface.getByRole('button', { name: ar ? 'حاول مرة أخرى' : 'Try again', exact: true }).press('Enter');

    const product = surface.getByRole('article').filter({ hasText: 'Daily Care' });
    await expect(product).toBeVisible();
    const price = ar ? new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }).format(20) : 'AED 20.00';
    await expect(product.getByRole('img', { name: price })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await product.getByRole('button', { name: ar
      ? 'إزالة Daily Care من المنتجات المحفوظة'
      : 'Remove Daily Care from saved products', exact: true }).press('Enter');
    await expect(empty).toBeVisible();
    await page.reload();
    await expect(empty).toBeVisible();
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
  });
}

test('published editorial details preserve authored locales and canonical routes', async ({ page, request }) => {
  const fixture = 'http://127.0.0.1:4711/__fixture/home-campaigns';
  expect((await request.get(fixture + '?enabled=1')).ok()).toBe(true);
  try {
    await page.route(url => url.pathname === '/_next/image', route =>
      route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250"><rect width="600" height="250" fill="#ffe5e5"/></svg>' }));
    for (const [path, lang, title, body] of [
      ['/offers/fixture-hero', 'en', 'Fixture campaign', 'Synthetic campaign copy.'],
      ['/ar/offers/fixture-hero', 'ar', 'عرض تجريبي للصيدلية', 'محتوى تجريبي لهذا العرض.'],
    ] as const) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const surface = page.locator('main [data-storefront-information]');
      await expect(surface).toHaveAttribute('lang', lang);
      await expect(surface.getByRole('heading', { name: title, exact: true })).toBeVisible();
      await expect(surface.getByText(body, { exact: true })).toBeVisible();
      await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'http://127.0.0.1:4710' + path);
      await expect(page.locator('link[rel=alternate][hreflang="ar-AE"]')).toHaveAttribute('href', /\/ar\/offers\/fixture-hero$/);
    }
  } finally {
    expect((await request.get(fixture + '?enabled=0')).ok()).toBe(true);
  }
});

for (const locale of ['en', 'ar'] as const) {
  test(`${locale} retail styling and navigation remain scoped when visiting wholesale and staff routes in one tab`, async ({ page, context }) => {
    const ar = locale === 'ar';
    const local = 'http://127.0.0.1:4720';
    await context.addCookies([{ name: 'almina_lang', value: locale, url: local }]);
    await page.route('**/api/customer/me', route => route.fulfill({ status: 401, json: {} }));
    await page.route('**/api/customer/options', route => route.fulfill({ json: { data: { googleClientId: null, emailEnabled: true } } }));
    await page.setViewportSize({ width: 390, height: 840 });

    await page.goto(local + '/account');
    const retail = page.locator('main [data-storefront-information]');
    const email = page.locator('main input[type=email]');
    await expect(retail).toHaveAttribute('dir', ar ? 'rtl' : 'ltr');
    await email.focus();
    await expect(email).toBeFocused();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(email).toBeFocused();

    await page.goto(local + '/wholesale');
    await expect(retail).toHaveCount(0);
    await expect(page.locator('main input[type=email]')).toBeVisible();
    await expect(page.locator('main a[href="/checkout"]')).toHaveCount(0);
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
    expect(await page.locator('main').evaluate(el => getComputedStyle(el).getPropertyValue('--store-canvas'))).toBe('');

    const contact = page.getByRole('banner').getByRole('link', { name: ar ? 'تواصل مع الصيدلية' : 'Contact pharmacy' });
    await contact.press('Enter');
    await expect(page).toHaveURL(local + '/contact');
    await expect(retail).toHaveAttribute('dir', ar ? 'rtl' : 'ltr');

    await page.goto(local + '/admin/login');
    await expect(retail).toHaveCount(0);
    await expect(page.locator('input[name=username]')).toBeVisible();
    await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
    await page.goBack();
    await expect(retail).toHaveAttribute('dir', ar ? 'rtl' : 'ltr');
    await page.reload();
    await expect(retail.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  });
}
