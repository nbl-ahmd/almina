import type { Page } from '@playwright/test';
import { test, expect, adminOrigin, login, reset } from './fixtures';

const catalog = 'http://127.0.0.1:4711/__fixture/';
const productId = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const fits = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const locale = (page: Page, value: 'ar' | 'en', origin: string) => page.context().addCookies([{ name: 'almina_lang', value, url: origin }]);

test('the homepage has a WhatsApp button at the bottom right, clear of the tab bar', async ({ page }) => {
  for (const [width, height] of [[390, 844], [1280, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const button = page.getByRole('link', { name: /Chat with us on WhatsApp/ });
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('href', /^https:\/\/wa\.me\/971504825007\?text=/);
    const box = (await button.boundingBox())!;
    expect(width - (box.x + box.width)).toBeLessThanOrEqual(32);
    expect(height - (box.y + box.height)).toBeLessThanOrEqual(100);
    if (width < 768) {
      const tabs = (await page.locator('.mobile-nav').boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(tabs.y);
    }
    expect(await fits(page)).toBe(true);
  }
  await page.goto('/products');
  await expect(page.getByRole('link', { name: /Chat with us on WhatsApp/ })).toHaveCount(0);
});

test('the skincare routine gives each product a readable card on every width', async ({ page, request }) => {
  expect((await request.get(catalog + 'home-routine?enabled=1')).ok()).toBeTruthy();
  try {
    for (const language of ['en', 'ar'] as const) {
      await locale(page, language, 'http://127.0.0.1:4710');
      for (const width of [390, 900, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        const section = page.locator('.home-routine');
        await expect(section.locator('.home-routine-step')).toHaveCount(3);
        // The page streams: counted elements can still be in the hidden holding area, so wait until the section is shown.
        await expect(section.locator('.section-heading')).toBeVisible();
        await expect(section.locator('.home-routine-step h3').last()).toBeVisible();
        const whole = (await section.boundingBox())!;
        const heading = (await section.locator('.section-heading').boundingBox())!;
        expect(heading.width).toBeGreaterThan(whole.width * 0.9);
        for (const name of await section.locator('.home-routine-step h3').all()) {
          expect((await name.boundingBox())!.width).toBeGreaterThanOrEqual(130);
        }
        expect(await fits(page)).toBe(true);
        await section.screenshot({ path: test.info().outputPath(`routine-${language}-${width}.png`) });
      }
    }
  } finally { expect((await request.get(catalog + 'home-routine?enabled=0')).ok()).toBeTruthy(); }
});

test('the hero frame keeps its shape whatever size the artwork is', async ({ page, request }) => {
  // Deliberately off-size artwork: the frame must not follow it.
  await page.route('**/_next/image?**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="900"><rect width="400" height="900" fill="#cde"/></svg>' }));
  expect((await request.get(catalog + 'home-campaigns?enabled=1')).ok()).toBeTruthy();
  try {
    for (const [width, ratio] of [[390, 2], [820, 2], [900, 16 / 5], [1440, 16 / 5]] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const hero = page.locator('.home-hero .qc-hero').first();
      await expect(hero).toBeVisible();
      const frame = (await hero.boundingBox())!;
      expect(frame.width / frame.height).toBeCloseTo(ratio, 1);
    }
  } finally { expect((await request.get(catalog + 'home-campaigns?enabled=0')).ok()).toBeTruthy(); }
});

test('a product can be shared through the system sheet, or by WhatsApp, e-mail and copied link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4710' });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/products/daily-care--PD0001?utm_source=test');
  await page.getByRole('button', { name: 'Share Daily Care', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Share this product' });
  await expect(dialog).toBeVisible();
  const link = await dialog.getByLabel('Product link').inputValue();
  expect(link).toMatch(/^http:\/\/127\.0\.0\.1:4710\/products\/[^?]+--PD0001$/);
  await expect(dialog.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=Daily\+Care/);
  await expect(dialog.getByRole('link', { name: 'Email' })).toHaveAttribute('href', /^mailto:\?subject=Daily%20Care/);
  await dialog.getByRole('button', { name: 'Copy link' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Share Daily Care', exact: true })).toBeFocused();

  const shared = await context.newPage();
  await shared.addInitScript(() => { Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { (window as unknown as { sharedData: ShareData }).sharedData = data; } }); });
  await shared.goto('/products/daily-care--PD0001');
  await shared.getByRole('button', { name: 'Share Daily Care', exact: true }).click();
  await expect.poll(() => shared.evaluate(() => (window as unknown as { sharedData?: ShareData }).sharedData?.url)).toBe(link);
  await expect(shared.getByRole('dialog')).toHaveCount(0);
});

async function ordersFixture(page: Page) {
  const reviews: Record<string, unknown>[] = [];
  const line = { productId, name: 'Synthetic ordered cream', quantity: 2, lineTotalMinor: 4000 };
  const orders = [
    { orderId: 'OD7002', status: 'dispatched', createdAt: '2026-11-20T08:00:00.000Z', paymentMethod: 'cash', totals: { totalMinor: 4500, deliveryFeeMinor: 500, discountMinor: 1000, lines: [line] },
      timeline: [{ status: 'pending', at: '2026-11-20T08:00:00.000Z' }, { status: 'confirmed', at: '2026-11-20T08:10:00.000Z' }, { status: 'packed', at: '2026-11-20T08:20:00.000Z' }, { status: 'dispatched', at: '2026-11-20T09:00:00.000Z' }] },
    { orderId: 'OD7001', status: 'pending', createdAt: '2026-11-19T08:00:00.000Z', totals: { totalMinor: 2000, lines: [{ productId: 'cccccccccccccccccccccccc', name: 'Synthetic waiting tablet pack', quantity: 1 }] } },
  ];
  await page.route('**/api/customer/**', async route => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    const json = (status: number, data: unknown) => route.fulfill({ status, json: { data } });
    if (action === 'me') return json(200, { id: 'synthetic-customer', email: 'shopper@example.invalid', marketingEmail: false, marketingWhatsapp: false });
    if (action === 'orders') return json(200, orders);
    if (action === 'review') { reviews.push(route.request().postDataJSON()); return json(200, { status: 'pending' }); }
    if (['saved', 'addresses', 'reminders'].includes(action!)) return json(200, action === 'saved' ? { ids: [] } : []);
    return json(503, null);
  });
  return reviews;
}

