import { test,expect } from './fixtures';
const productId='bbbbbbbbbbbbbbbbbbbbbbbb';
const user={id:'aaaaaaaaaaaaaaaaaaaaaaaa',email:'salon@example.invalid'};
const product={productId,sku:'PD_TRADE',name:'Everyday hand wash',categoryName:'Personal care',stock:24,images:[],price:{typeId:'salon',unitPriceMinor:700,minimumQuantity:2,quantityMultiple:2,maximumQuantity:20}};
for(const width of [360,768,1280])test(`private business ordering is responsive and preserves uncertain submissions at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});let accepted=false,attempt=0;const keys:string[]=[];
 await page.route('**/api/customer/**',route=>route.fulfill({json:{data:user}}));
 await page.route('**/api/wholesale/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/catalog'))return route.fulfill(accepted?{json:{data:{businessName:'Fixture Salon',typeName:'Salon',products:[product],nextCursor:null}}}:{status:403,json:{code:'FORBIDDEN'}});
  if(path.endsWith('/accept')){expect(route.request().postDataJSON().token).toBe('a'.repeat(43));accepted=true;return route.fulfill({json:{data:{accepted:true}}});}
  if(path.endsWith('/quote'))return route.fulfill({json:{data:{currency:'AED',policyVersion:'fixture',vatMode:'inclusive',lines:[],subtotalMinor:1400,discountMinor:0,taxMinor:67,deliveryFeeMinor:0,minimumOrderMinor:1000,totalMinor:1400},quoteHash:'b'.repeat(64)}});
  if(path.endsWith('/checkout')){keys.push(route.request().postDataJSON().idempotencyKey);attempt++;return route.fulfill(attempt===1?{status:503,json:{code:'SERVICE_UNAVAILABLE'}}:{json:{data:{orderId:'OD9001',totals:{totalMinor:1400}}}});}
  return route.fulfill({status:404,json:{}});
 });
 await page.goto('/wholesale?invite='+'a'.repeat(43));
 await expect(page.getByRole('heading',{name:'Pharmacy approval required'})).toBeVisible();
 await expect(page.getByText('AED 7.00',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Accept business invitation'}).click();
 await expect(page.getByRole('heading',{name:'Fixture Salon',exact:true})).toBeVisible();
 await expect(page).toHaveURL(/\/wholesale$/);
 await page.getByRole('spinbutton',{name:'Quantity for Everyday hand wash'}).fill('2');
 await page.getByLabel('Mobile number',{exact:true}).fill('0501234567');
 await page.getByLabel('City / area',{exact:true}).fill('Jazeera');
 await page.getByLabel('Street address',{exact:true}).fill('Fixture street');
 await page.getByRole('button',{name:'Review wholesale order'}).click();
 await expect(page.getByText('Total AED 14.00')).toBeVisible();
 await page.screenshot({path:`.verification-results/wholesale-${width}.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Place wholesale order'}).click();
 await expect(page.getByRole('button',{name:'Retry saved submission'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Place wholesale order'})).toBeDisabled();
 await page.reload();
 await page.getByRole('button',{name:'Retry saved submission'}).click();
 await expect(page.getByRole('heading',{name:'Order received · OD9001'})).toBeVisible();
 expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
});
test('corrupt saved wholesale submission blocks another checkout',async({page})=>{
 await page.addInitScript(({user})=>sessionStorage.setItem('almina.wholesale.pending.v1:'+user.id,'invalid'),{user});
 await page.route('**/api/customer/**',route=>route.fulfill({json:{data:user}}));
 await page.route('**/api/wholesale/catalog',route=>route.fulfill({json:{data:{businessName:'Fixture Salon',typeName:'Salon',products:[product],nextCursor:null}}}));
 await page.goto('/wholesale');
 await expect(page.getByRole('status')).toContainText('Contact the pharmacy');
 await expect(page.getByRole('spinbutton')).toBeDisabled();
 await expect(page.getByRole('button',{name:'Review wholesale order'})).toBeDisabled();
});
test('signed-out wholesale portal has no guest or public enrollment switch',async({page})=>{
 await page.route('**/api/customer/**',route=>route.fulfill(new URL(route.request().url()).pathname.endsWith('/options')?{json:{data:{emailEnabled:true,googleClientId:null}}}:{status:401,json:{}}));
 await page.goto('/wholesale');
 await expect(page.getByRole('heading',{name:'Wholesale, by invitation.'})).toBeVisible();
 await expect(page.getByText(/Continue as guest/i)).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue with email'})).toBeVisible();
 expect((await page.request.get('/wholesale')).headers()['x-robots-tag']).toBe('noindex, nofollow');
});

test('admin can configure a profile, verified business and invitation',async({page})=>{
 const {login,adminOrigin}=await import('./fixtures');await login(page);
 let accounts:unknown[]=[];
 await page.route('**/api/growth/admin/categories',route=>route.fulfill({json:{data:[]}}));
 await page.route('**/api/wholesale/admin/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/types'))return route.fulfill({json:{data:[{id:'salon',name:'Salon',active:true,allowMedicines:false,revision:1}]}});
  if(path.endsWith('/accounts')){if(route.request().method()==='POST'){const input=route.request().postDataJSON();expect(input.approval).toBe('approved');expect(input.scope).toBe('assigned');accounts=[{...input,revision:1,accepted:false}];return route.fulfill({json:{data:accounts[0]}});}return route.fulfill({json:{data:{items:accounts,nextCursor:null}}});}
  if(path.endsWith('/invite'))return route.fulfill({json:{data:{token:'a'.repeat(43),account:{...(accounts[0] as object),revision:2}}}});
  return route.fulfill({status:404,json:{}});
 });
 await page.goto(adminOrigin+'/admin/wholesale');
 await page.getByLabel('Business name',{exact:true}).fill('Fixture Salon');
 await page.getByLabel('Approved sign-in email',{exact:true}).fill('salon@example.invalid');
 await page.getByLabel('Business profile',{exact:true}).selectOption('salon');
 await page.getByLabel('Access status',{exact:true}).selectOption('approved');
 await page.getByLabel('Verification reference / check completed',{exact:true}).fill('Licence checked by pharmacy');
 await page.getByRole('button',{name:'Save business',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Business saved'})).toBeVisible();
 await page.getByRole('button',{name:'Create / replace invitation link'}).click();
 await expect(page.getByLabel('Private invitation link',{exact:true})).toHaveValue(adminOrigin+'/wholesale?invite='+'a'.repeat(43));
 await page.evaluate(()=>window.scrollTo(0,0));
 await page.screenshot({path:'.verification-results/wholesale-admin.png',fullPage:true});
 await page.setViewportSize({width:360,height:900});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'.verification-results/wholesale-admin-mobile.png',fullPage:true});
});

