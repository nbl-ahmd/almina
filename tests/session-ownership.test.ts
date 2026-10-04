import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { hash } from 'bcryptjs';
import type { Db } from 'mongodb';
import { createSessionService } from '../apps/api/src/modules/auth/sessions';
import { cookieName, cookieOptions, readSessionCookie, verifyBrowserMutation } from '../apps/api/src/modules/auth/cookies';
import { securityDb, id } from './helpers/security-fixture';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
test('maintained sessions read historical cookie-v2 receipts and reject malformed identities without fabricating staff fields', async () => {
  const password = await hash('synthetic-test-password', 4), token = 'a'.repeat(43);
  const fixture = securityDb({ users: [{ _id: id, username: 'synthetic', name: 'Synthetic', password, role: 'admin', cities: ['City A', 2] }],
    api_sessions: [{ userId: id, tokenHash: digest(token), expiresAt: new Date(Date.now() + 60000), passwordFingerprint: digest(password), scheme: 'cookie-v2' }] });
  const auth = createSessionService(async () => fixture.db);
  assert.deepEqual(await auth.authenticate(token), { id: String(id), username: 'synthetic', name: 'Synthetic', role: 'admin', cities: ['City A'] });
  const historical = JSON.stringify(fixture.data.api_sessions);
  fixture.data.users![0]!.name = null;
  await assert.rejects(auth.authenticate(token), { status: 401 });
  await assert.rejects(auth.login({ username: 'synthetic', password: 'synthetic-test-password' }), { status: 401 });
  assert.equal(JSON.stringify(fixture.data.api_sessions), historical);
  fixture.data.users![0]!.name = 'Synthetic'; fixture.data.api_sessions![0]!.userId = String(id);
  await assert.rejects(auth.authenticate(token), { status: 401 });
});
test('malformed login, bearer tokens and duplicate cookies fail before database access while cookie/CSRF contracts remain', async () => {
  let reads = 0;
  const auth = createSessionService(async () => { reads++; throw new Error('synthetic database must not be read'); });
  for (const input of [null, [], {}, { username: {}, password: 'x' }, { username: 'x', password: '🔒'.repeat(19) },
    { username: 'x', password: 'x', role: 'admin' }]) await assert.rejects(auth.login(input), { status: 400 });
  for (const token of [undefined, '', 'Bearer ' + 'a'.repeat(43), 'b'.repeat(42)]) await assert.rejects(auth.authenticate(token), { status: 401 });
  assert.equal(reads, 0); assert.equal(cookieName(false), '__Host-almina_session');
  assert.deepEqual(cookieOptions(false), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 28800000 });
  assert.equal(readSessionCookie({ cookie: 'almina_session=' + 'a'.repeat(43) }, true), 'a'.repeat(43));
  assert.equal(readSessionCookie({ cookie: 'almina_session=' + 'a'.repeat(43) + '; almina_session=' + 'a'.repeat(43) }, true), undefined);
  verifyBrowserMutation({ headers: { origin: 'https://shop.example.invalid', 'x-csrf-protection': '1' } }, ['https://shop.example.invalid']);
  assert.throws(() => verifyBrowserMutation({ headers: { origin: 'https://shop.example.invalid.evil.invalid', 'x-csrf-protection': '1' } }, ['https://shop.example.invalid']), { status: 403 });
});
test('distributed quota retains historical ModifyResult compatibility and fails closed on malformed counts', async () => {
  for (const result of [{ count: 1 }, { value: { count: 1 } }, null, { count: 0 }, { count: 0.5 }, { count: '1' }, { count: 21 }]) {
    const db = { collection: () => ({ findOneAndUpdate: async () => result }) } as unknown as Db;
    const auth = createSessionService(async () => db);
    if (result && ('value' in result || result.count === 1)) await auth.limitLogin('Synthetic', '192.0.2.1');
    else await assert.rejects(auth.limitLogin('Synthetic', '192.0.2.1'), { status: result?.count === 21 ? 429 : 503 });
  }
});
