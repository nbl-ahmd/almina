import { test, expect, reset, state, customer, productId, commerceOrigin, nextCheckoutPage, checkoutOrigin } from './fixtures';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const localRequire = createRequire(process.cwd() + '/apps/web/package.json');
const axe = readFileSync(localRequire.resolve('axe-core/axe.min.js'), 'utf8');
const origin = checkoutOrigin;
const prepare = nextCheckoutPage;
test.beforeEach(async ({ request }) => { await reset(request); });
for (const width of [360, 390, 768, 1280]) test(`Next checkout at ${width}px confirms current totals without overflow`, async ({ page, request }) => {
  await page.setViewportSize({ width, height: 900 });
  await prepare(page);
  await expect(page.getByRole('heading',{name:width<1024?'Review & payment':'Order summary',exact:true})).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.getByRole('group', { name: 'Contact and delivery details' })).toBeVisible();
  if(width===390||width===1280) await page.screenshot({path:`outputs/storefront-controls-2026-10-20/checkout-${width}.png`,fullPage:true});
  await page.evaluate(axe);
  const violations = await page.evaluate(async () => {
    const audit = (window as unknown as { axe: { run: (node: Element) => Promise<{ violations: { id: string }[] }> } }).axe;
    return (await audit.run(document.body)).violations.map(violation => violation.id);
  });
  expect(violations).toEqual([]);
  const submitted = page.waitForRequest(req => req.method() === 'POST' && new URL(req.url()).pathname === '/api/checkout');
  await page.getByRole('button', { name: 'Place order — AED 40.00', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.evaluate(axe);
  const confirmationAudit = await page.evaluate(async () => (window as unknown as { axe: { run: (node: Element) => Promise<{ violations: { id: string }[] }> } }).axe.run(document.body));
  expect(confirmationAudit.violations.map(violation => violation.id)).toEqual([]);
  if (width === 390 || width === 1280) await page.screenshot({ path: `.verification-results/checkout-confirmation-${width}.png`, fullPage: true });
  const input = (await submitted).postDataJSON();
  expect(Object.keys(input).sort()).toEqual(['acceptedQuoteHash', 'customer', 'idempotencyKey', 'items']);
  expect(input.items).toEqual([{ productId, quantity: 2 }]);
  const result = await state(request);
  expect(result.orders).toHaveLength(1); expect(result.stock).toBe(2); expect(result.receipts).toBe(1);
  expect(result.orders[0]!.totals.totalMinor).toBe(4000);
});
test('Next checkout refuses changed prices and requires a fresh review', async ({ page, request }) => {
  await prepare(page);
  expect((await request.post(commerceOrigin + '/__fixture/price')).status()).toBe(204);
  await page.getByRole('button', { name: 'Place order — AED 40.00', exact: true }).click();
  await expect(page.locator('[role="alert"]')).toContainText('Prices or delivery have changed');
  await expect(page.locator('[role="alert"]')).toBeFocused();
  expect((await state(request)).orders).toHaveLength(0);
  expect((await state(request)).stock).toBe(4);
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 38.00', exact: true })).toBeVisible();
});
test('Next checkout reload retries the saved intent after the server has committed', async ({ page, request }) => {
  await prepare(page);
  await request.post(commerceOrigin + '/__fixture/delay');
  await page.getByRole('button', { name: 'Place order — AED 40.00', exact: true }).click();
  await expect.poll(async () => (await state(request)).orders.length).toBe(1);
  const key = await page.evaluate(() => JSON.parse(sessionStorage.getItem('almina.checkout.pending.v1')!).idempotencyKey);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Use my current location', exact: true })).toBeDisabled();
  const submitted = page.waitForRequest(req => req.method() === 'POST' && new URL(req.url()).pathname === '/api/checkout');
  await page.getByRole('button', { name: 'Retry pending order', exact: true }).click();
  expect((await submitted).postDataJSON().idempotencyKey).toBe(key);
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  const result = await state(request);
  expect(result.orders).toHaveLength(1); expect(result.stock).toBe(2); expect(result.receipts).toBe(1);
});
test('Next checkout gateway rejects cross-origin submissions and forged totals', async ({ request }) => {
  const input = { customer, items: [{ productId, quantity: 2 }] };
  expect((await request.post(origin + '/api/checkout/quote', { data: input, headers: { Origin: 'https://other.example', 'X-CSRF-Protection': '1' } })).status()).toBe(403);
  expect((await request.post(origin + '/api/checkout/quote', { data: { ...input, total: 1 }, headers: { Origin: origin, 'X-CSRF-Protection': '1' } })).status()).toBe(400);
  expect((await state(request)).orders).toHaveLength(0);
});
test('checkout adds an opt-in GPS pin, invalidates review and saves the pin with the order', async ({ page, context, request }) => {
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({ latitude: 25.789, longitude: 55.943, accuracy: 10 });
  const response = await page.goto(origin + '/checkout');
  expect(response!.headers()['permissions-policy']).toContain('geolocation=(self)');
  await prepare(page);
  await expect(page.locator('input[name="maplink"]')).toHaveValue('');
  await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Check delivery pin in Google Maps' })).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=25.789%2C55.943');
  await expect(page.getByLabel('Street address', { exact: true })).toHaveValue('Synthetic street, Synthetic area, Ras Al Khaimah, United Arab Emirates');
  await expect(page.getByLabel('City / area', { exact: true })).toHaveValue('Synthetic area');
  await expect(page.getByRole('combobox', { name: 'Emirate', exact: true })).toHaveValue('Ras al-Khaimah');
  await page.screenshot({ path: '.verification-results/checkout-autofill.jpg', fullPage: true });
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  const submitted = page.waitForRequest(req => req.method() === 'POST' && new URL(req.url()).pathname === '/api/checkout');
  await page.getByRole('button', { name: 'Place order — AED 40.00', exact: true }).click();
  expect((await submitted).postDataJSON().customer.maplink).toBe('https://www.google.com/maps/search/?api=1&query=25.789%2C55.943');
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  const result = await state(request);
  expect(result.orders).toHaveLength(1);
  expect(result.stock).toBe(2);
  const stored = result.orders[0] as unknown as { customer: { maplink: string; address: string; city: string; emirate: string } };
  expect(stored.customer.maplink).toBe('https://www.google.com/maps/search/?api=1&query=25.789%2C55.943');
  expect(stored.customer.address).toBe('Synthetic street, Synthetic area, Ras Al Khaimah, United Arab Emirates');
  expect(stored.customer.city).toBe('Synthetic area');
  expect(stored.customer.emirate).toBe('Ras al-Khaimah');
});
test('removing the delivery pin requires a new review', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({ latitude: 25.789, longitude: 55.943, accuracy: 300 });
  await prepare(page);
  await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
  await expect(page.getByText('GPS accuracy is low', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove delivery pin', exact: true }).click();
  await expect(page.locator('input[name="maplink"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toHaveCount(0);
});
for (const code of [1, 2, 3]) test(`GPS failure ${code} leaves manual checkout available`, async ({ page }) => {
  await page.addInitScript(code => {
    Object.defineProperty(navigator, 'geolocation', { value: {
      getCurrentPosition: (_success: unknown, failure: (error: { code: number }) => void) => failure({ code }),
    } });
  }, code);
  await prepare(page);
  await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
  await expect(page.getByText(code === 1 ? 'Location permission was denied.' : code === 3 ? 'Location timed out.' : 'Unable to find your location.', { exact: false })).toBeVisible();
  await expect(page.locator('input[name="maplink"]')).toHaveValue('');
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
});
test('GPS permission prompt timeout ignores late results and lets the customer review manually', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { value: {
      getCurrentPosition: (success: (position: unknown) => void) => {
        (window as unknown as { lateGps: () => void }).lateGps = () => success({ coords: { latitude: 25.789, longitude: 55.943, accuracy: 10 } });
      },
    } });
  });
  await prepare(page);
  await page.clock.install();
  await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review order', exact: true })).toBeDisabled();
  await page.clock.runFor(21000);
  await expect(page.getByText('Location timed out.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { lateGps: () => void }).lateGps());
  await expect(page.locator('input[name="maplink"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
});
test('checkout works without browser geolocation support', async ({ page, request }) => {
  const response = await request.get(origin + '/products');
  expect(response.headers()['permissions-policy']).toContain('geolocation=(self)');
  const adminResponse = await request.get(origin + '/admin/login');
  expect(adminResponse.headers()['permissions-policy']).toContain('geolocation=()');
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { value: undefined }));
  await prepare(page);
  await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
  await expect(page.getByText('Location is unavailable in this browser.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
});
test('editing a detected delivery address clears its pin and requires review', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({ latitude: 25.789, longitude: 55.943, accuracy: 10 });
  await prepare(page);
  await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
  await expect(page.getByLabel('City / area', { exact: true })).toHaveValue('Synthetic area');
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
  await page.getByLabel('Street address', { exact: true }).fill('Corrected delivery street');
  await expect(page.locator('input[name="maplink"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toHaveCount(0);
});
for (const [status, code] of [[422, 'LOCATION_OUTSIDE_UAE'], [503, 'SERVICE_UNAVAILABLE'], [429, 'RATE_LIMITED'], [502, 'LOCATION_NOT_FOUND']] as const) test(`address lookup ${code} preserves manual details`, async ({ page, context }) => {
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({ latitude: 25.789, longitude: 55.943, accuracy: 10 });
  await page.route('**/api/checkout/location', route => route.fulfill({ status, json: { error: { code } } }));
  await prepare(page);
  await page.getByRole('button', { name: 'Use my current location', exact: true }).click();
  await expect(page.getByText(code === 'LOCATION_OUTSIDE_UAE' ? 'We deliver only within the UAE.' : code === 'RATE_LIMITED' ? 'Address lookup is busy.' : 'Unable to find a complete address.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('Street address', { exact: true })).toHaveValue(customer.address);
  await expect(page.getByLabel('City / area', { exact: true })).toHaveValue(customer.city);
  await expect(page.locator('input[name="maplink"]')).toHaveValue('');
  await page.getByRole('button', { name: 'Review order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Place order — AED 40.00', exact: true })).toBeVisible();
});
test('location gateway rejects cross-origin, GET and invalid coordinates', async ({ request }) => {
  const headers = { Origin: origin, 'X-CSRF-Protection': '1' };
  expect((await request.post(origin + '/api/checkout/location', { headers: { ...headers, Origin: 'https://other.example.invalid' }, data: { latitude: 25, longitude: 55 } })).status()).toBe(403);
  expect((await request.post(origin + '/api/checkout/location', { headers, data: { latitude: 91, longitude: 55 } })).status()).toBe(400);
  expect((await request.get(origin + '/api/checkout/location')).status()).toBe(405);
});

test('header delivery selector saves an area, persists on reload and prefills checkout', async ({ page }) => {
  await page.goto(origin + '/');
  await expect(page.getByRole('complementary', { name: 'Choose your delivery area' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Choose delivery area', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Where are we delivering?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Delivery emirate', exact: true }).selectOption('Dubai');
  await dialog.getByLabel('Delivery city / area', { exact: true }).fill('Al Barsha');
  await dialog.getByRole('button', { name: 'Save delivery area' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose delivery area' })).toContainText('Al Barsha, Dubai');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Choose delivery area' })).toContainText('Al Barsha, Dubai');
  await expect(page.getByRole('complementary', { name: 'Choose your delivery area' })).toHaveCount(0);
  await page.goto(origin + '/checkout');
  await expect(page.getByLabel('City / area', { exact: true })).toHaveValue('Al Barsha');
  await expect(page.getByRole('combobox', { name: 'Emirate', exact: true })).toHaveValue('Dubai');
  await expect(page.getByLabel('Street address', { exact: true })).toHaveValue('');
  await expect(page.locator('input[name="maplink"]')).toHaveValue('');
});

test('delivery area GPS denial allows manual selection and Escape returns focus', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: (_success: unknown, fail: (error: { code: number }) => void) => fail({ code: 1 }) } }));
  await page.goto(origin + '/');
  const trigger = page.getByRole('button', { name: 'Choose delivery area' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Where are we delivering?' });
  await dialog.getByRole('button', { name: 'Use current location', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Choose your area below');
  await expect(dialog.getByLabel('Delivery city / area', { exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('storefront location uses consented GPS, confirms the area and saves no coordinates', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'], { origin });
  await context.setGeolocation({ latitude: 25.789, longitude: 55.943, accuracy: 10 });
  const response = await page.goto(origin + '/');
  expect(response!.headers()['permissions-policy']).toContain('geolocation=(self)');
  await page.getByRole('button', { name: 'Choose delivery area' }).click();
  const dialog = page.getByRole('dialog', { name: 'Where are we delivering?' });
  await dialog.getByRole('button', { name: 'Use current location', exact: true }).click();
  await expect(dialog.getByLabel('Delivery city / area', { exact: true })).toHaveValue('Synthetic area');
  await dialog.getByRole('button', { name: 'Save delivery area' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('almina.delivery-area.v1')!))).toEqual({ city: 'Synthetic area', emirate: 'Ras al-Khaimah' });
});

test('mobile checkout preserves delivery details when going back and payment choices are keyboard accessible',async({page,request})=>{
 await page.setViewportSize({width:390,height:844});await prepare(page);
 await page.getByRole('button',{name:'Back',exact:true}).click();
 await expect(page.getByLabel('Name',{exact:true})).toHaveValue(customer.name);
 await page.getByRole('button',{name:'Continue to payment',exact:true}).click();
 const cash=page.getByRole('radio',{name:/Cash on delivery/});await cash.focus();await page.keyboard.press('ArrowDown');
 await expect(page.getByRole('radio',{name:/Credit or debit card/})).toBeChecked();
 await expect(page.getByRole('button',{name:'Continue to test payment'})).toBeVisible();
 expect((await state(request)).orders).toHaveLength(0);
});
