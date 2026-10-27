import {test,expect,reset,state,nextCheckoutPage,commerceOrigin,checkoutOrigin} from './fixtures';
test.beforeEach(async({request})=>{await reset(request);});
for(const width of [360,390,768,1440])test(`Stripe test option preserves delivery methods and handles cancel at ${width}px`,async({page,request})=>{
  await page.setViewportSize({width,height:900});await nextCheckoutPage(page);
  const select=page.locator('[name="payment"]');
  expect(await select.locator('option').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value))).toEqual(['cash','card','stripe']);
  await select.selectOption('stripe');
  await expect(page.locator('#checkout-form-field-12')).toBeDisabled();
  await page.getByRole('button',{name:'Review order',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue to Stripe test checkout'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`outputs/stripe-test-2026-10-27/checkout-${width}.png`,fullPage:true});
  // External provider navigation is intercepted; this suite never contacts Stripe or uses card details.
  await page.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Synthetic Stripe Checkout</h1>'}));
  await page.getByRole('button',{name:'Continue to Stripe test checkout'}).click();
  await expect(page.getByRole('heading',{name:'Synthetic Stripe Checkout'})).toBeVisible();
  expect((await state(request)).stock).toBe(2);
  await page.goto(checkoutOrigin+'/checkout/stripe?result=cancelled');
  await expect(page.getByRole('heading',{name:'Test checkout ended — stock released'})).toBeVisible();
  expect((await state(request)).stock).toBe(4);
  await page.reload();await expect(page.getByRole('heading',{name:'Test checkout ended — stock released'})).toBeVisible();
  expect((await state(request)).stock).toBe(4);
  await page.getByRole('button',{name:'Back to checkout'}).click();
  await expect(page).toHaveURL(checkoutOrigin+'/checkout');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('almina.cart.v1')!).length)).toBe(1);
});
test('Stripe return verifies server payment state and refund, preserves basket, and rejects absent recovery',async({page,request})=>{
  await nextCheckoutPage(page);await page.locator('[name="payment"]').selectOption('stripe');await page.getByRole('button',{name:'Review order',exact:true}).click();
  await page.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Synthetic Stripe Checkout</h1>'}));
  await page.getByRole('button',{name:'Continue to Stripe test checkout'}).click();await expect(page.getByRole('heading',{name:'Synthetic Stripe Checkout'})).toBeVisible();
  await page.goto(checkoutOrigin+'/checkout/stripe?result=returned');
  await expect(page.getByRole('heading',{name:'Waiting for payment confirmation'})).toBeVisible();
  await expect(page.getByRole('link',{name:'Resume test payment'})).toBeVisible();
  await request.post(commerceOrigin+'/__fixture/stripe-paid');
  await page.getByRole('button',{name:'Check payment status'}).click();
  await expect(page.getByRole('heading',{name:'Test payment successful'})).toBeVisible();
  expect((await state(request)).stock).toBe(2);
  await page.reload();await expect(page.getByRole('heading',{name:'Test payment successful'})).toBeVisible();
  await request.post(commerceOrigin+'/__fixture/stripe-refunded');await page.reload();
  await expect(page.getByRole('heading',{name:'Test payment refunded — stock released'})).toBeVisible();expect((await state(request)).stock).toBe(4);
  await page.evaluate(()=>sessionStorage.clear());await page.reload();await expect(page.locator('p[role="alert"]')).toContainText('could not verify');
});
test('Stripe gateway remains unavailable on the storefront where the feature is disabled',async({request})=>{
  expect((await request.post('http://127.0.0.1:4710/api/checkout/stripe/start',{data:{},headers:{Origin:'http://127.0.0.1:4710','X-CSRF-Protection':'1'}})).status()).toBe(404);
});

test('card on delivery continues through the existing checkout path',async({page,request})=>{
  await nextCheckoutPage(page);await page.locator('[name="payment"]').selectOption('card');
  await page.getByRole('button',{name:'Review order',exact:true}).click();
  const submitted=page.waitForRequest(req=>req.method()==='POST'&&new URL(req.url()).pathname==='/api/checkout');
  await page.getByRole('button',{name:'Place order — AED 40.00',exact:true}).click();
  expect((await submitted).postDataJSON().customer.payment).toBe('card');
  await expect(page.getByRole('heading',{name:'Order received'})).toBeVisible();expect((await state(request)).stock).toBe(2);
});
test('Stripe retry after navigation reuses the reserved order and saved payment method',async({page,request})=>{
  await nextCheckoutPage(page);await page.locator('[name="payment"]').selectOption('stripe');await page.getByRole('button',{name:'Review order',exact:true}).click();
  await page.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Synthetic Stripe Checkout</h1>'}));
  await page.getByRole('button',{name:'Continue to Stripe test checkout'}).click();await expect(page.getByRole('heading',{name:'Synthetic Stripe Checkout'})).toBeVisible();
  const originalUrl=page.url();await page.goto(checkoutOrigin+'/checkout');
  await expect(page.locator('[name="payment"]')).toHaveValue('stripe');await expect(page.locator('[name="payment"]')).toBeDisabled();
  await page.getByRole('button',{name:'Resume Stripe test checkout',exact:true}).click();await expect(page).toHaveURL(originalUrl);
  const result=await state(request);expect(result.orders).toHaveLength(1);expect(result.stock).toBe(2);expect(result.receipts).toBe(1);
});
