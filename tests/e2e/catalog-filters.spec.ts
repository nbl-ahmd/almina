import {test,expect} from './fixtures';
import {mkdir} from 'node:fs/promises';

for(const width of [360,390,768,1440])test(`filter panel matches the storefront and keeps native behavior at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.goto('/search?q=Daily&minPrice=5&maxPrice=25&sort=price-asc');
 const panel=page.locator('#catalog-filters'),summary=panel.locator(':scope > summary');
 if(width<1024){await summary.focus();await page.keyboard.press('Space');await expect(panel).toHaveAttribute('open');}
 else await expect(summary).toBeHidden();
 const form=page.getByRole('search',{name:'Filter products',exact:true});await expect(form).toBeVisible();
 const range=form.locator('fieldset');await expect(range).toHaveCSS('border-top-width','0px');await expect(range).toHaveCSS('padding','0px');
 const lower=form.getByRole('spinbutton',{name:'From',exact:true}),upper=form.getByRole('spinbutton',{name:'To',exact:true});
 await expect(lower).toHaveValue('5');await expect(upper).toHaveValue('25');await expect(lower).toHaveCSS('border-color','rgb(124, 137, 143)');
 for(const field of [lower,upper]){const box=await field.boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);expect(box!.width).toBeGreaterThan(75);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await mkdir('outputs/catalog-filters-2026-10-27',{recursive:true});await panel.scrollIntoViewIfNeeded();
 await page.screenshot({path:`outputs/catalog-filters-2026-10-27/filters-${width}.png`});
 if(width<1024){
   const sheet=page.getByRole('dialog',{name:'Filters',exact:true});
   await expect(sheet).toBeVisible();
   await expect(sheet).toHaveCSS('position','fixed');
   await page.keyboard.press('Escape');
   await expect(form).toBeHidden();
   await expect(summary).toBeFocused();
   await page.keyboard.press('Space');
   await expect(form).toBeVisible();
   await sheet.getByRole('button',{name:'Close filters'}).click();
   await expect(summary).toBeFocused();
 }
});

test('price range rejects reversed bounds and applying filters preserves query, sort and hidden refinements',async({page})=>{
 await page.goto('/search?q=Daily&sort=price-asc&brand=Care&literal=true&form=cream');
 const form=page.getByRole('search',{name:'Filter products',exact:true}),lower=form.getByRole('spinbutton',{name:'From',exact:true}),upper=form.getByRole('spinbutton',{name:'To',exact:true});
 await lower.fill('20');await upper.fill('10');await form.getByRole('button',{name:'Apply filters',exact:true}).click();
 await expect(upper).toHaveAttribute('aria-invalid','true');expect(await upper.evaluate((element:HTMLInputElement)=>element.validationMessage)).toContain('maximum price');
 expect(new URL(page.url()).searchParams.has('minPrice')).toBe(false);
 await upper.fill('30');await expect(upper).not.toHaveAttribute('aria-invalid');await upper.press('Enter');
 await expect.poll(()=>new URL(page.url()).searchParams.get('minPrice')).toBe('20');
 const query=new URL(page.url()).searchParams;for(const [key,value]of Object.entries({q:'Daily',sort:'price-asc',brand:'Care',literal:'true',form:'cream',maxPrice:'30'}))expect(query.get(key)).toBe(value);
 await page.reload();await expect(lower).toHaveValue('20');await expect(upper).toHaveValue('30');
 await form.getByRole('link',{name:'Clear filters',exact:true}).click();
 await expect.poll(()=>Object.fromEntries(new URL(page.url()).searchParams)).toEqual({q:'Daily',literal:'true',sort:'price-asc'});
});

test('Arabic filters keep price labels, decimal entry and inline validation readable',async({page,context})=>{
 await context.addCookies([{name:'almina_lang',value:'ar',url:test.info().project.use.baseURL!}]);
 await page.setViewportSize({width:390,height:1000});await page.goto('/search?q=Daily');
 await page.locator('#catalog-filters > summary').click();const form=page.getByRole('search',{name:'تصفية المنتجات',exact:true});
 const lower=form.getByRole('spinbutton',{name:'من',exact:true}),upper=form.getByRole('spinbutton',{name:'إلى',exact:true});
 await expect(lower).toHaveAttribute('placeholder','أدنى');await expect(upper).toHaveAttribute('placeholder','أقصى');
 await expect(page.locator('.storefront-shell')).toHaveAttribute('dir','rtl');
 await lower.fill('20');await upper.fill('10');await form.getByRole('button',{name:'تطبيق الفلاتر',exact:true}).click();
 expect(await upper.evaluate((element:HTMLInputElement)=>element.validationMessage)).toContain('السعر');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'outputs/catalog-filters-2026-10-27/filters-ar-390.png'});
});
