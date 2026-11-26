import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { MongoClient, ObjectId } from 'mongodb';
import { artworkTickets, commitArtwork } from '../apps/api/src/modules/media/artwork';
import { retainedStoredArtwork } from '../apps/api/src/modules/media/compatibility-reads';

const uri = process.env.COMMERCE_TEST_URI;
const config = { cloudName: 'synthetic', apiKey: '123456', apiSecret: 'synthetic-not-a-secret' };
test('direct artwork uploads are signed per kind, verified, recorded once and role checked', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db(`almina_artwork_${randomUUID().replaceAll('-', '')}`);
  const actor = new ObjectId().toHexString();
  const stored = new Set<string>(); let lookups = 0;
  // Stands in for Cloudinary's authenticated resource lookup. Only reads: no picture bytes reach the server.
  const storage: typeof fetch = async (input, init) => {
    assert.equal(init?.method ?? 'GET', 'GET'); lookups++;
    const publicId = decodeURIComponent(String(input).split('/upload/')[1]!);
    if (!stored.has(publicId)) return new Response('{}', { status: 404 });
    const format = publicId.startsWith('almina/posters/') ? 'jpg' : 'webp';
    return Response.json({ public_id: publicId, version: 1, resource_type: 'image', type: 'upload', format, width: 500, height: 500, bytes: 100,
      secure_url: `https://res.cloudinary.com/synthetic/image/upload/v1/${publicId}.${format}` });
  };
  const upload = (kind: string, uploadKey: string, count = 1) => {
    const ticket = artworkTickets(config, { kind, uploadKey, count }, 'admin');
    for (const item of ticket.uploads) { assert.equal(item.fields.overwrite, 'false'); stored.add(item.publicId); }
    return ticket;
  };
  try {
    // Banners: both sizes, language, and a repeat returns the same record.
    const banner = randomUUID();
    assert.deepEqual(upload('banner', banner, 2).uploads.map(item => item.publicId), [`almina/banners/${banner}-desktop`, `almina/banners/${banner}-mobile`]);
    const request = { kind: 'banner', uploadKey: banner, count: 2, name: 'Synthetic', link: '/offers', locale: 'ar' };
    const first = await commitArtwork(db, request, actor, 'admin', config, storage);
    assert.deepEqual(await commitArtwork(db, request, actor, 'admin', config, storage), first);
    const banners = await db.collection('banners').find().toArray();
    assert.equal(banners.length, 1); assert.equal(banners[0]!.locale, 'ar'); assert.equal(banners[0]!.cloudinaryImages.length, 2);
    await assert.rejects(commitArtwork(db, { ...request, name: 'Changed' }, actor, 'admin', config, storage), { code: 'IDEMPOTENCY_CONFLICT' });

    // Categories: create, then replace a Drive picture; the old reference is removed from the record and kept in history.
    const existing = new ObjectId();
    await db.collection('categories').insertOne({ _id: existing, name: 'Old', color: '1, 2, 3', image: 'old.webp', gdriveFileId: 'drive-old' });
    const replacement = randomUUID(); upload('category', replacement);
    await commitArtwork(db, { kind: 'category', uploadKey: replacement, categoryId: existing.toHexString(), name: 'Renamed' }, actor, 'admin', config, storage);
    const renamed = (await db.collection('categories').findOne({ _id: existing }))!;
    assert.equal(renamed.name, 'Renamed'); assert.equal(renamed.image, `category-${replacement}.webp`); assert.equal(renamed.gdriveFileId, undefined);
    assert.equal(renamed.cloudinaryImages[0], `https://res.cloudinary.com/synthetic/image/upload/v1/almina/categories/${replacement}.webp`);
    assert.ok(await db.collection('media_history').findOne({ collection: 'categories', 'previousAssets.gdriveFileId': 'drive-old' }));
    const created = randomUUID(); upload('category', created);
    await commitArtwork(db, { kind: 'category', uploadKey: created, name: 'New' }, actor, 'admin', config, storage);
    assert.equal((await db.collection('categories').findOne({ name: 'New' }))!.color, '198, 229, 214');

    // Posters are JPEG and their old address redirects to storage.
    const poster = randomUUID(); assert.equal(upload('poster', poster).uploads[0]!.fields.allowed_formats, 'jpg');
    await commitArtwork(db, { kind: 'poster', uploadKey: poster }, actor, 'admin', config, storage);
    assert.equal(await retainedStoredArtwork(db, 'whatsappposters', `poster-${poster}.jpeg`, {}, 'synthetic'), `https://res.cloudinary.com/synthetic/image/upload/v1/almina/posters/${poster}.jpg`);
    assert.equal(await retainedStoredArtwork(db, 'categories', 'old.webp', {}, 'synthetic'), null);

    // Staff may upload marketing artwork only; nothing is recorded without the file in storage.
    const marketing = randomUUID();
    assert.throws(() => artworkTickets(config, { kind: 'banner', uploadKey: marketing, count: 1 }, 'user'), { code: 'FORBIDDEN' });
    assert.throws(() => artworkTickets(config, { kind: 'poster', uploadKey: marketing, count: 2 }, 'admin'), { code: 'INVALID_REQUEST' });
    await assert.rejects(commitArtwork(db, { kind: 'marketing', uploadKey: marketing }, actor, 'user', config, storage), { code: 'INVALID_REQUEST' });
    artworkTickets(config, { kind: 'marketing', uploadKey: marketing, count: 1 }, 'user'); stored.add(`almina/products/${marketing}-0`);
    await commitArtwork(db, { kind: 'marketing', uploadKey: marketing }, actor, 'user', config, storage);
    assert.equal(await db.collection('marketing_assets').countDocuments(), 1);
    await assert.rejects(commitArtwork(db, { kind: 'banner', uploadKey: randomUUID(), count: 1, name: 'x', link: 'javascript:alert(1)' }, actor, 'admin', config, storage), { code: 'INVALID_REQUEST' });
    assert.ok(lookups > 0);
  } finally { await db.dropDatabase(); await client.close(); }
});
