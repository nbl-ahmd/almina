import {test,expect,productId} from './fixtures';

for(const width of [320,390,768])test(`mobile language choice is reachable and persists at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/');
  const toggle=page.getByRole('banner').getByRole('button',{name:'Switch to Arabic',exact:true});
  await expect(toggle).toBeVisible();expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await toggle.click();await expect(page.locator('.storefront-shell')).toHaveAttribute('dir','rtl');
  await page.reload();await expect(page.locator('.storefront-shell')).toHaveAttribute('dir','rtl');
  await page.getByRole('banner').getByRole('button',{name:'التبديل إلى الإنجليزية',exact:true}).click();
  await expect(page.locator('.storefront-shell')).toHaveAttribute('dir','ltr');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('active basket opens with one title, product count and editable line',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.addInitScript(id=>localStorage.setItem('almina.cart.v1',JSON.stringify([{id,quantity:2}])),productId);
  await page.goto('/cart');await expect(page.locator('.cart-item')).toHaveCount(1);
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('main h1')).toHaveText('Your cart');
  await expect(page.locator('.cart-title-count')).toContainText('1 product');
  await expect(page.locator('main').getByRole('link',{name:'Continue shopping',exact:true})).toHaveCount(1);
  expect((await page.locator('.cart-item').boundingBox())!.y).toBeLessThan(300);
  await page.goto('/checkout');await expect(page.getByRole('heading',{name:'Checkout',exact:true})).toBeVisible();
  await expect(page.locator('main h1')).toHaveCount(1);
});

test('empty search retains the query and has one truthful recovery state',async({page})=>{
  await page.goto('/search?q=No-synthetic-match');
  await expect(page.getByRole('heading',{name:'No products found.',exact:true})).toHaveCount(1);
  await expect(page.locator('.storefront-intro')).toContainText('No-synthetic-match');
  await expect(page.locator('.catalog-result-label')).toHaveCount(0);
  await expect(page.locator('.catalog-pagination')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('suggestions below');
  await expect(page.locator('main').getByRole('link',{name:'Browse categories',exact:true})).toBeVisible();
});
