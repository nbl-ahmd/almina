import type { Page } from '@playwright/test';
import { test, expect, reset, login, adminOrigin, storage } from './fixtures';

const art = 'https://cdn.alminapharmacy.com/cdn/synthetic/strip.webp';
const artRoute = (page: Page) => page.route('**/_next/image?**', route => route.fulfill({ contentType: 'image/svg+xml',
  body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="200"><rect width="1600" height="200" fill="#cde"/></svg>' }));

test('staff draft, publish and withdraw homepage sections from the signed-in screens', async ({ page, request, context }) => {
  test.setTimeout(120000);
  await reset(request); await artRoute(page); await login(page);
  const shop = await context.newPage(); await artRoute(shop);
  const row = (name: string) => shop.getByRole('heading', { name, exact: true });
  const status = (text: RegExp) => expect(page.getByRole('status').filter({ hasText: text })).toBeVisible();
  const openHomepage = async () => {
    await page.goto(adminOrigin + '/admin/growth');
    await page.getByRole('tab', { name: 'Homepage', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Homepage sections', exact: true })).toBeVisible();
  };
  await openHomepage();

  // A product row and a banner strip with a pasted image address (typed key by key, as a half-typed address must not break the screen).
  await page.getByRole('combobox', { name: /^Add a section/ }).selectOption('products');
  await page.getByLabel('Title', { exact: true }).fill('Synthetic offers row');
  await page.getByRole('combobox', { name: /^Add a section/ }).selectOption('strip');
  await page.getByLabel('Title', { exact: true }).fill('Synthetic strip');
  await page.getByRole('textbox', { name: 'Desktop image URL', exact: true }).pressSequentially(art);
  await page.getByLabel('Image description', { exact: true }).fill('Synthetic strip artwork');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await status(/Draft saved\. Customers see the built-in homepage/);

  await openHomepage(); // the draft survives a reload
  await expect(page.getByRole('button', { name: /^Product row · Synthetic offers row/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Banner strip · Synthetic strip/ })).toBeVisible();
  await shop.goto(adminOrigin + '/');
  await expect(shop.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(row('Synthetic offers row')).toHaveCount(0);
  await shop.goto(adminOrigin + '/?preview=layout');
  await expect(row('Synthetic offers row')).toBeVisible();

  await page.getByRole('button', { name: 'Publish homepage', exact: true }).click();
  await status(/Published\. The homepage shows this layout now/);
  await shop.goto(adminOrigin + '/');
  await expect(row('Synthetic offers row')).toBeVisible();
  await expect(shop.getByRole('img', { name: 'Synthetic strip artwork' })).toBeVisible();

  // Saving a further draft leaves the published homepage as it was.
  await page.getByRole('button', { name: /^Product row · Synthetic offers row/ }).click();
  await page.getByLabel('Title', { exact: true }).fill('Synthetic renamed row');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await status(/The live homepage is unchanged/);
  await shop.goto(adminOrigin + '/');
  await expect(row('Synthetic offers row')).toBeVisible();
  await expect(row('Synthetic renamed row')).toHaveCount(0);

  await page.getByRole('button', { name: 'Copy to Arabic draft', exact: true }).click();
  await status(/Copied to the Arabic draft/);
  await page.getByRole('combobox', { name: /^Language/ }).selectOption('ar');
  await expect(page.getByRole('button', { name: /^Product row · Synthetic renamed row/ })).toBeVisible();
  await expect(page.getByText('Nothing is published', { exact: false })).toBeVisible();

  await page.getByRole('combobox', { name: /^Language/ }).selectOption('en');
  await page.getByRole('button', { name: /Unpublish/ }).click();
  await status(/Unpublished\./);
  await shop.goto(adminOrigin + '/');
  await expect(row('Synthetic offers row')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Product row · Synthetic renamed row/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('staff create a custom page and a brand page from the signed-in screens', async ({ page, request }) => {
  test.setTimeout(90000);
  await reset(request); await artRoute(page); await login(page);
  const editor = async () => { await page.goto(adminOrigin + '/admin/growth'); await expect(page.getByRole('combobox', { name: 'Page type', exact: true })).toBeVisible(); };
  const save = async () => {
    await page.getByLabel('Publish this page', { exact: true }).check();
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Saved. Published pages appear' })).toBeVisible();
  };
  await editor();
  await page.getByRole('combobox', { name: 'Page type', exact: true }).selectOption('page');
  await page.getByRole('textbox', { name: /^URL name/ }).fill('synthetic-landing');
  await page.getByLabel('Title', { exact: true }).fill('Synthetic landing page');
  await page.getByLabel('Search description', { exact: true }).fill('A page assembled from sections for testing.');
  await page.getByRole('combobox', { name: /^Add a section/ }).selectOption('products');
  await page.getByRole('textbox', { name: 'Title', exact: true }).last().fill('Synthetic page row');
  await save();
  await editor(); // the sections come back from the server
  await page.getByRole('button', { name: /Synthetic landing page · Published/ }).click();
  await expect(page.getByRole('button', { name: /^Product row · Synthetic page row/ })).toBeVisible();
  await page.goto(adminOrigin + '/pages/synthetic-landing');
  await expect(page.getByRole('heading', { name: 'Synthetic landing page', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Synthetic page row', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Synthetic care product', exact: true })).toBeVisible();

  await editor();
  await page.getByRole('combobox', { name: 'Page type', exact: true }).selectOption('brand');
  const picker = page.getByRole('combobox', { name: /^Catalogue brand/ });
  await picker.fill('Synthetic Labs'); await picker.blur();
  await expect(page.getByRole('textbox', { name: /^URL name/ })).toHaveValue('synthetic-labs');
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Synthetic Labs');
  await page.getByRole('textbox', { name: 'Brand logo or image URL', exact: true }).pressSequentially(art);
  await page.getByLabel('Image description', { exact: true }).fill('Synthetic Labs logo');
  await page.getByLabel('Page content', { exact: false }).fill('A brand added by staff before any product carries its name.');
  await save();
  await page.goto(adminOrigin + '/brands');
  await expect(page.getByRole('link', { name: /Synthetic Labs/ }).first()).toBeVisible();
  await page.goto(adminOrigin + '/brands/synthetic-labs');
  await expect(page.getByRole('heading', { name: 'Synthetic Labs', exact: true })).toBeVisible();
});

test('staff publish a banner for one language', async ({ page, request }) => {
  await reset(request); await artRoute(page); await login(page);
  const direct = await storage(page, request);
  await page.goto(adminOrigin + '/admin/banners');
  await page.locator('summary').filter({ hasText: 'Add banner' }).click();
  await page.getByLabel('Banner name', { exact: false }).fill('Synthetic Arabic banner');
  await page.getByLabel('Destination URL or storefront path', { exact: false }).fill('/offers');
  await page.getByRole('combobox', { name: /^Show on/ }).selectOption('ar');
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Banner image', { exact: false }).first().setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer: pixel });
  await page.locator('form').filter({ has: page.getByRole('combobox', { name: /^Show on/ }) }).locator('button[type=submit]').click();
  await expect(page.getByRole('row').filter({ hasText: 'Synthetic Arabic banner' })).toContainText('Arabic');
  expect(direct.uploads).toHaveLength(1); expect(direct.uploads[0]).toMatch(/^almina\/banners\/[a-f0-9-]{36}-desktop$/);
  expect(direct.viaServer, 'no banner bytes go through the web gateway').toEqual([]);
});

test('category, poster and artwork pictures go straight to storage', async ({ page, request }) => {
  test.setTimeout(90000);
  await reset(request); await artRoute(page); await login(page);
  const direct = await storage(page, request);
  const pixel = { name: 'synthetic.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') };
  const submit = (field: string) => page.locator('form').filter({ has: page.getByLabel(field, { exact: false }) }).locator('button[type=submit]').click();

  await page.goto(adminOrigin + '/admin/categories');
  await page.locator('summary').filter({ hasText: 'Create category' }).click();
  await page.getByLabel('Category name', { exact: false }).fill('Synthetic pictured category');
  await page.getByLabel('Category image', { exact: false }).setInputFiles(pixel);
  await submit('Category name');
  await expect(page.getByRole('row').filter({ hasText: 'Synthetic pictured category' }).locator('img'))
    .toHaveAttribute('src', /res\.cloudinary\.com\/synthetic\/image\/upload\/c_fill,w_80,h_80,f_auto,q_auto\/v1\/almina\/categories\//);

  await page.goto(adminOrigin + '/admin/whatsapp');
  await page.getByLabel('Poster image', { exact: false }).setInputFiles(pixel);
  await submit('Poster image');
  await expect(page.getByText(/res\.cloudinary\.com\/synthetic\/image\/upload\/v1\/almina\/posters\/[a-f0-9-]{36}\.jpg/)).toBeVisible();

  await page.goto(adminOrigin + '/admin/growth');
  await page.getByRole('combobox', { name: 'Page type', exact: true }).selectOption('campaign');
  await page.locator('input[type=file]').first().setInputFiles(pixel);
  await expect(page.getByRole('textbox', { name: 'Desktop artwork URL', exact: true })).toHaveValue(/\/almina\/products\/[a-f0-9-]{36}-0\.webp$/);

  expect(direct.uploads.map(id => id.split('/')[1])).toEqual(['categories', 'posters', 'products']);
  expect(direct.viaServer, 'no picture bytes go through the web gateway').toEqual([]);
});

test('staff limit a coupon to a category and publish an opening popup', async ({ page, request, context }) => {
  test.setTimeout(90000);
  await reset(request); await artRoute(page); await login(page);
  await page.goto(adminOrigin + '/admin/growth');
  await page.getByRole('tab', { name: 'Coupons' }).click();
  await page.getByLabel('Code', { exact: true }).fill('care5');
  await page.getByLabel('Discount (%)', { exact: true }).fill('5');
  await page.getByRole('radio', { name: 'Selected categories' }).check();
  await page.getByRole('checkbox', { name: 'Synthetic category' }).check();
  await page.getByRole('button', { name: 'Save coupon' }).click();
  await expect(page.getByText('Saved CARE5.')).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Coupons' }).click();
  await expect(page.getByRole('button', { name: /CARE5/ })).toContainText('1 category');

  await page.goto(adminOrigin + '/admin/growth');
  await page.getByRole('combobox', { name: 'Page type', exact: true }).selectOption('campaign');
  await page.getByRole('textbox', { name: /^URL name/ }).fill('synthetic-welcome');
  await page.getByLabel('Title', { exact: true }).fill('Synthetic welcome offer');
  await page.getByLabel('Search description', { exact: true }).fill('A welcome message shown when the store opens.');
  await page.getByLabel('Page content', { exact: false }).fill('Synthetic welcome message for testing.');
  await page.getByRole('combobox', { name: 'Homepage position', exact: true }).selectOption('popup');
  await page.getByLabel('Publish this page', { exact: true }).check();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved. Published pages appear' })).toBeVisible();
  const shop = await context.newPage(); await artRoute(shop);
  // A returning visitor: on a first visit the popup waits for the delivery-location sheet to be closed.
  await shop.addInitScript(() => localStorage.setItem('almina.delivery-skip.v1', String(Date.now())));
  await shop.goto(adminOrigin + '/');
  await expect(shop.getByRole('dialog', { name: 'Synthetic welcome offer' })).toBeVisible();
});
