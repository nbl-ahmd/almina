import {test,expect} from './fixtures';
for(const width of [390,1280])test(`category-first discovery and sorting preserve shopping context at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/categories');
 await expect(page.getByRole('heading',{name:'Shop by category',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'View the full catalogue',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Skincare essentials',exact:true}).last()).toBeVisible();
 if(width>=768)await expect(page.getByRole('navigation',{name:'Shop navigation',exact:true}).getByRole('link',{name:'Everyday care',exact:true})).toBeVisible();
 await page.goto('/search?q=Daily&inStock=true&minPrice=5');
 const sort=page.getByRole('combobox',{name:'Sort by',exact:true});await expect(sort).toBeVisible();
 await sort.selectOption('price-asc');await expect(page).toHaveURL(/sort=price-asc/);
 const url=new URL(page.url());expect(url.searchParams.get('q')).toBe('Daily');expect(url.searchParams.get('inStock')).toBe('true');expect(url.searchParams.get('minPrice')).toBe('5');expect(url.searchParams.has('page')).toBe(false);
 const chips=page.getByRole('navigation',{name:'Applied filters'});await chips.getByRole('link',{name:'Remove From AED 5.00',exact:true}).click();
 await expect.poll(()=>new URL(page.url()).searchParams.has('minPrice')).toBe(false);await expect(sort).toHaveValue('price-asc');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
