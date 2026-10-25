import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test, expect, reset, state, login, streamSettled, commerceOrigin, adminOrigin, customer, productId } from './fixtures';
const localRequire = createRequire(process.cwd() + '/package.json');
const axe = readFileSync(localRequire.resolve('axe-core/axe.min.js'), 'utf8');

test.beforeEach(async ({ request }) => { await reset(request); });
test('authorized category edits refresh the warmed storefront cache and oversized uploads fail before mutation', async ({ page }) => {
  await page.goto(adminOrigin + '/categories');
  await expect(page.getByRole('link', { name: 'Synthetic category', exact: false }).first()).toBeVisible();
  await login(page);
  const changed = await page.request.put(adminOrigin + '/api/admin/category/aaaaaaaaaaaaaaaaaaaaaaaa', {
    headers: { origin: adminOrigin, 'x-csrf-protection': '1' }, data: { name: 'Updated synthetic category' },
  });
  expect(changed.status()).toBe(200);
  await page.goto(adminOrigin + '/categories');
  await expect(page.getByRole('link', { name: 'Updated synthetic category', exact: false }).first()).toBeVisible();
  const oversized = await page.request.post(adminOrigin + '/api/admin/banners', {
    headers: { origin: adminOrigin, 'x-csrf-protection': '1', 'content-type': 'application/json' },
    data: 'x'.repeat(4 * 1024 * 1024 + 1),
  });
  expect(oversized.status()).toBe(413);
});
// One independent viewport case per client: each case resets its own synthetic
// client, so provisioning must stay inside the real per-IP API quota instead of
// exhausting one bucket with four combined sessions.
for (const width of [360, 390, 768, 1280]) test(`staff provisioning clears credentials and deactivation revokes access at ${width}px`, async ({ page, request }) => {
  await login(page);
  const browser = { origin: commerceOrigin, 'x-csrf-protection': '1' };
  const username = `synthetic-new-${width}`, password = 'synthetic-long-password';
  await page.setViewportSize({ width, height: 900 }); await page.goto(adminOrigin + '/admin/users');
  await streamSettled(page);
  if (width < 768) {
    const more = page.getByRole('button', { name: 'More', exact: true });
    await more.click();
    const menu = page.getByRole('dialog', { name: 'All sections', exact: true });
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(more).toBeFocused();
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await menu.getByRole('link', { name: 'Products', exact: true }).click();
    await expect(page).toHaveURL(adminOrigin + '/admin/products');
    await expect(menu).toBeHidden();
    await page.goto(adminOrigin + '/admin/users');
    await streamSettled(page);
  }
  await page.getByRole('link', { name: 'Skip to content', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#admin-main')).toBeFocused();
  await page.evaluate(axe);
  const violations = await page.evaluate(async () => {
    const audit = (window as unknown as { axe: { run: (node: Element) => Promise<{ violations: { id: string }[] }> } }).axe;
    return (await audit.run(document.body)).violations.map(violation => violation.id);
  });
  expect(violations).toEqual([]);
  await page.locator('summary').filter({hasText:'Create staff account'}).click();
  await page.getByLabel('Full name', { exact: true }).fill('Synthetic created staff');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password (at least 12 characters)', { exact: true }).fill(password);
  await page.getByRole('combobox', { name: 'Role', exact: true }).selectOption('user');
  await page.getByRole('textbox', { name: /^Assigned cities/ }).fill('City A');
  await page.getByRole('button', { name: 'Create staff account', exact: true }).focus(); await page.keyboard.press('Enter');
  const row = page.getByRole('row').filter({ hasText: username }); await expect(row).toBeVisible();
  await expect(page.getByLabel('Password (at least 12 characters)', { exact: true })).toHaveValue('');
  expect((await request.post(commerceOrigin + '/api/auth/login', { headers: browser, data: { username, password } })).status()).toBe(200);
  expect((await request.get(commerceOrigin + '/api/auth/me')).status()).toBe(200);
  page.once('dialog', dialog => dialog.accept()); await row.getByRole('button', { name: 'Deactivate account', exact: true }).click();
  await expect(row).toHaveCount(0);
  expect((await request.get(commerceOrigin + '/api/auth/me')).status()).toBe(401);
  expect((await request.post(commerceOrigin + '/api/auth/login', { headers: browser, data: { username, password } })).status()).toBe(401);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload(); await streamSettled(page); await expect(page.getByRole('heading', { name: 'User management', exact: true })).toBeVisible();
});
test('operations shows scoped measurements and unknown acceptance at all required widths, and denies staff', async ({ page }) => {
  await login(page);
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(adminOrigin + '/admin/operations');
    await streamSettled(page);
    await expect(page.getByRole('heading', { name: 'Operations', exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Database integrity candidates' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Stock/order reconciliation requires');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole('region', { name: 'API requests — five-minute buckets' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.reload();
    await streamSettled(page);
    await expect(page.getByRole('heading', { name: 'Operations', exact: true })).toBeVisible();
  }
  const response = await page.request.get(adminOrigin + '/api/admin/operations'); expect(response.status()).toBe(200);
  expect(JSON.stringify(await response.json())).not.toContain('customer');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin/login');
  await login(page, 'synthetic-staff');
  expect((await page.request.get(adminOrigin + '/api/admin/operations')).status()).toBe(403);
});
test('admin login persists through reload and staff access remains scoped', async ({ page }) => {
  await page.goto(adminOrigin + '/admin/orders');
  await expect(page).toHaveURL(adminOrigin + '/admin/login');
  await page.getByLabel('Username', { exact: true }).fill('synthetic-admin');
  await page.getByLabel('Password', { exact: true }).fill('wrong-synthetic-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('main')).toContainText('Invalid username or password.');
  await login(page);
  await page.reload();
  await streamSettled(page);
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin/login');
  await login(page, 'synthetic-staff');
  expect((await page.request.get(adminOrigin + '/api/admin/auth/users')).status()).toBe(403);
});
test('admin order update reaches the real writer and prevents cancellation after dispatch', async ({ page, request }) => {
  const created = await request.post(commerceOrigin + '/api/orders', { headers: { origin: commerceOrigin, 'x-csrf-protection': '1' },
    data: { customer, items: [{ productId, quantity: 2 }], idempotencyKey: randomUUID() } });
  expect(created.status()).toBe(201);
  const order = await created.json() as { id: string };
  await login(page);
  await page.goto(adminOrigin + '/admin/orders/' + order.id);
  await streamSettled(page);
  await page.locator('summary').filter({hasText:'Contribution reporting'}).click();
  await expect(page.getByText('No costs recorded.',{exact:false})).toBeVisible();
  await page.getByRole('textbox',{name:'Product cost (AED)',exact:true}).fill('12.30');
  await page.getByRole('textbox',{name:'Fulfilment cost (AED)',exact:true}).fill('2');
  await page.getByRole('textbox',{name:'Payment and other fees (AED)',exact:true}).fill('0');
  await page.getByRole('button',{name:'Save actual costs',exact:true}).click();
  await expect(page.getByText('Costs saved. Order prices and stock are unchanged.',{exact:true})).toBeVisible();
  await page.reload(); await streamSettled(page);
  await page.locator('summary').filter({hasText:'Contribution reporting'}).click();
  await expect(page.getByRole('textbox',{name:'Product cost (AED)',exact:true})).toHaveValue('12.30');
  const lines = page.getByRole('table', { name: 'Recorded order lines' });
  await expect(lines.getByRole('columnheader', { name: 'Charged unit price (AED)' })).toBeVisible();
  await expect(lines.getByRole('cell', { name: '20.00', exact: true })).toBeVisible();
  await expect(lines.getByRole('cell', { name: '40.00', exact: true })).toBeVisible();
  await page.screenshot({ path: '.verification-results/admin-order-price.jpg', type: 'jpeg', fullPage: true });
  await page.getByRole('textbox', { name: 'Bill number', exact: true }).fill('12345');
  await page.getByRole('spinbutton', { name: 'Bill amount (AED)', exact: true }).fill('40');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Dispatch order', exact: true }).click();
  await expect(page.getByText('Saved successfully.', { exact: true })).toBeVisible();
  expect((await state(request)).orders[0]!.status).toBe('dispatched');
  await expect(page.getByRole('combobox', { name: 'Order status', exact: true })).toHaveValue('dispatched');
  await page.reload();
  await streamSettled(page);
  await expect(page.getByRole('combobox', { name: 'Order status', exact: true })).toHaveValue('dispatched');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Cancel order', exact: true }).click();
  await expect(page.locator('main')).toContainText('This record has changed or the action is unavailable.');
  const result = await state(request); expect(result.orders[0]!.status).toBe('dispatched'); expect(result.stock).toBe(2);
  await page.goto(adminOrigin+'/admin/growth');
  await page.getByRole('tab',{name:'Reports',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Recorded contribution',exact:true})).toBeVisible();
  await expect(page.getByText('1 of 1 dispatched orders have complete cost and tax records.',{exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Repeat purchase cohorts',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Consented activity',exact:true})).toBeVisible();

  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(adminOrigin + '/admin/login');
  await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
  await login(page, 'synthetic-staff');
  expect((await page.request.get(adminOrigin + '/api/admin/orders/' + order.id)).status()).toBe(404);
});

test('admin stock adjustment requires a reason, preserves the retry receipt and rejects stale stock', async ({ page, request }) => {
  await login(page);
  await page.goto(adminOrigin + '/admin/products/' + productId);
  await streamSettled(page);
  await page.getByLabel('Stock quantity', { exact: true }).fill('7');
  await page.getByLabel(/^Stock adjustment reason/).fill('Physical count verified');
  const saving = page.waitForRequest(request => request.method() === 'PUT' && request.url() === adminOrigin + '/api/admin/products/' + productId);
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  const payload = (await saving).postData() ?? '';
  expect(payload).not.toMatch(/name="(?:vat|featured|barcode)"/);
  await expect(page.getByText('Saved successfully.', { exact: true })).toBeVisible();
  expect((await state(request)).stock).toBe(7);
  const response = await page.request.put(adminOrigin + '/api/admin/products/' + productId, {
    headers: { origin: adminOrigin, 'x-csrf-protection': '1' },
    data: { stock: 9, expectedStock: 4, stockReason: 'Outdated count', inventoryKey: randomUUID() },
  });
  expect(response.status()).toBe(409); expect((await state(request)).stock).toBe(7);
});

test('authenticated Cloudinary replacement works through the gateway and archive preserves stock', async ({ page, request }) => {
  const { createRequire } = await import('node:module'); const require = createRequire(`${process.cwd()}/package.json`);
  const sharp = require('./backend/node_modules/sharp');
  const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await login(page);
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route('**/*.js', async route => { await scriptsReady; await route.continue(); });
  await page.goto(adminOrigin + '/admin/products/' + productId, { waitUntil: 'commit' });
  try {
    await expect(page.locator('button').filter({hasText:'Save product photos'})).toBeDisabled();
    await expect(page.getByLabel('Choose product photos')).toBeDisabled();
  } finally { releaseScripts(); }
  await page.getByRole('tab', {name:'Photos',exact:true}).click();
  await expect(page.getByLabel('Choose product photos')).toBeEnabled();
  await page.getByText('Upload recovery', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Clear local upload review', exact: true })).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Save product photos', exact: true })).toHaveCSS('padding-left', '20px');
  await page.getByLabel('Choose product photos').setInputFiles({ name: 'reviewed.png', mimeType: 'image/png', buffer: image });
  await page.getByRole('button', { name: 'Save product photos', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Product photos saved' })).toBeVisible();
  const product = await (await page.request.get(adminOrigin + '/api/admin/products/' + productId)).json();
  expect(product.cloudinaryImages[0]).toMatch(/^https:\/\/res.cloudinary.com\/synthetic\/image\/upload\/v1\/almina\/products\//);
  expect(product.mediaRevision).toBe(1); expect((await state(request)).stock).toBe(4);
  await page.goto(adminOrigin + '/admin/products');
  await streamSettled(page);
  await page.getByRole('button', { name: /^More actions for/ }).click();
  page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Archive product', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Product inventory' })).toContainText('No records found.');
  expect((await state(request)).stock).toBe(4);
  const unpublished = await page.request.put(adminOrigin + '/api/admin/products/publish/' + productId, { headers: { origin: adminOrigin, 'x-csrf-protection': '1' }, data: {} });
  expect(unpublished.status()).toBe(409);
});
