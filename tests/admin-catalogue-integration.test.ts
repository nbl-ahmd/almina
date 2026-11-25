import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { adminCatalogue, adminCatalogueQueue } from '../apps/api/src/modules/catalog/admin-catalogue';
import { setProductsVisibility, toggleCatalogVisibility } from '../apps/api/src/modules/media/metadata';

const uri = process.env.COMMERCE_TEST_URI;
const photo = 'https://res.cloudinary.com/synthetic/image/upload/v1/item.webp';

async function database() {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_catalogue_' + randomUUID().replaceAll('-', ''));
  return { db, close: async () => { await db.dropDatabase(); await client.close(); } };
}

test('the editor queue reaches every product in the list, whatever its stock, and survives items leaving the queue', { skip: !uri }, async () => {
  const { db, close } = await database();
  try {
    const category = new ObjectId();
    await db.collection('categories').insertOne({ _id: category, name: 'Synthetic' });
    // 260 hidden products without a photo (stock deliberately out of order), plus live and archived ones in between.
    const products = Array.from({ length: 300 }, (_, index) => ({ _id: new ObjectId(), product_id: `PD${1000 + index}`, name: `Synthetic item ${index}`, category,
      price: 10, stock: (index * 37) % 23, productType: 'general', disabled: index >= 40, published: index < 40 ? true : false,
      ...(index < 40 ? { cloudinaryImages: [photo] } : {}), ...(index % 100 === 99 ? { archivedAt: new Date() } : {}) }));
    await db.collection('products').insertMany(products);
    const queued = products.filter((product, index) => index >= 40 && !product.archivedAt);
    const context = { view: 'hidden', filter: 'missing-photo' } as const;
    let id = String(queued[0]!._id);
    const visited = [id];
    for (;;) {
      const queue = await adminCatalogueQueue(db, { ...context, id });
      assert.equal(queue.position, 1, 'finished products leave the queue, so the current one is always first');
      assert.equal(queue.total, queued.length - visited.length + 1);
      // What Save & next does after adding a photo and publishing: the product leaves the queue, then the next is looked up.
      await db.collection('products').updateOne({ _id: new ObjectId(id) }, { $set: { cloudinaryImages: [photo], disabled: false, published: true, stock: 999 } });
      const after = await adminCatalogueQueue(db, { ...context, id });
      assert.equal(after.position, null);
      if (!after.nextId) break;
      id = after.nextId; visited.push(id);
    }
    assert.deepEqual(visited, queued.map(product => String(product._id)));
    assert.ok(visited.length > 200, 'well past the 100 product window of the previous editor');

    // Unfiltered: previous and next are the catalogue neighbours, skipping archived products, at any depth.
    const middle = await adminCatalogueQueue(db, { id: String(products[198]!._id) });
    assert.equal(middle.previousId, String(products[197]!._id));
    assert.equal(middle.nextId, String(products[200]!._id));
    assert.equal(middle.total, 297);
    assert.equal(middle.position, 198);
    const last = await adminCatalogueQueue(db, { id: String(products[298]!._id) });
    assert.equal(last.nextId, null);
  } finally { await close(); }
});

