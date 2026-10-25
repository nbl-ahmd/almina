import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pageMetadata, hasDuplicateQuery, isPublicPath, productData, breadcrumbData, serializeJsonLd, aggregateRatingData, reviewListData } from '../apps/web/src/lib/seo';
import { formatAedMinor, lowestDeliveryFeeMinor, merchantReturnPolicyData, shippingDetailsData, type ShippingPolicy } from '../apps/web/src/lib/policies';
import { readWebEnvironment } from '@almina/config/env';
import { sitemapQuerySchema } from '@almina/contracts';

const googleBot = { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } as const;

test('production public SEO and preview/filter exclusion agree', () => {
  const metadata = pageMetadata('https://shop.example.invalid', true, 'Skin care', 'Description', '/categories/skin');
  assert.deepEqual(metadata.alternates, { canonical: 'https://shop.example.invalid/categories/skin' });
  assert.deepEqual(metadata.robots, { index: true, follow: true, googleBot });
  assert.deepEqual(pageMetadata('https://shop.example.invalid', false, 'Title', 'Description', '/').robots,
    { index: false, follow: true, googleBot: { ...googleBot, index: false } });
  for (const key of ['q', 'page', 'category', 'sort', 'anything']) assert.ok(hasDuplicateQuery({ [key]: 'value' }));
  assert.equal(hasDuplicateQuery({ utm_source: ['one', 'two'], fbclid: 'x' }), false);
  for (const path of ['/cart', '/checkout', '/admin', '/admin/orders', '/login', '/authentication', '/search', '/foundation/status']) assert.equal(isPublicPath(path), false);
  for (const path of ['/', '/products', '/products/name--PD1', '/categories', '/categories/name--abc', '/offers', '/about', '/contact',
    '/privacy', '/returns', '/shipping', '/terms', '/brands/cerave', '/health-guides/sunscreen', '/ar/shop/skin-care']) assert.ok(isPublicPath(path));
});

test('imported SEO titles use the site suffix once', () => {
  const metadata = pageMetadata('https://shop.example.invalid', true, 'Example cleanser 473 ml | Al Mina Pharmacy', 'Description', '/products/example--PD1');
  assert.equal(metadata.title, 'Example cleanser 473 ml');
  assert.equal(metadata.openGraph?.title, 'Example cleanser 473 ml | Al Mina Pharmacy');
  assert.equal(metadata.twitter?.title, 'Example cleanser 473 ml | Al Mina Pharmacy');
});
test('JSON-LD cannot terminate its script; catalog prices, images, availability and policies match the visible page', () => {
  const product = { _id: 'b'.repeat(24), product_id: 'PD1', name: '</script><script>alert(1)</script>', productType: 'general' as const,
    price: 25, sale: true, salePrice: 20, stock: 4, description: 'Real description', category: { _id: 'a'.repeat(24), name: 'Skin care' } };
  const data = productData('https://shop.example.invalid', product, ['https://cdn.example.invalid/product.jpg'], [], {}, null);
  const json = serializeJsonLd(data);
  assert.ok(!json.includes('<'));
  assert.deepEqual(JSON.parse(json), data);
  assert.equal(data.offers.price, '20.00');
  assert.equal(data.offers.priceCurrency, 'AED');
  assert.equal(data.offers.availability, 'https://schema.org/InStock');
  assert.equal(data.offers.hasMerchantReturnPolicy.merchantReturnDays, 7);
  assert.equal(data.offers.hasMerchantReturnPolicy.returnPolicyCountry, 'AE');
  assert.ok(!('shippingDetails' in data.offers));
  assert.deepEqual(data.image, ['https://cdn.example.invalid/product.jpg']);
  assert.equal(productData('https://shop.example.invalid', { ...product, salePrice: 0 }, []).offers.price, '0.00');
  assert.equal(productData('https://shop.example.invalid', { ...product, sale: false }, []).offers.price, '25.00');
  assert.deepEqual(productData('https://shop.example.invalid', product, []).image, ['https://shop.example.invalid/product-placeholder.svg']);
  assert.ok(!('aggregateRating' in data));
  assert.equal(breadcrumbData('https://shop.example.invalid', [{ name: 'Home', path: '/' }]).itemListElement[0]!.position, 1);
});

test('merchant return and live shipping policy produce valid Offer fields', () => {
  const policy = { currency: 'AED', minimumOrderMinor: 0, vatMode: 'inclusive', vatRateBps: 500,
    delivery: [{ emirate: 'Ras Al Khaimah', feeMinor: 1000, freeAboveMinor: 10000 }] } satisfies ShippingPolicy;
  assert.equal(formatAedMinor(1000), 'AED 10.00');
  assert.equal(lowestDeliveryFeeMinor(policy), 1000);
  assert.equal(lowestDeliveryFeeMinor(null), null);
  assert.equal(merchantReturnPolicyData('https://shop.example.invalid').merchantReturnLink, 'https://shop.example.invalid/returns');
  const shipping = shippingDetailsData(policy)!;
  assert.equal(shipping.shippingRate.value, '10.00');
  assert.equal(shipping.shippingRate.currency, 'AED');
  assert.equal(shipping.shippingDestination.addressCountry, 'AE');
  assert.equal(shipping.deliveryTime.transitTime.maxValue, 5);
  assert.equal(shipping.deliveryTime.handlingTime.maxValue, 1);
  const product = { _id: 'b'.repeat(24), product_id: 'PD1', name: 'Daily care', productType: 'general' as const, price: 25, stock: 0, category: { _id: 'a'.repeat(24), name: 'Skin care' } };
  const data = productData('https://shop.example.invalid', product, [], [], {}, policy);
  assert.deepEqual(data.offers.shippingDetails, shipping);
  assert.equal(data.offers.availability, 'https://schema.org/OutOfStock');
  assert.equal(shippingDetailsData(null), null);
  const medicine = productData('https://shop.example.invalid', { ...product, productType: 'otc' }, [], [], {}, policy);
  assert.equal(medicine.offers.hasMerchantReturnPolicy.returnPolicyCategory, 'https://schema.org/MerchantReturnNotPermitted');
  assert.ok(!('merchantReturnDays' in medicine.offers.hasMerchantReturnPolicy));
  assert.ok(!('returnMethod' in medicine.offers.hasMerchantReturnPolicy));
});

test('review markup only appears for real approved reviews', () => {
  assert.equal(aggregateRatingData(null), null);
  assert.equal(aggregateRatingData({ items: [], ratingCount: 0, average: null }), null);
  assert.deepEqual(aggregateRatingData({ items: [], ratingCount: 3, average: 4.7 }), {
    aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.7, reviewCount: 3, bestRating: 5, worstRating: 1 },
  });
  const reviews = reviewListData({ ratingCount: 1, average: 5, items: [{ rating: 5, displayName: 'A customer',
    title: 'Helpful', body: 'Arrived as expected.', createdAt: '2026-10-01T10:00:00.000Z', verifiedPurchase: true }] });
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0]!.author.name, 'A customer');
  assert.equal(reviews[0]!.reviewRating.ratingValue, 5);
  assert.equal(reviews[0]!.datePublished, '2026-10-01T10:00:00.000Z');
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
