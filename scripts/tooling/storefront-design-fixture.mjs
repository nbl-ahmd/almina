import { setTimeout } from 'node:timers';
import { createServer } from 'node:http';
import { createStorefrontFixture, product } from './storefront-fixture.mjs';

// Deliberately fictional, diverse visual data. No DB, credentials or external services.
const categories = ['Skin Care', 'Vitamins & Supplements', 'Personal Care', 'Baby & Family', 'First Aid', 'Oral Care', 'Wellness', 'Daily Essentials']
  .map((name, i) => ({ _id: (i + 10).toString(16).padStart(24, 'a'), name }));
const names = ['Daily Care', 'Gentle daily moisturising lotion · 200 ml', 'Everyday vitamin care · 30 tablets', 'Family essentials care pack', 'Sensitive skin cleansing wash · 150 ml', 'Daily oral care essentials', 'Hydrating body lotion · 400 ml', 'Travel first aid essentials', 'Mineral sunscreen care · 50 ml', 'Baby gentle care wash · 250 ml', 'Daily wellness essentials', 'Very long product name for a sensitive skin everyday moisturising and personal care routine · 500 ml'];
const products = names.map((name, i) => ({ ...product, _id: (i + 100).toString(16).padStart(24, 'b'), product_id: `VIS${String(i + 1).padStart(3, '0')}`, name,
  category: categories[i % categories.length], price: 25 + i * 7, salePrice: i % 3 === 0 ? 20 + i * 5 : undefined, sale: i % 3 === 0,
  featured: i % 2 === 0, stock: i % 4 === 3 ? 0 : 4, saleBadge: i === 0 ? 'Special offer' : undefined,
  images: [`synthetic-${i}.svg`, `synthetic-${i}-back.svg`], description: 'Synthetic product description for isolated layout verification. Read the pack instructions before use.' }));
const { server: base } = createStorefrontFixture();
const baseHandler = base.listeners('request')[0];
let failed = false;
let slow = false;
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://fixture.invalid');
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  if (url.pathname === '/__fixture/design-health') { res.end('almina-synthetic-design'); return; }
  if (url.pathname === '/__fixture/design-failure') { failed = url.searchParams.get('enabled') === '1'; res.end('OK'); return; }
  if (url.pathname === '/__fixture/design-slow') { slow = url.searchParams.get('enabled') === '1'; res.end('OK'); return; }
  if (failed && url.pathname.startsWith('/api/')) { res.writeHead(503); res.end(); return; }
  function respond() {
    if (/^\/api\/products\/images\/synthetic-\d+(-back)?\.svg$/.test(url.pathname)) {
      const i = Number(url.pathname.match(/synthetic-(\d+)/)[1]);
      const colors = ['#086657', '#4d6793', '#a13726', '#744513'];
      res.setHeader('Content-Type', 'image/svg+xml');
      res.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240"><rect width="240" height="240" fill="#fff"/><rect x="88" y="30" width="64" height="24" rx="5" fill="${colors[i % 4]}"/><rect x="70" y="54" width="100" height="160" rx="16" fill="#f0f4ef" stroke="#c9d4cf"/><rect x="70" y="96" width="100" height="70" fill="${colors[i % 4]}"/><text x="120" y="125" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="12">SYNTHETIC</text><text x="120" y="147" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="11">CARE ${i + 1}</text></svg>`); return;
    }
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/api/category') { res.end(JSON.stringify(categories)); return; }
    if (url.pathname === '/api/products' || url.pathname === '/api/products/search') {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const filter = JSON.parse(url.searchParams.get('filter') ?? '{}');
      const options = Array.isArray(filter) ? filter[0] : filter;
      const offset = Number(url.searchParams.get('offset')) || 0;
      res.end(JSON.stringify(products.filter(item => item.name.toLowerCase().includes(q) && (!options.category || item.category._id === options.category) && (!options.sale || item.sale) && (!options.featured || item.featured)).slice(offset, offset + 30))); return;
    }
    const details = products.find(item => url.pathname === `/api/products/details/${item.product_id}`);
    if (details) { res.end(JSON.stringify({ product: details })); return; }
    const byId = products.find(item => url.pathname === `/api/products/${item._id}`);
    if (byId) { res.end(JSON.stringify({ ...byId, category: byId.category._id })); return; }
    baseHandler(req, res);
  }
  if (slow) setTimeout(respond, 1800); else respond();
});
server.listen(Number(process.env.PORT ?? 4120), '127.0.0.1', () => console.log('Synthetic visual catalog on loopback.'));
