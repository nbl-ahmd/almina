import test from 'node:test';
import assert from 'node:assert/strict';
import { couponRecordSchema, couponSaveSchema } from '@almina/contracts';
import { eligibleProductIds } from '../apps/api/src/modules/coupons/service';

const care = { _id: 'aaaaaaaaaaaaaaaaaaaaaaa1', category: 'cccccccccccccccccccccc01', productType: 'general', contentReviewed: true };
const body = { _id: 'aaaaaaaaaaaaaaaaaaaaaaa2', category: 'cccccccccccccccccccccc02', productType: 'general', contentReviewed: true };
const otc = { _id: 'aaaaaaaaaaaaaaaaaaaaaaa3', category: 'cccccccccccccccccccccc01', productType: 'otc', contentReviewed: true };
const draft = { _id: 'aaaaaaaaaaaaaaaaaaaaaaa4', category: 'cccccccccccccccccccccc01', productType: 'general', contentReviewed: false };
const all = [care, body, otc, draft];

test('coupon scope narrows eligibility but never widens it past reviewed general products', () => {
  assert.deepEqual([...eligibleProductIds(undefined, all)], [care._id, body._id]);
  assert.deepEqual([...eligibleProductIds({ type: 'all' }, all)], [care._id, body._id]);
  assert.deepEqual([...eligibleProductIds({ type: 'categories', categoryIds: [care.category] }, all)], [care._id]);
  assert.deepEqual([...eligibleProductIds({ type: 'products', productIds: [body._id.toUpperCase(), otc._id] }, all)], [body._id]);
  // A malformed stored scope falls back to "all" rather than failing the basket.
  assert.deepEqual([...eligibleProductIds({ type: 'brands', brands: ['X'] }, all)], [care._id, body._id]);
});

test('coupon rows saved before scopes still parse, and saves validate scope ids', () => {
  const legacy = { code: 'OLD-1', enabled: true, discount: { type: 'fixed', amountMinor: 100 }, minimumMinor: 0, maximumUses: null, startsAt: null, endsAt: null, revision: 1, uses: 0 };
  const parsed = couponRecordSchema.parse(legacy);
  assert.deepEqual(parsed.scope, { type: 'all' });
  assert.equal(parsed.listed, false);
  assert.equal(parsed.title, '');
  const base = { ...legacy, revision: 0 } as Record<string, unknown>; delete base.uses;
  assert.equal(couponSaveSchema.safeParse({ ...base, scope: { type: 'categories', categoryIds: [] } }).success, false);
  assert.equal(couponSaveSchema.safeParse({ ...base, scope: { type: 'products', productIds: ['not-an-id'] } }).success, false);
  assert.equal(couponSaveSchema.safeParse({ ...base, scope: { type: 'products', productIds: [care._id] }, title: 'Care offer', listed: true }).success, true);
});
