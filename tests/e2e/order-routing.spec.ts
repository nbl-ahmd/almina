import { randomUUID } from 'node:crypto';
import { rakDeliveryAreas } from '@almina/contracts';
import { test, expect, reset, login, streamSettled, adminOrigin, commerceOrigin, productId, customer, state } from './fixtures';
test.beforeEach(async ({ request }) => { await reset(request); });
test('pharmacy routing setup, fallback inbox, sound opt-in and receiving work on mobile and desktop', async ({ page, request }) => {
  test.setTimeout(90000);
  async function switchAccount(username = 'synthetic-admin') {
    expect((await page.request.post(adminOrigin + '/api/admin/auth/logout', { headers: { origin: adminOrigin, 'x-csrf-protection': '1' } })).ok()).toBeTruthy();
    expect((await page.request.post(adminOrigin + '/api/admin/auth/login', { headers: { origin: adminOrigin, 'x-csrf-protection': '1' }, data: { username, password: 'synthetic-test-password' } })).ok()).toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const area = rakDeliveryAreas.find(value => value.name === 'Al Nakhil')!;
  const localId=randomUUID(),fallbackId=randomUUID(),headers={origin:adminOrigin,'x-csrf-protection':'1'};
  expect((await page.request.post(adminOrigin+'/api/admin/auth/branches',{headers,data:{revision:0,branch:{id:localId,name:'Local pharmacy',areaIds:[area.id],enabled:false},login:{username:'synthetic-local',password:'synthetic-test-password'}}})).ok()).toBeTruthy();
  const workspace=await(await page.request.get(adminOrigin+'/api/admin/auth/branches')).json();
  expect((await page.request.post(adminOrigin+'/api/admin/auth/branches',{headers,data:{revision:workspace.routing.revision,branch:{id:fallbackId,name:'Central pharmacy',areaIds:[],enabled:false},login:{username:'synthetic-central',password:'synthetic-test-password'}}})).ok()).toBeTruthy();
  const routing=await(await page.request.get(adminOrigin+'/api/admin/auth/order-routing')).json();
  expect((await page.request.put(adminOrigin+'/api/admin/auth/order-routing',{headers,data:{revision:routing.revision,active:false,branches:routing.branches,fallbackBranchId:fallbackId}})).ok()).toBeTruthy();
  await page.goto(adminOrigin+'/admin/users');await streamSettled(page);
  const staffRow = page.getByRole('row').filter({ hasText: 'synthetic-staff' });
  await staffRow.getByRole('combobox', { name: 'Branch assignment', exact: true }).selectOption(localId!);
  await staffRow.getByRole('button', { name: 'Save branch', exact: true }).click();
  await expect(staffRow).toContainText('Local pharmacy');
  await page.goto(adminOrigin+'/admin/branches');await streamSettled(page);await page.getByText('Receiving rules and existing staff',{exact:true}).click();
  await page.getByLabel('Enable branch routing', { exact: true }).check();
  await page.getByRole('button', { name: 'Save routing setup', exact: true }).click();
  await expect(page.getByText('Branch routing is active.', { exact: false })).toBeVisible();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    if (width === 390 || width === 1280) await page.screenshot({ path: `.verification-results/routing-setup-${width}.png`, fullPage: true });
  }
  await page.goto(adminOrigin + '/admin/orders'); await streamSettled(page);
  await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sound on', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const city of ['Al Nakheel', 'Nakhheel spelling mistake']) {
    expect((await request.post(commerceOrigin + '/api/orders', { headers: { origin: commerceOrigin, 'x-csrf-protection': '1' }, data: { idempotencyKey: randomUUID(), items: [{ productId, quantity: 1 }], customer: { ...customer, city } } })).ok()).toBeTruthy();
  }
  await expect(page.getByRole('link', { name: '2 orders awaiting confirmation' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Orders need attention', { exact: false })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Orders', exact: true })).toContainText('Central pharmacy');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '.verification-results/routing-inbox-mobile.png', fullPage: true });
  await page.getByRole('link', { name: /Address review · 1/ }).click();
  const snapshot = await state(request), unmatched = snapshot.orders[1]!;
  await expect(page.getByRole('table', { name: 'Orders', exact: true }).getByRole('row')).toHaveCount(2);
  await switchAccount('synthetic-staff'); await page.goto(adminOrigin + '/admin/orders'); await streamSettled(page);
  await expect(page.getByRole('table', { name: 'Orders', exact: true }).getByRole('row')).toHaveCount(2);
  expect((await page.request.get(adminOrigin + '/api/admin/orders/' + unmatched._id)).status()).toBe(404);
  await page.getByRole('link', { name: /^Open order/ }).click();
  await page.getByRole('button', { name: 'Confirm order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark as packed', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as packed', exact: true }).click();
  await expect(page.getByText('packed', { exact: true }).first()).toBeVisible();
  await switchAccount('synthetic-central'); await page.goto(adminOrigin + '/admin/orders'); await streamSettled(page);
  await expect(page.getByRole('table', { name: 'Orders', exact: true })).toContainText('Nakhheel spelling mistake');
  await switchAccount(); await page.goto(adminOrigin + '/admin/orders/' + unmatched._id); await streamSettled(page);
  await page.getByText('Review or correct delivery area', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Verified delivery area', exact: true }).selectOption(area.id);
  await page.getByLabel('Reason', { exact: true }).fill('Customer confirmed Al Nakheel by phone');
  await page.getByRole('button', { name: 'Confirm delivery area', exact: true }).click();
  await expect(page.locator('main')).toContainText('Local pharmacy');
  await expect(page.locator('main')).toContainText('Nakhheel spelling mistake');
});
