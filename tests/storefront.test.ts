import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cloudinaryImage } from '../apps/web/src/lib/catalog/media';
import { readProduct, readCategory, productSlug, categorySlug, slugIdentity, displayPrice, decodeStoredCart, cartSchema } from '../apps/web/src/lib/catalog/model';
import { readWebEnvironment } from '@almina/config/env';
import { retainedCatalogQuery } from '../apps/api/src/modules/catalog/compatibility-reads';
const category = { _id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Skin Care' };
const raw = { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb', product_id: 'PD0001', name: 'Daily Care', category, price: 25, stock: 4 };
test('retained catalog query reconstructs only bounded compatibility fields', () => {
  assert.equal(retainedCatalogQuery({}, 'products').limit, 30);
  assert.deepEqual(retainedCatalogQuery({ q: 'Literal [search]', filter: '[{"disabled":false}]', limit: '10', offset: '20' }, 'search').filter, { disabled: false });
  for (const query of [{ limit: '0' }, { limit: '101' }, { offset: '10001' }, { filter: '{"$where":"x"}' }, { filter: '{"category":{"$ne":null}}' },
    { q: ['one', 'two'] }, { disabledCat: 'yes' }, { cursor: 'arbitrary' }]) assert.throws(() => retainedCatalogQuery(query, 'search'));
  assert.throws(() => retainedCatalogQuery({ filter: '{"stock":1}' }, 'categories'));
  const filtered=retainedCatalogQuery({inStock:'true',minPrice:'5.50',maxPrice:'90',sort:'price-desc'},'products');
  assert.equal(filtered.inStock,true); assert.equal(filtered.minPrice,5.5); assert.equal(filtered.maxPrice,90); assert.equal(filtered.sort,'price-desc');
  for(const query of [{inStock:'yes'},{minPrice:'1e3'},{maxPrice:'1000000'},{minPrice:'20',maxPrice:'10'},{sort:'$where'}])
    assert.throws(()=>retainedCatalogQuery(query,'products'));
  assert.throws(()=>retainedCatalogQuery({inStock:'true'},'categories'));
});
test('old documents without new flags remain readable; disabled/orphan/malformed products do not leak', () => {
  assert.ok(readProduct(raw)); assert.ok(readCategory(category));
  for (const patch of [{ disabled: true }, { category: null }, { category: { ...category, disabled: true } }, { price: -1 }, { stock: -1 }]) assert.equal(readProduct({ ...raw, ...patch }), null);
  assert.equal(readCategory({ ...category, disabled: true }), null);
});
test('slugs distinguish duplicate names and resolve immutable legacy IDs across name changes', () => {
  const product = readProduct(raw)!;
  assert.equal(slugIdentity(productSlug(product)), 'PD0001');
  assert.notEqual(productSlug(product), productSlug({ ...product, product_id: 'PD0002' }));
  assert.equal(slugIdentity(productSlug({ ...product, name: 'Renamed!' })), 'PD0001');
  assert.equal(slugIdentity(categorySlug(category)), category._id);
  assert.equal(slugIdentity('bad/path'), null);
  for (const id of ['RECOVERED--001', '--leading', '001__trailing--', 'x'.repeat(80), 'b'.repeat(24)]) {
    assert.equal(slugIdentity(productSlug({ ...product, product_id: id, name: 'Name -- normalized' })), id);
  }
});
test('catalog, cart and schema presentation use active sale prices including zero', () => {
  const product = readProduct(raw)!;
  assert.equal(displayPrice({ ...product, sale: true, salePrice: 0 }), 0);
  assert.equal(displayPrice({ ...product, sale: false, salePrice: 20 }), 25);
  assert.equal(displayPrice({ ...product, salePrice: 20 }), 25);
  assert.equal(displayPrice({ ...product, sale: true, salePrice: 20 }), 20);
});
test('cart import discards client prices, stock, customer data and roles; malformed carts fail closed', () => {
  assert.deepEqual(decodeStoredCart(JSON.stringify([{ ...raw, quantity: 2, price: 0, role: 'admin', customer: 'private' }]), true), [{ id: raw._id, quantity: 2 }]);
  for (const raw of ['oops', '{}', '[{"id":"x","quantity":1}]', '[{"id":"bbbbbbbbbbbbbbbbbbbbbbbb","quantity":0}]']) assert.deepEqual(decodeStoredCart(raw), []);
  assert.equal(cartSchema.safeParse([{ id: raw._id, quantity: 1 }, { id: raw._id, quantity: 1 }]).success, false);
  assert.equal(cartSchema.safeParse([{ id: raw._id, quantity: 1000 }]).success, false);
});
test('permanent redirects default on and legacy origins must be credential-free HTTPS outside development', () => {
  assert.equal(readWebEnvironment({}).STOREFRONT_REDIRECTS_VERIFIED, true);
  assert.equal(readWebEnvironment({ STOREFRONT_REDIRECTS_VERIFIED: 'true' }).STOREFRONT_REDIRECTS_VERIFIED, true);
  assert.throws(() => readWebEnvironment({ STOREFRONT_REDIRECTS_VERIFIED: 'yes' }));
  assert.throws(() => readWebEnvironment({ LEGACY_API_ORIGIN: 'https://user:password@example.invalid' }));
  assert.throws(() => readWebEnvironment({ APP_ENV: 'staging', NODE_ENV: 'production', WEB_ORIGIN: 'https://web.example.invalid', API_ORIGIN: 'https://api.example.invalid', LEGACY_API_ORIGIN: 'http://localhost:4100' }));
});
test('recovered Cloudinary images are restricted to the configured account and raster upload assets', () => {
  const url = 'https://res.cloudinary.com/synthetic/image/upload/v1/care.webp';
  assert.equal(cloudinaryImage(url, 'synthetic'), url);
  for (const value of [url.replace('/synthetic/', '/other/'), url + '?token=private', url.replace('.webp', '.svg'),
    url.replace('https:', 'http:'), url.replace('res.cloudinary.com', 'untrusted.example'), url.replace('/upload/', '/fetch/'),
    url.replace('/v1/', '/%2e%2e/'), url.replace('https://', 'https://user:password@')]) {
    assert.equal(cloudinaryImage(value, 'synthetic'), null);
  }
  assert.equal(cloudinaryImage(url, undefined), null);
});
