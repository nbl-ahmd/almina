import { test, expect, reset, state, nextCheckoutPage, checkoutOrigin, login } from './fixtures';

test('retail checkout reaches enabled quote review without placing an order', async ({page, request}) => {
  await reset(request);
  const before = await state(request);
  await nextCheckoutPage(page);
  await expect(page.getByRole('button', {name:'Place order — AED 40.00', exact:true})).toBeVisible();
  expect(await state(request)).toEqual(before);
  expect(before.orders).toHaveLength(0);
  expect(before.receipts).toBe(0);
});

test('retired comparison routes return the public 404', async ({request}) => {
  for (const path of ['', '/cart', '/checkout', '/account', '/style-contract', '/components', '/stress', '/products', '/products/sample']) {
    const response = await request.get(checkoutOrigin + '/design-proof' + path);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain('data-proof-root');
  }
});

test('preserves admin login and dashboard', async ({page}) => {
  await login(page);
  await expect(page.getByRole('heading', {name:'Dashboard', exact:true})).toBeVisible();
  expect(await page.evaluate(()=>{const p=document.createElement('input');p.dataset.slot='input';p.className='border-control-border';document.body.append(p);const color=getComputedStyle(p).borderColor;p.remove();return color;})).toBe('rgb(135, 146, 164)');
  expect(await page.evaluate(()=>{const p=document.createElement('span');p.className='text-primary-foreground';document.body.append(p);const color=getComputedStyle(p).color;p.remove();return color;})).toBe('rgb(255, 255, 255)');
});

test('wholesale and root missing-page recovery keep isolated compatibility values', async ({page}) => {
  for(const path of ['/wholesale','/missing-p6-01-synthetic']) {
    await page.goto(path);
    const shell=page.locator('.storefront-shell').first();
    await expect(shell).toBeVisible();
    expect(await shell.evaluate(el=>getComputedStyle(el).getPropertyValue('--store-action').trim())).toBe('');
    expect(await shell.evaluate(el=>getComputedStyle(el).getPropertyValue('--color-page').trim())).toBe('#f6f6fe');
    expect(await shell.evaluate(el=>{const p=document.createElement('span');p.className='text-primary-foreground';el.append(p);const color=getComputedStyle(p).color;p.remove();return color;})).toBe('rgb(36, 39, 43)');
  }
});

for(const lang of ['en','ar'] as const) {
 test(`${lang} retail shell and added/saved hover feedback use accepted roles`,async({page,context})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await context.addCookies([{name:'almina_lang',value:lang,url:'http://127.0.0.1:4710'}]);
  await page.goto('/products/daily-care--PD0001');
  const shell=page.locator('[data-storefront-retail]');
  await expect(shell).toHaveAttribute('dir',lang==='ar'?'rtl':'ltr');
  await expect(shell).toHaveCSS('background-color','rgb(247, 250, 248)');
  await expect(shell).toHaveCSS('color','rgb(28, 41, 37)');
  const stepper=page.locator('.pdp-purchase [data-store-control="stepper"]');
  await expect(stepper.getByRole('button').first()).toBeDisabled();
  await expect(stepper.getByRole('button').first()).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await expect(stepper.getByRole('button').first()).toHaveCSS('border-top-width','0px');
  const add=page.locator('.add-to-cart:visible').first();await add.click();await expect(add).toHaveAttribute('data-added','true');await add.hover();
  await expect(add).toHaveCSS('background-color','rgb(234, 243, 239)');await expect(add).toHaveCSS('border-color','rgba(0, 0, 0, 0)');
  await expect(add).toContainText(lang==='ar'?'اذهب إلى السلة':'Go to cart');
  await add.click();
  await expect(page).toHaveURL(/\/cart$/);
  await page.goto('/products');const cardAdd=page.locator('.product-card .add-to-cart').first();await cardAdd.click();await expect(cardAdd).toHaveAttribute('data-added','true');await cardAdd.hover();await expect(cardAdd).toHaveCSS('background-color','rgb(234, 243, 239)');
  const save=page.locator('.card-save').first();await save.click();await expect(save).toHaveAttribute('aria-pressed','true');await save.hover();
  await expect(save).toHaveCSS('background-color','rgb(255, 242, 243)');await expect(save).toHaveCSS('color','rgb(167, 45, 66)');
 });
}
