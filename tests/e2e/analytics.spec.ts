import { test, expect, customer, reset, productId, commerceOrigin } from './fixtures';
import type { Page } from '@playwright/test';

const origin = 'http://127.0.0.1:4750';
const key = 'almina.optional-usage.v2';
type Sent = { event: string; properties: Record<string, unknown> };
// The SDK ignores automated browsers, so these cases present an ordinary one.
test.use({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' });
test.beforeEach(async ({ request }) => { await reset(request); });

/** Stands in for the provider and keeps every body it would have received. */
async function provider(page: Page) {
  const bodies: string[] = [], events: Sent[] = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Headless Chromium also announces itself through the client-hint brands.
    Object.defineProperty(navigator, 'userAgentData', { get: () => undefined });
  });
  await page.route('https://analytics.example.invalid/**', async route => {
    const raw = route.request().postData() ?? '';
    bodies.push(`${route.request().url()} ${raw}`);
    const text = raw.startsWith('data=') ? decodeURIComponent(raw.slice(5).split('&')[0]!) : raw;
    if (text) {
      const parsed = JSON.parse(text.startsWith('{') || text.startsWith('[') ? text : Buffer.from(text, 'base64').toString('utf8'));
      events.push(...(Array.isArray(parsed) ? parsed : parsed.batch ?? [parsed]));
    }
    await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' }, contentType: 'application/json', body: '{"status":1}' });
  });
  const named = (name: string) => events.filter(item => item.event === name);
  const arrives = (name: string, count = 1) => expect.poll(() => named(name).length, { message: name }).toBeGreaterThanOrEqual(count);
  return { bodies, events, named, arrives };
}
const deviceKeys = (page: Page) => page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage), ...document.cookie.split(';').map(part => part.trim().split('=')[0]!)].filter(name => /^(ph_|__ph)/.test(name)));

async function products(page: Page) {
  const response = await page.request.post(commerceOrigin + '/__fixture/products', { data: { products: [
    { name: 'Gentle Lotion', brand: 'Calm', productType: 'general', description: 'Synthetic' },
    { name: 'Insulin Pen', brand: 'Medico', productType: 'otc', description: 'Synthetic' },
  ] } });
  const { productIds } = await response.json() as { productIds: string[] };
  return { general: `${origin}/products/gentle-lotion--${productIds[0]}`, medicine: `${origin}/products/insulin-pen--${productIds[1]}` };
}

test('before a choice, counting is anonymous, stores nothing and never names medicines or searches', async ({ page }) => {
  const sent = await provider(page), pages = await products(page);
  await page.goto(`${pages.general}?utm_source=newsletter&q=metformin`);
  await expect(page.getByRole('region', { name: 'Analytics choice' })).toBeVisible();
  await sent.arrives('product_viewed');
  expect(sent.named('product_viewed')[0]!.properties).toMatchObject({ product_name: 'Gentle Lotion', $cookieless_mode: true, $pathname: '/products/:product', utm_source: 'newsletter' });
  await page.goto(pages.medicine);
  await sent.arrives('product_viewed', 2);
  expect(sent.named('product_viewed')[1]!.properties.product_name).toBeUndefined();
  expect(sent.named('product_viewed')[1]!.properties.product_id).toBeUndefined();
  await page.getByRole('button', { name: 'Add to cart: Insulin Pen' }).first().click();
  await sent.arrives('product_added_to_cart');
  expect(sent.named('product_added_to_cart')[0]!.properties).toMatchObject({ quantity: 1 });
  expect(sent.named('product_added_to_cart')[0]!.properties.product_name).toBeUndefined();
  await page.goto(`${origin}/search?q=insulin+pen`);
  await sent.arrives('search_performed');
  for (const item of sent.events) expect(item.properties.$cookieless_mode).toBe(true);
  expect(await deviceKeys(page)).toEqual([]);
  const wire = sent.bodies.join('\n').toLowerCase();
  for (const secret of ['insulin', 'metformin', 'medico', 'insulin-pen', 'gentle-lotion']) expect(wire).not.toContain(secret);
});

