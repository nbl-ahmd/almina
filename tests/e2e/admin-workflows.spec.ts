import type { APIRequestContext, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { test, expect, reset, login, streamSettled, confirmClick, adminOrigin, commerceOrigin, productId, customer } from './fixtures';
test.beforeEach(async ({ request }) => { await reset(request); });

const headers = { origin: adminOrigin, 'x-csrf-protection': '1' };
/** A real image the browser can decode and re-encode before uploading. */
let png: Buffer;
let art: { name: string; mimeType: string; buffer: Buffer };
test.beforeAll(async () => {
  const sharp = createRequire(`${process.cwd()}/package.json`)('./backend/node_modules/sharp');
  png = await sharp({ create: { width: 24, height: 24, channels: 3, background: '#c0262f' } }).png().toBuffer();
  art = { name: 'pack.png', mimeType: 'image/png', buffer: png };
});
const hex = (index: number) => index.toString(16).padStart(24, '0');

type Row = { name: string; _id: string; product_id: string };
/** Hidden catalogue products without photos, in catalogue order, with stock deliberately out of order. */
async function seed(request: APIRequestContext, count: number, extra: Record<string, unknown> = {}): Promise<Row[]> {
  const rows = Array.from({ length: count }, (_, index) => ({ _id: hex(index + 1), product_id: `PDQ${1000 + index}`, name: `Queue item ${String(index + 1).padStart(3, '0')}`,
    brand: 'Acme', packLabel: '50 g', disabled: true, published: false, stock: (index * 37) % 23, ...extra }));
  const response = await request.post(commerceOrigin + '/__fixture/products', { data: { products: rows.map(row => ({ ...row, _id: { $oid: row._id } })) } });
  expect(response.ok(), await response.text()).toBe(true);
  return rows;
}
/** Stands in for Cloudinary: the browser uploads straight to it, and the fixture records that the asset exists. */
async function storage(page: Page, request: APIRequestContext) {
  const uploads: string[] = [];
  await page.route('https://api.cloudinary.com/**', async route => {
    const publicId = /name="public_id"\r\n\r\n([^\r]+)/.exec(route.request().postData() ?? '')?.[1] ?? '';
    uploads.push(publicId);
    await request.post(`${commerceOrigin}/__fixture/media-asset?publicId=${encodeURIComponent(publicId)}`);
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, contentType: 'application/json', body: '{}' });
  });
  return uploads;
}
const product = async (page: Page, id: string) => (await page.request.get(`${adminOrigin}/api/admin/products/${id}`)).json() as Promise<{ disabled?: boolean; stock: number; cloudinaryImages?: string[]; productType?: string }>;

test('Save & next stays available through a long queue, past the old 100 product limit, while products leave it', async ({ page, request }) => {
  test.setTimeout(150000);
  await login(page);
  const rows = await seed(request, 130);
  await storage(page, request);
  // Start at the 93rd hidden product without a photo: the old editor lost its buttons after the 100th.
  await page.goto(adminOrigin + '/admin/products?view=hidden&filter=missing-photo&offset=75'); await streamSettled(page);
  await page.getByRole('link', { name: `Edit ${rows[92]!.name}`, exact: true }).click();
  const name = page.getByRole('textbox', { name: 'Product name', exact: true });
  for (let index = 92; index < 106; index++) {
    await expect(page).toHaveURL(`${adminOrigin}/admin/products/${rows[index]!._id}?view=hidden&filter=missing-photo`);
    await expect(name).toHaveValue(rows[index]!.name);
    const next = page.getByRole('button', { name: /^(Save|Publish) & next$/ });
    await expect(next).toBeEnabled();
    if (index === 95) {
      // Publishing with a photo takes this product out of the queue; the next one must still be the following product.
      await page.locator('#product-photos').setInputFiles(art);
      await page.getByRole('switch', { name: /^Draft/ }).click();
      await expect(page.getByRole('button', { name: 'Publish & next', exact: true })).toBeEnabled();
    }
    if (index === 99) await page.getByRole('spinbutton', { name: 'Stock', exact: true }).fill('77');
    await next.click();
  }
  await expect(name).toHaveValue(rows[106]!.name);
  const published = await product(page, rows[95]!._id);
  expect([published.disabled, published.cloudinaryImages?.length]).toEqual([false, 1]);
  expect((await product(page, rows[99]!._id)).stock).toBe(77);
  expect((await product(page, rows[100]!._id)).disabled).toBe(true);
  // The keyboard does the same, and the last product returns to the list instead of losing the button.
  await page.goto(`${adminOrigin}/admin/products/${rows[129]!._id}?view=hidden&filter=missing-photo`); await streamSettled(page);
  await name.press('ControlOrMeta+Enter');
  await expect(page.getByText('That was the last product in this list.')).toBeVisible();
  await expect(page).toHaveURL(`${adminOrigin}/admin/products?view=hidden&filter=missing-photo`);
});

