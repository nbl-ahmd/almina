import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  enrichmentCsvCell, enrichmentPriority, normalizeGtin, productGaps, restrictedGtin, tradeGtin, unescapeEnrichmentCell,
  catalogueFilters, catalogueFilterLabels, enrichmentQuerySchema,
} from '@almina/contracts';
import { accessPolicy, projectAdminResponse, upstreamQuery } from '../apps/web/src/lib/admin/policy';
import { catalogMutationTags } from '../apps/web/src/lib/admin/gateway-policy';
import { lookupPolicy } from '../apps/api/src/modules/auth/retained-policy';
import { productData } from '../apps/web/src/lib/seo';

test('GTINs compare by value, not spelling, and only valid check digits count', () => {
  assert.equal(normalizeGtin('036000291452'), '00036000291452'); // UPC-A
  assert.equal(normalizeGtin('0036000291452'), '00036000291452'); // the same item as EAN-13
  assert.equal(normalizeGtin('3337875597388'), '03337875597388');
  assert.equal(normalizeGtin('3337875597389'), null, 'wrong check digit');
  assert.equal(normalizeGtin('PD1198'), null);
  assert.equal(normalizeGtin('00000000'), null);
  assert.equal(normalizeGtin(' 3337875597388 '), '03337875597388');
  assert.equal(normalizeGtin(undefined), null);
});

test('in-store, variable-weight and coupon codes pass the checksum but are never trade GTINs', () => {
  // 2xx: restricted circulation (in-store and weighed items).
  assert.equal(normalizeGtin('2000000000008') !== null, true);
  assert.equal(restrictedGtin('2000000000008'), true);
  assert.equal(tradeGtin('2000000000008'), null);
  // UPC-A starting 2 (random weight) and 4 (in-store) become 02x / 04x.
  assert.equal(restrictedGtin('212345678992'), true);
  assert.equal(restrictedGtin('412345678908'), true);
  assert.equal(restrictedGtin('5012345678900'), false, 'GS1 UK prefix 501 is a normal trade prefix');
  assert.equal(restrictedGtin('0512345678909'), true, 'coupons');
  assert.equal(restrictedGtin('9812345678907'), true, 'coupons and refund receipts');
  // GTIN-8 velocity / internal codes.
  assert.equal(restrictedGtin('02345673'), true);
  assert.equal(tradeGtin('3337875597388'), '03337875597388');
  assert.equal(tradeGtin('6291000000013'), '06291000000013', 'UAE GS1 prefix 629');
});

test('gaps list what a product lacks, never what staff recorded as not applicable', () => {
  const complete = { name: 'CeraVe Cream', brand: 'CeraVe', manufacturer: "L'Oréal", gtin: '3337875597388', packLabel: '454 g',
    description: 'Moisturiser.', productType: 'general', cloudinaryImages: ['https://res.cloudinary.com/x/image/upload/v1/a.webp'] };
  assert.deepEqual(productGaps(complete, 'Skincare'), []);
  assert.deepEqual(productGaps({}, 'General'), ['photo', 'brand', 'gtin', 'manufacturer', 'pack', 'description', 'type', 'category']);
  assert.deepEqual(productGaps({ ...complete, gtin: '', identifierStatus: 'not-assigned' }, 'Skincare'), []);
  assert.deepEqual(productGaps({ ...complete, gtin: '3337875597389' }, 'Skincare'), ['gtin'], 'an invalid stored GTIN is still missing');
  assert.deepEqual(productGaps({ ...complete, brand: '', familyBrand: 'CeraVe' }), [], 'family brand counts; no category name means no category check');
  assert.deepEqual(productGaps({ ...complete, packLabel: '', variantPackSize: '30 tablets' }, 'Skincare'), []);
  assert.deepEqual(productGaps({ ...complete, cloudinaryImages: ['/product-placeholder.svg'] }, 'Skincare'), ['photo']);
  assert.deepEqual(productGaps({ ...complete, brand: '   ' }, 'Skincare'), ['brand']);
  assert.deepEqual(productGaps({ ...complete, productType: 'unreviewed' }, 'Skincare'), ['type']);
});

test('priority comes from orders, stock, visibility and merchandising, and says why', () => {
  const base = { units90: 0, stock: 0, live: false, featured: false, sale: false, gaps: 1 };
  const idle = enrichmentPriority(base);
  const selling = enrichmentPriority({ ...base, units90: 14, stock: 6, live: true });
  assert.ok(selling.score > idle.score);
  assert.deepEqual(selling.reasons, ['14 sold in 90 days', 'in stock', 'live']);
  assert.ok(enrichmentPriority({ ...base, stock: 1 }).score > enrichmentPriority({ ...base, featured: true, sale: true }).score, 'stock outranks merchandising flags');
  assert.ok(enrichmentPriority({ ...base, units90: 1 }).score > enrichmentPriority({ ...base, gaps: 8 }).score, 'one sale outranks extra gaps');
  assert.equal(enrichmentPriority({ ...base, units90: 5000 }).score, enrichmentPriority({ ...base, units90: 50 }).score, 'demand is capped');
  assert.deepEqual(idle.reasons, []);
});