test('the product list shares the queue filters, reports counts, finds photo file codes and rejects raw filters', { skip: !uri }, async () => {
  const { db, close } = await database();
  try {
    const category = new ObjectId(), other = new ObjectId();
    await db.collection('categories').insertMany([{ _id: category, name: 'First aid' }, { _id: other, name: 'Care' }]);
    const base = { category, price: 12, stock: 3, productType: 'general', brand: 'Acme', description: 'Synthetic', disabled: true, published: false };
    await db.collection('products').insertMany([
      { ...base, product_id: 'PD1', name: 'Ready bandage', cloudinaryImages: [photo], barcode: '6291000000011' },
      { ...base, product_id: 'PD2', name: 'No photo bandage', images: ['/product-placeholder.svg'], category: other },
      { ...base, product_id: 'PD3', name: '...Mxmn', cloudinaryImages: [photo] },
      { ...base, product_id: 'PD4', name: 'Unclassified', productType: 'unreviewed', cloudinaryImages: [photo] },
      { ...base, product_id: 'PD5', name: 'Rx item', productType: 'prescription', cloudinaryImages: [photo] },
      { ...base, product_id: 'PD6', name: 'Free item', price: 0, cloudinaryImages: [photo] },
      { ...base, product_id: 'PD7', name: 'Live item', disabled: false, published: true, stock: 0, sale: true, salePrice: 9, image: 'legacy.webp', description: '' },
      { ...base, product_id: 'PD8', name: 'Archived', archivedAt: new Date() },
    ]);
    const all = await adminCatalogue(db, {});
    assert.equal(all.total, 7);
    assert.deepEqual(all.counts.views, { all: 7, live: 1, hidden: 6, outofstock: 1, sale: 1 });
    assert.equal(all.counts.filters.ready, 1);
    assert.equal(all.counts.filters['missing-photo'], 1);
    assert.equal(all.counts.filters.identity, 1);
    assert.equal(all.counts.filters.classification, 1);
    assert.equal(all.counts.filters.prescription, 1);
    assert.equal(all.counts.filters.content, 1);
    const live = all.items.find(item => item.productId === 'PD7')!;
    assert.deepEqual([live.live, live.salePrice, live.image, live.category, live.ready], [true, 9, 'legacy.webp', 'First aid', false]);
    const ready = await adminCatalogue(db, { view: 'hidden', filter: 'ready' });
    assert.deepEqual(ready.items.map(item => item.productId), ['PD1']);
    assert.equal(ready.items[0]!.ready, true);
    const missing = await adminCatalogue(db, { filter: 'missing-photo' });
    assert.deepEqual(missing.items.map(item => [item.productId, item.missingPhoto, item.image]), [['PD2', true, null]]);
    // Counts follow the search and category; the active view and filter combine.
    const searched = await adminCatalogue(db, { q: 'bandage', category: String(other) });
    assert.deepEqual([searched.total, searched.counts.views.all, searched.counts.views.hidden], [1, 1, 1]);
    const paged = await adminCatalogue(db, { limit: '2', offset: '2' });
    assert.deepEqual(paged.items.map(item => item.productId), ['PD3', 'PD4']);
    // Photo file names: product ID (any letter case) or barcode.
    const matched = await adminCatalogue(db, { codes: 'pd2,6291000000011,PD8,PD999', limit: '100' });
    assert.deepEqual(matched.items.map(item => item.productId).sort(), ['PD1', 'PD2']);
    for (const raw of [{ filter: '$where' }, { view: 'archived' }, { limit: '101' }, { codes: '.*' }, { query: '{}' }, { q: ['a'] }]) {
      await assert.rejects(adminCatalogue(db, raw), { status: 400 });
    }
    await assert.rejects(adminCatalogueQueue(db, { id: 'nope' }), { status: 400 });
  } finally { await close(); }
});

