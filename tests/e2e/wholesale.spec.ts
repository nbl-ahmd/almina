import { test,expect } from './fixtures';
const productId='bbbbbbbbbbbbbbbbbbbbbbbb';
const user={id:'aaaaaaaaaaaaaaaaaaaaaaaa',email:'salon@example.invalid'};
const product={productId,sku:'PD_TRADE',name:'Everyday hand wash',categoryName:'Personal care',stock:24,images:[],price:{typeId:'salon',unitPriceMinor:700,minimumQuantity:2,quantityMultiple:2,maximumQuantity:20}};
for(const width of [360,768,1280])test(`private business ordering is responsive and preserves uncertain submissions at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});let accepted=false,attempt=0,signedIn=true;const keys:string[]=[];
 await page.route('https://accounts.google.com/gsi/client',route=>route.fulfill({contentType:'text/javascript',body:`window.google={accounts:{id:{initialize:function(options){this.options=options;},renderButton:function(node){var button=document.createElement('div');button.setAttribute('role','button');button.tabIndex=0;button.textContent='Continue with Google';button.onclick=()=>this.options.callback({credential:'synthetic-provider-token'});node.appendChild(button);}}}};`}));
 await page.route('**/api/customer/**',route=>{
  const action=new URL(route.request().url()).pathname.split('/').at(-1);
  if(action==='options')return route.fulfill({json:{data:{googleClientId:'synthetic.apps.googleusercontent.com',emailEnabled:false}}});
  if(action==='logout'){signedIn=false;return route.fulfill({status:204});}
  if(action==='google')signedIn=true;
  return route.fulfill(signedIn?{json:{data:user}}:{status:401,json:{}});
 });
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
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Fixture Salon',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Order received · OD9001',exact:true})).toHaveCount(0);
 await expect(page.getByRole('spinbutton',{name:'Quantity for Everyday hand wash',exact:true})).toHaveValue('0');
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
  if(path.endsWith('/accounts')){if(route.request().method()==='POST'){const input=route.request().postDataJSON();expect(input.approval).toBe('approved');expect(input.scope).toBe('assigned');expect(input.tradeLicense).toBe('SALON-001');expect(input.taxRegistrationNumber).toBe('100000000000003');accounts=[{...input,revision:1,accepted:false}];return route.fulfill({json:{data:accounts[0]}});}return route.fulfill({json:{data:{items:accounts,nextCursor:null}}});}
  if(path.endsWith('/invite'))return route.fulfill({json:{data:{token:'a'.repeat(43),account:{...(accounts[0] as object),revision:2}}}});
  return route.fulfill({status:404,json:{}});
 });
 await page.goto(adminOrigin+'/admin/wholesale');
 await page.getByLabel('Business name',{exact:true}).fill('Fixture Salon');
 await page.getByLabel('Business contact name',{exact:true}).fill('Fixture Buyer');
 await page.getByLabel('Business phone',{exact:true}).fill('+971501234567');
 await page.getByLabel('Trade licence number',{exact:true}).fill('SALON-001');
 await page.getByLabel('Tax registration number (15 digits, optional)',{exact:true}).fill('100000000000003');
 await page.getByLabel('Approved sign-in email',{exact:true}).fill('salon@example.invalid');
 await page.getByLabel('Business profile',{exact:true}).selectOption('salon');
 await page.getByLabel('Access status',{exact:true}).selectOption('approved');
 await page.getByLabel('Verification reference / check completed',{exact:true}).fill('Licence checked by pharmacy');
 await page.getByRole('button',{name:'Save business',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Business saved'})).toBeVisible();
 await page.getByRole('button',{name:'Create and email invitation'}).click();
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

test('business account shows verified details, trade history and prefills delivery at 390px',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 const profile={businessName:'Fixture Salon',typeName:'Salon',contactName:'Fixture Buyer',phone:'0501234567',tradeLicense:'SALON-001',taxRegistrationNumber:'100000000000003',deliveryAddress:'Trade fixture street',city:'Jazeera',emirate:'Ras al-Khaimah'};
 const totals={currency:'AED',policyVersion:'fixture',vatMode:'inclusive',lines:[{productId,sku:'PD_TRADE',barcode:null,name:product.name,quantity:2,unitPriceMinor:700,salePriceMinor:null,taxRateBps:500,taxMinor:67,discountMinor:0,lineTotalMinor:1400}],subtotalMinor:1400,discountMinor:0,taxMinor:67,deliveryFeeMinor:0,minimumOrderMinor:1000,totalMinor:1400};
 await page.route('**/api/customer/**',route=>route.fulfill({json:{data:user}}));
 await page.route('**/api/wholesale/**',route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  if(path.endsWith('/catalog'))return route.fulfill({json:{data:{businessName:profile.businessName,typeName:'Salon',products:[product],nextCursor:null}}});
  if(path.endsWith('/account'))return route.fulfill({json:{data:profile}});
  if(path.endsWith('/orders'))return route.fulfill({json:{data:{items:[{orderId:url.search?'OD-OLD':'OD-TRADE',status:'confirmed',createdAt:'2026-10-22T05:00:00Z',totals}],nextCursor:url.search?null:'aaaaaaaaaaaaaaaaaaaaaaaa'}}});
  return route.fulfill({status:404,json:{}});
 });
 await page.goto('/wholesale');
 await page.getByRole('button',{name:'Business account & orders',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your business details'})).toBeVisible();
 await expect(page.getByText('SALON-001',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'OD-TRADE',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Load older orders'}).click();
 await expect(page.getByRole('heading',{name:'OD-OLD',exact:true})).toBeVisible();
 await page.screenshot({path:'.verification-results/wholesale-account-390.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Use business delivery details'}).click();
 await expect(page.getByLabel('Contact name',{exact:true})).toHaveValue('Fixture Buyer');
 await expect(page.getByLabel('Street address',{exact:true})).toHaveValue(profile.deliveryAddress);
 await page.reload();
 await page.getByRole('button',{name:'Business account & orders',exact:true}).click();
 await expect(page.getByRole('heading',{name:'OD-TRADE',exact:true})).toBeVisible();
});

test('product visibility controls submit selected business types and preserve them on reload',async({page})=>{
 const {login,adminOrigin,reset,openMoreDetails,saveProductButton,savedToast,chooseBrand}=await import('./fixtures');await reset(page.request);await login(page);
 for(const id of ['salon','pharmacy'])expect((await page.request.post(adminOrigin+'/api/wholesale/admin/types',{headers:{origin:adminOrigin,'x-csrf-protection':'1'},data:{id,name:id==='salon'?'Salon':'Pharmacy',active:true,allowMedicines:false,revision:0}})).ok()).toBe(true);
 await page.goto(adminOrigin+'/admin/products/'+productId);
 await chooseBrand(page);await openMoreDetails(page);
 await page.getByRole('switch',{name:'Wholesale',exact:true}).click();
 await page.getByRole('switch',{name:'Retail',exact:true}).click();
 await page.getByRole('checkbox',{name:'Set wholesale price for Salon',exact:true}).check();
 await page.getByLabel('Wholesale price — Salon (AED)',{exact:true}).fill('12.50');
 await page.getByRole('combobox',{name:'Wholesale business types',exact:true}).selectOption('selected');
 await page.getByLabel('Salon',{exact:true}).check();
 for(const width of [360,390,768,1280]){
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 const saved=page.waitForResponse(response=>response.url().includes('/api/admin/products/'+productId)&&response.request().method()==='PUT');
 await saveProductButton(page).click();
 expect((await saved).ok()).toBe(true);
 await expect(savedToast(page)).toBeVisible();
 await page.reload();await openMoreDetails(page);
 await expect(page.getByRole('switch',{name:'Wholesale',exact:true})).toHaveAttribute('aria-checked','true');
 await expect(page.getByRole('switch',{name:'Retail',exact:true})).toHaveAttribute('aria-checked','false');
 await expect(page.getByLabel('Wholesale price — Salon (AED)',{exact:true})).toHaveValue('12.50');
 await expect(page.getByRole('combobox',{name:'Wholesale business types',exact:true})).toHaveValue('selected');
 await expect(page.getByLabel('Salon',{exact:true})).toBeChecked();
 await expect(page.getByLabel('Pharmacy',{exact:true})).not.toBeChecked();
 await page.screenshot({path:'.verification-results/admin-product-audience-1280.png',fullPage:true});
 await page.goto(adminOrigin+'/admin/products/new');await openMoreDetails(page);
 await expect(page.getByRole('switch',{name:'Retail',exact:true})).toHaveAttribute('aria-checked','true');
 await expect(page.getByRole('switch',{name:'Wholesale',exact:true})).toHaveAttribute('aria-checked','false');
});

for(const width of [360,390,768,1280])test(`Arabic wholesale catalogue preserves names and quantities at ${width}px`,async({page,context})=>{
 await context.addCookies([{name:'almina_lang',value:'ar',url:'http://127.0.0.1:4710'}]);await page.setViewportSize({width,height:900});
 await page.route('**/api/customer/me',route=>route.fulfill({json:{data:user}}));
 await page.route('**/api/wholesale/catalog',route=>route.fulfill({json:{data:{businessName:'Fixture Salon',typeName:'Salon',products:[product],nextCursor:null}}}));
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('/wholesale');
 await expect(page.locator('.storefront-shell')).toHaveAttribute('dir','rtl');await expect(page.getByRole('heading',{name:'Fixture Salon',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'تواصل مع الصيدلية',exact:true})).toBeVisible();
 await page.getByRole('spinbutton',{name:'الكمية لـ Everyday hand wash'}).fill('2');
 await expect(page.getByRole('spinbutton',{name:'الكمية لـ Everyday hand wash'})).toHaveValue('2');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
