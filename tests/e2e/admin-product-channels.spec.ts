import type { Page } from '@playwright/test';
import { test, expect, reset, login, streamSettled, adminOrigin, productId } from './fixtures';
const headers = { origin: adminOrigin, 'x-csrf-protection': '1' };
async function types(page: Page) {
  expect((await page.request.post(adminOrigin + '/api/wholesale/admin/types', { headers, data: { id: 'salon', name: 'Salon', active: true, allowMedicines: false, revision: 0 } })).ok()).toBe(true);
}
test.beforeEach(async ({ request }) => { await reset(request); });
test('product channels reveal prices, save both rates and preserve inactive prices and tab drafts', async ({ page }) => {
  await login(page); await types(page); await page.goto(adminOrigin + '/admin/products/' + productId); await streamSettled(page);
  await expect(page.getByRole('button', { name: 'Save product', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Retail price (AED)', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/^Stock adjustment reason/)).toBeHidden();
  await page.getByRole('switch', { name: 'Wholesale', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Set wholesale price for Salon', exact: true }).check();
  await page.getByLabel('Wholesale price — Salon (AED)', { exact: true }).fill('12.35');
  await page.getByRole('tab', { name: 'Care & usage', exact: true }).click();
  await page.getByRole('textbox', { name: 'Usage information', exact: true }).fill('Saved across tabs');
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await expect(page.getByLabel('Wholesale price — Salon (AED)', { exact: true })).toHaveValue('12.35');
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: test.info().outputPath(`product-channels-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByText('Saved successfully.', { exact: true })).toBeVisible();
  const terms = (await (await page.request.get(adminOrigin + '/api/wholesale/admin/terms?productId=' + productId)).json()).data;
  expect(terms.enabled).toBe(true); expect(terms.prices[0].unitPriceMinor).toBe(1235);
  await page.reload(); await streamSettled(page);
  await expect(page.getByLabel('Wholesale price — Salon (AED)', { exact: true })).toHaveValue('12.35');
  await page.getByRole('switch', { name: 'Retail', exact: true }).click();
  await expect(page.getByLabel('Retail price (AED)', { exact: true })).toBeHidden();
  await expect(page.getByLabel('Wholesale price — Salon (AED)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByText('Saved successfully.', { exact: true })).toBeVisible();
  const saved = await (await page.request.get(adminOrigin + '/api/admin/products/' + productId)).json();
  expect(saved.audience).toBe('wholesale'); expect(saved.price).toBe(25);
  await page.getByRole('tab', { name: 'Care & usage', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Usage information', exact: true })).toHaveValue('Saved across tabs');
});
test('partial wholesale failure retries only pricing without repeating product or stock changes', async ({ page }) => {
  await login(page); await types(page); await page.goto(adminOrigin + '/admin/products/' + productId); await streamSettled(page);
  await page.getByRole('switch', { name: 'Wholesale', exact: true }).click(); await page.getByRole('checkbox', { name: 'Set wholesale price for Salon', exact: true }).check();
  await page.getByLabel('Wholesale price — Salon (AED)', { exact: true }).fill('11.75');
  let productWrites = 0, fail = true;
  page.on('request', request => { if (request.method() === 'PUT' && request.url().endsWith('/api/admin/products/' + productId)) productWrites++; });
  await page.route('**/api/wholesale/admin/terms', async route => {
    if (route.request().method() === 'POST' && fail) { fail = false; await route.fulfill({ status: 503, json: { code: 'SERVICE_UNAVAILABLE' } }); } else await route.continue();
  });
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.locator('.admin-form__status [role=alert]')).toContainText('Product details saved.');
  await page.getByRole('button', { name: 'Retry wholesale pricing', exact: true }).click();
  await expect(page.getByText('Product and channel prices saved.', { exact: true })).toBeVisible();
  expect(productWrites).toBe(1);
  const terms = (await (await page.request.get(adminOrigin + '/api/wholesale/admin/terms?productId=' + productId)).json()).data;
  expect(terms.prices[0].unitPriceMinor).toBe(1175);
});
test('wholesale-only creation needs its own price and reveals invalid fields in inactive tabs', async ({ page }) => {
  await login(page); await types(page); await page.goto(adminOrigin + '/admin/products/new'); await streamSettled(page);
  await page.getByRole('switch', { name: 'Wholesale', exact: true }).click(); await page.getByRole('switch', { name: 'Retail', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Set wholesale price for Salon', exact: true }).check();
  await page.getByLabel('Wholesale price — Salon (AED)', { exact: true }).fill('10.05');
  await page.getByLabel('Product name', { exact: true }).fill('Synthetic wholesale-only item'); await page.getByLabel('Stock quantity', { exact: true }).fill('12');
  await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('aaaaaaaaaaaaaaaaaaaaaaaa');
  await page.getByLabel('Product name', { exact: true }).fill('');
  await page.getByRole('tab', { name: 'Variants', exact: true }).click();
  await page.getByRole('button', { name: 'Create product', exact: true }).click();
  await expect(page.getByRole('tab', {name:'Overview',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.getByLabel('Product name',{exact:true})).toBeFocused();
  await page.getByLabel('Product name',{exact:true}).fill('Synthetic wholesale-only item');
  await page.getByRole('tab', {name:'Variants',exact:true}).click();
  await page.getByRole('button', { name: 'Create product', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/products\/[a-f0-9]{24}$/); await streamSettled(page);
  await expect(page.getByRole('switch', { name: 'Retail', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByLabel('Wholesale price — Salon (AED)', { exact: true })).toHaveValue('10.05');
});
test('website sections show only the selected task and preserve drafts', async ({ page }) => {
  await login(page); await page.goto(adminOrigin + '/admin/growth'); await streamSettled(page);
  await expect(page.getByRole('heading', { name: 'Requested reminders', exact: true })).toBeHidden();
  await page.getByLabel('Title', { exact: true }).fill('Unsaved website draft');
  await page.getByRole('tab', { name: 'Retention', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Requested reminders', exact: true })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toBeHidden();
  await page.getByRole('tab', { name: 'Pages & campaigns', exact: true }).click();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved website draft');
});
