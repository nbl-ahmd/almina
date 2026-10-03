import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { setTimeout } from 'node:timers';
import { createStorefrontFixture } from './storefront-fixture.mjs';

// This fixture is loopback-only. Production builds are tested without a production DB/API.
const root = resolve('frontend/build');
const { server: fixture } = createStorefrontFixture();
const fixtureHandler = fixture.listeners('request')[0];
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture.invalid');
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/__fixture/')) {
    if (url.pathname.startsWith('/api/products') && !url.searchParams.has('offset')) {
      url.searchParams.set('offset', '0'); req.url = url.pathname + url.search;
    }
    // Fixed 80ms synthetic upstream latency, constant in both passes.
    setTimeout(() => fixtureHandler(req, res), 80); return;
  }
  const pathname = decodeURIComponent(url.pathname);
  const file = resolve(root, '.' + pathname);
  if (!file.startsWith(root + '/') && file !== root) { res.writeHead(403); res.end(); return; }
  try {
    const staticFile = extname(pathname) ? file : resolve(root, 'index.html');
    const body = await readFile(staticFile);
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
    res.setHeader('Content-Type', types[extname(staticFile)] ?? 'application/octet-stream');
    if (/gzip/.test(req.headers['accept-encoding'] ?? '') && /\.(html|js|css)$/.test(staticFile)) { res.setHeader('Content-Encoding', 'gzip'); res.end(gzipSync(body)); }
    else res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
server.listen(Number(process.env.PORT ?? 4200), '127.0.0.1', () => console.log('Performance fixture: synthetic API + compiled CRA on loopback.'));
