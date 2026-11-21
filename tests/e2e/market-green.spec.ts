import {test,expect} from './fixtures';

test('mobile filters keep draft changes local until apply and Back dismisses the sheet',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/search?q=Daily&minPrice=5');
  const trigger=page.getByRole('button',{name:'Filters',exact:true});
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'Filters',exact:true});
  await dialog.getByRole('spinbutton',{name:'From',exact:true}).fill('20');
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(dialog).toBeHidden();
  expect(new URL(page.url()).searchParams.get('minPrice')).toBe('5');
  await trigger.click();
  await dialog.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(dialog.getByRole('spinbutton',{name:'From',exact:true})).toHaveValue('');
  expect(new URL(page.url()).searchParams.get('q')).toBe('Daily');
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('mobile product docking retains quantity and restores browsing navigation',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/products/daily-care--PD0001');
  const quantity=page.getByRole('spinbutton',{name:'Quantity',exact:true});
  await quantity.fill('2');await quantity.blur();
  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.purchase-dock-controls')).toHaveClass(/is-docked/);
  await expect(quantity).toHaveValue('2');
  await expect(page.getByRole('navigation',{name:'Main navigation',exact:true})).toBeHidden();
  await expect(page.getByRole('button',{name:'Add to cart: Daily Care',exact:true})).toBeVisible();
  await page.evaluate(()=>window.scrollTo(0,0));
  await expect(page.locator('.purchase-dock-controls')).not.toHaveClass(/is-docked/);
  await expect(page.getByRole('navigation',{name:'Main navigation',exact:true})).toBeVisible();
});

for(const width of [320,390,768,899,900,1024,1199,1200,1440])test(`catalogue reflows without document overflow at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/products');
  await expect(page.getByRole('heading',{name:'Daily Care',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const cards=page.locator('.catalog-layout .product-card');
  expect((await cards.first().boundingBox())!.width).toBeGreaterThanOrEqual(140);
  const columns=await page.locator('.catalog-layout .product-grid').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(width<324?1:width<600?2:width<1200?3:4);
});

test('gallery supports keyboard selection, swipe and focus-restoring zoom',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/products');
  await page.getByRole('heading',{name:'Synthetic paged product 0',exact:true}).getByRole('link').click();
  const gallery=page.locator('.gallery');
  await expect(gallery.getByRole('status')).toHaveText('Image 1 of 2');
  await gallery.getByRole('button',{name:'Next product photo',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(gallery.getByRole('status')).toHaveText('Image 2 of 2');
  const stage=await page.locator('.gallery-stage').boundingBox();
  await page.mouse.move(stage!.x+stage!.width*.8,stage!.y+stage!.height*.5);await page.mouse.down();
  await page.mouse.move(stage!.x+stage!.width*.2,stage!.y+stage!.height*.5);await page.mouse.up();
  await expect(gallery.getByRole('status')).toHaveText('Image 1 of 2');
  const zoom=page.getByRole('button',{name:'Zoom image',exact:true});await zoom.click();
  await expect(page.getByRole('dialog',{name:'Synthetic paged product 0',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(zoom).toBeFocused();
});
