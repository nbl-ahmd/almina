import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiErrorSchema, mongoIdSchema, paginationQuerySchema, productBusinessIdSchema, statusResponseSchema } from '@almina/contracts';

test('pagination is bounded and unknown/raw database predicates are rejected', () => {
  assert.deepEqual(paginationQuerySchema.parse({}), { limit: 20, offset: 0 });
  assert.deepEqual(paginationQuerySchema.parse({ limit: '10', offset: '20' }), { limit: 10, offset: 20 });
  for (const input of [{ limit: '0' }, { limit: '101' }, { offset: '-1' }, { offset: '10001' },
    { limit: '1.5' }, { filter: { $where: 'arbitrary' } }, { limit: ['1', '2'] }]) {
    assert.equal(paginationQuerySchema.safeParse(input).success, false);
  }
});

test('business IDs cannot be confused with MongoDB IDs', () => {
  assert.equal(productBusinessIdSchema.safeParse('PD123').success, true);
  assert.equal(mongoIdSchema.safeParse('0123456789abcdef01234567').success, true);
  assert.equal(mongoIdSchema.safeParse('PD123').success, false);
  assert.equal(productBusinessIdSchema.safeParse('0123456789abcdef01234567').success, false);
});

test('response envelopes forbid extra data and require a request ID', () => {
  const requestId = '0d614be8-7697-4c01-87e6-32b153bc1ee8';
  const response = { data: { service: 'almina-api', contractVersion: '1', database: 'disabled' }, requestId };
  assert.equal(statusResponseSchema.safeParse(response).success, true);
  assert.equal(statusResponseSchema.safeParse({ ...response, password: 'fake-sensitive-marker' }).success, false);
  assert.equal(statusResponseSchema.safeParse({ ...response, requestId: 'arbitrary' }).success, false);
  assert.equal(apiErrorSchema.safeParse({ error: { code: 'INTERNAL_ERROR', message: 'An error occurred.' }, requestId }).success, true);
});
