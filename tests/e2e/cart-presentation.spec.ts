import { checkoutOrigin, commerceOrigin, expect, productId, reset, test } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  const ar = locale === 'ar';

  test(`${locale} cart gives quantities and estimates one responsive continuation`, async ({ page, context }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: checkoutOrigin }]);
    await page.setViewportSize({ width: 390, height: 720 });
    await page.addInitScript(id => localStorage.setItem('almina.cart.v1', JSON.stringify([
      { id, quantity: 2, price: 0 },
    ])), productId);
    await page.goto(checkoutOrigin + '/cart');

    const action = page.getByRole('link', { name: ar ? 'المتابعة إلى الدفع' : 'Proceed to checkout', exact: true });
    await expect(action).toBeVisible();
    await expect(page.locator('main a[href="/checkout"]')).toHaveCount(1);
    const price = ar ? new Intl.NumberFormat('ar-AE', { style: 'currency', currency: 'AED' }).format(40) : 'AED 40.00';
    await expect(page.locator('.cart-line-total [role="img"]')).toHaveAccessibleName(price);
    await expect(page.locator('.cart-subtotal [role="img"]')).toHaveAccessibleName(price);
    await expect(page.locator('.cart-summary')).toContainText(ar ? 'رسوم التوصيل والضريبة والإجمالي' : 'delivery charges, VAT and your final total');
    const itemList = page.getByRole('region', { name: ar ? 'منتجاتك' : 'Your items', exact: true });
    await expect(itemList.getByRole('status').first()).toHaveText(ar ? 'منتج · عنصران' : '1 product · 2 items');

    const stepper = itemList.locator('[data-store-control="stepper"]');
    const decrease = stepper.getByRole('button').first();
    await decrease.click();
    await expect(stepper.locator('output')).toHaveText((1).toLocaleString(ar ? 'ar-AE' : 'en-AE'));
    await expect(decrease).toBeDisabled();
    await expect(decrease).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(decrease).toHaveCSS('border-top-width', '0px');

    const bar = page.locator('.cart-mobile-bar');
    await expect(bar).toHaveCSS('position', 'fixed');
    await expect.poll(() => bar.evaluate(element => {
      const shell = element.closest('.storefront-shell')!;
      return parseInt(getComputedStyle(shell).getPropertyValue('--cart-dock-clearance')) >= element.getBoundingClientRect().height;
    })).toBe(true);
    const finalLink = page.locator('.storefront-footer').getByRole('link', { name: ar ? 'العودة إلى الأعلى' : 'Back to top' });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await finalLink.focus();
    expect((await finalLink.boundingBox())!.y + (await finalLink.boundingBox())!.height).toBeLessThanOrEqual((await bar.boundingBox())!.y);

    await action.focus();
    for (const [width, height, position] of [[667, 375, 'static'], [768, 1024, 'static'], [1440, 900, 'static'], [320, 740, 'fixed']] as const) {
      await page.setViewportSize({ width, height });
      await expect(bar).toHaveCSS('position', position);
      await expect(action).toBeFocused();
      await expect(action).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }

    await action.press('Enter');
    await expect(page).toHaveURL(checkoutOrigin + '/checkout');
    await expect(page.locator('.checkout-flow')).toBeVisible();
  });
}

test('empty cart recommendations exclude a newly added SKU and last-item removal restores keyboard focus', async ({ page }) => {
  await page.goto('/cart');
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  const recommendations = page.locator('main').getByRole('heading', { name: 'Explore more products' }).locator('..');
  const recommendedProduct = recommendations.getByRole('link', { name: 'Daily Care', exact: true });
  await expect(recommendedProduct).toBeVisible();
  await page.evaluate(id => {
    localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 1 }]));
    window.dispatchEvent(new Event('almina-cart-change'));
  }, productId);
  const remove = page.getByRole('button', { name: 'Remove Daily Care from cart' });
  await expect(remove).toBeVisible();
  await expect(recommendedProduct).toHaveCount(0);
  await remove.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeFocused();
  await expect(page.locator('[data-cart-next]')).toHaveCount(0);
  await expect(recommendedProduct).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
});

test('missing and out-of-stock items stay distinct from a cart read outage', async ({ page, request }) => {
  const fixture = 'http://127.0.0.1:4711';
  const missing = 'eeeeeeeeeeeeeeeeeeeeeeee';
  await page.addInitScript(({ id, missingId }) => localStorage.setItem('almina.cart.v1', JSON.stringify([
    { id, quantity: 5 },
    { id: missingId, quantity: 1 },
  ])), { id: productId, missingId: missing });
  await page.goto('/cart');
  await expect(page.locator('.cart-item').getByText('This quantity is no longer available.')).toHaveCount(1);
  await expect(page.locator('.cart-item').getByText('Unavailable product', { exact: true })).toBeVisible();
  await expect(page.locator('.cart-subtotal')).toHaveText('Unavailable');
  await expect(page.getByRole('link', { name: 'Ordering information' })).toBeVisible();

  expect((await request.get(fixture + '/__fixture/failure')).ok()).toBe(true);
  try {
    await page.reload();
    const alert = page.getByRole('alert').filter({ hasText: 'Unable to check your cart.' });
    await expect(alert).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toHaveCount(0);
    await expect(page.locator('[data-cart-next]')).toHaveCount(0);
  } finally {
    expect((await request.get(fixture + '/__fixture/failure')).ok()).toBe(true);
  }
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.cart-item')).toHaveCount(2);
  await expect(page.getByRole('status').filter({ hasText: '2 products · 6 items' })).toBeVisible();
  await expect(page.locator('.cart-subtotal')).toHaveText('Unavailable');
});

test('cart preserves the selected SKU, option label and pack price without starting an order', async ({ page, request }) => {
  await reset(request);
  expect((await request.post(commerceOrigin + '/__fixture/families')).ok()).toBe(true);
  await page.addInitScript(() => localStorage.setItem('almina.cart.v1', JSON.stringify([
    { id: 'ccccccccccccccccccccccc3', quantity: 2 },
  ])));
  await page.goto(checkoutOrigin + '/cart');
  const line = page.locator('.cart-item');
  await expect(line.getByRole('link', { name: 'Synthetic family', exact: true })).toHaveAttribute('href', /--PD8003$/);
  await expect(line.getByText('Size: Large · Flavour: Chocolate', { exact: true })).toBeVisible();
  await expect(line.locator('.cart-unit-price [role="img"]')).toHaveAccessibleName('AED 35.00');
  await expect(line.locator('.cart-line-total [role="img"]')).toHaveAccessibleName('AED 70.00');
});

test('removing a line keeps the cart visible during refresh and hands focus to its neighbor', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 720 });
  await page.addInitScript(id => localStorage.setItem('almina.cart.v1', JSON.stringify([
    { id, quantity: 1 },
    { id: 'eeeeeeeeeeeeeeeeeeeeeeee', quantity: 1 },
  ])), productId);
  await page.goto('/cart');
  const lines = page.locator('.cart-item');
  await expect(lines).toHaveCount(2);

  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/cart', async route => {
    if (route.request().method() === 'POST') await gate;
    await route.continue();
  });
  try {
    await lines.first().getByRole('button', { name: 'Remove Daily Care from cart' }).press('Enter');
    await expect(lines).toHaveCount(2);
    await expect(page.getByRole('status').filter({ hasText: /updating/i })).toBeVisible();
  } finally {
    release();
  }
  await expect(lines).toHaveCount(1);
  await expect(lines.getByRole('button', { name: /remove/i })).toBeFocused();
});