test('spreadsheet cells neutralise formulas and the import undoes only that escaping', () => {
  for (const value of ['- Hydrates dry skin', '=SUM(A1)', '+971', '@home', 'Plain text', "'quoted already", '']) {
    const cell = enrichmentCsvCell(value), inner = cell.slice(1, -1).replace(/""/g, '"');
    assert.ok(!/^[=+@-]/.test(inner), cell);
    assert.equal(unescapeEnrichmentCell(inner), value);
  }
  assert.equal(enrichmentCsvCell('say "hi"'), '"say ""hi"""');
});

test('new gap filters are labelled, and the gateway allows, validates, projects and purges the new routes', () => {
  for (const filter of catalogueFilters) assert.ok(catalogueFilterLabels[filter], filter);
  for (const [method, path] of [['GET', 'products/quality'], ['GET', 'products/enrichment'], ['GET', 'products/enrichment/export'],
    ['POST', 'products/enrichment/preview'], ['POST', 'products/enrichment/apply'], ['POST', 'products/gtin-from-barcode']] as const) {
    assert.equal(accessPolicy(method, path), 'admin', path);
    assert.equal(lookupPolicy(method, `/api/${path}`)?.policy, 'admin', path);
  }
  assert.deepEqual(catalogMutationTags('POST', 'products/enrichment/apply'), ['catalog:products']);
  assert.deepEqual(catalogMutationTags('POST', 'products/gtin-from-barcode'), ['catalog:products']);
  assert.deepEqual(catalogMutationTags('POST', 'products/enrichment/preview'), [], 'a preview changes nothing');
  assert.equal(new URLSearchParams(upstreamQuery('products/enrichment', new URLSearchParams({ gap: 'photo' }))).get('scope'), 'live');
  for (const input of [{ gap: 'price' }, { scope: 'everything' }, { limit: '500' }, { filter: '{"$where":1}' }])
    assert.throws(() => upstreamQuery('products/enrichment', new URLSearchParams(input)), JSON.stringify(input));
  assert.throws(() => upstreamQuery('products/quality', new URLSearchParams({ x: '1' })));
  assert.throws(() => upstreamQuery('products/enrichment/export', new URLSearchParams({ limit: '5' })));
  assert.throws(() => projectAdminResponse('products/enrichment', { items: [], total: 0, offset: 0, ordersSince: 'x', extra: 'private' }));
  assert.equal(enrichmentQuerySchema.parse({}).gap, 'any');
  // Write responses keep their shape through the gateway (the generic field filter would drop them) and nothing extra.
  assert.deepEqual(projectAdminResponse('products/gtin-from-barcode', { results: [{ id: 'a', ok: true, changed: true }] }), { results: [{ id: 'a', ok: true, changed: true }] });
  assert.throws(() => projectAdminResponse('products/gtin-from-barcode', { results: [{ id: 'a', ok: true, changed: true, actor: 'private' }] }));
  assert.equal((projectAdminResponse('products/enrichment/apply', { applied: 2, products: 1, skipped: [] }) as { applied: number }).applied, 2);
  assert.equal((projectAdminResponse('products/enrichment/preview', { rows: [], changeCount: 0, productCount: 0, errorCount: 0 }) as { changeCount: number }).changeCount, 0);
});

test('product structured data carries recorded identifiers and manufacturer, and nothing that was not recorded', () => {
  const product = { _id: 'b'.repeat(24), product_id: 'PD1', name: 'Daily care', productType: 'general' as const, price: 25, stock: 2,
    category: { _id: 'a'.repeat(24), name: 'Skin care' } };
  const bare = productData('https://shop.example.invalid', product, []);
  for (const key of ['gtin', 'mpn', 'brand', 'manufacturer']) assert.ok(!(key in bare), key);
  const full = productData('https://shop.example.invalid', { ...product, brand: 'CeraVe', manufacturer: "L'Oréal", gtin: '3337875597388' }, []);
  assert.deepEqual(full.manufacturer, { '@type': 'Organization', name: "L'Oréal" });
  assert.equal(full.gtin, '3337875597388');
  assert.deepEqual(full.brand, { '@type': 'Brand', name: 'CeraVe' });
});
