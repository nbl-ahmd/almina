import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const origin = process.env.STOREFRONT_URL ?? 'http://127.0.0.1:3120';
const fixture = process.env.FIXTURE_URL ?? 'http://127.0.0.1:4120';
for (const value of [origin, fixture]) {
  const url = new URL(value);
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/');
}
function fixtureRequest(path) { return fetch(`${fixture}${path}`, { headers: { Connection: 'close' } }); }
assert.equal(await (await fixtureRequest('/__fixture/design-health')).text(), 'almina-synthetic-design');
const directory = process.env.VISUAL_OUTPUT ?? '/tmp/almina-storefront-design';
mkdirSync(directory, { recursive: true });
const session = execFileSync('agent-browser', ['session', 'id', '--scope', 'worktree', '--prefix', 'next-dev-loop-design'], { encoding: 'utf8' }).trim();
function browser(...args) {
  const response = JSON.parse(execFileSync('agent-browser', ['--session', session, '--restore', '--json', ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
  assert.ok(response.success, response.error); return response.data;
}
function evaluate(code) { return browser('eval', code).result; }
function open(path) { browser('--enable', 'react-devtools', 'open', `${origin}${path}`); }
function settle() {
  browser('wait', '--load', 'networkidle');
  browser('wait', '--fn', 'document.querySelector("main h1") && document.fonts.status === "loaded"');
  // Expand the browser viewport to load native lazy images for full-page captures.
  // Do not mutate React-owned DOM attributes before hydration.
  const width = evaluate('innerWidth');
  const height = evaluate('document.documentElement.scrollHeight');
  browser('set', 'viewport', String(width), String(Math.max(900, height)));
  browser('wait', '--fn', '[...document.querySelectorAll("main img")].every(img => img.complete)');
  browser('set', 'viewport', String(width), '900');
}
browser('console', '--clear'); browser('errors', '--clear');
open('/'); settle();
evaluate(`localStorage.clear(); localStorage.setItem('almina.cart.v1', JSON.stringify([{id:'bbbbbbbbbbbbbbbbbbbbbb64',quantity:2},{id:'bbbbbbbbbbbbbbbbbbbbbb65',quantity:1}]));`);
const categories = await (await fixtureRequest('/api/category')).json();
const routes = [
  ['home', '/'], ['products', '/products'], ['categories', '/categories'], ['category', `/categories/skin-care--${categories[0]._id}`],
  ['offers', '/offers'], ['search', '/search?q=daily'], ['details', '/products/daily-care--VIS001'], ['cart', '/cart'], ['checkout', '/checkout'],
];
const results = [];
for (const width of [360, 390, 768, 1024, 1440]) {
  browser('set', 'viewport', String(width), '900');
  for (const [name, path] of routes) {
    open(path); settle();
    if (name === 'cart' || name === 'checkout') browser('wait', '--text', 'AED 20.00 per item');
    assert.equal(evaluate('document.documentElement.scrollWidth > window.innerWidth'), false, `${name} overflow at ${width}`);
    assert.deepEqual(evaluate('[...document.querySelectorAll("main img")].filter(img => !img.naturalWidth).map(img => img.src)'), [], `Broken ${name} images`);
    const audit = browser('a11y');
    assert.equal(audit.counts.violations, 0, `${name} ${width}px axe violations: ${JSON.stringify(audit.violations)}`);
    assert.equal(audit.counts.incomplete, 0, `${name} ${width}px axe review items: ${JSON.stringify(audit.incomplete)}`);
    const filename = `${name}-${width}.png`;
    browser('screenshot', '--full', join(directory, filename));
    results.push({ route: path, width, screenshot: filename, axeViolations: audit.counts.violations, axeIncomplete: audit.counts.incomplete });
  }
  console.log(`${width}px: nine routes, no overflow/broken images/axe violations; screenshots saved.`);
}
// Native search supports Enter; category selection and clearing keep query semantics.
browser('set', 'viewport', '390', '900'); open('/'); settle();
browser('fill', '#site-search', 'Daily'); browser('press', 'Enter'); browser('wait', '--text', 'Results for “Daily”');
assert.ok(evaluate('location.search').includes('q=Daily'));
browser('select', '.filters select', categories[0]._id); browser('find', 'role', 'button', 'click', '--name', 'Apply');
browser('wait', '--fn', `location.search.includes('${categories[0]._id}')`); settle();
assert.ok(evaluate('[...document.querySelectorAll(".category-name")].every(el => el.textContent === "Skin Care")'));
browser('click', '.filter-reset'); browser('wait', '--fn', 'location.search === "" && !document.querySelector(".filter-reset")'); settle();
assert.equal(evaluate('document.querySelector(".filters select").value'), '');
open('/products/daily-care--VIS001'); settle();
browser('click', '.thumbnails button:nth-child(2)');
assert.equal(evaluate('document.querySelector(".thumbnails button:nth-child(2)").getAttribute("aria-pressed")'), 'true');
assert.ok(evaluate('document.querySelector(".gallery > img").src').includes('-back.svg'));
open('/products'); settle();
assert.equal(evaluate('[...document.querySelectorAll(".out-stock")].every(el => el.closest("article").querySelector("button").disabled)'), true);
// Real keyboard focus and skip link; fixed navigation must not obscure focused controls.
open('/'); settle(); browser('press', 'Tab');
assert.equal(evaluate('document.activeElement.className'), 'skip-link');
assert.equal(evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid');
browser('press', 'Enter');
assert.equal(evaluate('location.hash'), '#main-content');
open('/products'); settle(); browser('focus', '.product-card button');
const bounds = evaluate('(() => { const a = document.activeElement.getBoundingClientRect(); const n = document.querySelector(".mobile-nav").getBoundingClientRect(); return { bottom: a.bottom, top: a.top, nav: n.top }; })()');
assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.nav, 'Focus obscured by navigation');
open('/cart'); settle(); browser('wait', '--text', 'AED 20.00 per item'); browser('focus', '.quantity-control button');
assert.equal(evaluate('getComputedStyle(document.activeElement).outlineWidth'), '3px');
assert.equal(evaluate('getComputedStyle(document.activeElement.parentElement).overflow'), 'visible');
browser('screenshot', '--full', join(directory, 'cart-keyboard-focus-390.png'));
open('/products/daily-care--VIS001'); settle(); browser('focus', '.thumbnails button');
assert.equal(evaluate('getComputedStyle(document.activeElement).outlineWidth'), '3px');
browser('screenshot', '--full', join(directory, 'gallery-keyboard-focus-390.png'));
open('/products'); settle();
// 200% text sizing and reduced motion.
evaluate('document.documentElement.style.fontSize = "200%";');
assert.equal(evaluate('document.documentElement.scrollWidth > innerWidth'), false, '200% text overflow');
browser('screenshot', '--full', join(directory, 'products-390-text-200.png'));
evaluate('document.documentElement.style.fontSize = "";');
browser('set', 'media', 'light', 'reduced-motion');
assert.equal(evaluate('getComputedStyle(document.querySelector("main button")).transitionDuration'), '0s');
browser('set', 'media', 'light', 'no-preference');
const successfulConsoleErrors = (browser('console').messages ?? []).filter(entry => entry.type === 'error');
assert.deepEqual(successfulConsoleErrors, [], 'Unexpected console error on successful storefront routes');
// Verify the scoped catalog skeleton during a native search navigation.
await fixtureRequest('/__fixture/design-slow?enabled=1');
try {
  open('/'); settle(); browser('fill', '#site-search', 'loading-state-check'); browser('press', 'Enter');
  browser('wait', '--text', 'Loading the pharmacy…');
  browser('screenshot', '--full', join(directory, 'catalog-loading-390.png'));
  browser('wait', '--text', 'No products found.');
} finally { await fixtureRequest('/__fixture/design-slow?enabled=0'); }
// Empty, unavailable and service-error states retain useful recovery paths.
open('/search?q=no-synthetic-match'); settle(); browser('wait', '--text', 'No products found.');
browser('screenshot', '--full', join(directory, 'search-empty-390.png'));
open('/products/family-essentials-care-pack--VIS004'); settle();
assert.equal(evaluate('document.querySelector(".cart-controls button").disabled'), true);
browser('screenshot', '--full', join(directory, 'details-out-stock-390.png'));
open('/missing'); settle(); browser('wait', '--text', 'Page not found');
browser('screenshot', '--full', join(directory, 'not-found-390.png'));
await fixtureRequest('/__fixture/design-failure?enabled=1');
try {
  open('/products'); browser('wait', '--text', 'Unable to load this page');
  browser('screenshot', '--full', join(directory, 'catalog-error-390.png'));
  open('/cart'); browser('wait', '--text', 'Unable to check your cart.');
  assert.ok(evaluate('JSON.parse(localStorage.getItem("almina.cart.v1")).length') > 0);
  browser('screenshot', '--full', join(directory, 'cart-error-390.png'));
} finally { await fixtureRequest('/__fixture/design-failure?enabled=0'); }
browser('find', 'role', 'button', 'click', '--name', 'Try again'); browser('wait', '--text', 'AED 20.00 per item');
await fixtureRequest('/__fixture/design-slow?enabled=1');
try {
  open('/cart'); browser('wait', '--text', 'Loading your cart…');
  browser('screenshot', '--full', join(directory, 'cart-loading-390.png'));
  browser('wait', '--text', 'AED 20.00 per item');
} finally { await fixtureRequest('/__fixture/design-slow?enabled=0'); }
evaluate('localStorage.removeItem("almina.cart.v1");'); open('/cart'); browser('wait', '--text', 'Your cart is currently empty');
browser('screenshot', '--full', join(directory, 'cart-empty-390.png'));
open('/products'); settle(); browser('reload'); settle();
assert.deepEqual(browser('errors').errors ?? [], []);
const consoleErrors = (browser('console').messages ?? []).filter(entry => entry.type === 'error');
// Intentional error-boundary/404 requests are inspected separately in the report.
writeFileSync(join(directory, 'verification.json'), JSON.stringify({ results, successfulConsoleErrors, consoleErrors, errors: browser('errors').errors ?? [] }, null, 2));
console.log('Search/filter/clear, gallery, unavailable controls, skip link/focus, text scaling/reduced motion, cart error/retry/empty and reload checks passed.');
console.log(`Evidence: ${directory}`);
