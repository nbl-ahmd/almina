/* global document, window */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.SHOT_BASE || 'http://127.0.0.1:4760';
const out = process.env.SHOT_OUT || '.verification-results/design-audit';
const locale = process.env.SHOT_LOCALE || '';
const fullPage = process.env.SHOT_FULL !== 'false';
const routes = (process.env.SHOT_ROUTES || '/,/products,/search?q=vitamin,/categories,/cart').split(',');
const sizes = (process.env.SHOT_SIZES || 'mobile:390x844,desktop:1440x960').split(',');
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const origin = new URL(base).origin;
for (const size of sizes) {
  const [name, dims] = size.split(':');
  const [width, height] = dims.split('x').map(Number);
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  if (locale) {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: origin }]);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  for (const route of routes) {
    errors.length = 0;
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const safe = route.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';
    await page.screenshot({ path: `${out}/${name}-${locale ? locale + '-' : ''}${safe}.png`, fullPage });
    console.log(`${name} ${route}${locale ? ` [${locale}]` : ''} overflow=${overflow} errors=${errors.length}`);
    for (const error of errors.slice(0, 5)) console.log(`  ! ${error}`);
  }
  await context.close();
}
await browser.close();