for (const width of [360, 1280]) test(`past orders, order status and rating live in the account at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  const reviews = await ordersFixture(page);
  await page.goto(adminOrigin + '/account');
  await expect(page.getByRole('heading', { name: 'Your Al Mina account', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: /OD7002/ })).toContainText('Dispatched');
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`account-${width}.png`), fullPage: true });

  await page.getByRole('link', { name: 'View all orders' }).click();
  await expect(page).toHaveURL(adminOrigin + '/account/orders');
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('button', { name: 'In progress', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Order received');
  await page.getByRole('button', { name: 'All orders', exact: true }).click();
  // The quantity stays a small chip with the product name beside it, in both directions.
  const chip = async () => {
    await expect(page.locator('.order-qty').first()).toBeVisible();
    const quantity = (await page.locator('.order-qty').first().boundingBox())!, name = (await page.locator('.order-card-line bdi').first().boundingBox())!;
    expect(quantity.width).toBeLessThan(48);
    expect(Math.min(Math.abs(name.x - (quantity.x + quantity.width)), Math.abs(quantity.x - (name.x + name.width)))).toBeLessThanOrEqual(10);
  };
  await chip();
  await locale(page, 'ar', adminOrigin); await page.reload(); await expect(page.getByRole('article')).toHaveCount(2); await chip();
  await locale(page, 'en', adminOrigin); await page.reload(); await expect(page.getByRole('article')).toHaveCount(2);
  // One field, not a box inside a pill.
  await expect(page.getByRole('searchbox', { name: 'Search your orders' })).toHaveCSS('border-top-width', '0px');
  await page.getByRole('searchbox', { name: 'Search your orders' }).fill('waiting tablet');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search your orders' }).fill('nothing here');
  await expect(page.getByRole('status').filter({ hasText: 'No orders match' })).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search your orders' }).fill('');
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`orders-${width}.png`), fullPage: true });

  // A pending order cannot be rated yet.
  await page.getByRole('link', { name: /OD7001/ }).click();
  await expect(page.getByRole('heading', { name: 'Order OD7001', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: /^Rate Synthetic/ })).toHaveCount(0);

  await page.goto(adminOrigin + '/account/orders/OD7002');
  await expect(page.getByRole('heading', { name: 'Order OD7002', exact: true })).toBeVisible();
  await expect(page.locator('.order-steps li')).toHaveCount(4);
  await expect(page.locator('.order-bill')).toContainText('Cash on delivery');
  await page.getByRole('button', { name: '4 out of 5, Good', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '4 out of 5, Good', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '4 out of 5, Good', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Share your experience' });
  await expect(dialog.getByRole('radio', { name: 'Good' })).toBeChecked();
  await dialog.getByRole('button', { name: 'Submit review' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Add a public name');
  expect(reviews).toHaveLength(0);
  await dialog.getByText('Great', { exact: true }).click();
  await dialog.getByLabel('Public display name').fill('Synthetic shopper');
  await dialog.getByLabel('Your experience').fill('Synthetic experience with this product.');
  await page.screenshot({ path: test.info().outputPath(`review-${width}.png`) });
  await dialog.getByRole('button', { name: 'Submit review' }).click();
  await expect(dialog).toHaveCount(0);
  expect(reviews).toEqual([{ productId, orderId: 'OD7002', rating: 5, displayName: 'Synthetic shopper', title: '', body: 'Synthetic experience with this product.' }]);
  await expect(page.getByText('You rated 5 out of 5')).toBeVisible();
  await expect(page.getByText('Waiting for pharmacy review')).toBeVisible();
  await expect(page.getByRole('group', { name: /^Rate Synthetic/ })).toHaveCount(0);
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`order-${width}.png`), fullPage: true });

  await locale(page, 'ar', adminOrigin);
  await page.goto(adminOrigin + '/account/orders/OD7002');
  await expect(page.getByRole('heading', { name: 'الطلب OD7002', exact: true })).toBeVisible();
  await expect(page.locator('.order-steps')).toContainText('تم الإرسال');
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`order-ar-${width}.png`), fullPage: true });
});

test('signed-out shoppers are asked to sign in on order screens, and the product page points there to review', async ({ page }) => {
  await page.goto(adminOrigin + '/account/orders/OD7002');
  await expect(page.getByRole('heading', { name: 'Welcome to Al Mina' })).toBeVisible();
  await page.goto('/products/daily-care--PD0001');
  await expect(page.getByRole('button', { name: 'Write a review' })).toHaveCount(0);
  await expect(page.locator('.product-reviews').getByRole('link', { name: 'My orders' })).toHaveAttribute('href', '/account/orders');
});

test('an administrator creates a brand with a logo and publishes its page', async ({ page, request }) => {
  test.setTimeout(90000);
  await reset(request);
  await page.route('**/_next/image?**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#cde"/></svg>' }));
  await login(page);
  await page.goto(adminOrigin + '/admin/brands');
  await expect(page.getByRole('heading', { name: 'Brands', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create brand', exact: true }).click();
  await page.getByLabel('New brand name', { exact: true }).fill('Synthetic Botanics');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic Botanics', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Brand logo URL', exact: true }).fill('https://cdn.alminapharmacy.com/cdn/synthetic/logo.webp');
  await page.getByRole('checkbox', { name: 'Publish this page' }).check();
  await page.getByRole('button', { name: 'Save and publish' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved and published' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('brand-editor.png'), fullPage: true });

  // Arabic is its own page at the same address.
  await page.getByRole('button', { name: 'Arabic', exact: true }).click();
  await page.getByLabel('Brand name (Arabic)').fill('نباتات تجريبية');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.getByRole('button', { name: 'All brands' }).click();
  const row = page.getByRole('listitem').filter({ hasText: '/brands/synthetic-botanics' });
  await expect(row).toContainText('English: published');
  await expect(row).toContainText('Arabic: draft');
  await page.screenshot({ path: test.info().outputPath('brands.png'), fullPage: true });

  await page.reload();
  await page.getByRole('button', { name: 'Edit Synthetic Botanics' }).click();
  await expect(page.getByRole('textbox', { name: 'Brand logo URL', exact: true })).toHaveValue('https://cdn.alminapharmacy.com/cdn/synthetic/logo.webp');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('brand-editor-390.png'), fullPage: true });

  await page.goto(adminOrigin + '/brands/synthetic-botanics');
  await expect(page.getByRole('heading', { name: 'Synthetic Botanics', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Synthetic Botanics logo' })).toBeVisible();
});

test('staff without administrator access cannot open Brands', async ({ page, request }) => {
  await reset(request); await login(page, 'synthetic-staff');
  await expect(page.getByRole('link', { name: 'Brands', exact: true })).toHaveCount(0);
  await page.goto(adminOrigin + '/admin/brands');
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});

test('banner upload warns when the file’s shape does not match its frame', async ({ page, request }) => {
  await reset(request); await login(page);
  await page.goto(adminOrigin + '/admin/banners');
  await page.locator('summary').filter({ hasText: 'Add banner' }).click();
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await page.getByLabel('Banner image', { exact: false }).first().setInputFiles({ name: 'square.png', mimeType: 'image/png', buffer: pixel });
  await expect(page.getByRole('status').filter({ hasText: 'This image is 1 × 1. The frame is shaped for 1600 × 500' })).toBeVisible();
  await page.getByLabel('Phone banner image', { exact: false }).setInputFiles({ name: 'square.png', mimeType: 'image/png', buffer: pixel });
  await expect(page.getByRole('status').filter({ hasText: 'shaped for 800 × 400' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('banner-warning.png'), fullPage: true });
});