test('photos are added from the table, then hidden products with everything go live in bulk', async ({ page, request }) => {
  await login(page);
  const rows = await seed(request, 4, { stock: 3 });
  const uploads = await storage(page, request);
  await page.goto(adminOrigin + '/admin/products?view=hidden&filter=missing-photo'); await streamSettled(page);
  // Click-or-drop on the row picture.
  await page.getByLabel(`Photos for ${rows[0]!.name}`, { exact: true }).setInputFiles(art);
  await expect(page.getByText(`Photo added: ${rows[0]!.name}`)).toBeVisible();
  expect((await product(page, rows[0]!._id)).disabled).toBe(true);
  await expect(page.getByRole('link', { name: `Edit ${rows[0]!.name}`, exact: true })).toHaveCount(0);
  // With the switch on, a photo publishes the product.
  await page.getByRole('switch', { name: 'Go live after adding a photo' }).click();
  await page.getByLabel(`Photos for ${rows[1]!.name}`, { exact: true }).setInputFiles(art);
  await expect(page.getByText(`Photo added and live: ${rows[1]!.name}`)).toBeVisible();
  expect((await product(page, rows[1]!._id)).disabled).toBe(false);
  // Many photos named by product number or barcode.
  await page.getByRole('button', { name: 'Upload many photos' }).click();
  const dialog = page.getByRole('dialog', { name: 'Upload many photos' });
  await dialog.getByLabel('Choose photos to upload').setInputFiles([
    { ...art, name: `${rows[2]!.product_id}.png` }, { ...art, name: `${rows[2]!.product_id.toLowerCase()}_2.png` }, { ...art, name: 'holiday.png' },
  ]);
  await expect(dialog.getByText('1 products matched · 1 files not matched · 1 selected')).toBeVisible();
  await expect(dialog.getByText('No product matches this file name.')).toBeVisible();
  await confirmClick(page, dialog.getByRole('button', { name: 'Upload 1 product', exact: true }));
  await expect(dialog.getByText('1 uploaded.')).toBeVisible();
  expect((await product(page, rows[2]!._id)).cloudinaryImages).toHaveLength(2);
  expect(uploads).toHaveLength(4);
  await dialog.getByRole('button', { name: 'Close' }).click();
  // Ready products go live together; the one without a photo is not in the ready list.
  await page.goto(adminOrigin + '/admin/products?view=hidden&filter=ready'); await streamSettled(page);
  await confirmClick(page, page.getByRole('button', { name: 'Make all 2 live', exact: true }));
  await expect(page.getByText('2 products are now live.')).toBeVisible();
  expect((await product(page, rows[0]!._id)).disabled).toBe(false);
  expect((await product(page, rows[2]!._id)).disabled).toBe(false);
  expect((await product(page, rows[3]!._id)).disabled).toBe(true);
});

