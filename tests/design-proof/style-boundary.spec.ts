import {test,expect,type Page} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const origin='http://127.0.0.1:4896';
const root='.verification-results/storefront-replacement/p2-02';
mkdirSync(root,{recursive:true});
test.beforeEach(async({page})=>{await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort('blockedbyclient'));});
async function computed(page:Page, selector:string){return page.locator(selector).evaluate(el=>{const c=getComputedStyle(el);return {color:c.color,background:c.backgroundColor,border:c.borderColor,outline:c.outlineColor,cursor:c.cursor,opacity:c.opacity,direction:c.direction};});}
for(const lang of ['en','ar'] as const){
 test(`${lang} compiled foreground, variant/state precedence and portal ancestry survive retained route CSS`,async({page,context})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:1440,height:900});
  await context.addCookies([{name:'almina_lang',value:lang,url:origin}]);
  await page.goto('/design-proof/style-contract');
  await expect(page.getByTestId('foreground-probe')).toHaveCSS('color','rgb(32, 42, 48)');
  await expect(page.getByTestId('primary-utility')).toHaveCSS('background-color','rgb(255, 90, 95)');
  await expect(page.getByTestId('primary-utility')).toHaveCSS('color','rgb(32, 42, 48)');
  const before=await computed(page,'[data-testid=primary-utility]');
  await page.getByTestId('primary-utility').focus();await page.getByTestId('primary-utility').press('Tab');await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('primary-utility')).toHaveCSS('outline-color','rgb(18, 93, 135)');
  await expect(page.getByTestId('primary-utility')).toHaveCSS('outline-width','3px');
  const added=page.getByTestId('added-variant');await added.click();await added.hover();
  await expect(added).toHaveCSS('background-color','rgb(234, 243, 239)');
  await expect(added).toHaveCSS('border-color','rgb(38, 96, 77)');
  await expect(page.getByTestId('disabled-variant')).toHaveCSS('background-color','rgb(231, 235, 237)');
  await expect(page.getByTestId('pending-variant')).toHaveCSS('background-color','rgb(255, 90, 95)');
  await expect(page.getByTestId('pending-variant')).toHaveCSS('cursor','progress');
  await expect(page.getByTestId('ghost-variant')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  await page.getByTestId('ghost-variant').hover();await expect(page.getByTestId('ghost-variant')).toHaveCSS('background-color','rgb(240, 243, 244)');
  await page.getByTestId('outline-variant').hover();await expect(page.getByTestId('outline-variant')).toHaveCSS('background-color','rgb(240, 243, 244)');
  await page.getByTestId('secondary-variant').hover();await expect(page.getByTestId('secondary-variant')).toHaveCSS('background-color','rgb(230, 237, 239)');
  await page.getByTestId('normal-field').hover();await expect(page.getByTestId('normal-field')).toHaveCSS('border-color','rgb(18, 93, 135)');
  await page.mouse.move(0,0);await expect(page.getByTestId('normal-field')).toHaveCSS('border-color','rgb(124, 137, 143)');
  const invalid=page.getByTestId('invalid-variant');await invalid.press('Tab');await invalid.focus();
  await expect(invalid).toHaveCSS('border-color','rgb(161, 29, 49)');
  await expect(invalid).toHaveCSS('outline-color','rgb(161, 29, 49)');
  await expect(invalid).toHaveCSS('outline-width','3px');
  const testedStates={added:await computed(page,'[data-testid=added-variant]'),pending:await computed(page,'[data-testid=pending-variant]'),disabled:await computed(page,'[data-testid=disabled-variant]')};
  // Load actual incumbent stylesheet through a client transition, then return.
  await page.locator('footer a[href="/contact"]').click();await expect(page).toHaveURL(/\/contact$/);
  await page.goBack();await expect(page.getByTestId('primary-utility')).toBeVisible();
  expect(await computed(page,'[data-testid=primary-utility]')).toEqual(before);
  const search=page.getByRole('combobox');await search.focus();await expect(search).toHaveCSS('outline-style','none');await expect(page.getByRole('search')).toHaveCSS('outline-width','2px');await search.press('Escape');
  const desktop=page.getByTestId('desktop-portal').getByRole('button').first();await desktop.click();
  const popover=page.locator('.storefront-mega-panel');await expect(popover).toBeVisible();
  expect(await popover.evaluate(el=>!!el.closest('[data-proof-root]'))).toBeTruthy();
  await expect(popover).toHaveCSS('color','rgb(32, 42, 48)');
  await expect(popover).toHaveCSS('direction',lang==='ar'?'rtl':'ltr');
  await page.keyboard.press('Escape');await expect(desktop).toBeFocused();
  await page.setViewportSize({width:390,height:844});
  const mobile=page.getByTestId('mobile-portal').getByRole('button').first();await mobile.click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el=>!!el.closest('[data-proof-root]'))).toBeTruthy();
  await expect(dialog).toHaveCSS('direction',lang==='ar'?'rtl':'ltr');
  await page.keyboard.press('Escape');await expect(mobile).toBeFocused();
  const sheets=await page.locator('link[rel=stylesheet]').evaluateAll(els=>els.map(el=>(el as HTMLLinkElement).href));
  const css=(await Promise.all(sheets.map(async url=>(await page.request.get(url)).text()))).join('\n');
  expect(css).toMatch(/\.text-primary-foreground\s*\{\s*color:\s*var\(--ui-primary-foreground/);
  writeFileSync(`${root}/state-${lang}.json`,JSON.stringify({before,...testedStates,compiledRule:css.match(/\.text-primary-foreground\s*\{[^}]+}/)?.[0]},null,2)+'\n');
 });
 test(`${lang} actual save, pending/in-cart/unavailable purchase and invalid dialog compute owned states`,async({page,context})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await context.addCookies([{name:'almina_lang',value:lang,url:origin}]);
  await page.goto('/design-proof/products');const card=page.locator('article').first();const save=card.locator('[data-store-control=save]');await save.click();await save.hover();
  await expect(save).toHaveAttribute('aria-pressed','true');await expect(save).toHaveCSS('background-color','rgb(255, 242, 243)');
  await page.locator('button[class*=location]').click();const dialog=page.locator('dialog');await dialog.locator('[name=city]').fill('   ');await dialog.locator('button[type=submit]').click();
  await expect(dialog.locator('[name=city]')).toHaveAttribute('aria-invalid','true');await expect(dialog.locator('[name=city]')).toHaveCSS('border-color','rgb(161, 29, 49)');await page.keyboard.press('Escape');
  await page.goto('/design-proof/products/sample--PD9901');let release!:()=>void;const held=new Promise<void>(r=>{release=r;});
  await page.route('**/design-proof/products/sample--PD9901',async route=>{if(route.request().method()==='POST')await held;await route.continue();});
  const add=page.locator('div[class*=dock] [data-store-control=purchase]');try{await add.press('Enter');await expect(add).toHaveAttribute('aria-busy','true');await expect(add).toHaveCSS('background-color','rgb(255, 90, 95)');await expect(add).toHaveCSS('cursor','progress');release();await expect(page.locator('div[class*=dock] [data-store-control=quantity][data-store-state=added]')).toHaveCSS('background-color','rgb(234, 243, 239)');}finally{release();}
  await page.goto('/design-proof/products/sample--PD9902');await expect(page.locator('div[class*=dock] [data-store-control=purchase]')).toBeDisabled();await expect(page.locator('div[class*=dock] [data-store-control=purchase]')).toHaveCSS('background-color','rgb(231, 235, 237)');
 });
}

test('existing stress-sample disabled controls retain the migrated unavailable role',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const path of ['/design-proof/stress','/design-proof/stress?sample=complete']) {
  await page.goto(path);const buttons=page.locator('[data-store-control=purchase]:disabled');
  expect(await buttons.count()).toBeGreaterThan(0);
  for(const button of await buttons.all())await expect(button).toHaveCSS('background-color','rgb(231, 235, 237)');
 }
});
