import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { catalogueEnrichmentCsv, catalogueEnrichmentQueue, catalogueQualityReport, useBarcodesAsGtin } from '../apps/api/src/modules/catalog/quality';
import { applyEnrichmentImport, previewEnrichmentImport } from '../apps/api/src/modules/catalog/enrichment-import';
import { adminCatalogue } from '../apps/api/src/modules/catalog/admin-catalogue';
import { enrichmentCsvCell } from '@almina/contracts';

const uri = process.env.COMMERCE_TEST_URI;
const photo = 'https://res.cloudinary.com/synthetic/image/upload/v1/item.webp';
const config = { cloudName: 'synthetic', origin: 'https://shop.example.invalid' };
const actor = String(new ObjectId());
const now = new Date('2026-11-26T12:00:00Z');

async function seeded() {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_quality_' + randomUUID().replaceAll('-', ''));
  const skin = new ObjectId(), general = new ObjectId();
  await db.collection('categories').insertMany([{ _id: skin, name: 'Skincare' }, { _id: general, name: 'General' }]);
  const reviewed = { contentReviewed: true, stockVerified: true, imageRights: 'authorized', condition: 'new', googleApproved: true };
  const complete = { category: skin, price: 20, stock: 3, productType: 'general', brand: 'Acme', manufacturer: 'Acme Labs', saleUnit: '1 tube',
    packLabel: '50 ml', description: 'A synthetic cream.', cloudinaryImages: [photo], published: true, disabled: false, ...reviewed };
  const ids = { P1: new ObjectId(), P2: new ObjectId(), P3: new ObjectId(), P4: new ObjectId(), P5: new ObjectId(), P6: new ObjectId(), P7: new ObjectId(), P8: new ObjectId(), P9: new ObjectId() };
  await db.collection('products').insertMany([
    // Selling, in stock, live; everything but a confirmed GTIN. Its barcode is a valid trade GTIN nobody else uses.
    { ...complete, _id: ids.P1, product_id: 'PD1', name: 'Selling cream', stock: 5, barcode: '6291000000020', identifierStatus: 'unknown' },
    // Fully ready for the Google feed.
    { ...complete, _id: ids.P2, product_id: 'PD2', name: 'Ready cream', gtin: '6291000000037', identifierStatus: 'assigned' },
    // Live with a legacy storefront photo only, and no brand.
    { ...complete, _id: ids.P3, product_id: 'PD3', name: 'Legacy photo cream', brand: '', cloudinaryImages: [], image: 'legacy.webp', stock: 2 },
    // A pharmacy medicine: excluded from the UAE Google feed by policy.
    { ...complete, _id: ids.P4, product_id: 'PD4', name: 'Medicine tablets', productType: 'otc', description: '' },
    // Hidden, generic category, nothing filled in.
    { _id: ids.P5, product_id: 'PD5', name: 'Bare item', category: general, price: 5, stock: 0, published: false, disabled: true, identifierStatus: 'unknown' },
    // Hidden; its barcode is PD2's GTIN, spelled as GTIN-14.
    { _id: ids.P6, product_id: 'PD6', name: 'Duplicate code item', category: skin, price: 5, stock: 0, published: false, disabled: true, barcode: '06291000000037' },
    // Hidden; an in-store code.
    { _id: ids.P7, product_id: 'PD7', name: 'Weighed item', category: skin, price: 5, stock: 0, published: false, disabled: true, barcode: '2000000000015' },
    // Live, but its stored GTIN fails validation, so the storefront cannot read it.
    { ...complete, _id: ids.P8, product_id: 'PD8', name: 'Broken GTIN cream', gtin: '1234', stock: 1 },
    // Archived: never counted, never blocks another product's code.
    { ...complete, _id: ids.P9, product_id: 'PD9', name: 'Archived', barcode: '6291000000020', archivedAt: new Date() },
  ]);
  const line = (product: ObjectId, quantity: number) => ({ productId: String(product), name: 'x', quantity, lineTotalMinor: 100 });
  await db.collection('orders').insertMany([
    { schemaVersion: 2, status: 'dispatched', createdAt: new Date('2026-11-20T00:00:00Z'), lines: [line(ids.P1, 10)] },
    { schemaVersion: 2, status: 'cancelled', createdAt: new Date('2026-11-20T00:00:00Z'), lines: [line(ids.P3, 50)] },
    { schemaVersion: 2, status: 'dispatched', createdAt: new Date('2026-06-01T00:00:00Z'), lines: [line(ids.P5, 100)] },
  ]);
  return { db, ids, close: async () => { await db.dropDatabase(); await client.close(); } };
}