test('bulk go-live refuses what may not be sold and the pharmacist chooses the type row by row', async ({ page, request }) => {
  await login(page);
  const rows = await seed(request, 2, { productType: 'unreviewed' });
  await page.goto(adminOrigin + '/admin/needs-action?reason=classification');
  await expect(page).toHaveURL(adminOrigin + '/admin/products?view=hidden&filter=classification');
  await streamSettled(page);
  await expect(page.getByText('Medicine classification needs pharmacy review.')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Select all rows' }).click();
  await confirmClick(page, page.getByRole('toolbar', { name: 'Bulk actions' }).getByRole('button', { name: 'Make live' }));
  await expect(page.getByText('0 products are now live. 2 not changed.')).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Bulk actions' })).toHaveCount(0);
  await page.getByRole('combobox', { name: `Type of ${rows[0]!.name}` }).selectOption('otc');
  await expect(page.getByText(`Type saved: ${rows[0]!.name}`)).toBeVisible();
  expect((await product(page, rows[0]!._id)).productType).toBe('otc');
  await expect(page.getByRole('combobox', { name: `Type of ${rows[0]!.name}` })).toHaveCount(0);
});

test('keeping publish on never classifies or publishes a product whose type nobody confirmed', async ({ page, request }) => {
  await login(page);
  const rows = await seed(request, 3, { productType: 'unreviewed' });
  await page.evaluate(() => sessionStorage.setItem('almina-editor-keep-publishing', '1'));
  await page.goto(`${adminOrigin}/admin/products/${rows[0]!._id}?view=hidden&filter=classification`); await streamSettled(page);
  const name = page.getByRole('textbox', { name: 'Product name', exact: true });
  for (const index of [0, 1]) {
    await expect(name).toHaveValue(rows[index]!.name);
    await expect(page.getByRole('switch', { name: /^Draft/ })).not.toBeChecked();
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
    await name.press('ControlOrMeta+Enter');
    await expect(name).toHaveValue(rows[index + 1]!.name);
    const saved = await product(page, rows[index]!._id);
    expect([saved.disabled, saved.productType]).toEqual([true, 'unreviewed']);
  }
  // Publishing asks for the type first, then records the choice that was made.
  await page.getByRole('switch', { name: /^Draft/ }).click();
  await page.getByRole('button', { name: 'Save & publish', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Choose the product type before publishing' })).toBeVisible();
  expect((await product(page, rows[2]!._id)).disabled).toBe(true);
  await page.getByText('Pharmacy medicine (OTC)', { exact: true }).click();
  await page.getByRole('button', { name: 'Save & publish', exact: true }).click();
  await expect(page.getByText('Saved and live')).toBeVisible();
  const published = await product(page, rows[2]!._id);
  expect([published.disabled, published.productType]).toEqual([false, 'otc']);
});

test('Publish all approved images runs a saved publication from the admin', async ({ page, request }) => {
  await login(page);
  await page.route('https://res.cloudinary.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  const rows = await seed(request, 3);
  const sourceSha256 = createHash('sha256').update(png).digest('hex');
  const identity = (name: string) => ({ name, brand: 'Acme', line: '', strength: '', form: '', size: '50 g', quantity: '', multipack: '', flavour: '', shadeModel: '', variantSize: '', ageStage: '', barcode: '', gtin: '' });
  const items = rows.map((row, index) => ({ assetId: `asset-${index}`, sourceSha256, publicId: `products/asset-${index}`, imageUrl: `https://res.cloudinary.com/synthetic/image/upload/v1/products/asset-${index}.webp`,
    identity: identity(row.name), labelText: [row.name], flags: [], candidateProductIds: [row.product_id], priorDecision: 'approved', sourceNote: 'Synthetic', extractionReference: 'synthetic' }));
  const staged = await page.request.post(adminOrigin + '/api/admin/image-review/stage', { headers, data: { schemaVersion: 'image-review-package-v1', sourceRun: 'synthetic', catalogueChecksum: 'b'.repeat(64), withdrawals: [], items } });
  expect(staged.ok(), await staged.text()).toBe(true);
  const queue = await (await page.request.get(adminOrigin + '/api/admin/image-review?status=pending')).json() as { items: { itemId: string; revision: number; selectedProductId: string | null }[] };
  for (const item of queue.items) {
    const chosen = rows[Number((await (await page.request.get(`${adminOrigin}/api/admin/image-review/${item.itemId}`)).json()).item.source.assetId.split('-')[1])]!;
    const detail = await (await page.request.post(adminOrigin + '/api/admin/image-review/select', { headers, data: { itemId: item.itemId, productId: chosen.product_id } })).json() as { item: { revision: number }; product: { revision: string } };
    const decided = await page.request.post(adminOrigin + '/api/admin/image-review/decide', { headers, data: { itemId: item.itemId, expectedRevision: detail.item.revision, productId: chosen.product_id, productRevision: detail.product.revision,
      decision: 'approved', originalViewed: true, sharedIdentifierConfirmed: false, checks: [], note: '', requestId: crypto.randomUUID() } });
    expect(decided.ok(), await decided.text()).toBe(true);
  }
  await page.goto(adminOrigin + '/admin/image-review'); await streamSettled(page);
  await expect(page.getByText(/approved images are not on their products yet/)).toBeVisible();
  await confirmClick(page, page.getByRole('button', { name: 'Publish all approved images' }));
  await expect(page.getByText(/Image publication · (Preparing|Publishing)/)).toBeVisible();
  expect((await request.post(commerceOrigin + '/__fixture/publication-drain', { data: { image: png.toString('base64') } })).ok()).toBe(true);
  await page.getByRole('button', { name: 'Refresh progress' }).click();
  await expect(page.getByText('Image publication · Finished')).toBeVisible();
  await expect(page.getByText('3 published · 0 returned for review')).toBeVisible();
  for (const row of rows) { const saved = await product(page, row._id); expect([saved.cloudinaryImages?.length, saved.disabled]).toEqual([1, true]); }
  await page.getByRole('link', { name: 'make hidden products with photos live' }).click();
  await expect(page.getByRole('button', { name: 'Make all 3 live', exact: true })).toBeVisible();
});

test('staff see the product list without any way to change it', async ({ page }) => {
  await login(page, 'synthetic-staff');
  await page.goto(adminOrigin + '/admin/products'); await streamSettled(page);
  await expect(page.getByRole('table', { name: 'Product inventory' })).toContainText('Synthetic care product');
  for (const control of [page.getByRole('switch'), page.getByRole('checkbox'), page.getByRole('button', { name: 'Upload many photos' }), page.getByLabel(/^Photos for/)]) await expect(control).toHaveCount(0);
  expect((await page.request.post(adminOrigin + '/api/admin/products/visibility', { headers, data: { ids: [productId], live: false } })).status()).toBe(403);
  expect((await page.request.get(`${adminOrigin}/api/admin/products/queue?id=${productId}`)).status()).toBe(403);
});

const screens = ['', '/products', '/products?view=hidden&filter=missing-photo', `/products/${productId}`, '/orders', '/categories', '/banners', '/image-review', '/catalog-import',
  '/growth', '/marketing', '/whatsapp', '/search', '/wholesale', '/branches', '/users', '/notifications', '/settings', '/operations', '/batch'];
for (const width of [360, 390, 768, 1440]) test(`every administration screen fits without sideways scrolling at ${width}px`, async ({ page, request }) => {
  test.setTimeout(150000);
  await page.setViewportSize({ width, height: 900 });
  const created = await request.post(commerceOrigin + '/api/orders', { headers: { origin: commerceOrigin, 'x-csrf-protection': '1' }, data: { customer, items: [{ productId, quantity: 2 }], idempotencyKey: crypto.randomUUID() } });
  expect(created.status()).toBe(201);
  const order = await created.json() as { id: string };
  await login(page);
  await seed(request, 6);
  const wide: string[] = [];
  for (const path of [...screens, `/orders/${order.id}`]) {
    await page.goto(adminOrigin + '/admin' + path); await streamSettled(page);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.screenshot({ path: `.verification-results/admin-screens/${width}${(path || '/dashboard').replace(/[^a-z0-9]+/gi, '-')}.png`, fullPage: true });
    // Name the elements that stick out, ignoring regions that scroll on purpose.
    const offenders = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth ? [] : [...document.querySelectorAll('body *')]
      .filter(element => element.getBoundingClientRect().right > innerWidth + 1 && !element.closest('.overflow-x-auto, .overflow-auto'))
      .slice(0, 4).map(element => `${element.tagName.toLowerCase()} “${(element.textContent ?? '').trim().slice(0, 40)}”`));
    if (offenders.length) wide.push(`${path || '/'}: ${offenders.join(', ')}`);
  }
  expect(wide, 'screens with horizontal page scroll').toEqual([]);
});
