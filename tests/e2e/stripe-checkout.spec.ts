import {test,expect,reset,state,nextCheckoutPage,commerceOrigin,checkoutOrigin} from './fixtures';
test.beforeEach(async({request})=>{await reset(request);});
for(const width of [360,390,768,1440])test(`card payment and cash on delivery handle cancel at ${width}px`,async({page,request})=>{
  await page.setViewportSize({width,height:900});await nextCheckoutPage(page);
  const select=page.locator('[name="payment"]');
  expect(await select.locator('option').evaluateAll(nodes=>nodes.map(node=>(node as HTMLOptionElement).value))).toEqual(['cash','stripe']);
  await expect(select.locator('option')).toHaveText(['Cash on delivery','Credit or debit card — test mode']);
  await expect(page.locator('main')).not.toContainText('Stripe');
  await select.selectOption('stripe');
  await expect(page.locator('#checkout-form-field-12')).toBeDisabled();
  await page.getByRole('button',{name:'Review order',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue to test payment'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`outputs/stripe-test-2026-10-27/checkout-${width}.png`,fullPage:true});
  // External provider navigation is intercepted; this suite never contacts Stripe or uses card details.
  await page.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Synthetic Stripe Checkout</h1>'}));
  await page.getByRole('button',{name:'Continue to test payment'}).click();
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
  await page.getByRole('button',{name:'Continue to test payment'}).click();await expect(page.getByRole('heading',{name:'Synthetic Stripe Checkout'})).toBeVisible();
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

test('cash on delivery continues through the existing checkout path',async({page,request})=>{
  await nextCheckoutPage(page);await page.locator('[name="payment"]').selectOption('cash');
  await page.getByRole('button',{name:'Review order',exact:true}).click();
  const submitted=page.waitForRequest(req=>req.method()==='POST'&&new URL(req.url()).pathname==='/api/checkout');
  await page.getByRole('button',{name:'Place order — AED 40.00',exact:true}).click();
  expect((await submitted).postDataJSON().customer.payment).toBe('cash');
  await expect(page.getByRole('heading',{name:'Order received'})).toBeVisible();expect((await state(request)).stock).toBe(2);
});
test('Stripe retry after navigation reuses the reserved order and saved payment method',async({page,request})=>{
  await nextCheckoutPage(page);await page.locator('[name="payment"]').selectOption('stripe');await page.getByRole('button',{name:'Review order',exact:true}).click();
  await page.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Synthetic Stripe Checkout</h1>'}));
  await page.getByRole('button',{name:'Continue to test payment'}).click();await expect(page.getByRole('heading',{name:'Synthetic Stripe Checkout'})).toBeVisible();
  const originalUrl=page.url();await page.goto(checkoutOrigin+'/checkout');
  await expect(page.locator('[name="payment"]')).toHaveValue('stripe');await expect(page.locator('[name="payment"]')).toBeDisabled();
  await page.getByRole('button',{name:'Resume test payment',exact:true}).click();await expect(page).toHaveURL(originalUrl);
  const result=await state(request);expect(result.orders).toHaveLength(1);expect(result.stock).toBe(2);expect(result.receipts).toBe(1);
});
test('verified live receipt clears purchased quantities once and preserves later basket additions',async({page,request})=>{
  await nextCheckoutPage(page);await page.locator('[name="payment"]').selectOption('stripe');await page.getByRole('button',{name:'Review order',exact:true}).click();
  await page.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Synthetic Stripe Checkout</h1>'}));
  await page.getByRole('button',{name:'Continue to test payment'}).click();await expect(page.getByRole('heading',{name:'Synthetic Stripe Checkout'})).toBeVisible();
  await request.post(commerceOrigin+'/__fixture/stripe-paid');
  // Exercise the live receipt branch with a synthetic, verified-server response. No live Stripe API calls.
  await page.route('**/api/checkout/stripe/status',async route=>{const response=await route.fetch();const body=await response.json();await route.fulfill({response,json:{...body,testMode:false}});});
  await page.goto(checkoutOrigin+'/checkout/stripe?result=returned');await expect(page.getByRole('heading',{name:'Payment received',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('almina.cart.v1')!))).toEqual([]);
  await page.evaluate(()=>localStorage.setItem('almina.cart.v1',JSON.stringify([{id:'bbbbbbbbbbbbbbbbbbbbbbbb',quantity:1}])));
  await page.reload();await expect(page.getByRole('heading',{name:'Payment received',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('almina.cart.v1')!))).toEqual([{id:'bbbbbbbbbbbbbbbbbbbbbbbb',quantity:1}]);
  await request.post(commerceOrigin+'/__fixture/stripe-refunded');await page.reload();await expect(page.getByRole('heading',{name:'Payment refunded',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('almina.cart.v1')!))).toEqual([{id:'bbbbbbbbbbbbbbbbbbbbbbbb',quantity:1}]);
});
test('Stripe authorization or rate-limit errors preserve the original payment key',async({page})=>{
  await nextCheckoutPage(page);await page.locator('[name="payment"]').selectOption('stripe');await page.getByRole('button',{name:'Review order',exact:true}).click();
  await page.route('**/api/checkout/stripe/start',route=>route.fulfill({status:403,json:{error:{code:'FORBIDDEN'}}}));
  await page.getByRole('button',{name:'Continue to test payment'}).click();
  await expect(page.locator('p[role="alert"]')).toBeVisible();
  const original=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('almina.checkout.pending.v1')!).idempotencyKey);
  await page.reload();await expect(page.getByRole('button',{name:'Resume test payment'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('almina.checkout.pending.v1')!).idempotencyKey)).toBe(original);
});
