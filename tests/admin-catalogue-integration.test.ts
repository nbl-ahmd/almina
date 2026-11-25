import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { adminCatalogue, adminCatalogueQueue } from '../apps/api/src/modules/catalog/admin-catalogue';

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
