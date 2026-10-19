import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createStorefrontFixture } from './storefront-fixture.mjs';
const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('apps/web/package.json', root));
const { server: fixture, requests } = createStorefrontFixture();
let web;
async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
try {
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  web = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: fileURLToPath(new URL('apps/web/', root)), stdio: 'ignore',
    env: { AL_MINA_ISOLATED_BUILD: process.env.AL_MINA_ISOLATED_BUILD, APP_ENV: 'development', NODE_ENV: 'production', WEB_ORIGIN: origin, API_ORIGIN: `http://127.0.0.1:${fixture.address().port}`, STOREFRONT_REDIRECTS_VERIFIED: 'true', NEXT_TELEMETRY_DISABLED: '1' },
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (web.exitCode !== null) throw new Error('Compiled storefront did not start');
    try { if ((await fetch(`${origin}/cart`)).ok) break; } catch { /* startup */ }
    await delay(100);
  }
  for (const [path, text] of [['/', 'Your everyday essentials'], ['/products', 'Daily Care'], ['/products/daily-care--PD0001', 'Daily care product description.'], ['/categories', 'Skin Care'], ['/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa', 'Daily Care'], ['/offers', 'Daily Care'], ['/search?q=Daily', 'Daily Care'], ['/cart', 'Your cart'], ['/checkout', 'Ordering is not available in this preview.']]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path); assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.ok((await response.text()).includes(text), `SSR content absent for ${path}`);
  }
  // Coarse hosted-CI regression budget for synthetic SSR routes, not a production
  // latency SLO. Keep checkout in the sample while ordering remains disabled.
  const performanceRoutes = ['/', '/products', '/search?q=Daily', '/products/daily-care--PD0001', '/checkout'];
  const timings = new Map(performanceRoutes.map(path => [path, []]));
  for (let sample = 0; sample < 5; sample++) {
    for (const path of performanceRoutes) {
      const started = performance.now();
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200, `performance route ${path}`);
      await response.arrayBuffer();
      timings.get(path).push(performance.now() - started);
    }
  }
  const p95 = Object.fromEntries([...timings].map(([path, values]) => {
    values.sort((a, b) => a - b);
    return [path, Math.round(values[Math.ceil(values.length * 0.95) - 1])];
  }));
  assert.ok(Object.values(p95).every(duration => duration < 5000), `Synthetic SSR p95 exceeded 5000ms: ${JSON.stringify(p95)}`);
  console.log(`Synthetic SSR p95 (ms): ${JSON.stringify(p95)}`);
  assert.match(await (await fetch(`${origin}/robots.txt`)).text(), /Disallow: \//);
  for (const path of ['/sitemap.xml', '/sitemaps/products/first.xml']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200);
    assert.ok(!(await response.text()).includes('<loc>'), 'Previews must not submit catalog URLs');
  }
  const secure = await fetch(`${origin}/cart`, { headers: { 'x-nonce': 'caller-selected-nonce' } });
  const csp = secure.headers.get('content-security-policy');
  assert.ok(csp?.includes("frame-ancestors 'none'"));
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.ok(!csp.split(';').find(part => part.trim().startsWith('script-src')).includes("'unsafe-inline'"));
  assert.ok(!csp.split(';').find(part => part.trim().startsWith('style-src ')).includes("'unsafe-inline'"), 'Compiled production-mode pages retain nonce-only style elements');
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce && nonce !== 'caller-selected-nonce');
  const secureHtml = await secure.text();
  for (const match of secureHtml.matchAll(/<script\b([^>]*)>/g)) {
    assert.ok(match[1].includes(`nonce="${nonce}"`), 'Every framework script must carry the response nonce');
  }
  for (const header of ['x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy']) assert.ok(secure.headers.has(header));
  assert.ok(secure.headers.get('cache-control').includes('no-store'));
  const secondSecure = await fetch(`${origin}/cart`);
  assert.notEqual(secondSecure.headers.get('content-security-policy').match(/'nonce-([^']+)'/)?.[1], nonce);
  const literalSearch = await fetch(`${origin}/search?q=%5B`);
  assert.equal(literalSearch.status, 200); assert.ok((await literalSearch.text()).includes('No products found.'));
  for (const path of ['/missing', '/products/missing', '/categories/missing', '/categories/cccccccccccccccccccccccc', '/productdetails/PD9999', '/_next/mcp', '/api/orders']) {
    assert.equal((await fetch(`${origin}${path}`)).status, 404, path);
  }
  // Verify targets before testing permanent redirects against the same synthetic catalog.
  for (const [oldPath, target] of [['/productdetails/PD0001?utm_source=shared', '/products/daily-care--PD0001?utm_source=shared'], ['/categories/aaaaaaaaaaaaaaaaaaaaaaaa?utm_source=shared&utm_source=repeat', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa?utm_source=shared&utm_source=repeat']]) {
    const response = await fetch(`${origin}${oldPath}`, { redirect: 'manual' });
    assert.equal(response.status, 308, oldPath);
    const location = new URL(response.headers.get('location'), origin);
    assert.equal(location.pathname + location.search, target);
    assert.equal((await fetch(location)).status, 200);
  }
  await fetch(`http://127.0.0.1:${fixture.address().port}/__fixture/failure`);
  const failedRedirect = await fetch(`${origin}/productdetails/PD0001`, { redirect: 'manual' });
  assert.equal(failedRedirect.status, 503); assert.equal(failedRedirect.headers.get('location'), null);
  assert.ok(requests.every(request => request.method === 'GET'), 'Storefront must never write to fixture API');
  console.log('Compiled storefront smoke passed: nine routes, server HTML, literal search, real 404s, gated 308s with shared query parameters, outage handling, no API writes and no production MCP.');
} finally {
  if (web && web.exitCode === null) { web.kill('SIGTERM'); await Promise.race([once(web, 'exit'), delay(5000)]); if (web.exitCode === null && web.signalCode === null) web.kill('SIGKILL'); }
  fixture.closeAllConnections(); await new Promise(resolve => fixture.close(resolve));
}
