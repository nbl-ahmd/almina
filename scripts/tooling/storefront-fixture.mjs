import { createServer } from 'node:http';
import { createServer as createSecureServer } from 'node:https';
import { pathToFileURL } from 'node:url';
// Synthetic compatibility API only. No database, credentials or customer data.
export const category = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Skin Care', disabled: false };
export const product = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', product_id: 'PD0001', name: 'Daily Care',
  category, price: 25, salePrice: 20, stock: 4, disabled: false, featured: true, sale: true,
  images: ['fixture.svg'], description: 'Daily care product description.' };
export function createStorefrontFixture(tls) {
  let closed = false;
  let failed = false;
  const requests = [];
  const factory = tls ? handler => createSecureServer(tls, handler) : createServer;
  const server = factory((req, res) => {
    const url = new URL(req.url, 'http://fixture.invalid');
    requests.push({ method: req.method, pathname: url.pathname });
    if (url.pathname === '/__fixture/health') { res.end('almina-synthetic-catalog'); return; }
    if (url.pathname === '/__fixture/closed') { closed = !closed; res.end('OK'); return; }
    if (url.pathname === '/__fixture/failure') { failed = !failed; res.end('OK'); return; }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    if (failed) { res.writeHead(503); res.end('Fixture unavailable'); return; }
    if (url.pathname === '/api/products/images/fixture.svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.end('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#e6f6f3"/><text x="30" y="120">Daily Care</text></svg>'); return;
    }
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/api/v1/catalog/sitemap') {
      const kind = url.searchParams.get('kind');
      res.end(JSON.stringify({ requestId: '00000000-0000-4000-8000-000000000000', data: {
        items: kind === 'products' ? [{ id: product._id, productId: product.product_id, name: product.name }]
          : [{ id: category._id, name: category.name }], nextCursor: null,
      } })); return;
    }
    if (url.pathname === '/api/category') { res.end(JSON.stringify([category])); return; }
    if (url.pathname === '/api/banners') { res.end('[]'); return; }
    if (url.pathname === '/api/store/status') { res.end(JSON.stringify({ status: closed ? 'closed' : 'open' })); return; }
    if (url.pathname === `/api/products/${product._id}`) { res.end(JSON.stringify({ ...product, category: category._id })); return; }
    if (url.pathname === '/api/products/details/PD0001') { res.end(JSON.stringify({ product, relatedProducts: [] })); return; }
    if (url.pathname === '/api/products' || url.pathname === '/api/products/search') {
      const q = url.searchParams.get('q');
      const match = !q || new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(product.name);
      res.end(JSON.stringify(match && Number(url.searchParams.get('offset')) === 0 ? [product] : [])); return;
    }
    res.writeHead(404); res.end('null');
  });
  return { server, requests };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server } = createStorefrontFixture();
  server.listen(Number(process.env.PORT ?? 4100), '127.0.0.1', () => console.log('Synthetic catalog fixture listening on loopback.'));
}
