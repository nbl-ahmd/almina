import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectEnvironment, guidanceFor } from '../apps/web/src/lib/location/access';
import { pointSchema } from '../apps/web/src/lib/location/schema';

const chromeAndroid = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const instagram = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21F90 Instagram 340.0.0.0';
const safariIphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const androidWebView = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36';
const base = { standalone: false, secure: true, supported: true };

test('the environment is recognised from the user agent, including embedded browsers and installed apps', () => {
  assert.deepEqual(detectEnvironment({ ...base, userAgent: chromeAndroid }), { platform: 'android', embedded: false, installed: false, secure: true, supported: true });
  assert.equal(detectEnvironment({ ...base, userAgent: instagram }).embedded, true);
  assert.equal(detectEnvironment({ ...base, userAgent: instagram }).platform, 'ios');
  assert.equal(detectEnvironment({ ...base, userAgent: androidWebView }).embedded, true);
  assert.equal(detectEnvironment({ ...base, userAgent: safariIphone }).embedded, false);
  assert.equal(detectEnvironment({ ...base, standalone: true, userAgent: chromeAndroid }).installed, true);
});

test('a blocked location explains the fix for the installed Android app, Chrome, embedded browsers and iPhone', () => {
  const installed = guidanceFor('denied', detectEnvironment({ ...base, standalone: true, userAgent: chromeAndroid }));
  assert.match(installed.steps.join(' '), /App info/);
  assert.match(installed.steps.join(' '), /Site settings/);
  const chrome = guidanceFor('denied', detectEnvironment({ ...base, userAgent: chromeAndroid }));
  assert.match(chrome.steps[0]!, /lock icon/);
  const embedded = guidanceFor('denied', detectEnvironment({ ...base, userAgent: instagram }));
  assert.match(embedded.steps.join(' '), /built-in browser/);
  assert.match(embedded.steps.join(' '), /Open in Safari/);
  assert.match(guidanceFor('denied', detectEnvironment({ ...base, userAgent: safariIphone })).steps.join(' '), /Location Services/);
});

test('timeouts, missing support and insecure pages never tell the customer to change a permission', () => {
  const env = detectEnvironment({ ...base, userAgent: chromeAndroid });
  for (const failure of ['timeout', 'unavailable'] as const) assert.match(guidanceFor(failure, env).steps.join(' '), /GPS/);
  for (const failure of ['unsupported', 'insecure'] as const) assert.doesNotMatch(guidanceFor(failure, env).steps.join(' '), /Permissions|Allow/);
  assert.match(guidanceFor('denied', env, 'ar').title, /محظور/);
});

test('a saved delivery point is strictly validated before it is ever reused', () => {
  const point = { latitude: 25.79, longitude: 55.94, address: 'Al Ghubb, Ras Al Khaimah', emirate: 'Ras al-Khaimah', city: 'Al Ghubb' };
  assert.deepEqual(pointSchema.parse(point), point);
  for (const bad of [{ ...point, latitude: 91 }, { ...point, emirate: 'Gotham' }, { ...point, extra: 1 }, { ...point, address: '' }]) assert.equal(pointSchema.safeParse(bad).success, false);
});
