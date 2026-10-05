import assert from 'node:assert/strict';
import { test } from 'node:test';
import { whatsappRetryKey } from '../apps/web/src/lib/admin/whatsapp-retry';
test('private tab receipts survive reload and reordered payloads, bind changed input, and never store plaintext recipient/content', async () => {
  let value: string | null = null;
  const storage = { getItem: () => value, setItem: (_name: string, input: string) => { value = input; } };
  const payload = { recipient: '971500000001', template: 'synthetic_template', link: 'https://example.com/synthetic.jpeg' };
  const key = await whatsappRetryKey('whatsapp/s', payload, storage);
  assert.equal(await whatsappRetryKey('whatsapp/s', { link: payload.link, template: payload.template, recipient: payload.recipient }, storage), key);
  assert.notEqual(await whatsappRetryKey('whatsapp/s', { ...payload, template: 'changed' }, storage), key);
  assert.notEqual(await whatsappRetryKey('whatsapp/text', payload, storage), key);
  for (const text of Object.values(payload)) assert.equal(value!.includes(text), false);
  value = '{'; await assert.rejects(whatsappRetryKey('whatsapp/s', payload, storage), /recovery storage/);
  value = JSON.stringify(Object.fromEntries(Array.from({ length: 100 }, (_, i) => [String(i).padStart(64, '0'), key])));
  await assert.rejects(whatsappRetryKey('whatsapp/s', payload, storage), /recovery storage/);
});