test('permission adds a stored identifier and withdrawing it removes the identifier', async ({ page }) => {
  const sent = await provider(page), pages = await products(page);
  await page.goto(pages.general);
  await sent.arrives('product_viewed');
  await page.getByRole('region', { name: 'Analytics choice' }).getByRole('button', { name: 'Allow', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Analytics choice' })).toHaveCount(0);
  await expect.poll(() => deviceKeys(page)).not.toEqual([]);
  const before = sent.events.length;
  await page.getByRole('link', { name: 'Privacy policy' }).first().click();
  await expect.poll(() => sent.events.slice(before).filter(item => item.event === '$pageview' && item.properties.$pathname === '/privacy').length).toBeGreaterThan(0);
  const identified = sent.events.slice(before).find(item => item.properties.$pathname === '/privacy')!;
  expect(identified.properties.$cookieless_mode).toBeUndefined();
  await page.getByRole('button', { name: 'Usage preferences', exact: true }).click();
  await page.getByRole('button', { name: 'Decline optional reports', exact: true }).click();
  await expect.poll(() => deviceKeys(page)).toEqual([]);
  const withdrawn = sent.events.length;
  await page.getByRole('link', { name: 'Al Mina Pharmacy home' }).first().click();
  await expect.poll(() => sent.events.length).toBeGreaterThan(withdrawn);
  for (const item of sent.events.slice(withdrawn)) expect(item.properties.$cookieless_mode).toBe(true);
  expect(await deviceKeys(page)).toEqual([]);
});

test('a browser privacy signal and staff screens send nothing', async ({ page }) => {
  const sent = await provider(page);
  const scripts: Promise<string>[] = [];
  page.on('response', response => { if (response.url().endsWith('.js')) scripts.push(response.text().catch(() => '')); });
  await page.goto(origin + '/admin/login');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.addInitScript(storageKey => { localStorage.setItem(storageKey, 'allowed'); Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }); }, key);
  await page.goto(origin + '/cart');
  await expect(page.getByText('Optional usage reports: off.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Analytics choice' })).toHaveCount(0);
  await page.waitForTimeout(3000);
  expect(sent.bodies).toEqual([]);
  // The SDK itself is not even downloaded.
  expect((await Promise.all(scripts)).filter(source => source.includes('"posthog-js"'))).toEqual([]);
});

test('a confirmed order reports value and size without customer or order details', async ({ page }) => {
  const sent = await provider(page);
  await page.addInitScript(storageKey => localStorage.setItem(storageKey, 'allowed'), key);
  await page.goto(origin + '/checkout');
  await page.evaluate(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 2 }])), productId);
  await page.reload();
  for (const [name, value] of Object.entries(customer)) {
    if (name === 'payment') continue;
    const field = page.locator(`[name="${name}"]`);
    if (name === 'emirate') await field.selectOption(value); else await field.fill(value);
  }
  const review = page.getByRole('button', { name: 'Review order', exact: true });
  if (await review.isVisible()) await review.click(); else await page.getByRole('button', { name: 'Continue to payment', exact: true }).click();
  await page.getByRole('button', { name: 'Place order — AED 40.00', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order received' })).toBeVisible();
  await sent.arrives('checkout_confirmed');
  expect(sent.named('checkout_confirmed')[0]!.properties).toMatchObject({ value_aed: 40, item_count: 2, payment_method: 'cash' });
  const wire = sent.bodies.join('\n');
  for (const secret of [customer.email, customer.mobile, customer.address, 'Synthetic care product', 'OD']) {
    if (secret === 'OD') expect(wire).not.toMatch(/OD\d+/); else expect(wire).not.toContain(secret);
  }
});

for (const width of [360, 1280]) test(`the choice bar fits at ${width}px without covering the basket`, async ({ page }) => {
  await provider(page);
  await page.setViewportSize({ width, height: 800 });
  await page.addInitScript(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 1 }])), productId);
  await page.goto(origin + '/products');
  const banner = page.getByRole('region', { name: 'Analytics choice' });
  await expect(banner).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const box = (await banner.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  const basket = page.locator('.qc-cart-bar');
  if (width < 900) { const other = (await basket.boundingBox())!; expect(box.y + box.height).toBeLessThanOrEqual(other.y); }
  await page.screenshot({ path: `.verification-results/analytics-banner-${width}.png` });
  await banner.getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(banner).toHaveCount(0);
});

test('the choice is offered in Arabic, right to left', async ({ page }) => {
  await provider(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.context().addCookies([{ name: 'almina_lang', value: 'ar', url: origin }]);
  await page.goto(origin + '/products');
  const banner = page.getByRole('region', { name: 'خيار التحليلات' });
  await expect(banner.getByRole('button', { name: 'رفض', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: '.verification-results/analytics-banner-ar.png' });
});

test.describe('a brand new phone visitor', () => {
  // No stored delivery choice: the location sheet opens as it would for a real first visit.
  test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 360, height: 800 } });
  for (const path of ['/', '/products/synthetic-care-product--PD0001']) test(`is never asked two things at once on ${path}`, async ({ page }) => {
    await provider(page);
    await page.goto(origin + path);
    const banner = page.getByRole('region', { name: 'Analytics choice' });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `.verification-results/analytics-first-visit${path === '/' ? '-home' : '-product'}.png` });
    const sheet = page.locator('dialog[open]');
    await expect(sheet).toHaveCount(1);
    await expect(banner).toBeHidden();
    await page.getByRole('button', { name: 'Browse first', exact: true }).click();
    await expect(sheet).toHaveCount(0);
    await expect(banner).toBeVisible();
  });
});
