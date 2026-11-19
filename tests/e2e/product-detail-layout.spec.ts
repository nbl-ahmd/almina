import { test, expect } from './fixtures';

const direct = '/products/daily-care--PD0001';

for (const locale of ['en', 'ar'] as const) {
  const ar = locale === 'ar';
  test(`image-first product detail, desktop resize and measured dock clearance in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: baseURL! }]);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(direct);
    const gallery = page.locator('.gallery-image');
    const overlay = page.locator('.pdp-mobile-toolbar');
    const back = overlay.getByRole('link', { name: ar ? 'العودة إلى الفئة' : 'Back to category' });
    const dock = page.locator('.pdp-purchase');
    const header = page.locator('[data-storefront-chrome="header"]');
    const footerLink = page.locator('footer a[href="#top"]');
    await expect(back).toHaveAttribute('href', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa');
    await expect(page.getByRole('group', { name: ar ? 'صور المنتج' : 'Product photos' })).toHaveCount(0);

    for (const [width, height] of [[320, 740], [390, 844], [667, 375], [768, 1024], [1440, 900], [390, 844]] as const) {
      await page.setViewportSize({ width, height });
      if (width < 768) {
        await expect(header).toBeHidden();
        const image = (await gallery.boundingBox())!;
        expect(image.x).toBe(0);
        expect(image.width).toBe(width);
        for (const control of await overlay.locator('a, button').all()) {
          const box = (await control.boundingBox())!;
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.y).toBeGreaterThanOrEqual(image.y);
          expect(box.y + box.height).toBeLessThan(image.y + image.height);
        }
      } else {
        await expect(header).toBeVisible();
        await expect(overlay).toBeHidden();
      }
      await expect(dock).toHaveCSS('position', width < 768 && height > 500 ? 'fixed' : 'static');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await footerLink.focus();
    await expect(footerLink).toBeFocused();
    await expect.poll(async () => {
      const [last, fixed] = await Promise.all([footerLink.boundingBox(), dock.boundingBox()]);
      return last!.y + last!.height <= fixed!.y;
    }).toBe(true);

    const quantity = dock.getByRole('spinbutton', { name: ar ? 'الكمية' : 'Quantity', exact: true });
    await quantity.fill('2.9');
    await expect(quantity).toHaveValue('2');
    await expect(dock.getByText(ar ? 'سعر الوحدة' : 'Unit price', { exact: true })).toBeVisible();
    await expect(dock.getByRole('img')).toHaveCount(1);
  });
}

test('only actual photos get selectors and a failing gallery photo has a localized fallback', async ({ page }) => {
  await page.route(url => (url.searchParams.get('url') ?? url.pathname).endsWith('/fixture-back.svg'),
    route => route.fulfill({ status: 404 }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products/synthetic-paged-product-0--SYNTHETIC_0');
  const gallery = page.getByRole('group', { name: 'Product photos', exact: true });
  const images = gallery.getByRole('button');
  await expect(images).toHaveCount(2);
  await expect(gallery).toHaveCSS('scrollbar-width', 'none');
  const related = page.locator('.related-product-list');
  await expect(related.locator('.related-product-row')).toHaveCount(4);
  expect(await related.evaluate(rail => rail.scrollWidth > rail.clientWidth)).toBe(true);
  await expect(related).toHaveCSS('scrollbar-width', 'none');
  const lastRelatedLink = related.getByRole('link').last();
  await lastRelatedLink.focus();
  await expect(lastRelatedLink).toBeFocused();
  await expect.poll(() => related.evaluate(rail => rail.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(images.first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Next product photo', exact: true }).click();
  await expect(images.last()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Product photo unavailable.', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await images.first().press('Enter');
  await expect(images.first()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gallery-image')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Out of stock: Synthetic paged product 0', exact: true })).toBeDisabled();
});
