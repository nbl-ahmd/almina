import assert from 'node:assert/strict';
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
    env: { APP_ENV: 'development', NODE_ENV: 'production', WEB_ORIGIN: origin, API_ORIGIN: `http://127.0.0.1:${fixture.address().port}`, STOREFRONT_REDIRECTS_VERIFIED: 'true', NEXT_TELEMETRY_DISABLED: '1' },
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (web.exitCode !== null) throw new Error('Compiled storefront did not start');
    try { if ((await fetch(`${origin}/cart`)).ok) break; } catch { /* startup */ }
    await delay(100);
  }
  for (const [path, text] of [['/', 'Featured products'], ['/products', 'Daily Care'], ['/products/daily-care--PD0001', 'Daily care product description.'], ['/categories', 'Skin Care'], ['/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa', 'Daily Care'], ['/offers', 'Daily Care'], ['/search?q=Daily', 'Daily Care'], ['/cart', 'Your cart'], ['/checkout', 'Ordering is not available in this preview.']]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path); assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.ok((await response.text()).includes(text), `SSR content absent for ${path}`);
  }
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
