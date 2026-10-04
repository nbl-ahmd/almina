import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageMetadata, hasDuplicateQuery, isPublicPath, productData, breadcrumbData, serializeJsonLd } from '../apps/web/src/lib/seo';
import { readWebEnvironment } from '@almina/config/env';
import { sitemapQuerySchema } from '@almina/contracts';

test('production public SEO and preview/filter exclusion agree', () => {
  const metadata = pageMetadata('https://shop.example.invalid', true, 'Skin care', 'Description', '/categories/skin');
  assert.deepEqual(metadata.alternates, { canonical: 'https://shop.example.invalid/categories/skin' });
  assert.deepEqual(metadata.robots, { index: true, follow: true });
  assert.deepEqual(pageMetadata('https://shop.example.invalid', false, 'Title', 'Description', '/').robots, { index: false, follow: true });
  for (const key of ['q', 'page', 'category', 'sort', 'anything']) assert.ok(hasDuplicateQuery({ [key]: 'value' }));
  assert.equal(hasDuplicateQuery({ utm_source: ['one', 'two'], fbclid: 'x' }), false);
  for (const path of ['/cart', '/checkout', '/admin', '/admin/orders', '/login', '/authentication', '/search', '/foundation/status']) assert.equal(isPublicPath(path), false);
  for (const path of ['/', '/products', '/products/name--PD1', '/categories', '/categories/name--abc', '/offers', '/about', '/contact']) assert.ok(isPublicPath(path));
});
test('JSON-LD cannot terminate its script; catalog prices match the page without invented reviews or availability', () => {
  const product = { _id: 'b'.repeat(24), product_id: 'PD1', name: '</script><script>alert(1)</script>',
    price: 25, sale: true, salePrice: 20, stock: 4, description: 'Real description', category: { _id: 'a'.repeat(24), name: 'Skin care' } };
  const data = productData('https://shop.example.invalid', product, ['https://cdn.example.invalid/product.jpg']);
  const json = serializeJsonLd(data);
  assert.ok(!json.includes('<'));
  assert.deepEqual(JSON.parse(json), data);
  assert.equal(data.offers.price, '20.00');
  assert.equal(data.offers.priceCurrency, 'AED');
  assert.ok(!('availability' in data.offers) && !('aggregateRating' in data));
  assert.equal(productData('https://shop.example.invalid', { ...product, salePrice: 0 }, []).offers.price, '0.00');
  assert.equal(productData('https://shop.example.invalid', { ...product, sale: false }, []).offers.price, '25.00');
  assert.equal(breadcrumbData('https://shop.example.invalid', [{ name: 'Home', path: '/' }]).itemListElement[0]!.position, 1);
});
test('replacement mappings reject cycles, chains, unsafe targets and malformed JSON', () => {
  assert.deepEqual(readWebEnvironment({ STOREFRONT_PRODUCT_REPLACEMENTS: '{"PD2":"PD1"}' }).STOREFRONT_PRODUCT_REPLACEMENTS, { PD2: 'PD1' });
  for (const map of ['oops', '[]', '{"PD1":"PD1"}', '{"PD1":"PD2","PD2":"PD3"}', '{"PD1":"https://evil.invalid"}']) {
    assert.throws(() => readWebEnvironment({ STOREFRONT_PRODUCT_REPLACEMENTS: map }));
  }
});
test('sitemap database query accepts only scoped pagination', () => {
  assert.deepEqual(sitemapQuerySchema.parse({ kind: 'products' }), { kind: 'products' });
  for (const query of [{ kind: 'orders' }, { kind: 'products', filter: '{}' }, { kind: 'categories', cursor: ['one', 'two'] }, { kind: 'products', cursor: '$where' }]) {
    assert.equal(sitemapQuerySchema.safeParse(query).success, false);
  }
});
