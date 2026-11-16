import { test, expect } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  test(`${locale} storefront resizes without reload or header collisions`, async ({ page, context }) => {
    await context.addCookies([{ name:'almina_lang', value:locale, url:'http://127.0.0.1:4710' }]);
    await page.goto('/');
    await page.locator('.home-product-grid .product-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [390,600,900,1024,1440,1920,767,320]) {
      await page.setViewportSize({width,height:900});
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const collisions = await page.evaluate(() => {
        const elements=['.brand-logo','.header-search','.header-location','.header-content > .header-cart'].map(selector=>document.querySelector(selector)!.getBoundingClientRect());
        return elements.flatMap((a,i)=>elements.slice(i+1).filter(b=>a.width&&b.width&&Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1));
      });
      expect(collisions).toEqual([]);
      if(width>=1024) {
        const lead=await page.locator('.home-lead').evaluate(el=>getComputedStyle(el).display);
        expect(lead).toBe('grid');
        expect(await page.locator('.home-product-grid').evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(700);
      }
    }
  });
}

test('catalogue filters and result columns adapt while resizing the same page', async ({page}) => {
  await page.goto('/products');
  const filters=page.locator('#catalog-filters');
  for(const [width,columns] of [[390,2],[600,3],[1024,3],[900,3],[1440,4],[768,3],[1280,4],[320,2]] as const) {
    await page.setViewportSize({width,height:900});
    if(width>=1024)await expect(filters).toHaveAttribute('open','');
    else await expect(filters).not.toHaveAttribute('open');
    await expect.poll(()=>page.locator('.catalog-results .product-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await filters.locator(':scope > summary').click();
  await expect(filters.getByRole('button',{name:'Apply filters',exact:true})).toBeVisible();
  await page.setViewportSize({width:1440,height:900});
  await expect(filters.getByRole('button',{name:'Apply filters',exact:true})).toBeVisible();
});

test('product purchase controls fit phone portrait and short landscape viewports',async({page})=>{
  await page.goto('/products/daily-care--PD0001');
  for(const [width,height]of [[390,844],[667,375],[1024,900]] as const) {
    await page.setViewportSize({width,height});
    const geometry=await page.locator('.pdp-purchase').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,height:r.height,position:getComputedStyle(el).position};});
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(width);
    if(width<768){expect(geometry.position).toBe('fixed');expect(geometry.bottom).toBe(height);expect(geometry.height).toBeLessThan(height*.4);}
    else expect(geometry.position).not.toBe('fixed');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

test('desktop filters retain an accessible disclosure when closed',async({page})=>{
  await page.setViewportSize({width:1440,height:900});await page.goto('/products');
  const filters=page.locator('#catalog-filters');
  await expect(filters).toHaveAttribute('open','');
  // Exercise the closed state that exists before the media effect opens the panel.
  await filters.evaluate(el=>el.removeAttribute('open'));
  await expect(filters.locator(':scope > summary')).toBeVisible();
  await filters.locator(':scope > summary').click();
  await expect(filters.getByRole('button',{name:'Apply filters',exact:true})).toBeVisible();
});
