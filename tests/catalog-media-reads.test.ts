import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Db } from 'mongodb';
import { catalogUploadTarget, retainedBannerList, retainedBannerQuery, retainedCatalogAsset } from '../apps/api/src/modules/media/compatibility-reads';
test('catalog media readers validate bounded filenames, target identifiers and banner pages before database access', async () => {
  const db = { collection() { throw new Error('Unexpected database work'); } } as unknown as Db;
  assert.deepEqual(retainedBannerQuery({}), { limit: 25, offset: 0 });
  for (const input of [{ limit: '0' }, { limit: '101' }, { offset: '10001' }, { filter: '{}' }, { limit: ['1'] }]) await assert.rejects(retainedBannerList(db, input), { status: 400 });
  for (const filename of ['../private.webp', 'a.svg', 'a.webp?secret=x', 'a'.repeat(201) + '.webp']) await assert.rejects(retainedCatalogAsset(db, 'products', filename, {}), { status: 400 });
  await assert.rejects(retainedCatalogAsset(db, 'categories', 'valid.webp', { filter: '{}' }), { status: 400 });
  await assert.rejects(catalogUploadTarget(db, 'products', 'invalid'), { status: 400 });
});
test('catalog upload prechecks reject missing and archived targets without inventing references or modifying data', async () => {
  let target: unknown = null;
  const db = { collection() { return { findOne: async () => target }; } } as unknown as Db;
  const id = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  await assert.rejects(catalogUploadTarget(db, 'categories', id, true), { status: 400 });
  await assert.rejects(catalogUploadTarget(db, 'products', id), { status: 404 });
  target = { _id: id, archivedAt: new Date() };
  await assert.rejects(catalogUploadTarget(db, 'categories', id, true), { status: 400 });
  await assert.rejects(catalogUploadTarget(db, 'products', id), { status: 409, code: 'PRODUCT_UNAVAILABLE' });
});
