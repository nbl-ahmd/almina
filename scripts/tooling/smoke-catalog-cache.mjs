import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createStorefrontFixture, product, category } from './storefront-fixture.mjs';

const root = new URL('../../', import.meta.url);
const require = createRequire(new URL('apps/web/package.json', root));
const { server: source, requests } = createStorefrontFixture();
const handler = source.listeners('request')[0];
const fixture = createServer((req, res) => {
  if (req.url === '/api/v1/auth/me') {
    if (!req.headers.cookie?.includes('synthetic-admin')) { res.writeHead(401); res.end('{}'); return; }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ requestId: '00000000-0000-4000-8000-000000000000', data: {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa', username: 'synthetic', name: 'Synthetic', role: 'admin', cities: [],
    } })); return;
  }
  handler(req, res);
});
let web;
const original = { name: category.name, disabled: category.disabled, stock: product.stock, salePrice: product.salePrice };
try {
  fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
  const probe = createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  web = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: fileURLToPath(new URL('apps/web/', root)), stdio: 'ignore',
    env: { PATH: process.env.PATH, APP_ENV: 'development', NODE_ENV: 'production', WEB_ORIGIN: origin, API_ORIGIN: `http://127.0.0.1:${fixture.address().port}`, NEXT_TELEMETRY_DISABLED: '1',
      // A long window so this check never straddles a boundary.
      CATALOG_CACHE_SECONDS: '300' },
  });
  for (let i = 0; i < 100; i++) {
    if (web.exitCode !== null) throw new Error('Compiled cache verification did not start');
    try { if ((await fetch(`${origin}/cart`)).ok) break; } catch { /* Startup. */ }
    await delay(100);
  }
  const count = path => requests.filter(r => r.pathname === path).length;
  const read = async path => { const response = await fetch(origin + path); assert.equal(response.status, 200); return response.text(); };
  await read('/categories'); await read('/categories');
  assert.equal(count('/api/category'), 1, 'Category presentation should reuse the data cache across renders.');
  const html = await read('/'); await read('/');
  assert.equal(count('/api/banners'), 1);
  const listReads = count('/api/products');
  assert.ok(listReads >= 1);
  await read('/'); assert.equal(count('/api/products'), listReads, 'Browse lists are shared within the cache window.');
  assert.match(html, /AED 20\.00/);
  product.stock = 0; product.salePrice = 17;
  assert.match(await read('/'), /AED 20\.00/, 'A browse list may be reused until its window ends or staff purge it.');
  const detail = await read(`/products/daily-care--${product.product_id}`);
  assert.match(detail, /AED 17\.00/, 'The product page always reads the current price and stock.');
  const purgeProducts = await fetch(origin + '/api/catalog/revalidate', { method: 'POST', headers: { Origin: origin, 'X-CSRF-Protection': '1',
    'Content-Type': 'application/json', Cookie: 'session=synthetic-admin' }, body: JSON.stringify({ kind: 'products' }) });
  assert.equal(purgeProducts.status, 200);
  const updated = await read('/');
  assert.match(updated, /Temporarily out of stock/); assert.match(updated, /AED 17\.00/);
  category.name = 'Renamed synthetic category';
  assert.ok(!(await read('/categories')).includes(category.name), 'Presentation may be stale until invalidation.');
  const purge = cookie => fetch(origin + '/api/catalog/revalidate', { method: 'POST', headers: {
    Origin: origin, 'X-CSRF-Protection': '1', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
  }, body: JSON.stringify({ kind: 'categories' }) });
  assert.equal((await purge()).status, 401);
  assert.equal((await purge('session=synthetic-admin')).status, 200);
  assert.ok((await read('/categories')).includes(category.name), 'A successful admin purge must expire the tagged category cache.');
  category.disabled = true;
  const hidden = await fetch(`${origin}/categories/renamed-synthetic-category--${category._id}`);
  assert.equal(hidden.status, 404, 'Identity visibility must bypass the presentation cache.');
  assert.ok(count('/api/category') >= 3);
  console.log('Compiled cache checks passed: reuse, admin-only tagged purge, shared browse lists, live product pages and fresh category visibility.');
} finally {
  Object.assign(category, { name: original.name, disabled: original.disabled });
  Object.assign(product, { stock: original.stock, salePrice: original.salePrice });
  web?.kill('SIGTERM'); if (web && web.exitCode === null) await once(web, 'exit');
  await new Promise(resolve => fixture.close(resolve));
}
