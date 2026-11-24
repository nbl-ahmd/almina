import test from 'node:test';
import assert from 'node:assert/strict';
import { answersGuestLocally, guestReadBody, sessionOnlyReads } from '../apps/web/src/lib/account/session-reads';

test('tokenless session-only reads are answered by the web proxy without an upstream call', () => {
  for (const action of sessionOnlyReads) {
    assert.equal(answersGuestLocally('GET', action, ''), true);
    assert.equal(answersGuestLocally('HEAD', action, ''), true);
  }
  assert.deepEqual(guestReadBody, { error: { code: 'UNAUTHORIZED', message: 'Authentication is required.' } });
});

test('public reads, writes and requests with a session still reach the API', () => {
  assert.equal(answersGuestLocally('GET', 'options', ''), false);
  assert.equal(answersGuestLocally('POST', 'saved', ''), false);
  assert.equal(answersGuestLocally('POST', 'verify', ''), false);
  assert.equal(answersGuestLocally('GET', 'saved', 'a'.repeat(43)), false);
});
