import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createStorefrontFixture } from './storefront-fixture.mjs';
const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('apps/web/package.json', root));
const directory = await mkdtemp(join(tmpdir(), 'almina-seo-'));
let web;
let fixture;
async function freePort() {
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve)); return port;
}
const canonical = 'https://shop.example.invalid';
try {
  // Short-lived synthetic loopback TLS only; Node trusts this certificate in the child.
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(directory, 'key.pem'),
    '-out', join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' });
  fixture = createStorefrontFixture({ key: await readFile(join(directory, 'key.pem')), cert: await readFile(join(directory, 'cert.pem')) }).server;
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
  const fixtureOrigin = `https://127.0.0.1:${fixture.address().port}`;
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  web = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: fileURLToPath(new URL('apps/web/', root)), stdio: 'ignore', env: {
      APP_ENV: 'production', NODE_ENV: 'production', WEB_ORIGIN: canonical, API_ORIGIN: fixtureOrigin,
      STOREFRONT_PRODUCT_REPLACEMENTS: '{"PDRETIRED":"PD0001","PDUNAVAILABLE":"PD9999"}',
      NODE_EXTRA_CA_CERTS: join(directory, 'cert.pem'), NEXT_TELEMETRY_DISABLED: '1',
    },
  });
  for (let i = 0; i < 100; i++) {
    if (web.exitCode !== null) throw new Error('SEO smoke server did not start');
    try { if ((await fetch(`${origin}/cart`)).ok) break; } catch { /* starting */ }
    await delay(100);
  }
  for (const path of ['/', '/products', '/categories', '/offers', '/products/daily-care--PD0001', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa']) {
    for (const userAgent of ['Mozilla/5.0', 'Googlebot', 'facebookexternalhit', 'Twitterbot']) {
      const response = await fetch(`${origin}${path}`, { headers: { 'User-Agent': userAgent } });
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('x-robots-tag'), null, path);
      const html = await response.text();
      const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
      assert.ok(head?.includes(`<link rel="canonical" href="${canonical}${path === "/" ? "" : path}"`), path);
      assert.ok(head.includes('name="robots" content="index, follow"'), path);
      assert.ok(head.includes('property="og:url"') && head.includes('name="twitter:card"'), path);
      assert.match(head, /<title>[^<]*Al Mina Pharmacy[^<]*<\/title>/, path);
      if (path.includes('daily-care')) {
        // Discard all executable/RSC script text: this must be real visible SSR markup.
        const visibleHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
        assert.ok(visibleHtml.includes('<h1>Daily Care</h1>'));
        assert.ok(visibleHtml.includes('Daily care product description.'));
        assert.ok(visibleHtml.includes('AED 20.00'));
        const data = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
        assert.deepEqual(data.map(item => item['@type']).sort(), ['BreadcrumbList', 'Organization', 'Product']);
        const product = data.find(item => item['@type'] === 'Product');
        assert.equal(product.name, 'Daily Care'); assert.equal(product.sku, 'PD0001');
        assert.equal(product.offers.price, '20.00');
        assert.equal(product.offers.priceCurrency, 'AED');
        assert.ok(!product.aggregateRating && !product.offers.availability);
        const nonce = response.headers.get('content-security-policy').match(/'nonce-([^']+)'/)[1];
        for (const match of html.matchAll(/<script\b([^>]*)>/g)) assert.ok(match[1].includes(`nonce="${nonce}"`));
      }
    }
  }
  for (const path of ['/cart', '/checkout', '/search?q=Daily', '/admin', '/login', '/register', '/auth/login', '/foundation/status', '/products?category=aaaaaaaaaaaaaaaaaaaaaaaa', '/products?page=2', '/products/daily-care--PD0001?sort=price', '/offers?q=Daily']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow', path);
    assert.match(await response.text(), /name="robots" content="noindex/);
  }
  const tracking = await fetch(`${origin}/products/daily-care--PD0001?utm_source=test`);
  assert.equal(tracking.headers.get('x-robots-tag'), null);
  assert.ok((await tracking.text()).includes(`<link rel="canonical" href="${canonical}/products/daily-care--PD0001"`));
  for (const path of ['/products/missing--PD9999', '/categories/missing', '/missing', '/productdetails/PD9999', '/products/missing--PDUNAVAILABLE']) {
    for (const userAgent of ['Mozilla/5.0', 'Googlebot']) assert.equal((await fetch(`${origin}${path}`, { headers: { 'User-Agent': userAgent } })).status, 404, path);
  }
  for (const [path, destination] of [
    ['/productdetails/PD0001?utm_source=one&utm_source=two', '/products/daily-care--PD0001?utm_source=one&utm_source=two'],
    ['/categories/aaaaaaaaaaaaaaaaaaaaaaaa', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa'],
    ['/products/old-name--PD0001', '/products/daily-care--PD0001'],
    ['/categories/old-name--aaaaaaaaaaaaaaaaaaaaaaaa', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa'],
    ['/productdetails/PDRETIRED', '/products/daily-care--PD0001'],
    ['/products/retired--PDRETIRED', '/products/daily-care--PD0001'],
  ]) {
    const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
    assert.equal(response.status, 308, path);
    const location = new URL(response.headers.get('location'), origin);
    assert.equal(location.pathname + location.search, destination);
  }
  const robots = await (await fetch(`${origin}/robots.txt`)).text();
  assert.ok(robots.includes('Allow: /') && robots.includes(`Sitemap: ${canonical}/sitemap.xml`));
  const index = await (await fetch(`${origin}/sitemap.xml`)).text();
  const maps = [...index.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  assert.deepEqual(maps.sort(), ['/sitemaps/categories/first.xml', '/sitemaps/products/first.xml', '/sitemaps/static/first.xml']);
  const allUrls = [];
  for (const path of maps) {
    const response = await fetch(`${origin}${path}`); assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/xml/);
    const xml = await response.text(); allUrls.push(...[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]));
  }
  assert.deepEqual(allUrls.sort(), ['/', '/products', '/categories', '/offers', '/products/daily-care--PD0001', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa'].map(path => `${canonical}${path}`).sort());
  assert.equal((await fetch(`${origin}/sitemaps/orders/first.xml`)).status, 404);
  // Toggle the fixture locally through its HTTP handler, without disabling TLS verification.
  const { request } = await import('node:https');
  const certificate = await readFile(join(directory, 'cert.pem'));
  await new Promise((resolve, reject) => {
    request(`${fixtureOrigin}/__fixture/failure`, { ca: certificate }, response => { response.resume(); response.on('end', resolve); }).on('error', reject).end();
  });
  assert.equal((await fetch(`${origin}/sitemap.xml`)).status, 503);
  assert.equal((await fetch(`${origin}/sitemaps/products/first.xml`)).status, 503);
  assert.equal((await fetch(`${origin}/productdetails/PD0001`, { redirect: 'manual' })).status, 503);
  console.log('SEO smoke passed: raw production HTML, metadata in head, no-JS product content, nonce-safe JSON-LD, indexing exclusions, true 404s, permanent/replacement redirects, robots, dynamic sitemap and outage behavior.');
} finally {
  if (web && web.exitCode === null && web.signalCode === null) { web.kill('SIGTERM'); await once(web, 'exit'); }
  if (fixture?.listening) await new Promise(resolve => fixture.close(resolve));
  await rm(directory, { recursive: true, force: true });
}
