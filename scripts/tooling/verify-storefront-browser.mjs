import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const origin = process.env.STOREFRONT_URL ?? 'http://127.0.0.1:3100';
const fixture = process.env.FIXTURE_URL ?? 'http://127.0.0.1:4100';
for (const value of [origin, fixture]) {
  const url = new URL(value);
  assert.ok(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname === '/', 'Verification is restricted to isolated loopback previews.');
}
assert.equal(await (await fetch(`${fixture}/__fixture/health`)).text(), 'almina-synthetic-catalog');
const session = execFileSync('agent-browser', ['session', 'id', '--scope', 'worktree', '--prefix', 'next-dev-loop'], { encoding: 'utf8' }).trim();
function browser(...args) {
  const result = JSON.parse(execFileSync('agent-browser', ['--session', session, '--restore', '--json', ...args], { encoding: 'utf8' }));
  assert.ok(result.success, result.error);
  return result.data;
}
function evaluate(code) { return browser('eval', code).result; }
function contains(text) { browser('wait', '--text', text); assert.ok(evaluate('document.querySelector("main").innerText').includes(text)); }
function open(path) { browser('--enable', 'react-devtools', 'open', `${origin}${path}`); }
open('/');
browser('set', 'viewport', '1280', '900');
// Clear this isolated fixture session, then seed the legacy representation with forged price/stock.
evaluate(`localStorage.clear(); localStorage.setItem('cartItems', JSON.stringify([{_id:'bbbbbbbbbbbbbbbbbbbbbbbb', quantity:2, price:0, stock:999, name:'Forged'}]));`);
for (const [path, text] of [['/', 'Featured products'], ['/products', 'Daily Care'], ['/products/daily-care--PD0001', 'Daily care product description.'], ['/categories', 'Skin Care'], ['/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa', 'Daily Care'], ['/offers', 'Daily Care'], ['/search?q=Daily', 'Daily Care'], ['/cart', 'AED 20.00 per item'], ['/checkout', 'Ordering is not available in this preview.'], ['/missing', 'Page not found'], ['/products/missing', 'Page not found'], ['/categories/missing', 'Page not found'], ['/productdetails/PD0001?utm_source=shared', 'Daily care product description.'], ['/categories/aaaaaaaaaaaaaaaaaaaaaaaa', 'Daily Care']]) {
  open(path); contains(text);
  browser('reload'); contains(text);
  assert.equal(evaluate('document.documentElement.scrollWidth > window.innerWidth'), false, `Overflow at ${path}`);
  console.log(`Direct navigation and refresh: ${path}`);
}
open('/cart'); contains('AED 20.00 per item');
assert.ok(!evaluate('document.querySelector("main").innerText').includes('Forged'));
browser('click', 'button[aria-label="Increase Daily Care quantity"]');
browser('wait', '--fn', 'document.querySelector(".quantity")?.textContent === "3"');
browser('click', 'button[aria-label="Increase Daily Care quantity"]');
browser('wait', '--fn', 'document.querySelector(".quantity")?.textContent === "4"');
browser('click', 'button[aria-label="Increase Daily Care quantity"]'); contains('Stock is low.');
assert.equal(evaluate('document.querySelector(".quantity").textContent'), '4');
browser('reload'); contains('AED 20.00 per item');
assert.equal(evaluate('document.querySelector(".quantity").textContent'), '4');
browser('click', 'button[aria-label="Decrease Daily Care quantity"]');
browser('wait', '--fn', 'document.querySelector(".quantity")?.textContent === "3"');
browser('find', 'role', 'button', 'click', '--name', 'Remove'); contains('Your cart is currently empty');
await fetch(`${fixture}/__fixture/closed`);
try {
  open('/products/daily-care--PD0001'); contains('Product description');
  browser('find', 'role', 'button', 'click', '--name', 'Add to cart'); contains('The store is currently closed.');
  assert.deepEqual(JSON.parse(evaluate('localStorage.getItem("almina.cart.v1")')), []);
} finally { await fetch(`${fixture}/__fixture/closed`); }
browser('find', 'role', 'button', 'click', '--name', 'Add to cart'); contains('Added to cart.');
open('/cart'); contains('AED 20.00 per item');
browser('set', 'viewport', '375', '812');
open('/'); contains('Featured products');
assert.equal(evaluate('getComputedStyle(document.querySelector(".mobile-nav")).display'), 'flex');
browser('click', '.mobile-nav a[href="/categories"]'); contains('Skin Care');
browser('click', '.mobile-nav a[href="/offers"]'); contains('Daily Care');
browser('click', '.mobile-nav a[href="/cart"]'); contains('AED 20.00 per item');
for (const path of ['/products/daily-care--PD0001', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa', '/checkout', '/search?q=%5B']) {
  open(path);
  assert.equal(evaluate('document.documentElement.scrollWidth > window.innerWidth'), false, `Mobile overflow at ${path}`);
}
open('/products/daily-care--PD0001'); contains('Product description');
console.log('Cart legacy import, server prices, quantity/stock checks, removal, persistence, closed-store handling and mobile navigation passed.');
const tree = browser('react', 'tree').tree;
assert.ok(tree.includes('Server(ProductPage)') && tree.includes('Server(Navigation)'));
console.log('React inspection confirms server page and navigation with small interactive islands.');
console.log(JSON.stringify(browser('errors')));
const consoleEntries = browser('console').messages ?? [];
console.log(`Console inspection: ${consoleEntries.filter(entry => entry.type === 'error').length} error messages (including intentional 404 navigation).`);

await fetch(`${fixture}/__fixture/failure`);
try { open('/products'); contains('Unable to load this page'); }
finally { await fetch(`${fixture}/__fixture/failure`); }
browser('find', 'role', 'button', 'click', '--name', 'Try again'); contains('Daily Care');
console.log('Upstream failure error boundary and retry passed.');
