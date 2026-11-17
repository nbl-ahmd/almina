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
  for (const path of ['/design-proof', '/design-proof/cart', '/design-proof/checkout', '/design-proof/account', '/design-proof/style-contract', '/design-proof/components']) {
    const response = await request.get(checkoutOrigin + path);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain('data-proof-root');
  }
});

test('P1-04 preserves admin login and dashboard', async ({page}) => {
  await login(page);
  await expect(page.getByRole('heading', {name:'Dashboard', exact:true})).toBeVisible();
  expect(await page.evaluate(()=>{const p=document.createElement('input');p.dataset.slot='input';p.className='border-control-border';document.body.append(p);const color=getComputedStyle(p).borderColor;p.remove();return color;})).toBe('rgb(135, 146, 164)');
  expect(await page.evaluate(()=>{const p=document.createElement('span');p.className='text-primary-foreground';document.body.append(p);const color=getComputedStyle(p).color;p.remove();return color;})).toBe('rgb(255, 255, 255)');
});

test('P2-01 accepted tokens do not leak into wholesale or root missing-page compatibility', async ({page}) => {
  for(const path of ['/wholesale','/missing-p2-01-synthetic']) {
    await page.goto(path);
    const shell=page.locator('.storefront-shell').first();
    await expect(shell).toBeVisible();
    expect(await shell.evaluate(el=>getComputedStyle(el).getPropertyValue('--store-action').trim())).toBe('');
    expect(await shell.evaluate(el=>getComputedStyle(el).getPropertyValue('--color-page').trim())).toBe('#f6f6fe');
    expect(await shell.evaluate(el=>{const p=document.createElement('span');p.className='text-primary-foreground';el.append(p);const color=getComputedStyle(p).color;p.remove();return color;})).toBe('rgb(36, 39, 43)');
  }
});

for(const lang of ['en','ar'] as const) {
 test(`${lang} incumbent added/saved hover feedback is owned without changing commerce`,async({page,context})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await context.addCookies([{name:'almina_lang',value:lang,url:'http://127.0.0.1:4710'}]);
  await page.goto('/products/daily-care--PD0001');const add=page.locator('.add-to-cart:visible').first();await add.click();await expect(add).toHaveAttribute('data-added','true');await add.hover();
  await expect(add).toHaveCSS('background-color','rgb(255, 231, 233)');await expect(add).toHaveCSS('border-color','rgb(23, 91, 90)');
  await page.goto('/products');const cardAdd=page.locator('.product-card .add-to-cart').first();await cardAdd.click();await expect(cardAdd).toHaveAttribute('data-added','true');await cardAdd.hover();await expect(cardAdd).toHaveCSS('background-color','rgb(255, 231, 233)');
  const save=page.locator('.save-product-compact').first();await save.click();await expect(save).toHaveAttribute('aria-pressed','true');await save.hover();
  await expect(save).toHaveCSS('background-color','rgb(255, 240, 241)');await expect(save).toHaveCSS('color','rgb(180, 35, 45)');
 });
}
