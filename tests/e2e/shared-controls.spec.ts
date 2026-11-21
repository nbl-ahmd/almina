import { test, expect } from './fixtures';

test('filter checkbox serializes its value through the native GET form', async ({page}) => {
  await page.setViewportSize({width:390,height:900});await page.goto('/products');
  const panel=page.getByRole('dialog',{name:'Filters',exact:true});await page.getByRole('button',{name:'Filters',exact:true}).click();
  const stock=panel.getByRole('checkbox',{name:'In stock',exact:true});
  await stock.check();
  await expect.poll(()=>stock.evaluate(el=>{
    const style=getComputedStyle(el);
    const luminance=(color:string)=>{const channels=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4;});return (channels[0]??0)*0.2126+(channels[1]??0)*0.7152+(channels[2]??0)*0.0722;};
    const a=luminance(style.color),b=luminance(style.backgroundColor);return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
  })).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({path:test.info().outputPath('checked-filter-390.png')});
  await panel.getByRole('button',{name:'Apply filters',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('inStock')).toBe('true');
  await expect(panel).toBeHidden();
  await page.getByRole('button',{name:'Filters',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:'In stock',exact:true})).toBeChecked();
});

test('reminder consent remains required before the form sends a request', async ({page}) => {
  let submissions=0;
  await page.route('**/api/growth/reminder-options',route=>route.fulfill({json:{data:{enabled:true,priceDrop:true,deliveryReady:true}}}));
  await page.route('**/api/customer/reminders',route=>{submissions++;expect(route.request().postDataJSON().consent).toBe(true);return route.fulfill({json:{data:{}}});});
  await page.goto('/products/daily-care--PD0001');
  await page.getByText('Get a product reminder',{exact:true}).click();
  const save=page.getByRole('button',{name:'Save reminder',exact:true});
  await save.click();expect(submissions).toBe(0);
  const consent=page.getByRole('checkbox',{name:'Email this reminder to my verified account email. I can cancel anytime.',exact:true});
  await expect(consent).not.toBeChecked();await consent.check();await save.click();
  await expect(page.getByText('Reminder saved. Manage or cancel it in your account.',{exact:true})).toBeVisible();
  expect(submissions).toBe(1);
});
