import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { archiveEntity, replaceCategory, resolveRetainedAsset } from '../apps/api/src/modules/media/retention';
import { replaceCloudinaryImages, cloudinarySignature } from '../apps/api/src/modules/media/cloudinary';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('signed media retries reconcile provider acceptance and preserve old references, revisions, stock and history', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(); const db = client.db('almina_media_test_' + randomUUID().replaceAll('-', ''));
  const id = new ObjectId(), category = new ObjectId(), actor = String(new ObjectId());
  const config = { cloudName: 'synthetic', apiKey: '1234', apiSecret: 'synthetic-not-a-secret' };
  const files = [new Uint8Array([1, 2, 3])], uploadKey = randomUUID(), input = { uploadKey, expectedMediaRevision: '0' };
  const assets = new Map<string, object>(); let posts = 0, lost = true;
  const transport: typeof fetch = async (url, options) => {
    if (options?.method !== 'POST') { const publicId = decodeURIComponent(String(url).split('/upload/')[1]!); return assets.has(publicId) ? Response.json(assets.get(publicId)) : new Response('{}', { status: 404 }); }
    posts++; const form = options.body as FormData, publicId = String(form.get('public_id'));
    assert.equal(form.get('overwrite'), 'false');
    const asset = { public_id: publicId, version: 1, resource_type: 'image', type: 'upload', format: 'webp', width: 500, height: 500, bytes: 100,
      secure_url: `https://res.cloudinary.com/synthetic/image/upload/v1/${publicId}.webp` };
    assets.set(publicId, asset); if (lost) { lost = false; throw new Error('Synthetic lost response'); }
    return Response.json({ ...asset, signature: cloudinarySignature({ public_id: publicId, version: '1' }, config.apiSecret) });
  };
  try {
    await db.collection('categories').insertOne({ _id: category, name: 'Reviewed', image: 'old-category.webp', gdriveFileId: 'synthetic-category-drive' });
    await db.collection('products').insertOne({ _id: id, product_id: 'PD_ORIGINAL', stock: 5, price: 10, category, images: ['old-product.webp'], gdriveFileIds: ['synthetic-product-drive'] });
    await db.collection('orders').insertOne({ cartItems: [{ _id: id, quantity: 1 }], totalAmount: 10 });
    await assert.rejects(replaceCloudinaryImages(db, String(id), actor, input, files, config, transport));
    assert.equal((await db.collection('products').findOne({ _id: id }))!.mediaRevision, undefined);
    await replaceCloudinaryImages(db, String(id), actor, input, files, config, transport); assert.equal(posts, 1);
    const product = (await db.collection('products').findOne({ _id: id }))!;
    assert.equal(product.stock, 5); assert.equal(product.mediaRevision, 1); assert.equal(product.images[0], 'old-product.webp');
    await db.collection('products').updateOne({ _id: id }, { $set: { stock: 3 } });
    await replaceCloudinaryImages(db, String(id), actor, input, files, config, transport); assert.equal(posts, 1);
    assert.equal((await db.collection('products').findOne({ _id: id }))!.stock, 3);
    await assert.rejects(replaceCloudinaryImages(db, String(id), actor, input, [new Uint8Array([4])], config, transport), { status: 409 });
    await assert.rejects(replaceCloudinaryImages(db, String(id), actor, { ...input, uploadKey: randomUUID() }, files, config, transport), { status: 409 });
    await replaceCategory(db, String(category), { image: 'new-category.webp', gdriveFileId: 'synthetic-new-drive' }, actor);
    assert.equal(await resolveRetainedAsset(db, 'categories', 'old-category.webp'), 'synthetic-category-drive');
    await archiveEntity(db, 'products', String(id), actor); await archiveEntity(db, 'products', String(id), actor);
    await archiveEntity(db, 'categories', String(category), actor);
    assert.equal(await db.collection('products').countDocuments(), 1); assert.equal(await db.collection('orders').countDocuments(), 1);
    const archived = (await db.collection('products').findOne({ _id: id }))!; assert.equal(archived.stock, 3); assert.equal(archived.disabled, true);
    assert.equal(archived.gdriveFileIds[0], 'synthetic-product-drive'); assert.deepEqual(archived.cloudinaryImages, product.cloudinaryImages);
    assert.equal(await db.collection('media_history').countDocuments(), 4); // two replacements, two archives
  } finally { await db.dropDatabase(); await client.close(); }
});
