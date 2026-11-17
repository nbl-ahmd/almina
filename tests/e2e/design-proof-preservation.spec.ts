import { test, expect, reset, state, nextCheckoutPage, checkoutOrigin, login } from './fixtures';

test('P1-04 retains enabled checkout quote/review without placing an order', async ({page, request}) => {
  await reset(request);
  const before = await state(request);
  await nextCheckoutPage(page);
  await expect(page.getByRole('button', {name:'Place order — AED 40.00', exact:true})).toBeVisible();
  await page.screenshot({path:'.verification-results/storefront-replacement/p1-04/existing-checkout-review.png', caret:'initial'});
  expect(await state(request)).toEqual(before);
  expect(before.orders).toHaveLength(0);
  expect(before.receipts).toBe(0);
  for (const path of ['/design-proof', '/design-proof/cart', '/design-proof/checkout', '/design-proof/account']) {
    const response = await request.get(checkoutOrigin + path);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain('data-proof-root');
  }
});

test('P1-04 preserves admin login and dashboard', async ({page}) => {
  await login(page);
  await expect(page.getByRole('heading', {name:'Dashboard', exact:true})).toBeVisible();
});
