import { test, expect, checkoutOrigin, productId } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  test(`${locale} mobile search expands, fits a short viewport, and recovers from unavailable suggestions`, async ({ page, context }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: 'http://127.0.0.1:4710' }]);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.route('**/api/search/suggest?*', route => route.fulfill({ status: 503 }));
    const savedRequest = () => page.waitForResponse(response => new URL(response.url()).pathname === '/api/customer/saved');
    await Promise.all([savedRequest(), page.goto('/')]);
    const header = page.locator('[data-mobile-shell]');
    const search = header.getByRole('combobox');
    const nav = header.locator('.mobile-nav');
    await search.fill('Daily');
    await expect(search).toHaveAttribute('aria-expanded', 'true');
    await expect(nav).toBeHidden();
    await expect(header.locator('[data-slot=search-panel]')).toContainText(locale === 'ar' ? 'الاقتراحات غير متاحة' : 'Suggestions are unavailable');
    await page.setViewportSize({ width: 390, height: 370 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await search.press('Escape');
    await expect(search).toHaveAttribute('aria-expanded', 'false');
    await expect(search).toHaveValue('Daily');
    await expect(nav).toBeVisible();
    await search.click();
    await header.getByRole('button', { name: locale === 'ar' ? 'إلغاء' : 'Cancel', exact: true }).click();
    await expect(search).toHaveAttribute('aria-expanded', 'false');
    await expect(header.getByRole('search')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(search).toBeFocused();
    await Promise.all([savedRequest(), search.press('Enter')]);
    await expect(page).toHaveURL(/\/search\?q=Daily$/);
    await page.goBack();
    await expect(nav).toBeVisible();
  });

  test(`${locale} mobile delivery area persists and cart and checkout use task navigation`, async ({ page, context }) => {
    await context.addCookies([
      { name: 'almina_lang', value: locale, url: 'http://127.0.0.1:4710' },
      { name: 'almina_lang', value: locale, url: checkoutOrigin },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const header = page.locator('[data-mobile-shell]');
    const delivery = header.locator('[data-slot=delivery-selector]');
    await delivery.click();
    const dialog = page.locator('.delivery-area-sheet');
    await expect(dialog).toBeVisible();
    await dialog.locator('[autocomplete=address-level2]').fill('Al Nakheel');
    await dialog.locator('button[type=submit]').click();
    await expect(dialog).toBeHidden();
    await expect(delivery).toBeFocused();
    await page.reload();
    await expect(delivery).toContainText('Al Nakheel');

    await page.evaluate(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 2 }])), productId);
    await page.reload();
    await expect(header.locator('.header-cart [data-cart-count]')).toHaveText('2');
    await header.locator('.header-cart').click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(header.locator('.mobile-nav')).toBeHidden();
    await expect(header.locator('.mobile-cart-return')).toBeVisible();
    const dock = page.locator('.cart-mobile-bar');
    await expect(dock).toBeVisible();
    await expect(dock).toHaveCSS('bottom', '0px');

    await page.goto(checkoutOrigin + '/checkout');
    await page.evaluate(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 2 }])), productId);
    await page.reload();
    await expect(page.locator('.checkout-flow')).toBeVisible();
    await expect(header.locator('.mobile-nav')).toBeHidden();
    await expect(header.getByRole('combobox')).toBeHidden();
  });
}
