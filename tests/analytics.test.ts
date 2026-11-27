import assert from 'node:assert/strict';
import test from 'node:test';
import { analyticsMode, contactChannel, productSignal, safePath, safeUrl, sanitizeCapture } from '../apps/web/src/lib/analytics/policy';
import { purchaseDetails } from '../apps/web/src/lib/analytics/purchase';
import { readWebEnvironment } from '@almina/config/env';

const origin = 'https://shop.example.invalid';
const capture = (event: string, properties: Record<string, unknown>) => sanitizeCapture({ event, properties, $set: { email: 'a@b.invalid' }, $set_once: { x: 1 } }, origin);

test('analytics needs permission unless anonymous counting is switched on, and privacy signals stop everything', () => {
  assert.equal(analyticsMode('allowed', false, false), 'full');
  assert.equal(analyticsMode('unset', false, false), 'off');
  assert.equal(analyticsMode('declined', false, false), 'off');
  assert.equal(analyticsMode('unset', false, true), 'anonymous');
  assert.equal(analyticsMode('declined', false, true), 'anonymous');
  for (const choice of ['allowed', 'declined', 'unset'] as const) assert.equal(analyticsMode(choice, true, true), 'off');
});

test('addresses become page types, so slugs, order references and tokens never leave', () => {
  assert.equal(safePath('/products/insulin-pen--PD0042'), '/products/:product');
  assert.equal(safePath('/categories/diabetes--aaaaaaaaaaaaaaaaaaaaaaaa'), '/categories/:category');
  assert.equal(safePath('/health-guides/managing-asthma'), '/health-guides/:guide');
  assert.equal(safePath('/account/orders/OD1234'), '/account/orders/:order');
  assert.equal(safePath('/ar/categories/pain-relief'), '/ar/:section/:page');
  assert.equal(safePath('/productdetails/PD0042'), '/other');
  assert.equal(safePath('/admin/orders'), null);
  assert.equal(safePath('/wholesale'), null);
  for (const path of ['/', '/search', '/checkout/stripe', '/products/:product', '/account/orders/:order', '/other']) assert.equal(safePath(path), path);
});

test('only safe campaign tags survive a query string', () => {
  assert.equal(safeUrl(`${origin}/search?q=metformin&utm_source=google&utm_medium=cpc&utm_term=metformin&gclid=abc&token=secret#x`),
    `${origin}/search?utm_source=google&utm_medium=cpc`);
  assert.equal(safeUrl(`${origin}/?utm_source=someone%40example.invalid&utm_campaign=0501234567`), `${origin}/`);
  assert.equal(safeUrl('javascript:alert(1)'), undefined);
});

test('the sanitizer denies unknown events and properties and never writes person data', () => {
  for (const event of ['$identify', '$set', '$autocapture', '$snapshot', '$opt_in', 'anything']) assert.equal(capture(event, {}), null);
  assert.equal(capture('$pageview', { $current_url: `${origin}/admin/orders` }), null);
  assert.equal(capture('$pageleave', { $pathname: '/wholesale/catalogue' }), null);
  const result = capture('$pageview', {
    token: 'phc_x', distinct_id: 'anonymous', $current_url: `${origin}/products/insulin--PD1?q=insulin`, $pathname: '/products/insulin--PD1',
    $referrer: 'https://www.google.com/search?q=insulin', $referring_domain: 'www.google.com', title: 'Insulin pen', $title: 'Insulin pen',
    $session_entry_url: `${origin}/search?q=insulin`, $session_entry_pathname: '/products/insulin--PD1', $initial_current_url: `${origin}/search?q=insulin`,
    $prev_pageview_pathname: '/health-guides/asthma', $el_text: 'Insulin', $elements: [{ text: 'Insulin' }], $set: { name: 'Person' },
    email: 'a@b.invalid', utm_term: 'insulin', utm_source: 'newsletter', locale: 'en', product_name: { nested: 'Insulin' },
  });
  assert(result);
  assert.deepEqual(result.properties, {
    token: 'phc_x', distinct_id: 'anonymous', $current_url: `${origin}/products/:product`, $pathname: '/products/:product',
    $referrer: 'https://www.google.com/', $referring_domain: 'www.google.com', $session_entry_url: `${origin}/search`,
    $session_entry_pathname: '/products/:product', $prev_pageview_pathname: '/health-guides/:guide', utm_source: 'newsletter', locale: 'en',
  });
  assert.equal(JSON.stringify(result).toLowerCase().includes('insulin'), false);
  assert.equal('$set' in result, false);
  assert.equal('$set_once' in result, false);
});

test('shop event values are validated', () => {
  assert.deepEqual(capture('checkout_failed', { error_code: 'INSUFFICIENT_STOCK' })?.properties, { error_code: 'INSUFFICIENT_STOCK' });
  assert.deepEqual(capture('checkout_failed', { error_code: 'Phone 0501234567 rejected', value_aed: -1, channel: '+971500000000' })?.properties, {});
});

test('only confirmed general-sale products are named', () => {
  const product = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'Daily care', brand: 'Care', category: { name: 'Skin' } };
  assert.deepEqual(productSignal({ ...product, productType: 'general' }, 12), { product_id: product._id, product_name: 'Daily care', product_category: 'Skin', product_brand: 'Care', price_aed: 12 });
  for (const productType of ['otc', 'prescription', 'unreviewed', '', undefined]) assert.equal(productSignal({ ...product, productType }, 12), undefined);
});

test('purchases carry value and size only; contact links carry the channel only', () => {
  assert.deepEqual(purchaseDetails({ totalMinor: 4550, lines: [{ quantity: 2 }, { quantity: 1 }] }, 'cash'), { value_aed: 45.5, item_count: 3, payment_method: 'cash' });
  assert.equal(contactChannel('https://wa.me/971500000000?text=Insulin'), 'whatsapp');
  assert.equal(contactChannel('tel:+971500000000'), 'phone');
  assert.equal(contactChannel('/products/x'), undefined);
});

test('analytics settings default to off and a mistyped value cannot stop the shop', () => {
  const off = readWebEnvironment({});
  assert.equal(off.POSTHOG_PROJECT_KEY, undefined);
  assert.equal(off.POSTHOG_HOST, 'https://eu.i.posthog.com');
  assert.equal(off.POSTHOG_COOKIELESS_ENABLED, false);
  const on = readWebEnvironment({ POSTHOG_PROJECT_KEY: `phc_${'a'.repeat(40)}`, POSTHOG_HOST: 'https://e.shop.example.invalid', POSTHOG_COOKIELESS_ENABLED: 'true' });
  assert.equal(on.POSTHOG_PROJECT_KEY, `phc_${'a'.repeat(40)}`);
  assert.equal(on.POSTHOG_HOST, 'https://e.shop.example.invalid');
  assert.equal(on.POSTHOG_COOKIELESS_ENABLED, true);
  const wrong = readWebEnvironment({ POSTHOG_PROJECT_KEY: 'phx_personal_secret', POSTHOG_HOST: 'http://insecure.example.invalid', POSTHOG_COOKIELESS_ENABLED: 'yes' });
  assert.equal(wrong.POSTHOG_PROJECT_KEY, undefined);
  assert.equal(wrong.POSTHOG_HOST, 'https://eu.i.posthog.com');
  assert.equal(wrong.POSTHOG_COOKIELESS_ENABLED, false);
});
