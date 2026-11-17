import {test,expect,type Locator} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin='http://127.0.0.1:4896';
const folder='.verification-results/storefront-replacement/p2-04';mkdirSync(folder,{recursive:true});
function ratio(a:number[],b:number[]){const luminance=(c:number[])=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i]!,0);const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
async function pairing(el:Locator){return el.evaluate(e=>{const rgb=(s:string)=>(s.match(/[\d.]+/g)||[]).map(Number);const over=(fg:number[],bg:number[])=>fg.slice(0,3).map((v,i)=>v*(fg[3]??1)+bg[i]!*(1-(fg[3]??1)));const ancestors:Element[]=[];let n:Element|null=e;while(n){ancestors.push(n);n=n.parentElement;}let bg=[255,255,255];for(const a of ancestors.reverse())bg=over(rgb(getComputedStyle(a).backgroundColor),bg);const c=getComputedStyle(e);return{fg:over(rgb(c.color),bg),bg,border:rgb(c.borderTopColor),outline:rgb(c.outlineColor),size:c.fontSize,radius:c.borderRadius};});}
test.beforeEach(async({page})=>{await page.route('**/*',r=>['127.0.0.1','localhost'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort('blockedbyclient'));});
for(const lang of ['en','ar'] as const){
 test(`${lang} actual enabled and meaning-state text, field boundaries and focus have measured contrast`,async({page,context})=>{
  await context.addCookies([{name:'almina_lang',value:lang,url:origin}]);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/design-proof/components');
  const records=[];
  for(const id of ['primary-utility','pending-variant','ghost-variant','outline-variant','secondary-variant','link-variant','destructive-variant']){
   const el=page.getByTestId(id);for(const state of ['rest','hover']){if(state==='hover'&&id!=='pending-variant')await el.hover();const c=await pairing(el);const contrast=ratio(c.fg,c.bg);expect(contrast,`${id} ${state}`).toBeGreaterThanOrEqual(4.5);records.push({id,state,...c,contrast});await page.mouse.move(0,0);}
  }
  await page.getByTestId('added-variant').click();for(const el of [page.getByTestId('added-variant'),page.locator('[data-store-control=option][aria-current=page]'),page.locator('[data-store-notice=offer]')]){const c=await pairing(el);expect(ratio(c.fg,c.bg)).toBeGreaterThanOrEqual(4.5);records.push({id:await el.getAttribute('data-store-control')??'meaning',...c,contrast:ratio(c.fg,c.bg)});}
  const notices=[];
  for(const state of ['error','success','loading','empty']){await page.getByTestId('feedback-'+state).click();const c=await pairing(page.locator('#feedback [data-store-notice='+state+']'));expect(ratio(c.fg,c.bg)).toBeGreaterThanOrEqual(4.5);notices.push({state,...c,contrast:ratio(c.fg,c.bg)});}
  expect(notices[0]!.border).not.toEqual(notices[1]!.border);
  const primary=page.getByTestId('primary-utility');await primary.hover();await page.mouse.down();const pressed=await pairing(primary);expect(ratio(pressed.fg,pressed.bg)).toBeGreaterThanOrEqual(4.5);await page.mouse.up();
  const save=page.locator('#cards [data-store-control=save]').first();await save.click();const saved=await pairing(save);expect(ratio(saved.fg,saved.bg)).toBeGreaterThanOrEqual(3);expect(await save.getAttribute('aria-pressed')).toBe('true');
  const field=page.getByTestId('normal-field');const normal=await pairing(field);expect(ratio(normal.border,normal.bg)).toBeGreaterThanOrEqual(3);await field.focus();await expect(field).toHaveCSS('outline-width','3px');const focused=await pairing(field);expect(ratio(focused.outline,[250,251,251])).toBeGreaterThanOrEqual(3);
  const invalid=await pairing(page.getByTestId('invalid-variant'));expect(ratio(invalid.border,invalid.bg)).toBeGreaterThanOrEqual(3);expect(invalid.border).not.toEqual((await pairing(page.locator('[data-store-notice=offer]'))).fg);
  writeFileSync(`${folder}/contrast-${lang}.json`,JSON.stringify({records,notices,pressed,saved,normal,focused,invalid},null,2)+'\n');
 });
 test(`${lang} control shapes, icon family and reduced-motion portal links follow accepted roles`,async({page,context})=>{
  await context.addCookies([{name:'almina_lang',value:lang,url:origin}]);await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/design-proof/components');
  const primary=page.getByTestId('primary-utility');await expect(primary).toHaveCSS('border-radius','10px');expect(await page.getByTestId('pill-shape').evaluate(e=>parseFloat(getComputedStyle(e).borderRadius)>=e.getBoundingClientRect().height/2)).toBeTruthy();await expect(page.getByTestId('rounded-shape')).toHaveCSS('border-radius','14px');await expect(primary).toHaveCSS('transition-duration','0.12s');
  const icon=page.locator('#cards [data-store-control=save] svg').first();await expect(icon).toHaveCSS('stroke-width','1.5px');await expect(icon).toHaveCSS('width','22px');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(primary).toHaveCSS('transition-duration','0s');await expect(page.getByTestId('normal-field')).toHaveCSS('transition-duration','0s');
  await page.locator('#sheets button[aria-label][aria-haspopup=dialog]').click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('link').first()).toHaveCSS('transition-duration','0s');await expect(dialog).toHaveCSS('animation-name','none');await page.keyboard.press('Escape');
  await page.goto('/design-proof/products/sample--PD1186');const photo=page.locator('img').filter({visible:true});await photo.first().hover();expect(await page.locator('img').evaluateAll(els=>els.filter(e=>e.closest('[class*=gallery]')).every(e=>getComputedStyle(e).transform==='none'))).toBeTruthy();
 });
 test(`${lang} specimen typography reflows under doubled text without hiding names or purchase controls`,async({page,context})=>{
  await context.addCookies([{name:'almina_lang',value:lang,url:origin}]);await page.goto('/design-proof/components');await page.evaluate(()=>document.fonts.ready);
  const font=await page.locator('[data-proof-root]').evaluate(e=>getComputedStyle(e).fontFamily);expect(font).toMatch(lang==='ar'?/storefrontArabic/:/storefrontLatin/);
  // Synthetic text scaling, not native browser zoom or an OS accessibility setting.
  await page.evaluate(()=>{const els=[...document.querySelectorAll<HTMLElement>('[data-proof-root] *')].filter(e=>!e.closest('svg'));const sizes=els.map(e=>[e,getComputedStyle(e).fontSize,getComputedStyle(e).lineHeight] as const);for(const[e,size,line]of sizes){e.style.fontSize=parseFloat(size)*2+'px';if(line!=='normal')e.style.lineHeight=parseFloat(line)*2+'px';}});
  for(const width of [320,390,768,1440,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();}
  expect(await page.locator('[data-slot=button]').evaluateAll(els=>els.filter(e=>e.getBoundingClientRect().width).every(e=>e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1))).toBeTruthy();
  await expect(page.locator('#cards article').first().locator('[data-store-control=purchase]')).toBeVisible();
 });
}
