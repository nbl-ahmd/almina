import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createStorefrontFixture, recoveredProducts } from './storefront-fixture.mjs';
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
  fixture = createStorefrontFixture({ key: await readFile(join(directory, 'key.pem')), cert: await readFile(join(directory, 'cert.pem')) }, { includeRecovered: true }).server;
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
  const fixtureOrigin = `https://127.0.0.1:${fixture.address().port}`;
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  web = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: fileURLToPath(new URL('apps/web/', root)), stdio: 'ignore', env: {
      AL_MINA_ISOLATED_BUILD: process.env.AL_MINA_ISOLATED_BUILD,
      APP_ENV: 'production', NODE_ENV: 'production', WEB_ORIGIN: canonical, API_ORIGIN: fixtureOrigin, CLOUDINARY_CLOUD_NAME: 'synthetic',
      STOREFRONT_PRODUCT_REPLACEMENTS: '{"PDRETIRED":"PD0001","PDUNAVAILABLE":"PD9999"}',
      NODE_EXTRA_CA_CERTS: join(directory, 'cert.pem'), NEXT_TELEMETRY_DISABLED: '1',
    },
  });
  for (let i = 0; i < 100; i++) {
    if (web.exitCode !== null) throw new Error('SEO smoke server did not start');
    try { if ((await fetch(`${origin}/cart`)).ok) break; } catch { /* starting */ }
    await delay(100);
  }
  assert.equal((await fetch(`${origin}/_next/mcp`)).status, 404);
  assert.equal((await fetch(`${origin}/favicon.ico`)).status, 200);
  const recoveredPaths = ['/products/recovery-example--RECOVERY--0001', `/products/numeric-identity-example--${recoveredProducts[1].product_id}`];
  for (const [index, path] of recoveredPaths.entries()) {
    const recovered = recoveredProducts[index];
    for (const userAgent of ['Mozilla/5.0', 'Googlebot', 'facebookexternalhit', 'Twitterbot']) {
      const response = await fetch(`${origin}${path}`, { headers: { 'User-Agent': userAgent } });
      assert.equal(response.status, 200, path);
      const html = await response.text(), head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1];
      assert.ok(head.includes(`<link rel="canonical" href="${canonical}${path}"`), path);
      const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
      assert.ok(visible.match(/<h1\b[^>]*>([^<]*)<\/h1>/)?.[1] === recovered.name);
      assert.ok(visible.includes(index === 0 ? 'AED 0.00' : 'AED 9.99'));
      assert.ok(visible.includes('Out of stock'));
      const data = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
      const schema = data.find(value => value['@type'] === 'Product');
      assert.equal(schema.sku, recovered.product_id); assert.equal(schema.url, canonical + path);
      assert.equal(schema.offers.price, index === 0 ? '0.00' : '9.99');
      assert.ok(!schema.aggregateRating && !schema.offers.availability);
      if (index === 0) {
        assert.deepEqual(schema.image, recovered.cloudinaryImages);
        assert.ok(head.includes('res.cloudinary.com/synthetic/image/upload/v1/recovery-example.webp'));
      }
    }
    for (const source of [`/productdetails/${recovered.product_id}?utm_source=recovery`, `/products/old-name--${recovered.product_id}?utm_source=recovery`]) {
      const response = await fetch(origin + source, { redirect: 'manual' });
      assert.equal(response.status, 308, source);
      const location = new URL(response.headers.get('location'), origin);
      assert.equal(location.pathname + location.search, path + '?utm_source=recovery');
      if (source.startsWith('/productdetails/')) assert.equal(location.origin, canonical);
    }
  }
  for (const path of ['/', '/products', '/categories', '/offers', '/about', '/contact', '/brands', '/ras-al-khaimah', '/products/daily-care--PD0001', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa']) {
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
        assert.ok(visibleHtml.match(/<h1\b[^>]*>([^<]*)<\/h1>/)?.[1] === 'Daily Care');
        assert.ok(visibleHtml.includes('Daily care product description.'));
        assert.ok(visibleHtml.includes('AED 20.00'));
        const data = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
        assert.deepEqual(data.flatMap(item => item['@type']).sort(), ['BreadcrumbList', 'Organization', 'Pharmacy', 'Product', 'WebSite']);
        const website = data.find(item => item['@type'] === 'WebSite');
        assert.equal(website.url, canonical);
        assert.equal(website.potentialAction.target.urlTemplate, `${canonical}/search?q={search_term_string}`);
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
  for (const path of ['/cart', '/checkout', '/search?q=Daily', '/admin', '/login', '/register', '/auth/login', '/foundation/status', '/products?category=aaaaaaaaaaaaaaaaaaaaaaaa', '/products/daily-care--PD0001?sort=price', '/offers?q=Daily']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.headers.get('x-robots-tag'), path.startsWith('/admin') ? 'noindex, nofollow' : 'noindex, follow', path);
    assert.match(await response.text(), /name="robots" content="noindex/);
  }
  const paginated=await fetch(`${origin}/products?page=2`);
  assert.equal(paginated.headers.get('x-robots-tag'),null);
  const pageHtml=await paginated.text();assert.ok(pageHtml.includes(`<link rel="canonical" href="${canonical}/products?page=2"`));assert.match(pageHtml,/name="robots" content="index, follow"/);
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
  assert.ok(!robots.includes('Disallow: /_next/'));
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
  assert.deepEqual(allUrls.sort(), ['/', '/products', '/categories', '/offers', '/about', '/contact', '/brands', '/ras-al-khaimah', '/products/daily-care--PD0001', '/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa', ...recoveredPaths].map(path => `${canonical}${path}`).sort());
  assert.equal((await fetch(`${origin}/sitemaps/orders/first.xml`)).status, 404);
  const measurements = [];
  for (const path of ['/products', '/search?q=Recovery', ...recoveredPaths]) {
    const durations = []; let htmlBytes = 0;
    for (let sample = 0; sample < 5; sample++) {
      const start = performance.now(), response = await fetch(origin + path); assert.equal(response.status, 200);
      htmlBytes = Math.max(htmlBytes, (await response.arrayBuffer()).byteLength); durations.push(performance.now() - start);
    }
    const p95Ms = Math.round(durations.sort((a, b) => a - b)[4]);
    assert.ok(p95Ms < 5000, `Synthetic recovered SSR exceeds 5000 ms: ${path}`);
    assert.ok(htmlBytes <= 512 * 1024, `Recovered raw HTML exceeds 512 KiB: ${path}`);
    measurements.push({ path, p95Ms, maxHtmlBytes: htmlBytes });
  }
  await mkdir(new URL('.verification-results/', root), { recursive: true });
  await writeFile(new URL('.verification-results/recovery-seo.json', root), JSON.stringify({
    scope: 'synthetic recovered products; loopback TLS; five warm samples; not a production SLO or Cloudinary delivery test',
    measuredAt: new Date().toISOString(), budgets: { ssrP95Ms: 5000, rawHtmlBytes: 512 * 1024 }, measurements,
  }, null, 2));
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
