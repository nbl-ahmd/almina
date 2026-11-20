import { test, expect } from './fixtures';

const complete = '/products/synthetic-paged-product-0--SYNTHETIC_0';
const sparse = '/products/synthetic-paged-product-1--SYNTHETIC_1';

for (const locale of ['en', 'ar'] as const) {
  const ar = locale === 'ar';
  test(`product facts, help and reviews precede alternatives in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: baseURL! }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(complete);
    const main = page.locator('main');
    const expectedOrder = ar
      ? ['عن هذا المنتج', 'مواصفات المنتج', 'هل تحتاج مساعدة في الاختيار؟', 'التوصيل والإرجاع', 'تقييمات العملاء', 'منتجات مشابهة']
      : ['About this product', 'Product specifications', 'Need help choosing?', 'Delivery and returns', 'Customer reviews', 'Similar products'];
    await expect(main.getByRole('heading', { name: expectedOrder[5]!, exact: true })).toBeVisible();
    const headings = await main.getByRole('heading', { level: 2 }).allTextContents();
    expect(headings).toEqual(expectedOrder);
    const about = page.locator('#product-description');
    await expect(about).toContainText('Synthetic catalogue summary for layout verification.');
    await expect(about).toContainText('Synthetic product description.');
    await expect(about).toContainText('Literal fixture text <em>sample</em>.');
    await expect(about.locator('em')).toHaveCount(0);
    await expect(about.getByRole('listitem')).toHaveCount(2);
    await expect(page.locator('#product-facts')).toContainText('64 ml');
    await expect(page.locator('#product-facts')).toContainText('Synthetic manufacturer');
    await expect(page.getByText('SYNTHETIC_0', { exact: true })).toHaveCount(1);
    const help = page.locator('#product-support');
    await expect(help.locator('a[href^="tel:"]')).toHaveAttribute('href', 'tel:+971504825007');
    await expect(help.locator('a[href="/contact"]')).toBeVisible();
    await expect(main.locator('a[href="/shipping"]')).toBeVisible();
    await expect(main.locator('a[href="/returns"]')).toBeVisible();

    await expect(page.getByText('Synthetic warnings field.', { exact: true })).toBeVisible();
    const usage = page.locator('#product-usage');
    await expect(usage.getByText('Synthetic directions field.', { exact: true })).toBeHidden();
    await usage.locator('summary').press('Enter');
    await expect(usage.getByText('Synthetic directions field.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Synthetic review title', exact: true })).toBeVisible();
    await expect(page.getByText('Fixture copy for review layout.', { exact: true })).toBeVisible();

    for (const width of [320, 667, 768, 1440, 390]) {
      await page.setViewportSize({ width, height: width === 667 ? 375 : 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
    await expect(page.locator('.related-product-list')).toBeVisible();
  });

  test(`sparse product copy stays explicit and compact in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: baseURL! }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(sparse);
    await expect(page.getByText(ar ? 'لا يتوفر وصف لهذا المنتج حالياً.' : 'A description for this product is currently unavailable.', { exact: true })).toBeVisible();
    await expect(page.getByText(ar ? 'تعذّر تحميل التقييمات المنشورة.' : 'Published reviews could not be loaded.', { exact: true })).toBeVisible();
    await expect(page.locator('#product-usage, #product-warnings, #product-ingredients, #product-storage')).toHaveCount(0);
    await expect(page.locator('#product-facts dt')).toHaveCount(2);
    await expect(page.locator('.related-product-list .related-product-row')).toHaveCount(4);
  });
}

test('review form keeps native validation, errors and confirmed feedback', async ({ page }) => {
  await page.goto('/products/daily-care--PD0001');
  await expect(page.getByText('There are no published verified-purchase reviews yet.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Write a review', exact: true }).click();
  const form = page.locator('#write-product-review');
  const submit = form.getByRole('button', { name: 'Submit for review', exact: true });
  await expect(submit).toHaveCSS('border-radius', '12px');
  await expect(form.getByRole('textbox', { name: 'Order number', exact: true })).toHaveCSS('border-bottom-color', 'rgb(196, 208, 203)');
  await submit.click();
  await expect(form.getByRole('textbox', { name: 'Order number', exact: true })).toBeFocused();
  await form.getByRole('textbox', { name: 'Order number', exact: true }).fill('OD5050');
  const rating = form.getByRole('group', { name: 'Rating', exact: true });
  await rating.getByRole('radio', { name: '3 out of 5', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(rating.getByRole('radio', { name: '4 out of 5', exact: true })).toBeChecked();
  await form.getByRole('textbox', { name: 'Public display name', exact: true }).fill('Synthetic shopper');
  await form.getByRole('textbox', { name: 'Your experience', exact: true }).fill('Synthetic review submission for browser verification.');
  // Intercept the fixture request before any review is submitted.
  await page.route('**/api/customer/review', route => {
    expect(route.request().postDataJSON()).toMatchObject({ productId: 'bbbbbbbbbbbbbbbbbbbbbbbb', orderId: 'OD5050', rating: 4 });
    expect(route.request().headers()['x-csrf-protection']).toBe('1');
    return route.fulfill({ status: 401 });
  });
  await submit.click();
  const reviews = page.getByRole('region', { name: 'Customer reviews', exact: true });
  await expect(reviews.getByRole('alert')).toHaveText('Please sign in before writing a review.');
  await expect(form).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Order number', exact: true })).toHaveValue('OD5050');

  await page.unroute('**/api/customer/review');
  await page.route('**/api/customer/review', route => route.fulfill({ status: 201 }));
  await submit.click();
  await expect(form).toHaveCount(0);
  await expect(reviews.getByRole('status')).toContainText('awaiting moderation');
  await expect(reviews.getByRole('button', { name: 'Write a review', exact: true })).toBeFocused();
});

for (const width of [390, 1440]) {
  test(`product tools share the canonical URL and save a browsing area at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined });
      Object.defineProperty(navigator, 'clipboard', { value: {
        writeText: async (url: string) => { sessionStorage.setItem('test-shared-url', url); },
      } });
    });
    await page.goto(complete + '?utm_source=fixture');
    const share = page.getByRole('button', { name: 'Share product', exact: true });
    await expect(share).toHaveCount(1);
    await share.click();
    await expect(page.getByText('Product link copied', { exact: true })).toBeVisible();
    expect(new URL((await page.evaluate(() => sessionStorage.getItem('test-shared-url')))!).pathname).toBe(complete);
    expect(new URL((await page.evaluate(() => sessionStorage.getItem('test-shared-url')))!).search).toBe('');

    const picker = page.locator('.pdp-delivery-area');
    await picker.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('#delivery-location-field-2').fill('Al Hamra');
    await dialog.locator('button[type=submit]').click();
    await expect(dialog).toBeHidden();
    await expect(picker).toBeFocused();
    await expect(picker).toContainText('Al Hamra');
    await expect(page.locator('.floating-contact')).toHaveAttribute('href', /^https:\/\/api\.whatsapp\.com\/send\/\?phone=971504825007&text=/);
    if (width === 390) await expect(page.locator('.floating-contact')).toBeHidden();
    else await expect(page.locator('.floating-contact')).toBeVisible();
  });
}
