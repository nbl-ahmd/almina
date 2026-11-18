import { test, expect } from './fixtures';

test('filter checkbox serializes its value through the native GET form', async ({page}) => {
  await page.setViewportSize({width:390,height:900});await page.goto('/products');
  const panel=page.locator('#catalog-filters');await panel.locator(':scope > summary').click();
  const stock=panel.getByRole('checkbox',{name:'In stock',exact:true});
  await stock.check();
  await expect(stock).toBeChecked();
  await expect(stock).toHaveCSS('accent-color', 'rgb(32, 42, 48)');
  await page.screenshot({path:'outputs/coral-redesign-2026-10-21/checked-filter-390.png'});
  await panel.getByRole('button',{name:'Apply filters',exact:true}).click();
  await expect(page).toHaveURL(/inStock=true/);
  await expect(panel).not.toHaveAttribute('open');
  await panel.locator(':scope > summary').click();
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