test('bulk visibility is idempotent, reports every refusal and never publishes prescription, unclassified or unpriced products', { skip: !uri }, async () => {
  const { db, close } = await database();
  try {
    const actor = String(new ObjectId());
    const base = { category: new ObjectId(), price: 12, stock: 3, productType: 'general', disabled: true, published: false };
    const rows = [
      { ...base, name: 'Good bandage' },
      { ...base, name: 'Rx item', productType: 'prescription' },
      { ...base, name: 'Unclassified', productType: 'unreviewed' },
      // Legacy products without the managed-catalogue flag are held to the same rules in bulk.
      { ...base, name: '...Mxmn' },
      { ...base, name: 'Free item', price: 0 },
      { ...base, name: 'Broken offer', salePrice: 99 },
      { ...base, name: 'Archived', archivedAt: new Date() },
      { ...base, name: 'Retired record', active: false },
      { ...base, name: 'Already live', disabled: false, published: true },
    ].map(row => ({ ...row, _id: new ObjectId() }));
    await db.collection('products').insertMany(rows);
    const ids = [...rows.map(row => String(row._id)), String(new ObjectId())];
    const first = await setProductsVisibility(db, { ids, live: true }, actor);
    assert.deepEqual(first.results.map(result => [result.ok, result.changed]), [[true, true], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [true, false], [false, false]]);
    assert.ok(first.results.filter(result => !result.ok).every(result => result.reason));
    const stored = await db.collection('products').find().sort({ _id: 1 }).toArray();
    assert.deepEqual(stored.filter(product => product.disabled === false).map(product => product.name), ['Good bandage', 'Already live']);
    const good = stored.find(product => product.name === 'Good bandage')!;
    assert.deepEqual([good.published, good.contentReviewed, good.stockVerified, good.imageRights, good.price, good.stock], [true, true, true, 'authorized', 12, 3]);
    assert.equal(await db.collection('catalog_audit').countDocuments(), 1);
    // Repeating the request changes nothing: a retry after a lost response can never hide what it just published.
    const again = await setProductsVisibility(db, { ids: [ids[0]!], live: true }, actor);
    assert.deepEqual(again.results, [{ id: ids[0], ok: true, changed: false }]);
    assert.equal(await db.collection('catalog_audit').countDocuments(), 1);
    const hide = await setProductsVisibility(db, { ids: [ids[0]!, ids[1]!], live: false }, actor);
    assert.deepEqual(hide.results.map(result => [result.ok, result.changed]), [[true, true], [true, false]]);
    assert.equal((await db.collection('products').findOne({ _id: rows[0]!._id }))!.published, false);
    // The single switch refuses prescription items too, including legacy records without the managed-catalogue flag.
    await assert.rejects(toggleCatalogVisibility(db, 'products', ids[1]!, actor), { status: 409 });
    assert.equal((await db.collection('products').findOne({ _id: rows[1]!._id }))!.disabled, true);
    // The single switch still flips whatever the product currently is.
    await toggleCatalogVisibility(db, 'products', ids[0]!, actor);
    assert.equal((await db.collection('products').findOne({ _id: rows[0]!._id }))!.disabled, false);
    for (const raw of [{ ids: [], live: true }, { ids: [ids[0], ids[0]], live: true }, { ids: Array.from({ length: 51 }, () => String(new ObjectId())), live: true }, { ids: [ids[0]] }, { ids: [{ $ne: null }], live: true }, { ids: [ids[0]], live: 'yes' }]) {
      await assert.rejects(setProductsVisibility(db, raw, actor), { status: 400 });
    }
  } finally { await close(); }
});

test('the product list and queue answer quickly for a catalogue of production size', { skip: !uri }, async () => {
  const { db, close } = await database();
  try {
    const categories = Array.from({ length: 40 }, (_, index) => ({ _id: new ObjectId(), name: `Category ${index}` }));
    await db.collection('categories').insertMany(categories);
    const description = 'Synthetic product information with usage, storage and ingredient notes. '.repeat(30); // about 2 KB
    const products = Array.from({ length: 8000 }, (_, index) => ({ _id: new ObjectId(), product_id: `PD${index}`, name: `Synthetic catalogue product ${index} 500 mg tablets`, brand: `Brand ${index % 600}`,
      category: categories[index % 40]!._id, price: 10 + (index % 90), stock: index % 12, productType: index % 3 ? 'general' : 'unreviewed', disabled: index % 10 !== 0, published: index % 10 === 0,
      description, ingredients: description, usage: description, warnings: description, ...(index % 7 === 0 ? { cloudinaryImages: [photo] } : {}) }));
    await db.collection('products').insertMany(products);
    const timed = async <T>(work: () => Promise<T>) => { const start = performance.now(); const value = await work(); return { value, ms: Math.round(performance.now() - start) }; };
    const list = await timed(() => adminCatalogue(db, { view: 'hidden', filter: 'missing-photo', offset: '5000' }));
    const search = await timed(() => adminCatalogue(db, { q: 'product 7', limit: '100' }));
    const queue = await timed(() => adminCatalogueQueue(db, { view: 'hidden', filter: 'missing-photo', id: String(products[6001]!._id) }));
    console.log(JSON.stringify({ catalogueTimingMs: { list: list.ms, search: search.ms, queue: queue.ms, documents: products.length } }));
    // View counts respect the chosen filter (1,143 products have a photo); filter counts respect the chosen view.
    assert.equal(list.value.counts.views.all, 8000 - 1143); assert.equal(list.value.counts.filters.all, 7200); assert.equal(list.value.items.length, 25);
    assert.equal(list.value.counts.filters.content, 0);
    // Well inside the 5 second database limit even on a much slower shared cluster.
    assert.ok(list.ms < 2000 && search.ms < 2000 && queue.ms < 2000, 'catalogue reads must stay fast');
  } finally { await close(); }
});
