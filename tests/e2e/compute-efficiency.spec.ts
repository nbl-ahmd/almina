import {test,expect,login,reset} from './fixtures';

test('storefront links do not speculatively fetch dynamic routes but clicks still navigate',async({page})=>{
 const prefetches:string[]=[];
 page.on('request',request=>{if(request.headers()['next-router-prefetch']==='1'||request.headers().purpose==='prefetch')prefetches.push(request.url());});
 await page.goto('/products');
 await page.getByRole('heading',{name:'Daily Care',exact:true}).hover();
 await page.getByRole('link',{name:'Back to top',exact:true}).scrollIntoViewIfNeeded();
 await page.waitForTimeout(1000);
 expect(prefetches).toEqual([]);
 await page.getByRole('link',{name:'Daily Care',exact:true}).click();
 await expect(page).toHaveURL(/\/products\/daily-care--PD0001/);
 await expect(page.getByRole('button',{name:'Add to cart: Daily Care'})).toBeVisible();
});
test('metadata caching stays separate from private HTML and API responses',async({request})=>{
 const first=await request.get('/products'),second=await request.get('/products');
 const one=first.headers()['content-security-policy']!,two=second.headers()['content-security-policy']!;
 expect(one).toContain("'strict-dynamic'");expect(one).not.toEqual(two);
 expect(first.headers()['cache-control']).toContain('no-store');
 const api=await request.get('/api/search/suggest?q=care');
 expect(api.headers()['content-security-policy']).toContain("default-src 'none'");
 expect(api.headers()['cache-control']).toContain('no-store');
 expect(api.headers()['x-robots-tag']).toContain('noindex');
 const sitemap=await request.get('/sitemap.xml');
 expect(sitemap.status()).toBe(200);expect(sitemap.headers()['cache-control']).toContain('s-maxage=300');
 expect(sitemap.headers()['set-cookie']).toBeUndefined();
 const invalid=await request.get('/sitemap.xml?unbounded=1');expect(invalid.status()).toBe(404);expect(invalid.headers()['cache-control']).toContain('no-store');
 const image=await request.get('/product-placeholder.svg');expect(image.status()).toBe(200);expect(image.headers()['content-security-policy']).toBeUndefined();
});


test('admin links also avoid speculative private route renders',async({page,request})=>{
 await reset(request);const prefetches:string[]=[];
 page.on('request',request=>{if(request.headers()['next-router-prefetch']==='1')prefetches.push(request.url());});
 await login(page);await page.waitForTimeout(1000);
 expect(prefetches).toEqual([]);
 await page.getByRole('link',{name:'Orders',exact:true}).click();
 await expect(page).toHaveURL(/\/admin\/orders/);
});
