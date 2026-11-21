import {test,expect,reset,commerceOrigin,checkoutOrigin,customer,login} from './fixtures';
test.beforeEach(async({request})=>{await reset(request);expect((await request.post(commerceOrigin+'/__fixture/families')).ok()).toBeTruthy();});
for(const width of [360,390,768,1280]) {
  test(`family selection is responsive and each SKU is directly accessible at ${width}px`,async({page})=>{
    await page.setViewportSize({width,height:900});
    await page.goto(checkoutOrigin+'/products/synthetic-family--PD8001');
    const options=page.getByRole('region',{name:'Product options'});
    await expect(options).toBeVisible();
    await expect(options.getByRole('link',{name:'Small',exact:true})).toHaveAttribute('aria-current','page');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await page.getByRole('spinbutton',{name:'Quantity',exact:true}).fill('4');
    await options.getByRole('link',{name:'Large Out of stock',exact:true}).click();
    await expect(page).toHaveURL(/--PD8002$/);
    await expect(page.getByRole('button',{name:'Out of stock: Synthetic family',exact:true})).toBeDisabled();
    await page.getByRole('region',{name:'Product options'}).getByRole('link',{name:'Chocolate',exact:true}).click();
    await expect(page).toHaveURL(/--PD8003$/);
    await expect(page.getByRole('spinbutton',{name:'Quantity',exact:true})).toHaveValue('1');
    await page.reload();
    await expect(page.getByRole('region',{name:'Product options'})).toContainText('Selected: Size: Large · Flavour: Chocolate');
    await page.getByText('View all available combinations',{exact:true}).click();
    await expect(page.getByRole('link',{name:'Size: Small · Flavour: Vanilla AED 30.00',exact:true})).toBeVisible();
    const structured=await page.locator('script[type="application/ld+json"]').allTextContents();
    const product=structured.map(value=>JSON.parse(value)).find(value=>value['@type']==='Product');
    expect(product.isVariantOf.hasVariant).toHaveLength(3);
    expect(product.offers.price).toBe('35.00');
    expect(product.url).toContain('--PD8003');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toContain('--PD8003');
    await expect(page).toHaveTitle(/Size: Large.*Flavour: Chocolate/);
    const html=await (await page.request.get(checkoutOrigin+'/products/synthetic-family--PD8003',{headers:{'User-Agent':'Googlebot'}})).text();
    expect(html).toContain('"productGroupID":"synthetic-options"');
    expect(html).toContain('href="/products/synthetic-family--PD8001"');
    await page.screenshot({path:`.verification-results/product-family-${width}.png`,fullPage:true});
    await page.goto(checkoutOrigin+'/products');
    await expect(page.getByRole('link',{name:'Choose options',exact:true})).toHaveCount(1);
    await expect(page.getByRole('link',{name:'Synthetic medicine 20mg',exact:true})).toBeVisible();
  });
}
test('selected SKU survives cart, server checkout and immutable staff order details',async({page,request})=>{
  await page.goto(checkoutOrigin+'/products/synthetic-family--PD8003');
  await page.locator('.pdp-purchase').getByRole('button',{name:'Add to cart: Synthetic family',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Added to cart.'})).toBeVisible();
  await page.goto(checkoutOrigin+'/cart');
  await expect(page.getByText('Size: Large · Flavour: Chocolate',{exact:true})).toBeVisible();
  await page.goto(checkoutOrigin+'/checkout');
  for(const[name,value]of Object.entries(customer)) {
    const field=page.locator(`[name="${name}"]`);
    if(name==='payment')continue;
    if(name==='emirate') await field.selectOption(value);else await field.fill(value);
  }
  await page.getByRole('button',{name:'Review order',exact:true}).click();
  await expect(page.locator('#checkout-order-items').getByText('Size: Large · Flavour: Chocolate',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Place order — AED 35.00',exact:true}).click();
  await expect(page.getByRole('heading',{name:/order.*confirmed|order.*received/i})).toBeVisible();
  const state=await(await request.get(commerceOrigin+'/__fixture/state')).json();
  await login(page);
  await page.goto('http://127.0.0.1:4720/admin/orders/'+state.orders[0]._id);
  await expect(page.getByRole('cell',{name:'Size: Large · Flavour: Chocolate',exact:true})).toBeVisible();
});

test('staff can maintain a verified family option through the existing product form',async({page})=>{
  await login(page);
  await page.goto('http://127.0.0.1:4720/admin/products/ccccccccccccccccccccccc1');
  await expect(page.getByLabel(/^Product family key/)).toHaveValue('synthetic-options');
  await page.getByRole('tab',{name:'Variants',exact:true}).click();
  await page.getByLabel('Variant size',{exact:true}).fill('Medium');
  await page.getByRole('tab',{name:'Overview',exact:true}).click();
  // Editing an option does not request an inventory adjustment.
  await expect(page.getByLabel(/^Stock adjustment reason/)).toBeHidden();
  await page.getByRole('button',{name:'Save product',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Saved successfully.'})).toBeVisible();
  await page.reload();
  await page.getByRole('tab',{name:'Variants',exact:true}).click();
  await expect(page.getByLabel('Variant size',{exact:true})).toHaveValue('Medium');
  await page.getByLabel(/^Family strength identity/).fill('20mg');
  await page.getByRole('tab',{name:'Overview',exact:true}).click();
  await expect(page.getByLabel(/^Stock adjustment reason/)).toBeHidden();
  await page.getByRole('button',{name:'Save product',exact:true}).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('Check the family name, brand, form, strength, category and option combinations.');
  await page.goto(checkoutOrigin+'/products/synthetic-family--PD8001');
  await expect(page.getByRole('region',{name:'Product options'})).toContainText('Selected: Size: Medium · Flavour: Vanilla');
});
