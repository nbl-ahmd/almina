import assert from 'node:assert/strict';
/* global window: readonly, document: readonly, innerWidth: readonly -- Used only inside Playwright browser callbacks. */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = new URL(process.env.DEV_STYLE_ORIGIN ?? 'http://127.0.0.1:4760');
assert.ok(origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname)
  && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash,
'Dev style verification requires a credential-free loopback origin');
const response = await fetch(origin, { signal: AbortSignal.timeout(10000) });
assert.equal(response.status, 200);
const policy = response.headers.get('content-security-policy');
assert.ok(policy?.split(';').find(value => value.trim().startsWith('style-src '))?.includes("'unsafe-inline'"));
assert.ok(!policy.split(';').find(value => value.trim().startsWith('script-src '))?.includes("'unsafe-inline'"));
const browser = await chromium.launch({ headless: true });
const evidence = [];
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
    ? route.continue() : route.abort('blockedbyclient'));
  await page.addInitScript(() => {
    window.__stylePolicyViolations = [];
    window.addEventListener('securitypolicyviolation', event => {
      if (event.effectiveDirective.startsWith('style-src')) window.__stylePolicyViolations.push(event.effectiveDirective);
    });
  });
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/products', '/categories', '/offers', '/search?q=Demo', '/cart', '/checkout', '/admin/login']) {
      await page.goto(new URL(path, origin).href, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `Overflow at ${width}px ${path}`);
      assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1);
      const indicator = page.getByRole('button', { name: 'Open Next.js Dev Tools', exact: true });
      await indicator.waitFor({ state: 'visible' });
      const bounds = await indicator.boundingBox();
      assert.ok(bounds && bounds.width >= 24 && bounds.width <= 40 && bounds.height >= 24 && bounds.height <= 40, 'Dev indicator retains its compact framework styling');
      assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.y + bounds.height <= 900, 'Dev indicator stays in the viewport');
      assert.deepEqual(await page.evaluate(() => window.__stylePolicyViolations), [], `Blocked inline style at ${path}`);
      evidence.push({ width, path, indicator: { width: bounds.width, height: bounds.height }, overflow: false });
    }
  }
  await page.getByRole('button', { name: 'Open Next.js Dev Tools', exact: true }).click();
  await page.getByRole('menu', { name: 'Next.js Dev Tools Items' }).waitFor({ state: 'visible' });
  await mkdir('.verification-results/dev-styles', { recursive: true });
  await page.screenshot({ path: '.verification-results/dev-styles/menu.jpg', type: 'jpeg' });
  assert.deepEqual(errors, []);
  await writeFile('.verification-results/dev-styles/result.json', JSON.stringify({ cases: evidence, errors, blockedStyleElements: 0 }, null, 2));
  console.log(`Development CSS verification passed: ${evidence.length} route/viewport cases, compact visible dev logo/menu, no stylesheet CSP violations or page errors.`);
} finally { await browser.close(); }
