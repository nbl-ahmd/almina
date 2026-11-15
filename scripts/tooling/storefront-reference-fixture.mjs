// Isolated visual-review catalogue. Prices and stock are synthetic; never a live API.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createStorefrontFixture, product, category } from './storefront-fixture.mjs';
import { searchFixtureResponse } from './search-fixture.mjs';
const directory = new URL('../../docs/design/storefront/previews/assets/', import.meta.url);
const media = JSON.parse(readFileSync(new URL('provenance.json', directory), 'utf8'));
const products = media.map((entry, index) => ({ ...product, _id: (index + 300).toString(16).padStart(24, 'b'), product_id: entry.productId, name: entry.productName, brand: entry.productName.split(' ')[0], price: [68, 79, 82.5, 64, 95, 58][index], sale: false, salePrice: undefined, stock: index === 5 ? 0 : 8, images: [entry.file], description: '' }));
const { server: base } = createStorefrontFixture();
const fallback = base.listeners('request')[0];
const server = createServer((req, res) => {
 const url = new URL(req.url, 'http://fixture.invalid');
 if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
 if (url.pathname === '/__fixture/reference-health') { res.end('almina-reference-preview-synthetic'); return; }
 const image = media.find(entry => url.pathname === '/api/products/images/' + entry.file);
 if (image) { res.setHeader('Content-Type', 'image/webp'); res.end(readFileSync(new URL(image.file, directory))); return; }
 const byId = products.find(row => url.pathname === '/api/products/' + row._id);
 const bySku = products.find(row => url.pathname === '/api/products/details/' + row.product_id);
 res.setHeader('Content-Type', 'application/json');
 if (byId) { res.end(JSON.stringify({ ...byId, category: category._id })); return; }
 if (bySku) { res.end(JSON.stringify({ product: bySku, relatedProducts: products.filter(row => row._id !== bySku._id) })); return; }
 if (url.pathname === '/api/category') { res.end(JSON.stringify([category, ...['Vitamins & Supplements','Baby Care','Oral Care','Hair Care','First Aid'].map((name,index) => ({_id:(index+100).toString(16).padStart(24,'a'),name,disabled:false}))])); return; }
 if (url.pathname === '/api/v1/search' || url.pathname === '/api/v1/search/suggest') { res.end(JSON.stringify(searchFixtureResponse(url, products, category))); return; }
 if (url.pathname === '/api/products' || url.pathname === '/api/products/search') {
  const filter = JSON.parse(url.searchParams.get('filter') ?? '{}');
  const query = url.searchParams.get('q')?.toLowerCase() ?? '';
  const rules = Array.isArray(filter) ? filter[0] : filter;
  const offset = Number(url.searchParams.get('offset')) || 0;
  const selected = products.filter(row => (!query || row.name.toLowerCase().includes(query)) && (!rules.category || rules.category === category._id) && (!rules.sale || row.sale));
  res.end(JSON.stringify(selected.slice(offset, offset + 30))); return;
 }
 fallback(req, res);
});
server.listen(Number(process.env.PORT ?? 4861), '127.0.0.1', () => console.log('Loopback reference preview: reviewed photos, synthetic prices/stock, no database/providers.'));