test('real gateway binds the admin invitation to the verified customer session',async({page,request})=>{
 const {login,reset,adminOrigin,commerceOrigin}=await import('./fixtures');await reset(request);await login(page);
 const headers={origin:adminOrigin,'x-csrf-protection':'1'};
 const post=(path:string,data:unknown)=>page.request.post(adminOrigin+'/api/wholesale/admin/'+path,{headers,data});
 expect((await post('types',{id:'salon',name:'Salon',active:true,allowMedicines:false,revision:0})).status()).toBe(200);
 expect((await post('accounts',{email:'shopper@example.invalid',businessName:'Gateway Salon',typeId:'salon',approval:'approved',verificationReference:'Synthetic verified business',scope:'assigned',productIds:[],categoryIds:[],revision:0})).status()).toBe(200);
 const invite=await post('invite',{email:'shopper@example.invalid',revision:1});expect(invite.status()).toBe(200);const token=(await invite.json()).data.token;
 expect((await page.request.get(adminOrigin+'/api/wholesale/catalog')).status()).toBe(401);
 let code='';
 await page.route('**/api/customer/options',route=>route.fulfill({json:{data:{googleClientId:null,emailEnabled:true}}}));
 await page.route('**/api/customer/email',async route=>{const response=await request.post(commerceOrigin+'/__fixture/customer-challenge');const value=await response.json();code=value.code;await route.fulfill({json:{data:{challenge:value.challenge}}});});
 await page.goto(adminOrigin+'/wholesale?invite='+token);
 await page.getByLabel('Email address',{exact:true}).fill('shopper@example.invalid');
 await page.getByRole('button',{name:'Continue with email',exact:true}).click();
 await expect(page.getByLabel('Six-digit code',{exact:true})).toBeVisible();
 await page.getByLabel('Six-digit code',{exact:true}).fill(code);
 await page.getByRole('button',{name:'Verify & sign in',exact:true}).click();
 await page.getByRole('button',{name:'Accept business invitation'}).click();
 await expect(page.getByRole('heading',{name:'Gateway Salon',exact:true})).toBeVisible();
 const catalog=await page.request.get(adminOrigin+'/api/wholesale/catalog');expect(catalog.status()).toBe(200);expect((await catalog.json()).data.products).toEqual([]);
 const customerCookie=(await page.context().cookies()).find(cookie=>cookie.name==='almina_customer');expect(customerCookie!.httpOnly).toBe(true);
 await page.reload();await expect(page.getByRole('heading',{name:'Gateway Salon',exact:true})).toBeVisible();
});
