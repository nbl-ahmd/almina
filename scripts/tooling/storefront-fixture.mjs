import {searchFixtureResponse} from './search-fixture.mjs';
import { createServer } from 'node:http';
import { setTimeout } from 'node:timers';
import { fixtureHealth } from './e2e-ownership.mjs';
import { createServer as createSecureServer } from 'node:https';
import { pathToFileURL } from 'node:url';
// Synthetic compatibility API only. No database, credentials or customer data.
export const category = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Skin Care', disabled: false };
export const product = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', product_id: 'PD0001', name: 'Daily Care',
  category, price: 25, salePrice: 20, stock: 4, disabled: false, featured: true, sale: true,
  // Explicitly reviewed synthetic general-sale item exercises reminder consent UI.
  productType: 'general', contentReviewed: true,
  images: ['fixture.svg'], description: 'Daily care product description.' };
export const recoveredProducts = [
  { ...product, _id: 'cccccccccccccccccccccccc', product_id: 'RECOVERY--0001', name: 'Recovery Example', price: 12.50, salePrice: 0, stock: 0,
    images: [], cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/recovery-example.webp'], description: 'Synthetic reviewed recovery fixture.' },
  { ...product, _id: 'dddddddddddddddddddddddd', product_id: product._id, name: 'Numeric Identity Example', price: 9.99, sale: false, salePrice: 1,
    stock: 0, images: [], description: 'Synthetic namespace fixture.' },
];
const cardSamples = [
  { ...product, _id: 'ccccccccccccccccccccccc5', product_id: 'PD9005', brand: 'Synthetic',
    name: 'Synthetic Card sample تركيبة EXTRAORDINARILYLONGUNBROKENPACKNAME 500mg / 5 ml', price: 123456.78, salePrice: 0, images: [] },
  { ...product, _id: 'ccccccccccccccccccccccc6', product_id: 'PD9006', brand: 'Synthetic',
    name: 'Synthetic Card sample 64 ml', price: 987654.32, sale: false, images: ['fixture.svg'] },
];
export function createStorefrontFixture(tls, { includeRecovered = false, includePagination = false } = {}) {
  const products = includeRecovered ? [product, ...recoveredProducts] : [product];
  if (includePagination) products.push(...Array.from({ length: 35 }, (_, index) => ({ ...product,
    _id: (index + 100).toString(16).padStart(24, '0'), product_id: `SYNTHETIC_${index}`, name: `Synthetic paged product ${index}`,
    stock: 0, sale: false, featured: false, price: 1,
    ...(index === 0 ? {
      images: ['fixture.svg', 'fixture-back.svg'],
      summary: 'Synthetic catalogue summary for layout verification.',
      description: 'Synthetic product description.\n\nPack details\n- Synthetic outer packaging\n- Synthetic pack insert\n\nLiteral fixture text <em>sample</em>.',
      brand: 'Synthetic Brand', packLabel: '64 ml', saleUnit: 'One synthetic pack', productForm: 'Synthetic form',
      manufacturer: 'Synthetic manufacturer', usage: 'Synthetic directions field.', warnings: 'Synthetic warnings field.',
      ingredients: 'Synthetic materials field.', storage: 'Synthetic storage field.',
    } : index === 1 ? { description: '   ' } : {}),
  })));
  let closed = false;
  let failed = false;
  let homeStock = "normal";
  let homeCampaigns = false;
  const requests = [];
  const factory = tls ? handler => createSecureServer(tls, handler) : createServer;
  const server = factory((req, res) => {
    const url = new URL(req.url, 'http://fixture.invalid');
    requests.push({ method: req.method, pathname: url.pathname });
    if (url.pathname === '/__fixture/health') { res.end(fixtureHealth('almina-synthetic-catalog', process.env.AL_MINA_FIXTURE_RUN_ID)); return; }
    if (url.pathname === '/__fixture/closed') { closed = !closed; res.end('OK'); return; }
    if (url.pathname === '/__fixture/failure') { failed = !failed; res.end('OK'); return; }
    if (url.pathname === '/__fixture/home-stock' && includePagination) {
      const mode = url.searchParams.get('mode');
      if (!['normal', 'empty', 'wide'].includes(mode)) { res.writeHead(400); res.end(); return; }
      homeStock = mode;
      res.end('OK');
      return;
    }
    if (url.pathname === '/__fixture/home-campaigns' && includePagination) {
      homeCampaigns = url.searchParams.get('enabled') === '1';
      res.end('OK');
      return;
    }
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    if (failed) { res.writeHead(503); res.end('Fixture unavailable'); return; }
    if (['/api/products/images/fixture.svg', '/api/products/images/fixture-back.svg'].includes(url.pathname)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      const back = url.pathname.endsWith('-back.svg');
      res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${back ? '#edf2fd' : '#e6f6f3'}"/><text x="30" y="120">${back ? 'Synthetic back photo' : 'Daily Care'}</text></svg>`); return;
    }
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/api/v1/search' || url.pathname === '/api/v1/search/suggest') {
      const send = () => {
        const sample = includePagination && url.pathname === '/api/v1/search' && url.searchParams.get('q') === 'Card sample';
        const fixture = searchFixtureResponse(url, sample ? cardSamples : products, category);
        // Simulate the exact identifier fallback while the main search is unavailable.
        if (includePagination && url.pathname === '/api/v1/search' && url.searchParams.get('q') === 'PD0001') {
          fixture.data.unavailable = true;
        }
        res.end(JSON.stringify(fixture));
      };
      if (includePagination && url.pathname === '/api/v1/search' && url.searchParams.get('q') === 'slow fixture') {
        setTimeout(send, 2000);
      } else send();
      return;
    }
    if (url.pathname === '/api/v1/catalog/sitemap') {
      const kind = url.searchParams.get('kind');
      res.end(JSON.stringify({ requestId: '00000000-0000-4000-8000-000000000000', data: {
        items: kind === 'products' ? products.map(value => ({ id: value._id, productId: value.product_id, name: value.name }))
          : [{ id: category._id, name: category.name }], nextCursor: null,
      } })); return;
    }
    if (includePagination && url.pathname === '/api/v1/growth/reviews') {
      const id = url.searchParams.get('productId');
      const complete = products.find(row => row.product_id === 'SYNTHETIC_0');
      if (id === complete?._id) {
        res.end(JSON.stringify({ data: { ratingCount: 1, average: 4, items: [{
          rating: 4, verifiedPurchase: true, displayName: 'Synthetic reviewer',
          title: 'Synthetic review title', body: 'Fixture copy for review layout.', createdAt: '2026-10-02T12:00:00.000Z',
        }] } }));
        return;
      }
      if (id === product._id) {
        res.end(JSON.stringify({ data: { ratingCount: 0, average: null, items: [] } }));
        return;
      }
    }
    if (url.pathname === '/api/v1/growth/shipping') {
      res.end(JSON.stringify({ requestId: '00000000-0000-4000-8000-000000000000', data: {
        active: true, version: 'synthetic-shipping-v1', currency: 'AED', vatMode: 'inclusive', vatRateBps: 500,
        minimumOrderMinor: 0, cancellationRestocks: true,
        delivery: [{ emirate: 'Ras Al Khaimah', feeMinor: 1000, freeAboveMinor: 10000 }],
      } })); return;
    }
    if (url.pathname === '/api/category') {
      const visualCategories = includePagination ? ['Baby Care','Oral Care','Hair Care','First Aid'].map((name,index)=>({_id:(200+index).toString(16).padStart(24,'0'),name,disabled:false})) : [];
      res.end(JSON.stringify([category,...visualCategories])); return;
    }
    if (url.pathname === '/api/v1/growth/campaigns' && homeCampaigns) {
      const locale = url.searchParams.get('locale') === 'ar' ? 'ar' : 'en';
      res.end(JSON.stringify({ data: ['hero', 'secondary'].map(homepagePlacement => ({
        kind: 'campaign', slug: 'fixture-' + homepagePlacement, locale, homepagePlacement,
        title: homepagePlacement === 'hero' ? 'Fixture campaign' : 'Fixture secondary campaign',
        description: 'Synthetic campaign description.', body: 'Synthetic campaign copy.',
        image: 'https://cdn.alminapharmacy.com/cdn/banners/synthetic-test-campaign.webp',
        imageAlt: 'Synthetic campaign artwork', ctaLabel: 'See campaign', terms: 'Test fixture only.', published: true,
      })) }));
      return;
    }
    if (url.pathname === '/api/banners') { res.end('[]'); return; }
    if (url.pathname === '/api/store/status') { res.end(JSON.stringify({ status: closed ? 'closed' : 'open' })); return; }
    const byMongoId = products.find(value => url.pathname === `/api/products/${value._id}`);
    if (byMongoId) { res.end(JSON.stringify({ ...byMongoId, category: category._id })); return; }
    const byBusinessId = products.find(value => url.pathname === `/api/products/details/${value.product_id}`);
    if (byBusinessId) {
      const relatedProducts = ['SYNTHETIC_0', 'SYNTHETIC_1'].includes(byBusinessId.product_id) ? products.slice(3, 7) : [];
      res.end(JSON.stringify({ product: byBusinessId, relatedProducts })); return;
    }
    if (url.pathname === '/api/products' || url.pathname === '/api/products/search') {
      const q = url.searchParams.get('q');
      const source = url.searchParams.get('inStock') !== 'true' || homeStock === 'normal'
        ? products
        : homeStock === 'empty' ? [] : products.slice(0, 5).map(item => ({ ...item, stock: 4 }));
      const matching = source.filter(value => !q || new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(value.name));
      const offset = Number(url.searchParams.get('offset')); const limit = Number(url.searchParams.get('limit') ?? '30');
      res.end(JSON.stringify(matching.slice(offset, offset + limit))); return;
    }
    res.writeHead(404); res.end('null');
  });
  return { server, requests };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { server } = createStorefrontFixture(undefined, { includePagination: process.env.PAGINATED_FIXTURE === '1' });
  server.listen(Number(process.env.PORT ?? 4100), '127.0.0.1', () => console.log('Synthetic catalog fixture listening on loopback.'));
}
