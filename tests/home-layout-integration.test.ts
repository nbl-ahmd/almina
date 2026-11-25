import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { adminHomeLayout, catalogueBrandNames, publishedHomeLayout, saveHomeLayout } from '../apps/api/src/modules/growth/home-layout';

const uri = process.env.COMMERCE_TEST_URI;
test('homepage layouts save with revisions, publish per locale and fall back to the built-in homepage', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect();
  const db = client.db('home_layout_' + randomUUID().replaceAll('-', ''));
  try {
    // Nothing saved: admins start from the built-in order and the storefront uses the built-in homepage.
    const start = await adminHomeLayout(db, 'en');
    assert.equal(start.revision, 0);
    assert.equal(await publishedHomeLayout(db, 'en'), null);
    const section = { type: 'products', id: 'deals', title: 'Deals', subtitle: '', enabled: true, background: 'coral', viewAllHref: '/offers', banner: null, startsAt: null, endsAt: null, source: { kind: 'offers' }, limit: 8 };
    const draft = await saveHomeLayout(db, { ...start, sections: [section, ...start.sections] }, 'actor');
    assert.equal(draft.revision, 1);
    assert.equal(await publishedHomeLayout(db, 'en'), null, 'drafts stay private');
    // A stale revision is refused, so two editors cannot overwrite each other.
    await assert.rejects(saveHomeLayout(db, { ...start, published: true }, 'actor'), { code: 'IDEMPOTENCY_CONFLICT' });
    const live = await saveHomeLayout(db, { ...draft, published: true }, 'actor');
    assert.equal(live.revision, 2);
    assert.equal((await publishedHomeLayout(db, 'en'))?.sections[0]?.id, 'deals');
    assert.equal(await publishedHomeLayout(db, 'ar'), null, 'locales are separate');
    // Invalid input never reaches the database.
    await assert.rejects(saveHomeLayout(db, { ...live, sections: [{ ...section, viewAllHref: 'https://evil.example/' }] }, 'actor'), { code: 'INVALID_REQUEST' });
    // A row that no longer validates (hand-edited) is treated as absent instead of breaking the homepage.
    await db.collection('home_layouts').updateOne({ _id: 'en' as never }, { $set: { 'sections.0.type': 'unknown' } });
    assert.equal(await publishedHomeLayout(db, 'en'), null);
    await db.collection('products').insertMany([{ brand: ' CeraVe ' }, { brand: 'CeraVe' }, { brand: 'Bioderma' }, { brand: '' }, { brand: 'Gone', archivedAt: new Date() }]);
    assert.deepEqual(await catalogueBrandNames(db), ['Bioderma', 'CeraVe']);
  } finally {
    await db.dropDatabase(); await client.close();
  }
});
