import { test, expect } from './fixtures';
const surfaces=[['home','/'],['catalog','/products'],['product','/products/daily-care--PD0001'],['cart','/cart'],['offers','/offers'],['contact','/contact']] as const;
for(const width of [390,1280]) test(`storefront routes stay usable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
 for(const [name,path]of surfaces){
  await page.goto(path);await page.locator('main h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.getByRole('banner').getByRole('link',{name:'Al Mina Pharmacy home',exact:true})).toBeVisible();
  if(name==='home'){
   const care=page.getByRole('region',{name:'Shop by care',exact:true});
   await expect(care).toBeVisible();
   await expect(care.getByRole('link').first()).toBeVisible();
  }
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=700;y<height;y+=700){await page.evaluate(top=>window.scrollTo(0,top),y);await page.waitForTimeout(60);}
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:test.info().outputPath(`${name}-${width}.png`),fullPage:true});
 }
});
