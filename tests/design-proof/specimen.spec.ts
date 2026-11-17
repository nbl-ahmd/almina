import {test,expect} from '@playwright/test';
const origin='http://127.0.0.1:4896';
test.beforeEach(async({page})=>{await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort('blockedbyclient'));});
for(const lang of ['en','ar'] as const){
 test(`${lang} complete specimen has one page heading, all component groups and responsive embedded dock`,async({page,context})=>{
  await context.addCookies([{name:'almina_lang',value:lang,url:origin}]);await page.goto('/design-proof/components');await expect(page.locator('main h1')).toHaveCount(1);
  for(const id of ['context','controls','merchandising','cards','product','disclosure','sheets','feedback','cart'])await expect(page.locator('#'+id)).toBeVisible();
  await expect(page.locator('#cards article')).toHaveCount(7);
  for(const width of [320,390,768,1440,390]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await expect(page.locator('[class*=embeddedDock]')).toHaveCSS('position','static');}
  expect(await page.locator('[data-proof-root]').evaluate(el=>el.style.getPropertyValue('--proof-dock-clearance'))).toBe('');
  const error=page.getByTestId('feedback-error');await error.click();await expect(page.locator('#feedback [data-store-notice=error] [role=alert]')).toBeVisible();
  await page.getByTestId('feedback-loading').click();await expect(page.locator('#feedback [data-store-notice=loading]')).toHaveAttribute('aria-busy','true');
  await page.getByTestId('feedback-success').click();await expect(page.locator('#feedback [role=status]')).toBeVisible();
  await expect(page.getByTestId('feedback-success')).toHaveCSS('background-color','rgb(230, 237, 239)');
  const summary=page.locator('#disclosure summary');await summary.focus();await page.keyboard.press('Enter');await expect(page.locator('#disclosure details')).toHaveAttribute('open','');
  const menu=page.locator('#sheets button[aria-label][aria-haspopup=dialog]');await menu.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeFocused();
 });
 test(`${lang} specimen reuses real gallery/pack and shared device-cart behavior`,async({page,context})=>{
  await context.addCookies([{name:'almina_lang',value:lang,url:origin}]);await page.goto('/design-proof/components');
  await page.locator('#cards article').first().locator('[data-store-control=purchase]').click();await expect(page.locator('#cart [class*=cartLine]')).toHaveCount(1);
  await expect(page.locator('#cart [class*=cartLine] output')).toHaveText('1');
  await page.locator('#cart button[class*=remove]').click();await expect(page.locator('#cart [class*=cartLine]')).toHaveCount(0);
  await page.locator('#product').getByRole('button',{name:lang==='en'?'View product photo 2':'عرض صورة المنتج 2',exact:true}).click();
  await expect(page.locator('#product [class*=galleryImage] img').last()).toHaveAttribute('src',/proof-image-b/);
  const current=page.locator('#product [data-store-control=option][aria-current=page]');await expect(current).toHaveCSS('background-color','rgb(230, 237, 239)');
  await page.locator('#product [data-store-control=option]').filter({hasText:'Large'}).click();await expect(page).toHaveURL(/PD9902/);await expect(page.locator('div[class*=dock] [data-store-control=purchase]')).toBeDisabled();
 });
}
