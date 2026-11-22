import {test,expect} from './fixtures';
for(const width of [390,495,1508])test(`homepage review changes preserve shopping at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:795});await page.goto('/');
 const search=page.getByRole('search',{name:'Product search',exact:true});const submit=search.getByRole('button',{name:'Search',exact:true});
 await expect(submit).toBeVisible();expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 const hero=page.locator('.home-hero');await expect(hero.getByRole('group',{name:'1 of 3',exact:true})).toBeVisible();
 const second=hero.getByRole('button',{name:'Show promotion 2',exact:true});await second.click();await expect(second).toHaveAttribute('aria-pressed','true');
 await expect(hero.getByRole('heading',{name:'Skincare essentials',exact:true})).toBeInViewport();
 const track=hero.locator('.campaign-track');await track.focus();await page.keyboard.press('End');await expect(hero.getByRole('button',{name:'Show promotion 3',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.home-benefits')).toHaveCount(0);
 await expect(page.locator('.product-card .dirham-symbol').first()).toBeVisible();
 expect(await page.locator('.home-categories').evaluate(e=>getComputedStyle(e).scrollbarWidth)).toBe('none');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Arabic hero uses native RTL scrolling and named controls',async({page})=>{
 await page.context().addCookies([{name:'almina_lang',value:'ar',url:'http://127.0.0.1:4710'}]);await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.locator('.storefront-shell')).toHaveAttribute('dir','rtl');const hero=page.locator('.home-hero');
 await hero.locator('.campaign-track').focus();await page.keyboard.press('ArrowLeft');await expect(hero.locator('[data-slot=carousel-indicator]').nth(1)).toHaveAttribute('aria-pressed','true');
 await expect(hero.getByRole('heading',{name:'أساسيات العناية بالبشرة',exact:true})).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
