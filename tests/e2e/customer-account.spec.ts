import { test, expect, adminOrigin, commerceOrigin, reset } from './fixtures';
import type { Page } from '@playwright/test';

async function accountFixture(page: Page, mode: 'ready' | 'unconfigured' | 'google-failure' = 'ready') {
  let signedIn = false;
  await page.route('https://accounts.google.com/gsi/client', async route => {
    if (mode === 'google-failure') { await route.abort(); return; }
    // Synthetic GIS adapter tests our callback integration; Google-owned authentication
    // and the actual provider popup require a configured OAuth client and human account.
    await route.fulfill({ contentType: 'text/javascript', body: `window.google={accounts:{id:{initialize:function(options){this.options=options;},renderButton:function(node,options){var button=document.createElement('div');button.setAttribute('role','button');button.tabIndex=0;button.textContent='Continue with Google';button.style.cssText='width:'+options.width+'px;min-height:44px;border:1px solid #dadce0;border-radius:24px;background:#fff;color:#1f1f1f;font-size:14px;font-weight:500;';button.onclick=()=>this.options.callback({credential:'synthetic-provider-token'});node.appendChild(button);}}}};` });
  });
  await page.route('**/api/customer/**', async route => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    const json = (status: number, data: unknown) => route.fulfill({ status, json: { data } });
    const user = { id: 'synthetic-customer', email: 'shopper@example.invalid', marketingEmail: false, marketingWhatsapp: false };
    if (action === 'options') return json(200, { googleClientId: mode === 'unconfigured' ? null : 'synthetic.apps.googleusercontent.com', emailEnabled: mode !== 'unconfigured' });
    if (action === 'me') return json(signedIn ? 200 : 401, signedIn ? user : null);
    if (action === 'email') { expect(route.request().postDataJSON().email).toBe('shopper@example.invalid'); return json(200, { challenge: 'a'.repeat(43) }); }
    if (action === 'verify') {
      expect(route.request().postDataJSON().challenge).toBe('a'.repeat(43));
      if (route.request().postDataJSON().code !== '123456') return json(401, null);
      signedIn = true; return json(200, user);
    }
    if (action === 'google') { expect(route.request().postDataJSON()).toEqual({ idToken: 'synthetic-provider-token' }); signedIn = true; return json(200, user); }
    if (action === 'logout') { signedIn = false; return route.fulfill({ status: 204 }); }
    if (action === 'orders') return json(503, null); // History outages must not discard sign-in.
    if (['saved', 'addresses', 'reminders'].includes(action!)) return json(200, action === 'saved' ? { ids: [] } : []);
    return json(503, null);
  });
}
for (const width of [360, 390, 768, 1280]) test(`email account flow handles codes, reload and logout at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await accountFixture(page);
  await page.goto(adminOrigin + '/account');
  await expect(page.getByRole('heading', { name: 'Welcome to Al Mina' })).toBeVisible();
  const panel=await page.locator('section[aria-labelledby="sign-in-heading"]').boundingBox();expect(panel!.width).toBeLessThanOrEqual(441);
  await page.getByLabel('Email address', { exact: true }).fill('shopper@example.invalid');
  await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Check your email', exact: true })).toBeVisible();
  await expect(page.getByLabel('Six-digit code', { exact: true })).toBeFocused();
  await page.screenshot({path:`outputs/customer-sign-in-polish-2026-10-20/code-${width}.png`});
  await expect(page.getByRole('button', { name: /Resend code in/ })).toBeDisabled();
  const verifyButton=page.getByRole('button',{name:'Verify & sign in',exact:true});
  await expect(verifyButton).toBeDisabled();
  const disabledBackground = await verifyButton.evaluate(element => getComputedStyle(element).backgroundColor);
  await verifyButton.hover({force:true});
  await expect(verifyButton).toHaveCSS('background-color', disabledBackground);
  await page.getByLabel('Six-digit code', { exact: true }).fill('000000');
  await page.getByRole('button', { name: 'Verify & sign in', exact: true }).click();
  await expect(page.getByRole('alert').filter({hasText:'incorrect'})).toBeVisible();
  await page.getByRole('button', { name: 'Change email', exact: true }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue('shopper@example.invalid');
  await expect(page.getByLabel('Email address', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Continue with email', exact: true }).click();
  await page.getByLabel('Six-digit code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify & sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your Al Mina account', exact: true })).toBeVisible();
  await expect(page.getByText('Your account is signed in, but orders could not load.', { exact: false })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Your Al Mina account', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Al Mina', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const logo=await page.locator('.brand-logo').boundingBox(),area=await page.locator('.header-location').boundingBox();
  expect(logo).not.toBeNull();expect(area).not.toBeNull();expect(area!.x).toBeGreaterThanOrEqual(logo!.x+logo!.width);
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({ path: `outputs/customer-sign-in-polish-2026-10-20/sign-in-${width}.png` });
});
test('Google button callback signs in and can render again after logout', async ({ page }) => {
  await accountFixture(page); await page.goto(adminOrigin + '/account');
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your Al Mina account', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your Al Mina account', exact: true })).toBeVisible();
});
test('provider failure keeps email available; missing setup offers honest guest fallback', async ({ page }) => {
  await accountFixture(page, 'google-failure'); await page.goto(adminOrigin + '/account');
  await expect(page.getByText('Google sign-in could not load.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with email', exact: true })).toBeEnabled();
  await page.unrouteAll({ behavior: 'wait' }); await accountFixture(page, 'unconfigured'); await page.reload();
  await expect(page.getByText('Account sign-in is not connected yet.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue as a guest', exact: false })).toHaveAttribute('href', '/checkout');
  await page.getByRole('link', { name: 'account privacy notice', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Privacy policy', exact: true })).toBeVisible();
});

test('email verification uses the real gateway, HttpOnly session, reload and logout',async({page,request})=>{
 await reset(request);let deliveredCode='';
 await page.route('**/api/customer/options',route=>route.fulfill({json:{data:{googleClientId:null,emailEnabled:true}}}));
 await page.route('**/api/customer/email',async route=>{const result=await request.post(commerceOrigin+'/__fixture/customer-challenge');expect(result.ok()).toBeTruthy();const value=await result.json();deliveredCode=value.code;await route.fulfill({json:{data:{challenge:value.challenge}}});});
 await page.goto(adminOrigin+'/account');await page.getByLabel('Email address',{exact:true}).fill('shopper@example.invalid');
 await page.getByRole('button',{name:'Continue with email',exact:true}).click();await expect(page.getByLabel('Six-digit code',{exact:true})).toBeVisible();
 await page.getByLabel('Six-digit code',{exact:true}).fill(deliveredCode);await page.getByRole('button',{name:'Verify & sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your Al Mina account',exact:true})).toBeVisible();
 const cookie=(await page.context().cookies()).find(value=>value.name==='almina_customer');expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Lax');
 expect(await page.evaluate(()=>document.cookie)).not.toContain('almina_customer');
 await page.reload();await expect(page.getByText('Signed in as shopper@example.invalid',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Welcome to Al Mina',exact:true})).toBeVisible();
 expect((await page.request.get(adminOrigin+'/api/customer/me')).status()).toBe(401);
});

test('late purchase history cannot repopulate the next sign-in after logout',async({page})=>{
 await accountFixture(page);let resolveFirst:(()=>void)|undefined,resolveSecond:(()=>void)|undefined,count=0;
 await page.route('**/api/customer/orders',async route=>{count++;if(count===1){await new Promise<void>(resolve=>{resolveFirst=resolve;});await route.fulfill({json:{data:[{orderId:'OD-OLD',status:'confirmed',createdAt:'2026-10-20',totals:{totalMinor:100,lines:[{productId:'old-private-id',name:'Previous customer item',quantity:1}]}}]}});}else{await new Promise<void>(resolve=>{resolveSecond=resolve;});await route.fulfill({json:{data:[]}});}});
 await page.goto(adminOrigin+'/account');await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your Al Mina account',exact:true})).toBeVisible();await expect.poll(()=>Boolean(resolveFirst)).toBe(true);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Welcome to Al Mina',exact:true})).toBeVisible();resolveFirst!();
 await page.getByRole('button',{name:'Continue with Google',exact:true}).click();await expect(page.getByRole('heading',{name:'Your Al Mina account',exact:true})).toBeVisible();await expect.poll(()=>Boolean(resolveSecond)).toBe(true);
 await expect(page.getByText('Previous customer item',{exact:false})).toHaveCount(0);resolveSecond!();
});

test('shared controls keep keyboard focus, required fields and checkbox labels usable', async ({page}) => {
  await accountFixture(page); await page.goto(adminOrigin+'/account');
  const email=page.getByLabel('Email address',{exact:true});
  await email.focus();
  expect(await email.evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');
  expect(await email.evaluate(el=>getComputedStyle(el).fontSize)).toBe('16px');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Continue with email',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
  const checkbox=page.getByRole('checkbox',{name:'Set as my default delivery address',exact:true});
  await expect(checkbox).not.toBeChecked();
  await page.getByText('Set as my default delivery address',{exact:true}).click();
  await expect(checkbox).toBeChecked();
  await checkbox.focus();await page.keyboard.press('Space');await expect(checkbox).not.toBeChecked();
  await expect(page.getByLabel('Recipient name',{exact:true})).toHaveAttribute('required','');
  await expect(page.getByLabel('Street address',{exact:true})).toHaveAttribute('autocomplete','street-address');
  await page.screenshot({path:'outputs/storefront-controls-2026-10-20/account-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:900});
  await page.screenshot({path:'outputs/storefront-controls-2026-10-20/account-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('Google-only wholesale sign-in keeps the invitation and never offers retail enrollment',async({page})=>{
 await accountFixture(page);
 await page.route('**/api/customer/options',route=>route.fulfill({json:{data:{googleClientId:'synthetic.apps.googleusercontent.com',emailEnabled:false}}}));
 let accepted=false;
 await page.route('**/api/wholesale/**',async route=>{
  if(new URL(route.request().url()).pathname.endsWith('/accept')){expect(route.request().postDataJSON()).toEqual({token:'a'.repeat(43)});accepted=true;return route.fulfill({json:{data:{accepted:true}}});}
  return route.fulfill(accepted?{json:{data:{businessName:'Google Salon',typeName:'Salon',products:[],nextCursor:null}}}:{status:403,json:{code:'FORBIDDEN'}});
 });
 await page.goto(adminOrigin+'/wholesale?invite='+'a'.repeat(43));
 await expect(page.getByRole('heading',{name:'Business sign-in',exact:true})).toBeVisible();
 await expect(page.getByText('or continue with email',{exact:true})).toHaveCount(0);
 await expect(page.getByText('Business sign-in is not available.',{exact:false})).toHaveCount(0);
 await expect(page.getByRole('link',{name:'Continue as a guest',exact:false})).toHaveCount(0);
 await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Pharmacy approval required',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Accept business invitation',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Google Salon',exact:true})).toBeVisible();
 await expect(page.getByText('Wholesale access is not active for this account. Contact the pharmacy.',{exact:true})).toHaveCount(0);
 await expect(page).toHaveURL(/\/wholesale$/);
 await page.reload();await expect(page.getByRole('heading',{name:'Google Salon',exact:true})).toBeVisible();
});

test('Google origin errors do not misdirect a Google-only customer to unavailable email codes',async({page})=>{
 await accountFixture(page);
 await page.route('**/api/customer/options',route=>route.fulfill({json:{data:{googleClientId:'synthetic.apps.googleusercontent.com',emailEnabled:false}}}));
 await page.route('**/api/customer/google',route=>route.fulfill({status:403,json:{error:'Access denied'}}));
 await page.goto(adminOrigin+'/account');await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
 const error=page.getByRole('region',{name:'Welcome to Al Mina',exact:true}).getByRole('alert');
 await expect(error).toContainText('securely');
 await expect(error).not.toContainText('email code');
});

test('retail purchase history labels wholesale orders and does not send them to retail buy again',async({page})=>{
 await accountFixture(page);
 await page.route('**/api/customer/orders',route=>route.fulfill({json:{data:[{orderId:'OD-TRADE',channel:'wholesale',status:'confirmed',createdAt:'2026-10-22',totals:{totalMinor:1400,lines:[{productId:'bbbbbbbbbbbbbbbbbbbbbbbb',name:'Trade hand wash',quantity:2}]}},{orderId:'OD-RETAIL',status:'confirmed',createdAt:'2026-10-22',totals:{totalMinor:2500,lines:[{productId:'bbbbbbbbbbbbbbbbbbbbbbbb',name:'Retail hand wash',quantity:1}]}}]}}));
 await page.goto(adminOrigin+'/account');await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
 const trade=page.getByRole('article').filter({hasText:'OD-TRADE'}),retail=page.getByRole('article').filter({hasText:'OD-RETAIL'});
 await expect(trade).toContainText('Wholesale · confirmed');
 await expect(trade.getByRole('button',{name:'Buy available items again'})).toHaveCount(0);
 await expect(retail.getByRole('button',{name:'Buy available items again'})).toBeVisible();
});

for(const width of [360,390,768,1280])test(`Arabic account sign-in and reload at ${width}px`,async({page,context})=>{
 await context.addCookies([{name:'almina_lang',value:'ar',url:adminOrigin}]);await page.setViewportSize({width,height:900});await accountFixture(page);
 const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));
 await page.goto(adminOrigin+'/account');await expect(page.locator('.storefront-shell')).toHaveAttribute('dir','rtl');
 await expect(page.getByRole('heading',{name:'مرحباً بك في الميناء'})).toBeVisible();
 await page.getByLabel('البريد الإلكتروني',{exact:true}).fill('shopper@example.invalid');
 await page.getByRole('button',{name:'المتابعة بالبريد الإلكتروني',exact:true}).click();
 await expect(page.getByRole('heading',{name:'تحقّق من بريدك الإلكتروني',exact:true})).toBeVisible();
 await expect(page.getByLabel('رمز مكوّن من ستة أرقام',{exact:true})).toBeFocused();
 await page.reload();await expect(page.getByRole('heading',{name:'مرحباً بك في الميناء'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(failures).toEqual([]);
});

for (const locale of ['en', 'ar'] as const) {
  test(`the account privacy link has a visible cue and keyboard focus in ${locale}`, async ({ page, context, browserName }) => {
    const ar = locale === 'ar';
    await context.addCookies([{ name: 'almina_lang', value: locale, url: adminOrigin }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await accountFixture(page);
    await page.goto(adminOrigin + '/account');

    const privacy = page.getByRole('link', { name: ar ? 'إشعار خصوصية الحساب' : 'account privacy notice', exact: true });
    const submit = page.getByRole('button', { name: ar ? 'المتابعة بالبريد الإلكتروني' : 'Continue with email', exact: true });
    await expect(privacy).toHaveCSS('text-decoration-line', 'underline');
    await privacy.hover();
    await expect(privacy).toHaveCSS('text-decoration-line', 'underline');
    await submit.focus();
    await page.keyboard.press(browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab');
    await expect(privacy).toBeFocused();
    await expect(privacy).toHaveCSS('outline-style', 'solid');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(privacy).toBeFocused();
    await privacy.press('Enter');
    await expect(page).toHaveURL(adminOrigin + '/privacy');
  });
}
