import { test, expect, adminOrigin } from './fixtures';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const localRequire = createRequire(resolve('package.json'));
const axe = readFileSync(localRequire.resolve('axe-core/axe.min.js'), 'utf8');
for (const width of [360, 390, 768, 1280]) test(`public information routes preserve navigation and accessibility at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  for (const [path, title] of [['/about', 'A little more care for your everyday.'], ['/contact', 'Let’s talk care.']]) {
    await page.goto(path!); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title!);
    await page.reload(); await expect(page.getByRole('heading', { level: 1 })).toHaveText(title!);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `http://127.0.0.1:4710${path}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(axe);
    const violations = await page.evaluate(async () => {
      const audit = (window as unknown as { axe: { run: (node: Element) => Promise<{ violations: { id: string }[] }> } }).axe;
      return (await audit.run(document.querySelector('main')!)).violations.map(item => item.id);
    });
    expect(violations).toEqual([]);
  }
  await page.goto('/map?utm_source=shared');
  await expect(page).toHaveURL('http://127.0.0.1:4710/contact?utm_source=shared#delivery');
  await expect(page.getByRole('link', { name: '+971 50 482 5007', exact: true }).first()).toHaveAttribute('href', 'tel:+971504825007');
  const cart = page.getByRole('link', { name: 'Review your cart', exact: true });
  await cart.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/cart$/);
});
test('all retained administrator aliases redirect explicitly without exposing private HTML', async ({ request }) => {
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const destinations: Record<string, string> = {
    '/admindash': '/admin', '/admin/order': '/admin/orders', '/admin/productlist': '/admin/products',
    '/admin/disabled': '/admin/products?view=disabled', '/admin/salelist': '/admin/products?view=sale',
    '/admin/outofstock': '/admin/products?view=outofstock', '/admin/dispatched': '/admin/orders?status=dispatched',
    '/admin/cancelled': '/admin/orders?status=cancelled', '/admindash/uploadproduct': '/admin/products/new',
    '/admindash/banner': '/admin/banners', '/admindash/salelist': '/admin/products?view=sale',
    '/admindash/outofstock': '/admin/products?view=outofstock',
    [`/admin/productlist/update/${id}`]: `/admin/products/${id}`,
    [`/admin/categories/update/${id}`]: `/admin/categories/${id}`,
    [`/admindash/categories/update/${id}`]: `/admin/categories/${id}`,
  };
  for (const name of ['products', 'categories', 'settings', 'batch', 'users', 'whatsapp']) destinations[`/admindash/${name}`] = `/admin/${name}`;
  for (const path of ['/admin/productlist', '/admin/outofstock', '/admin/salelist', '/admindash/products', '/admindash/outofstock', '/admindash/salelist', '/admindash/categories']) destinations[`${path}/search`] = destinations[path]!;
  for (const [path, target] of Object.entries(destinations)) {
    const response = await request.get(adminOrigin + path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307); expect(new URL(response.headers().location!, adminOrigin).href, path).toBe(adminOrigin + target);
    expect(response.headers()['x-robots-tag'], path).toBe('noindex, nofollow');
  }
});
test('public icon, manifest and compatibility worker URLs survive frontend replacement', async ({ request }) => {
  for (const path of ['/favicon.ico', '/favicon-16x16.png', '/favicon-32x32.png', '/apple-touch-icon.png', '/android-chrome-192x192.png', '/android-chrome-512x512.png', '/manifest.json', '/service-worker.js', '/admin/worker.js']) {
    const response = await request.get(path); expect(response.status(), path).toBe(200);
  }
  const worker = await (await request.get('/service-worker.js')).text();
  expect(worker).not.toContain('importScripts'); expect(worker).not.toContain('event.data'); expect(worker).toContain('/admin/notifications');
});