test('the quality report counts coverage, feed readiness, identifier problems and unreadable live products', { skip: !uri }, async () => {
  const { db, close } = await seeded();
  try {
    const report = await catalogueQualityReport(db, config, now);
    assert.equal(report.all.total, 8, 'archived products are not counted');
    assert.equal(report.live.total, 5);
    assert.equal(report.live.missing.photo, 0, 'a legacy storefront photo is still a photo');
    assert.equal(report.live.missing.brand, 1);
    assert.equal(report.all.missing.category, 1);
    assert.equal(report.instock.total, 5);
    assert.equal(report.merchant.ready, 1);
    assert.equal(report.merchant.medicines, 1);
    assert.equal(report.merchant.legacyPhotoOnly, 1);
    assert.ok(report.merchant.reviewSteps.some(row => row.issue === 'Manufacturer identifier review' && row.products === 2));
    assert.ok(report.merchant.dataGaps.some(row => row.issue === 'Brand'));
    assert.ok(!report.merchant.dataGaps.some(row => row.issue === 'Channel approval'), 'approvals are review steps, not data gaps');
    assert.equal(report.unreadableLiveTotal, 1);
    assert.equal(report.unreadableLive[0]!.productId, 'PD8');
    assert.equal(report.identifiers.barcodeGtinCandidates, 1);
    assert.equal(report.identifiers.restrictedBarcodes, 1);
    assert.equal(report.identifiers.duplicateGroupTotal, 1, 'PD6 barcode and PD2 GTIN are the same number in two spellings');
    assert.deepEqual(report.identifiers.duplicateGroups[0]!.products.map(product => product.productId).sort(), ['PD2', 'PD6']);

    // The Products list filters agree with the gaps for live products.
    const live = await adminCatalogue(db, { view: 'live', limit: 1 });
    assert.equal(live.counts.filters['missing-brand'], 1);
    assert.equal(live.counts.filters['missing-gtin'], report.live.missing.gtin);
    assert.equal(report.live.missing.gtin, 4, 'PD1, PD3 and PD4 have none; PD8 holds an invalid one');
    assert.equal(live.counts.filters['missing-description'], 1);
  } finally { await close(); }
});

test('the enrichment queue ranks by real demand and stock, explains why, and offers verified barcodes', { skip: !uri }, async () => {
  const { db, close } = await seeded();
  try {
    const queue = await catalogueEnrichmentQueue(db, { scope: 'live' }, now);
    assert.equal(queue.items[0]!.productId, 'PD1');
    assert.deepEqual(queue.items[0]!.reasons, ['10 sold in 90 days', 'in stock', 'live']);
    assert.equal(queue.items[0]!.units90, 10, 'cancelled orders and orders older than 90 days do not count');
    assert.equal(queue.items[0]!.barcodeGtin, true);
    assert.ok(!queue.items.some(item => item.productId === 'PD2'), 'complete products are not queued');
    assert.equal(queue.items.find(item => item.productId === 'PD3')!.units90, 0);
    const all = await catalogueEnrichmentQueue(db, { scope: 'all', gap: 'gtin', limit: '50' }, now);
    assert.ok(all.items.every(item => item.gaps.includes('gtin')));
    assert.equal(all.items.find(item => item.productId === 'PD6')!.barcodeGtin, false, 'a shared code is not offered');
    assert.equal(all.items.find(item => item.productId === 'PD7')!.barcodeGtin, false, 'an in-store code is not offered');
    const paged = await catalogueEnrichmentQueue(db, { scope: 'all', limit: '2', offset: '2' }, now);
    assert.equal(paged.items.length, 2);
    assert.equal(paged.offset, 2);
    await assert.rejects(catalogueEnrichmentQueue(db, { scope: 'all', gap: { $ne: null } }, now), { status: 400 });

    const csv = await catalogueEnrichmentCsv(db, { scope: 'all', gap: 'photo' }, now);
    const [header, ...rows] = csv.trim().split('\r\n');
    assert.equal(header, 'product_id,name,barcode,category,priority,gaps,brand,manufacturer,gtin,mpn,identifierStatus,packLabel,saleUnit,description,photo_file_name');
    assert.ok(rows.some(row => row.startsWith('"PD5"') && row.endsWith('"PD5.jpg"')));
  } finally { await close(); }
});

