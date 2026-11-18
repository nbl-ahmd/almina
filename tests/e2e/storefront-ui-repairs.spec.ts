import {test,expect,productId} from './fixtures';
for(const locale of ['en','ar'] as const)for(const width of[390,1440])test(`${locale} controls and cart presentation remain consistent at ${width}px`,async({page,context})=>{
 await context.addCookies([{name:'almina_lang',value:locale,url:'http://127.0.0.1:4710'}]);
 await page.setViewportSize({width,height:900});await page.goto('/products');
 const submit=page.locator('[data-slot="search-submit"]');
 const geometry=await submit.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{width:r.width,height:r.height,radius:s.borderRadius};});
 expect(geometry.height).toBeGreaterThanOrEqual(44);expect(geometry.radius).toBe('8px');
 expect(await page.locator('[data-slot="delivery-selector"]').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
 await page.locator('[data-slot="header-search-input"]').fill('Daily');
 const panel=page.locator('[data-slot="search-panel"]');await expect(panel).toBeVisible();
 if(width<768)expect(await panel.evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(width-40);
 await page.keyboard.press('Escape');
 // Stored display hints must not set the displayed server catalogue subtotal.
 await page.evaluate(id=>localStorage.setItem('almina.cart.v1',JSON.stringify([{id,quantity:2,price:0}])),productId);
 await page.goto('/cart');
 await expect(page.locator('.cart-subtotal [role="img"]')).toHaveAccessibleName(locale==='ar'?new Intl.NumberFormat('ar-AE',{style:'currency',currency:'AED'}).format(40):'AED 40.00');
 await expect(page.locator('.cart-line-total [role="img"]')).toHaveAccessibleName(locale==='ar'?new Intl.NumberFormat('ar-AE',{style:'currency',currency:'AED'}).format(40):'AED 40.00');
 const next=page.locator('[data-cart-next]:visible');await expect(next).toHaveCount(1);
 if(width<768){await expect(page.locator('.mobile-nav')).toBeHidden();await expect(page.locator('.cart-mobile-bar')).toHaveCSS('position','fixed');await expect(page.locator('.cart-mobile-bar')).toHaveCSS('bottom','0px');}
 const increase=page.getByRole('button',{name:locale==='ar'?'زيادة كمية Daily Care':'Increase Daily Care quantity'});await increase.click();
 await expect(page.locator('.cart-subtotal [role="img"]')).toHaveAccessibleName(locale==='ar'?new Intl.NumberFormat('ar-AE',{style:'currency',currency:'AED'}).format(60):'AED 60.00');
 await page.reload();await expect(page.locator('.cart-subtotal [role="img"]')).toHaveAccessibleName(locale==='ar'?new Intl.NumberFormat('ar-AE',{style:'currency',currency:'AED'}).format(60):'AED 60.00');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/checkout');
 await expect(page.locator('.cart-summary')).not.toContainText(locale==='ar'?'بعد إدخال تفاصيل التوصيل':'after you enter your delivery details');
 await expect(page.locator('.cart-summary')).toContainText(locale==='ar'?'غير متاح':'unavailable');
});
test('secondary phone navigation collapses without losing desktop links',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto('/');
 const footer=page.locator('.sf-footer-group').first();await expect(footer).not.toHaveAttribute('open');
 await footer.locator('summary').click();await expect(footer.getByRole('link',{name:'Shop by category',exact:true})).toBeVisible();
 await page.setViewportSize({width:1440,height:900});await expect(footer).toHaveAttribute('open','');
 await expect(footer.getByRole('link',{name:'Shop by category',exact:true})).toBeVisible();
});
