import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cloudinarySignature, signedRasterUpload } from '../apps/api/src/modules/media/cloudinary';
const config = { cloudName: 'synthetic', apiKey: '1234', apiSecret: 'synthetic-not-a-secret' };
const publicId = 'almina/products/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa-0';
const response = { public_id: publicId, version: 1, resource_type: 'image', type: 'upload', format: 'webp', width: 500, height: 500, bytes: 100,
  secure_url: `https://res.cloudinary.com/synthetic/image/upload/v1/${publicId}.webp` };
test('signed upload fields are fixed, sorted and bound to secret, with overwrite disabled', async () => {
  assert.equal(cloudinarySignature({ b: '2', a: '1' }, config.apiSecret), createHash('sha256').update('a=1&b=2' + config.apiSecret).digest('hex'));
  let posts = 0;
  const transport: typeof fetch = async (url, options) => {
    assert.match(String(url), /^https:\/\/api\.cloudinary\.com\/v1_1\/synthetic\//); assert.equal(options?.redirect, 'error');
    if (options?.method !== 'POST') return new Response('{}', { status: 404 });
    posts++; const form = options.body as FormData; assert.equal(form.get('overwrite'), 'false'); assert.equal(form.get('allowed_formats'), 'webp');
    assert.equal(form.get('public_id'), publicId); assert.equal(form.has('api_secret'), false);
    return Response.json({ ...response, signature: cloudinarySignature({ public_id: publicId, version: '1' }, config.apiSecret, 'sha1') });
  };
  assert.equal(await signedRasterUpload(config, new Uint8Array([1]), publicId, AbortSignal.timeout(1000), transport), response.secure_url);
  assert.equal(posts, 1);
});
test('upload reconciliation does not repeat existing uploads; hostile provider responses and outages fail closed', async () => {
  let calls = 0;
  const lookup: typeof fetch = async () => { calls++; return Response.json(response); };
  assert.equal(await signedRasterUpload(config, new Uint8Array([1]), publicId, AbortSignal.timeout(1000), lookup), response.secure_url); assert.equal(calls, 1);
  for (const raw of [{ ...response, format: 'svg' }, { ...response, secure_url: 'https://example.invalid/a.webp' }, { ...response, public_id: 'other' }, { ...response, width: 5001 }, { ...response, bytes: 6000000 }]) {
    await assert.rejects(signedRasterUpload(config, new Uint8Array([1]), publicId, AbortSignal.timeout(1000), async () => Response.json(raw)), { status: 503 });
  }
  await assert.rejects(signedRasterUpload(config, new Uint8Array([1]), publicId, AbortSignal.timeout(1000), async () => new Response('{}', { status: 503 })), { status: 503 });
  await assert.rejects(signedRasterUpload(config, new Uint8Array([1]), 'arbitrary/path', AbortSignal.timeout(1000), lookup), { status: 400 });
  const forged: typeof fetch = async (_url, options) => options?.method === 'POST' ? Response.json({ ...response, signature: 'a'.repeat(40) }) : new Response('{}', { status: 404 });
  await assert.rejects(signedRasterUpload(config, new Uint8Array([1]), publicId, AbortSignal.timeout(1000), forged), { status: 503 });
});
