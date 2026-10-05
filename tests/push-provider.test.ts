import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createECDH, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { createPushSender, pushSubscription, PushFailure, type PushRequestFactory } from '../apps/api/src/modules/notifications/push';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const sdk = require('web-push') as { generateRequestDetails: PushRequestFactory };
const curve = createECDH('prime256v1'); curve.generateKeys();
const config = { subject: 'mailto:synthetic@example.invalid', publicKey: curve.getPublicKey().toString('base64url'), privateKey: curve.getPrivateKey().toString('base64url') };
const subscription = { endpoint: 'https://fcm.googleapis.com/synthetic', keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
test('push validates subscription destinations, elliptic keys and matching server VAPID configuration', () => {
  for (const endpoint of ['http://localhost/private', 'https://fcm.googleapis.com.evil.invalid', 'https://user@fcm.googleapis.com/x', 'https://fcm.googleapis.com/x#fragment']) assert.throws(() => pushSubscription({ ...subscription, endpoint }), { status: 400 });
  for (const keys of [{ ...subscription.keys, p256dh: 'a'.repeat(87) }, { ...subscription.keys, auth: 'b'.repeat(22) }]) assert.throws(() => pushSubscription({ ...subscription, keys }), { status: 400 });
  for (const invalid of [{}, { ...config, subject: 'https://localhost' }, { ...config, privateKey: randomBytes(32).toString('base64url') }]) assert.throws(() => createPushSender(invalid, sdk.generateRequestDetails), { status: 503 });
  assert.deepEqual(pushSubscription({ ...subscription, expirationTime: null }), subscription);
});
test('real Web Push SDK signs a generic no-payload POST with fixed TTL/topic and no adapter retry', async () => {
  let calls = 0;
  const sender = createPushSender(config, sdk.generateRequestDetails, { fetch: async (url, options) => {
    calls++; assert.equal(String(url), subscription.endpoint); assert.equal(options!.redirect, 'error'); assert.equal(options!.method, 'POST'); assert.equal(options!.body, undefined);
    const headers = options!.headers as Record<string, string>;
    assert.equal(headers.TTL, '600'); assert.equal(headers.Topic, 'almina-orders'); assert.match(headers.Authorization!, /^vapid /);
    return new Response(null, { status: 201 });
  } });
  await sender(subscription); assert.equal(calls, 1);
});
test('push classifies provider rejection separately from uncertain network outcomes without exposing details', async () => {
  for (const [status, kind] of [[404, 'expired'], [410, 'expired'], [429, 'retryable'], [503, 'retryable'], [400, 'invalid'], [302, 'invalid']] as const) {
    let calls = 0; const sender = createPushSender(config, sdk.generateRequestDetails, { fetch: async () => { calls++; return new Response('private-provider-details', { status }); } });
    await assert.rejects(sender(subscription), { kind, message: 'Push delivery unavailable' }); assert.equal(calls, 1);
  }
  await assert.rejects(createPushSender(config, sdk.generateRequestDetails, { fetch: async () => { throw new Error('private'); } })(subscription), { kind: 'uncertain' });
});
test('push deadlines drain bounded callers and retain concurrency slots when transport ignores cancellation', async () => {
  let calls = 0;
  const sender = createPushSender(config, sdk.generateRequestDetails, { deadlineMs: 15, fetch: async () => { calls++; return new Promise<Response>(() => {}); } });
  await Promise.all(Array.from({ length: 4 }, () => assert.rejects(sender(subscription), { kind: 'uncertain' })));
  await assert.rejects(sender(subscription), { kind: 'uncertain' }); assert.equal(calls, 4);
  const abort = new AbortController(); abort.abort(); await assert.rejects(sender(subscription, abort.signal), PushFailure);
  const { startStaffPush } = require('./integrations/push.cjs');
  let reads = 0; assert.equal(await startStaffPush(() => { reads++; throw new Error('No DB'); }, {}), undefined); assert.equal(reads, 0);
  await assert.rejects(startStaffPush(() => { reads++; throw new Error('No DB'); }, { ADMIN_PUSH_ENABLED: 'yes' })); assert.equal(reads, 0);
});
