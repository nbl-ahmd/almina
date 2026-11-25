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
    await assert.rejects(saveHomeLayout(db, { ...start, action: 'publish' }, 'actor'), { code: 'IDEMPOTENCY_CONFLICT' });
    const live = await saveHomeLayout(db, { ...draft, action: 'publish' }, 'actor');
    assert.equal(live.revision, 2);
    assert.equal((await publishedHomeLayout(db, 'en'))?.sections[0]?.id, 'deals');
    assert.equal(await publishedHomeLayout(db, 'ar'), null, 'locales are separate');
    // Saving a draft never touches the live homepage (regression: it used to take the published layout offline).
    const edited = await saveHomeLayout(db, { ...live, sections: [{ ...section, id: 'next', title: 'Next week' }], action: 'save' }, 'actor');
    assert.equal(edited.published, true);
    assert.equal(edited.unpublishedChanges, true);
    assert.deepEqual((await publishedHomeLayout(db, 'en'))?.sections.map(item => item.id), live.sections.map(item => item.id));
    assert.equal((await adminHomeLayout(db, 'en')).sections[0]?.id, 'next');
    const released = await saveHomeLayout(db, { ...edited, action: 'publish' }, 'actor');
    assert.equal(released.unpublishedChanges, false);
    assert.equal((await publishedHomeLayout(db, 'en'))?.sections[0]?.id, 'next');
    // Unpublishing is its own action and keeps the draft.
    const withdrawn = await saveHomeLayout(db, { ...released, action: 'unpublish' }, 'actor');
    assert.equal(withdrawn.published, false);
    assert.equal(await publishedHomeLayout(db, 'en'), null);
    assert.equal((await adminHomeLayout(db, 'en')).sections[0]?.id, 'next');
    // A row stored before drafts and live copies were separated still reads, and its first draft save keeps it live.
    await db.collection('home_layouts').insertOne({ _id: 'ar' as never, locale: 'ar', published: true, revision: 4, sections: [{ ...section, id: 'old' }], updatedBy: 'a', updatedAt: new Date() });
    assert.equal((await publishedHomeLayout(db, 'ar'))?.sections[0]?.id, 'old');
    const legacy = await adminHomeLayout(db, 'ar');
    await saveHomeLayout(db, { ...legacy, sections: [{ ...section, id: 'new' }], action: 'save' }, 'actor');
    assert.equal((await publishedHomeLayout(db, 'ar'))?.sections[0]?.id, 'old');
    const current = await saveHomeLayout(db, { ...(await adminHomeLayout(db, 'en')), action: 'publish' }, 'actor');
    // Invalid input never reaches the database.
    await assert.rejects(saveHomeLayout(db, { ...current, sections: [{ ...section, viewAllHref: 'https://evil.example/' }] }, 'actor'), { code: 'INVALID_REQUEST' });
    // A row that no longer validates (hand-edited) is treated as absent instead of breaking the homepage.
    await db.collection('home_layouts').updateOne({ _id: 'en' as never }, { $set: { 'live.0.type': 'unknown' } });
    assert.equal(await publishedHomeLayout(db, 'en'), null);
    await db.collection('products').insertMany([{ brand: ' CeraVe ' }, { brand: 'CeraVe' }, { brand: 'Bioderma' }, { brand: '' }, { brand: 'Gone', archivedAt: new Date() }]);
    assert.deepEqual(await catalogueBrandNames(db), ['Bioderma', 'CeraVe']);
  } finally {
    await db.dropDatabase(); await client.close();
  }
});
