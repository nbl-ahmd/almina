import {test,expect,login,adminOrigin,reset} from './fixtures';
test('search retains grouped autocomplete, keyboard, recents and category navigation',async({page})=>{
 await page.goto('/');const input=page.locator('[data-slot="header-search-input"]').first();await input.fill('daily');await expect(page.locator('[role="listbox"]')).toBeVisible();
 await expect(page.locator('[role="option"]').filter({hasText:'Daily Care'}).first()).toBeVisible();await expect(page.locator('[role="option"]').filter({hasText:'Synthetic Care'})).toBeVisible();
 await input.press('ArrowDown');await expect(input).toHaveAttribute('aria-activedescendant',/.+/);await input.press('Escape');await expect(page.locator('[role="listbox"]')).toHaveCount(0);
 await input.fill('skin');await expect(page.locator('[role="option"]').filter({hasText:'Skin Care'})).toBeVisible();
 await input.fill('Daily Care');await input.press('Enter');await expect(page).toHaveURL(/\/search\?q=Daily\+Care/);await expect(page.locator('.product-card').first()).toContainText('Daily Care');
 await page.goto('/');await input.focus();await expect(page.locator('[role="option"]').filter({hasText:'Daily Care'}).first()).toBeVisible();
});
test('correction, relaxation, zero recovery, filters and reload remain usable',async({page})=>{
 await page.goto('/search?q=dailyy&minPrice=10&inStock=true');await expect(page.getByText('Did you mean')).toBeVisible();await expect(page.locator('.product-card')).toHaveCount(1);
 await page.getByRole('link',{name:'Search the original phrase'}).click();await expect(page).toHaveURL(/literal=true/);await expect(page).toHaveURL(/minPrice=10/);
 await page.goto('/search?q=daily+care+900ml');await expect(page.getByText('No exact match found. Showing related results')).toBeVisible();
 await page.goto('/search?q=missing');await expect(page.getByText('No exact match found. Try a brand')).toBeVisible();await expect(page.getByRole('link',{name:'Daily Care',exact:true})).toBeVisible();
 await page.goto('/search?q=Daily+Care&minPrice=10&maxPrice=25&sort=price-asc');await page.reload();await expect(page.locator('.product-card')).toHaveCount(1);await expect(page.locator('input[type="number"][name="minPrice"]')).toHaveValue('10');
 const robots=await page.locator('meta[name="robots"]').getAttribute('content');expect(robots).toContain('noindex');
});
test('mobile, Arabic, loading and suggestion failure preserve accessible search',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.route('**/api/search/suggest?*',async route=>{await new Promise(resolve=>setTimeout(resolve,500));await route.fulfill({json:{products:[],categories:[],unavailable:true}});});
 const input=page.locator('[data-slot="header-search-input"]').first();await input.fill('daily');await expect(page.locator('[role="listbox"]')).toHaveAttribute('aria-busy','true');await expect(page.locator('[data-slot="search-panel"]')).toContainText('Suggestions are unavailable');
 await input.press('Escape');await page.unroute('**/api/search/suggest?*');
 await page.context().addCookies([{name:'almina_lang',value:'ar',url:'http://127.0.0.1:4710'}]);await page.goto('/search?q=%D8%A8%D8%B4%D8%B1%D8%A9');await expect(page.locator('.product-card').first()).toBeVisible();await expect(page.locator('.storefront-shell')).toHaveAttribute('lang','ar');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('existing usage consent does not enable query reports; separate consent batches impressions and stops on withdrawal',async({page})=>{
 const events:{event:string;items:{productId:string;position:number}[];query?:string}[]=[];
 await page.addInitScript(()=>localStorage.setItem('almina.optional-usage.v1','allowed'));
 await page.route('**/api/search/events',async route=>{events.push(route.request().postDataJSON());await route.fulfill({status:204});});
 await page.goto('/search?q=Daily+Care');await expect(page.locator('.product-card')).toHaveCount(1);await page.waitForTimeout(500);expect(events).toEqual([]);
 await page.evaluate(()=>{localStorage.setItem('almina.optional-search-usage.v1','allowed');window.dispatchEvent(new Event('almina-usage-change'));});
 await page.locator('.product-card').scrollIntoViewIfNeeded();await expect.poll(()=>events.filter(e=>e.event==='search_result_impression').length).toBe(1);
 const impression=events.find(e=>e.event==='search_result_impression')!;expect(impression.items).toEqual([{productId:'bbbbbbbbbbbbbbbbbbbbbbbb',position:1}]);expect(impression.query).toBeUndefined();
 await page.evaluate(()=>{localStorage.setItem('almina.optional-search-usage.v1','declined');window.dispatchEvent(new Event('almina-usage-change'));});
 const count=events.length;await page.locator('.product-card a').first().click();await page.waitForTimeout(300);expect(events).toHaveLength(count);
});


test('administrators can inspect search, manage vocabulary and queue reviewed phrases',async({page,request})=>{
 await reset(request);await login(page);await page.goto(adminOrigin+'/admin/search');
 await expect(page.getByRole('heading',{name:'Search',exact:true})).toBeVisible();await expect(page.getByText('Current provider: legacy.',{exact:false})).toBeVisible();
 await page.getByPlaceholder('Try sugar checking machine').fill('Synthetic');await page.getByRole('button',{name:'Run search',exact:true}).click();
 await expect(page.getByRole('table',{name:'Ranking explanation'})).toContainText('Synthetic care product');
 await page.getByRole('button',{name:'Queue staff-reviewed phrase for semantic preparation'}).click();await expect(page.getByRole('status').filter({hasText:'Approved phrase queued'})).toBeVisible();
 await page.getByRole('button',{name:'New synonym',exact:true}).click();
 await page.getByLabel('Synonym definition',{exact:true}).fill(JSON.stringify({key:'synthetic-synonym',type:'one_way',inputs:['daily test phrase'],outputs:['Synthetic'],enabled:true,locale:'en'}));
 await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Saved.'})).toBeVisible();
 await expect(page.locator('li').filter({hasText:'daily test phrase → Synthetic'})).toBeVisible();
});

for(const width of [360,390,768,1280])test(`search correction and results fit ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/search?q=dailyy');await expect(page.getByRole('link',{name:'Search the original phrase'})).toBeVisible();await expect(page.locator('.product-card')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`.verification-results/search-${width}.png`});
});
