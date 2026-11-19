import { test, expect, checkoutOrigin, commerceOrigin, reset } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  const ar = locale === 'ar';
  test(`catalogue cards preserve content, currency, saved state and targets in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: baseURL! }]);
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/products');
    const card = page.locator('.product-card').filter({ has: page.getByRole('heading', { name: 'Daily Care', exact: true }) });
    const save = card.getByRole('button', { name: ar ? 'حفظ Daily Care' : 'Save Daily Care', exact: true });
    const add = card.getByRole('button', { name: ar ? 'أضف إلى السلة: Daily Care' : 'Add to cart: Daily Care', exact: true });
    await expect(add).toHaveCSS('border-radius', '10px');
    await expect(card.locator('.product-stock')).toHaveText(ar ? 'متوفر' : 'In stock');
    await expect(card.locator('.currency-visual')).toHaveCount(2);
    await expect(card.locator('.currency-visual').first()).toHaveAttribute('dir', 'ltr');
    await expect(card.locator('del')).toHaveCount(1);
    const unavailable = page.locator('.product-card').filter({ has: page.getByRole('heading', { name: 'Synthetic paged product 0', exact: true }) });
    await expect(unavailable.locator('.product-stock')).toHaveAttribute('data-stock', 'unavailable');
    await expect(unavailable.getByRole('button').last()).toBeDisabled();
    await expect(unavailable.locator('del')).toHaveCount(0);

    for (const width of [320, 390, 600, 768, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      for (const control of [save, add]) {
        const box = await control.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
    }
    const before = await card.boundingBox();
    await save.click();
    const remove = card.getByRole('button', { name: ar ? 'إزالة Daily Care من المنتجات المحفوظة' : 'Remove Daily Care from saved products' });
    await expect(remove).toHaveAttribute('aria-pressed', 'true');
    await expect(remove).toHaveCSS('background-color', 'rgb(255, 242, 243)');
    await add.click();
    await expect(add.locator('.card-cart-count')).toHaveText(ar ? '١' : '1');
    expect((await card.boundingBox())!.height).toBe(before!.height);
    await page.reload();
    await expect(add.locator('.card-cart-count')).toHaveText(ar ? '١' : '1');
    await expect(remove).toHaveAttribute('aria-pressed', 'true');
    await remove.click();
    await expect(save).toHaveAttribute('aria-pressed', 'false');
  });
}

test('grouped cards show the included pack price and preserve the exact SKU option link', async ({ page, request }) => {
  await reset(request);
  expect((await request.post(commerceOrigin + '/__fixture/families')).ok()).toBeTruthy();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(checkoutOrigin + '/products');
  const family = page.locator('.product-card').filter({ has: page.getByRole('link', { name: 'Choose options', exact: true }) });
  await expect(family.locator('.product-card-tags')).toContainText('Small');
  await expect(family.getByText('Price varies by option', { exact: true })).toBeVisible();
  await expect(family.getByRole('img', { name: 'AED 30.00' })).toBeVisible();
  await expect(family.getByRole('button', { name: /Add to cart/ })).toHaveCount(0);
  await expect(family.getByRole('link', { name: 'Choose options' })).toHaveAttribute('href', /--PD8001$/);
  const noPhoto = page.locator('.product-card').filter({ has: page.getByRole('heading', { name: 'Synthetic medicine 20mg', exact: true }) });
  await expect(noPhoto.getByText('Photo coming soon', { exact: true })).toBeVisible();
});

test('mixed-script identities, zero sale, long prices and failed images fit narrow cards', async ({ page }) => {
  const name = 'Synthetic Card sample تركيبة EXTRAORDINARILYLONGUNBROKENPACKNAME 500mg / 5 ml';
  await page.route(url => (url.searchParams.get('url') ?? url.pathname).endsWith('/fixture.svg'),
    route => route.fulfill({ status: 404 }));
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/search?q=Card+sample');
  const longName = page.getByRole('heading', { name, exact: true });
  await expect(longName).toContainText(/500mg \/ 5 ml/);
  const sale = page.locator('.product-card').filter({ has: longName });
  await expect(sale.getByRole('img', { name: 'AED 0.00', exact: true })).toBeVisible();
  await expect(sale.locator('del').getByRole('img')).toHaveAccessibleName('AED 123456.78');
  const expensive = page.locator('.product-card').filter({ has: page.getByRole('heading', { name: 'Synthetic Card sample 64 ml' }) });
  await expect(expensive.locator('.product-card-tags')).toContainText('64 ml');
  await expect(expensive.getByRole('img', { name: 'AED 987654.32' })).toBeVisible();
  await expect(expensive.getByText('Photo coming soon', { exact: true })).toBeVisible();
  for (const card of [sale, expensive]) {
    const bounds = (await card.boundingBox())!;
    for (const item of await card.locator('.currency-amount, .add-to-cart').all()) {
      const box = (await item.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x);
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

test('the recently viewed rail uses the exact product and can be cleared', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products/daily-care--PD0001');
  await page.waitForFunction(() => localStorage.getItem('almina.recent-products.v1')?.includes('bbbbbbbbbbbbbbbbbbbbbbbb'));
  await page.goto('/');
  const heading = page.getByRole('heading', { name: 'Pick up where you left off', exact: true });
  await expect(heading).toBeVisible();
  await expect(page.getByRole('link', { name: /Daily Care In stock AED 20.00/ })).toHaveAttribute('href', '/products/daily-care--PD0001');
  await page.getByRole('button', { name: 'Clear history', exact: true }).click();
  await expect(heading).toHaveCount(0);
  await page.reload();
  await expect(heading).toHaveCount(0);
});
