import { test, expect, checkoutOrigin, customer, productId, reset, state } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  test(`${locale} checkout moves one action between dock and summary without losing input or focus`, async ({ page, context, request }) => {
    await reset(request);
    const initial = await state(request);
    await page.setViewportSize({ width: 390, height: 820 });
    await context.addCookies([{ name: 'almina_lang', value: locale, url: checkoutOrigin }]);
    await page.addInitScript(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 2 }])), productId);
    await page.goto(checkoutOrigin + '/checkout');

    const action = page.locator('.checkout-flow button[form="checkout-details"]');
    const dock = page.locator('.checkout-mobile-action');
    const name = page.locator('[name=name]');
    await expect(action).toHaveCount(1);
    await expect(action).toHaveCSS('border-radius', '10px');
    await expect(dock).toHaveCSS('position', 'fixed');
    await expect.poll(() => dock.evaluate(element => {
      const shell = element.closest('.storefront-shell')!;
      const clearance = parseInt(getComputedStyle(shell).getPropertyValue('--checkout-dock-clearance'));
      return clearance >= element.getBoundingClientRect().height;
    })).toBe(true);
    await expect(name).toHaveCSS('border-radius', '10px');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `.verification-results/p5-02-${locale}-details-${page.context().browser()?.browserType().name()}.png` });
    await action.click();
    await expect(page.locator('.checkout-error-summary[role=alert]')).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');

    await name.focus();
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperty(viewport, 'height', { configurable: true, get: () => window.innerHeight / 2 });
      viewport.dispatchEvent(new Event('resize'));
    });
    await expect(page.locator('.checkout-flow')).toHaveAttribute('data-keyboard', 'true');
    await expect(name).toBeFocused();
    await expect(dock).toHaveCSS('position', 'static');
    await expect(page.locator('.storefront-shell')).toHaveCSS('--checkout-dock-clearance', '0px');
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Reflect.deleteProperty(viewport, 'height');
      viewport.dispatchEvent(new Event('resize'));
    });
    await expect(dock).toHaveCSS('position', 'fixed');

    for (const [field, value] of Object.entries(customer)) {
      if (field === 'payment') continue;
      const control = page.locator(`[name="${field}"]`);
      if (field === 'emirate') await control.selectOption(value);
      else await control.fill(value);
    }
    await action.focus();
    for (const [width, height, position] of [[320, 740, 'fixed'], [667, 375, 'static'], [768, 1024, 'fixed'], [1024, 900, 'static'], [1440, 900, 'static'], [390, 820, 'fixed']] as const) {
      await page.setViewportSize({ width, height });
      await expect(dock).toHaveCSS('position', position);
      await expect(action).toBeFocused();
      await expect(name).toHaveValue(customer.name);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await action.press('Enter');
    await expect(page.locator('.checkout-flow')).toHaveAttribute('data-stage', 'payment');
    await expect(action).toHaveAttribute('type', 'button');
    await expect(page.locator('.checkout-payment-stage h2')).toBeFocused();
    await expect(page.locator('.checkout-order-panel dl')).toBeVisible();
    await expect(page.locator('.checkout-payment-choice input[value=cash]')).toBeChecked();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `.verification-results/p5-02-${locale}-review-${page.context().browser()?.browserType().name()}.png` });
    expect(await state(request)).toEqual(initial);
  });
}

test('disabled checkout has a cart recovery path and no payment controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.addInitScript(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 2 }])), productId);
  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Ordering is currently unavailable' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to cart' })).toHaveAttribute('href', '/cart');
  await expect(page.locator('.cart-subtotal [role=img]')).toHaveAccessibleName('AED 40.00');
  await expect(page.locator('.checkout-mobile-action')).toHaveCount(0);
  await page.screenshot({ path: `.verification-results/p5-02-disabled-${page.context().browser()?.browserType().name()}.png` });
});

test('payment return without a local attempt offers recovery', async ({ page }) => {
  await page.goto(checkoutOrigin + '/checkout/stripe');
  await expect(page.locator('main').getByRole('alert')).toContainText('We could not verify this payment');
  await expect(page.getByRole('button', { name: 'Check payment status' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to checkout' })).toHaveAttribute('href', '/checkout');
  await expect(page.locator('.checkout-success-mark')).toHaveCount(0);
});
