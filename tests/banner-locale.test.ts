import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaMetadataInput } from '../apps/api/src/modules/media/metadata';

test('a banner may be limited to one language; otherwise it shows to everyone', () => {
  const base = { name: 'Banner', link: '/offers' };
  assert.deepEqual(mediaMetadataInput('banners', base), base);
  assert.deepEqual(mediaMetadataInput('banners', { ...base, locale: 'all' }), base);
  assert.deepEqual(mediaMetadataInput('banners', { ...base, locale: 'ar' }), { ...base, locale: 'ar' });
  assert.throws(() => mediaMetadataInput('banners', { ...base, locale: 'fr' }), { code: 'INVALID_REQUEST' });
});
