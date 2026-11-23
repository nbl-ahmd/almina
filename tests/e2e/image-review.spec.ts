import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect, reset, login, streamSettled, adminOrigin, commerceOrigin } from './fixtures';
test.beforeEach(async ({ request }) => { await reset(request); });

const headers = { origin: adminOrigin, 'x-csrf-protection': '1' };
const hash = 'a'.repeat(64);
const identity = (name: string, over: object = {}) => ({ name, brand: 'Acme', line: '', strength: '', form: 'Cream', size: '50 g', quantity: '', multipack: '', flavour: '', shadeModel: '', variantSize: '', ageStage: '', barcode: '', gtin: '', ...over });
const item = (assetId: string, productId: string, name: string, over: object = {}) => ({ assetId, sourceSha256: hash, publicId: 'products/' + assetId,
  imageUrl: `https://res.cloudinary.com/synthetic/image/upload/v1/products/${assetId}.webp`, identity: identity(name, over), labelText: [name, '50 g'], flags: [],
  candidateProductIds: [productId], priorDecision: 'approved', sourceNote: 'Synthetic proposal', extractionReference: 'synthetic' });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

async function seed(page: Page, request: APIRequestContext, count: number) {
  await page.route('https://res.cloudinary.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  const response = await request.post(commerceOrigin + '/__fixture/products', { data: { products: Array.from({ length: count }, (_, index) => ({
    name: `Acme Review Cream ${index + 1}`, brand: 'Acme', packLabel: '50 g', productForm: 'Cream' })) } });
  expect(response.ok()).toBe(true);
  return (await response.json() as { productIds: string[] }).productIds;
}

test('review quickly: only differing details are shown, approving publishes in the background and the next image opens by itself', async ({ page, request }) => {
  await login(page);
  await page.route('**/api/admin/image-review/publish', route => route.fulfill({ json: { imported: 1, replayed: false } }));
  const publishCalls: string[] = []; page.on('request', req => { if (req.url().endsWith('/api/admin/image-review/publish')) publishCalls.push(req.postData() ?? ''); });
  const decisions: string[] = []; page.on('request', req => { if (req.url().endsWith('/api/admin/image-review/decide')) decisions.push(req.postData() ?? ''); });
  const ids = await seed(page, request, 4);
  const staged = await page.request.post(adminOrigin + '/api/admin/image-review/stage', { headers, data: { schemaVersion: 'image-review-package-v1', sourceRun: 'synthetic', catalogueChecksum: 'b'.repeat(64), withdrawals: [],
    items: [item('one', ids[0]!, 'Acme Review Cream 1'), item('two', ids[1]!, 'Acme Review Cream 2', { size: '100 g' }), item('three', ids[2]!, 'Acme Review Cream 3'), item('four', ids[3]!, 'Acme Review Cream 4')] } });
  expect(staged.ok(), await staged.text()).toBe(true);
  await page.goto(adminOrigin + '/admin/image-review'); await streamSettled(page);
  await expect(page.getByRole('button', { name: /^Pending 4/ })).toBeVisible();
  await page.getByRole('button', { name: 'Start reviewing' }).click();
  const heading = page.locator('#review-product-title');
  const approve = page.getByRole('button', { name: 'Save & publish & next' });
  const seen: string[] = [];
  let corrected = false, held = false;
  for (let step = 0; step < 4; step++) {
    await expect(heading).toContainText('Acme Review Cream');
    const name = (await heading.textContent())!.trim();
    expect(seen).not.toContain(name); seen.push(name);
    // Approval waits for the original image, then needs nothing else when the label matches.
    await expect(page.getByLabel(/Reason for holding/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Correct extraction|Not applicable/ })).toHaveCount(0);
    if (name.endsWith('2')) {
      await expect(page.getByText('Check these details')).toBeVisible();
      await expect(page.getByText('Label says').first()).toBeVisible();
      await expect(approve).toBeEnabled();                       // a difference warns but never blocks
      await page.getByRole('button', { name: 'Use label value' }).first().click();
      await expect(page.getByText('Your corrections are saved with the approval.')).toBeVisible();
      corrected = true;
    } else await expect(page.getByText('Everything on the label matches the catalogue.')).toBeVisible();
    if (step === 3) { await page.getByRole('button', { name: 'Hold' }).click(); held = true; }
    else await approve.click();
    if (step < 3) await expect(heading).not.toContainText(name);  // the next image opened by itself
  }
  expect(corrected && held).toBe(true);
  // One request per image: no per-field checks or evidence are sent, and the correction travels with the approval.
  expect(decisions).toHaveLength(4);
  expect(decisions.filter(body => body.includes('"productChanges":{"packLabel":"100 g"}'))).toHaveLength(1);
  expect(decisions.every(body => body.includes('"checks":[]'))).toBe(true);
  await expect.poll(() => publishCalls.length).toBe(3);
  for (const call of publishCalls) expect(call).toMatch(/"approvalIds":\["[a-f0-9]{64}"\]/);
  await expect(page.getByText(/Held for another check/)).toBeVisible();
  await page.getByRole('button', { name: 'Held 1' }).waitFor();
});

test('making a product live from the products table works without any review forms', async ({ page, request }) => {
  await login(page);
  const response = await request.post(commerceOrigin + '/__fixture/products', { data: { products: [{ name: 'Acme Toggle Cream', brand: 'Acme', disabled: true, published: false }] } });
  expect(response.ok()).toBe(true);
  await page.goto(adminOrigin + '/admin/products'); await streamSettled(page);
  await page.getByRole('switch', { name: 'Publish Acme Toggle Cream' }).click();
  await expect(page.getByText('Acme Toggle Cream is live')).toBeVisible();
  await expect(page.getByText(/image rights|physical stock review/i)).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Hide Acme Toggle Cream' })).toBeVisible();
});