test('a barcode becomes the GTIN only when valid, unique, not in-store and confirmed; nothing else changes', { skip: !uri }, async () => {
  const { db, ids, close } = await seeded();
  try {
    await assert.rejects(useBarcodesAsGtin(db, { ids: [String(ids.P1)] }, actor), { status: 400 }, 'confirmation is required');
    const { results } = await useBarcodesAsGtin(db, { ids: [ids.P1, ids.P6, ids.P7, ids.P2].map(String), confirmed: true }, actor);
    assert.deepEqual(results.map(result => [result.ok, result.changed]), [[true, true], [false, false], [false, false], [true, false]]);
    assert.match(results[1]!.reason!, /PD2/);
    assert.match(results[2]!.reason!, /in-store/);
    const p1 = await db.collection('products').findOne({ _id: ids.P1 });
    assert.equal(p1!.gtin, '6291000000020');
    assert.equal(p1!.identifierStatus, 'assigned');
    assert.equal(p1!.published, true); assert.equal(p1!.price, 20); assert.equal(p1!.stock, 5);
    assert.equal(await db.collection('catalog_audit').countDocuments({ reason: 'Barcode confirmed as GTIN by administrator' }), 1);
  } finally { await close(); }
});

test('the enrichment file previews every change, fills blanks only, skips stale rows and never publishes', { skip: !uri }, async () => {
  const { db, ids, close } = await seeded();
  try {
    const rows = [
      ['product_id', 'name', 'brand', 'gtin', 'description', 'manufacturer'],
      ['PD5', 'Bare item', 'Acme', '6291000000044', '- Gentle formula', ''],
      ['PD3', '', 'Bioderma', '', '', ''],
      ['PD2', '', 'Other brand', '', '', ''],
      ['PD4', '', '', '', 'New medicine text', ''],
      ['PD404', '', 'Nobody', '', '', ''],
      ['PD5', '', 'Second row', '', '', ''],
      ['PD6', '', '', '6291000000037', '', ''],
    ];
    const content = rows.map(row => row.map(enrichmentCsvCell).join(',')).join('\r\n');
    await assert.rejects(previewEnrichmentImport(db, { content: 'product_id,price\r\nPD1,0' }), { status: 400 }, 'unknown columns are refused');
    const preview = await previewEnrichmentImport(db, { content });
    const row = (productId: string, nth = 0) => preview.rows.filter(entry => entry.productId === productId)[nth]!;
    assert.deepEqual(row('PD5').changes.map(change => [change.field, change.after]),
      [['brand', 'Acme'], ['gtin', '6291000000044'], ['description', '- Gentle formula'], ['identifierStatus', 'assigned']]);
    assert.deepEqual(row('PD3').changes.map(change => [change.field, change.before, change.after]), [['brand', '', 'Bioderma']]);
    assert.equal(row('PD2').changes.length, 0);
    assert.match(row('PD2').notes[0]!, /kept the current value/);
    assert.match(row('PD4').notes[0]!, /product editor only/);
    assert.match(row('PD404').notes[0]!, /No product/);
    assert.match(row('PD5', 1).notes[0]!, /earlier in the file/);
    assert.match(row('PD6').notes[0]!, /PD2/);
    assert.equal(preview.errorCount, 2);
    assert.equal((await previewEnrichmentImport(db, { content, overwrite: true })).rows.find(entry => entry.productId === 'PD2')!.changes[0]!.after, 'Other brand');

    // Someone edits PD3 between preview and apply.
    await db.collection('products').updateOne({ _id: ids.P3 }, { $set: { brand: 'Edited meanwhile' } });
    const changes = preview.rows.flatMap(entry => entry.changes);
    await assert.rejects(applyEnrichmentImport(db, { changes }, actor), { status: 400 }, 'confirmation is required');
    const result = await applyEnrichmentImport(db, { changes, confirmed: true }, actor);
    assert.equal(result.applied, 4); assert.equal(result.products, 1);
    assert.deepEqual(result.skipped.map(skip => [skip.field, skip.reason]), [['brand', 'Changed since the preview. Preview the file again.']]);
    const p5 = await db.collection('products').findOne({ _id: ids.P5 });
    assert.equal(p5!.description, '- Gentle formula');
    assert.equal(p5!.disabled, true); assert.equal(p5!.published, false);
    assert.equal(p5!.contentReviewed, undefined); assert.equal(p5!.googleApproved, undefined);
    assert.equal((await db.collection('products').findOne({ _id: ids.P3 }))!.brand, 'Edited meanwhile');
    const audit = await db.collection('catalog_audit').findOne({ entityId: ids.P5 });
    assert.equal(audit!.reason, 'Enrichment file, values confirmed by administrator');
    assert.deepEqual(Object.keys(audit!.after).sort(), ['brand', 'description', 'gtin', 'identifierStatus']);

    // A medicine description cannot be forced through apply, and fields outside the file's columns are refused outright.
    const forced = await applyEnrichmentImport(db, { changes: [{ id: String(ids.P4), field: 'description', before: '', after: 'Forced' }], confirmed: true }, actor);
    assert.equal(forced.applied, 0);
    await assert.rejects(applyEnrichmentImport(db, { changes: [{ id: String(ids.P4), field: 'price', before: '20', after: '0' }], confirmed: true }, actor), { status: 400 });
  } finally { await close(); }
});
