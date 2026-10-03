import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const origin = 'http://127.0.0.1:4501';
assert.equal(await (await fetch(`${origin}/__fixture/health`)).text(), 'almina-synthetic-commerce');
const session = 'almina-commerce-verification';
function browser(...args) {
  const result = JSON.parse(execFileSync('agent-browser', ['--session', session, '--json', ...args], { encoding: 'utf8' }));
  assert.ok(result.success, result.error); return result.data;
}
function evaluate(code) { return browser('eval', code).result; }
async function records() { return (await fetch(`${origin}/__fixture/orders`)).json(); }
function fill() {
  for (const [field, value] of [['name', 'Synthetic'], ['mobile', '0501234567'], ['email', 'synthetic@example.invalid'], ['address', 'Synthetic address']]) browser('fill', `#${field}`, value);
  browser('select', '#emirate', 'Ras al-Khaimah');
  browser('wait', '--fn', 'document.querySelector("#city").options[0].textContent !== "Loading Cities..."');
  // Supply a synthetic suburb while external providers are blocked in this isolated preview.
  evaluate('document.querySelector("#city").add(new Option("City A", "City A"));');
  browser('select', '#city', 'City A'); browser('check', '#cash');
}
function enableQuoteReview() {
  evaluate('window.confirm = text => { window.__lastConfirmation = text; return true; };');
}
browser('network', 'unroute');
browser('network', 'route', 'https://overpass-api.de/**', '--abort');
browser('network', 'route', 'https://nominatim.openstreetmap.org/**', '--abort');
browser('open', origin);
evaluate('sessionStorage.clear(); localStorage.setItem("cartItems", JSON.stringify([{_id:"bbbbbbbbbbbbbbbbbbbbbbbb",quantity:2,name:"Forged browser name",price:1,salePrice:1,stock:999}]));');
browser('open', `${origin}/checkout`);
browser('wait', '--fn', 'getComputedStyle(document.querySelector(".d-none")).display === "none"');
fill(); enableQuoteReview();
for (const width of [360, 390, 768, 1280]) {
  browser('set', 'viewport', String(width), '900');
  browser('wait', '--fn', `window.innerWidth === ${width}`);
  assert.equal(evaluate('document.documentElement.scrollWidth > window.innerWidth'), false, `Overflow at ${width}px`);
}
const before = (await records()).count;
browser('find', 'role', 'button', 'click', '--name', 'Place order');
browser('wait', '--text', 'Order Placed Successfully!');
assert.equal(evaluate('window.__lastConfirmation'), 'Place order for AED 40.00? Prices are confirmed by the server.');
assert.ok(evaluate('document.body.innerText').includes('AED 40.00'));
assert.equal(evaluate('sessionStorage.getItem("checkoutAttempt")'), null);
let result = await records(); assert.equal(result.count, before + 1);
assert.deepEqual(Object.keys(result.lastIntent).sort(), ['customer', 'idempotencyKey', 'items']);
assert.deepEqual(result.lastIntent.items, [{ productId: 'bbbbbbbbbbbbbbbbbbbbbbbb', quantity: 2 }]);
assert.ok(!Object.keys(result.lastIntent.customer).some(key => /price|total|fee|vat|discount|stock/i.test(key)));

// Lose a response after synthetic commit, then reload and retry the exact same saved submission.
evaluate('localStorage.setItem("cartItems", JSON.stringify([{_id:"bbbbbbbbbbbbbbbbbbbbbbbb",quantity:2,name:"Synthetic",price:20,salePrice:20,stock:4}]));');
browser('open', `${origin}/checkout`); fill(); enableQuoteReview();
await fetch(`${origin}/__fixture/delay`, { method: 'POST' });
browser('find', 'role', 'button', 'click', '--name', 'Place order');
browser('wait', '--fn', 'sessionStorage.getItem("checkoutAttempt") !== null');
const attempt = evaluate('JSON.parse(sessionStorage.getItem("checkoutAttempt"))');
assert.equal(evaluate('[...document.querySelectorAll("button")].filter(b => b.textContent === "Place order").every(b => b.disabled)'), true);
// Invoke another click while pending: the component lock must suppress it.
evaluate('[...document.querySelectorAll("button")].find(b => b.textContent === "Place order").click();');
browser('reload');
browser('wait', '--fn', 'document.querySelector("#name")?.value === "Synthetic"');
assert.equal(evaluate('document.querySelector("#address").value'), 'Synthetic address');
assert.equal(evaluate('document.querySelector("#city").value'), 'City A');
browser('find', 'role', 'button', 'click', '--name', 'Place order');
browser('wait', '--text', 'Order Placed Successfully!');
result = await records(); assert.equal(result.count, before + 2);
assert.equal(result.lastIntent.idempotencyKey, attempt.idempotencyKey);
assert.equal(evaluate('sessionStorage.getItem("checkoutAttempt")'), null);
assert.deepEqual(browser('errors').errors ?? [], []);
console.log('Browser checks passed: server quote despite forged cached money, intent-only payload, saved retry after reload, pending click suppression, committed totals and 360/390/768/1280px layouts.');
