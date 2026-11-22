import { test, expect, reset, login, checkoutOrigin, commerceOrigin, adminOrigin, productId, state, customer } from './fixtures';

test('admin configures a coupon, guest sees it in cart and checkout, and the order records it', async ({ page, request }) => {
  await reset(request);
  expect((await request.post(commerceOrigin+'/__fixture/marketing-product')).ok()).toBeTruthy();
  await login(page);
  await page.goto(adminOrigin+'/admin/growth');
  await page.getByRole('tab', { name: 'Coupons' }).click();
  await page.getByLabel('Code', { exact: true }).fill('test10');
  await page.getByLabel('Discount (%)', { exact: true }).fill('10');
  await page.getByLabel('Minimum eligible spend (AED)').fill('30');
  await page.getByLabel('Total usage limit').fill('1');
  await page.getByLabel('Enable coupon').check();
  await page.getByRole('button', { name: 'Save coupon' }).click();
  await expect(page.getByText('Saved TEST10.')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(checkoutOrigin+'/cart');
  await page.evaluate(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 1 }])), productId);
  await page.reload();
  const code = page.getByLabel('Coupon code', { exact: true });
  await code.fill('TEST10');
  await code.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'minimum spend' })).toBeVisible();
  await page.getByRole('button', { name: /Increase .* quantity/ }).click();
  await expect(page.getByRole('status', { name: /Quantity .*: 2/ })).toBeVisible();
  await code.press('Enter');
  await expect(page.getByText('Estimated coupon savings')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Estimated coupon savings' })).toContainText('4.00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove coupon' })).toBeVisible();

  await page.setViewportSize({ width: 360, height: 790 });
  await page.context().addCookies([{ name: 'almina_lang', value: 'ar', url: checkoutOrigin }]);
  await page.reload();
  await expect(page.getByRole('button', { name: 'إزالة الرمز' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.context().addCookies([{ name: 'almina_lang', value: 'en', url: checkoutOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(checkoutOrigin+'/checkout');
  for (const [name, value] of Object.entries(customer)) {
    if (name === 'payment') continue;
    const field = page.locator(`[name="${name}"]`);
    if (name === 'emirate') await field.selectOption(value);
    else await field.fill(value);
  }
  await page.getByRole('button', { name: /^(Review order|Continue to payment)$/ }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 36.00' })).toBeVisible();
  await page.getByRole('button', { name: 'Remove coupon' }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00' })).toBeVisible();
  await code.fill('TEST10');
  await code.press('Enter');
  await page.getByRole('button', { name: 'Place order — AED 36.00' }).click();
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  await expect(page.locator('dt').filter({ hasText: 'Coupon discount' })).toContainText('TEST10');

  const result = await state(request);
  expect(result.orders[0]?.totals).toMatchObject({ coupon: { code: 'TEST10', discountMinor: 400 }, totalMinor: 3600 });
  await page.goto(adminOrigin+'/admin/growth');
  await page.getByRole('tab', { name: 'Coupons' }).click();
  await expect(page.getByRole('button', { name: /TEST10.*Limit reached/ })).toBeVisible();
});

test('anonymous shoppers and staff cannot administer coupons', async ({ page, request }) => {
  await reset(request);
  const endpoint = commerceOrigin+'/api/v1/admin/growth/coupons';
  expect((await request.get(endpoint)).status()).toBe(401);
  await login(page, 'synthetic-staff');
  const cookie = (await page.context().cookies(adminOrigin)).map(value => value.name+'='+value.value).join('; ');
  expect((await request.get(endpoint, { headers: { cookie } })).status()).toBe(403);
  expect((await request.post(endpoint, { headers: { cookie, Origin: adminOrigin, 'X-CSRF-Protection': '1' }, data: {} })).status()).toBe(403);
});
