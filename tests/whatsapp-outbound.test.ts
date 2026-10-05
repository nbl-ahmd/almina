import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWhatsappSender, whatsappOutboundInput } from '../apps/api/src/modules/notifications/whatsapp-outbound';
const config = { token: 'synthetic-token', version: 'v99.0', phoneNumberId: '123456789' }; // Synthetic version, not a recommendation.
const text = { kind: 'text' as const, recipient: '+971500000001', name: 'Synthetic', text: 'Synthetic message' };
function response(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }); }
test('WhatsApp validates explicit configuration and message contracts before provider effects', async () => {
  for (const invalid of [{}, { ...config, token: 'header\r\ninjection' }, { ...config, version: '../x' }, { ...config, phoneNumberId: 'https://localhost' }]) {
    assert.throws(() => createWhatsappSender(invalid), { status: 503, message: 'SERVICE_UNAVAILABLE' });
  }
  for (const invalid of [{ recipient: 'x', name: '', text: 'x' }, { recipient: '1', name: '', text: ' ' }, { recipient: '1', name: '', text: 'x', role: 'admin' }]) {
    assert.throws(() => whatsappOutboundInput(invalid, 'text'), { status: 400 });
  }
  for (const link of ['http://localhost/image', 'https://user:pass@example.com/image', 'https://example.com/with space']) {
    assert.throws(() => whatsappOutboundInput({ recipient: '1', template: 'approved', link }, 'template'), { status: 400 });
  }
});
test('WhatsApp uses fixed origin, configured identity, compatible text/template payload and single-attempt acceptance', async () => {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const sender = createWhatsappSender(config, { fetch: async (url, options) => {
    assert.equal(options!.redirect, 'error'); assert.equal((options!.headers as Record<string, string>).Authorization, 'Bearer synthetic-token');
    calls.push({ url: String(url), body: JSON.parse(String(options!.body)) });
    return response({ messaging_product: 'whatsapp', messages: [{ id: 'synthetic-provider-id' }] });
  } });
  assert.deepEqual(await sender(text), { providerId: 'synthetic-provider-id' });
  await sender({ kind: 'template', recipient: '1', template: 'approved', link: 'https://example.com/synthetic.jpeg' });
  assert.equal(calls.length, 2); assert.equal(calls[0]!.url, 'https://graph.facebook.com/v99.0/123456789/messages');
  assert.deepEqual(calls[0]!.body.text, { body: text.text }); assert.equal(calls[0]!.body.preview_url, false);
  assert.deepEqual(calls[1]!.body.template, { name: 'approved', language: { code: 'en_US' }, components: [{ type: 'header', parameters: [{ type: 'image', image: { link: 'https://example.com/synthetic.jpeg' } }] }] });
});
test('WhatsApp rejects outage, redirect, malformed and excessive acceptance without exposing provider errors or retry', async () => {
  for (const body of [() => response({ token: 'secret' }, 429), () => response({ messages: [] }), () => response({ padding: 'x'.repeat(65537) }), () => { throw new Error('provider-secret'); }]) {
    let calls = 0; const sender = createWhatsappSender(config, { fetch: async () => { calls++; return body(); } });
    await assert.rejects(sender(text), { status: 503, message: 'SERVICE_UNAVAILABLE' }); assert.equal(calls, 1);
  }
});
test('WhatsApp deadlines cancel stalled response bodies and retain slots for transports ignoring cancellation', async () => {
  let cancelled = false;
  const sender = createWhatsappSender(config, { deadlineMs: 30, fetch: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'content-type': 'application/json' } }) });
  await assert.rejects(sender(text), { status: 503 }); assert.equal(cancelled, true);
  let calls = 0;
  const stalled = createWhatsappSender(config, { deadlineMs: 30, fetch: async () => { calls++; return new Promise<Response>(() => undefined); } });
  await Promise.all(Array.from({ length: 4 }, () => assert.rejects(stalled(text), { status: 503 })));
  await assert.rejects(stalled(text), { status: 503 }); assert.equal(calls, 4);
  const aborted = new AbortController(); aborted.abort(); await assert.rejects(sender(text, aborted.signal), { status: 503 });
});
