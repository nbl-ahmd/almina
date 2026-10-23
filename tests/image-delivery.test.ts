import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { cloudinaryDelivery, mediaOrigin, mediaRequestHeaders, mediaTarget, mediaWidths, publicImage } from '../apps/web/src/lib/catalog/image-delivery';
import { mediaResponse } from '../apps/web/src/lib/catalog/media-response';
import { proxy } from '../apps/web/src/proxy';

const asset = 'v1792264725/almina/products/94af433b-e742-4855-896a-7eb32107bc4c-0.webp';
const source = `https://res.cloudinary.com/example/image/upload/${asset}`;

test('versioned Cloudinary uploads produce branded, finite responsive image variants', () => {
  for (const width of mediaWidths) {
    const local = `/media/w${width}/${asset}`;
    assert.equal(cloudinaryDelivery(source, 'example', width), local);
    assert.equal(cloudinaryDelivery(`${mediaOrigin}/media/w1200/${asset}`, 'example', width), mediaOrigin + local);
    assert.equal(cloudinaryDelivery(`/media/w1200/${asset}`, 'example', width), local);
    assert.equal(mediaTarget(local, 'example')?.href, `https://res.cloudinary.com/example/image/upload/c_limit,w_${width}/q_auto/f_webp/${asset}`);
  }
  assert.equal(publicImage(source, 'example', true), `${mediaOrigin}/media/w1200/${asset}`);
  assert.equal(publicImage(source, 'example', false), source);
  // Unsupported historical formats/IDs retain the established allowlisted optimizer path.
  const unversioned = 'https://res.cloudinary.com/example/image/upload/older.webp';
  assert.equal(publicImage(unversioned, 'example', true), unversioned);
  assert.equal(publicImage(source.replace('v1792264725', 'v1792264726'), 'example', true)?.includes('v1792264726'), true);
});

test('image delivery rejects other accounts, URLs, encoded traversal and arbitrary transformations', () => {
  for (const value of [source.replace('/example/', '/other/'), source + '?token=private', source.replace('https:', 'http:'),
    source.replace('/upload/', '/upload/c_fill/'), '/product-placeholder.svg', mediaOrigin + '/media/w640/' + asset + '?url=other',
    'https://other.invalid/media/w640/' + asset, mediaOrigin + '.attacker.invalid/media/w640/' + asset,
    'https://user:pass@cdn.alminapharmacy.com/media/w640/' + asset, '/media/w640/' + asset.replace('/products/', '/%2fproducts/'),
    '/media/w640/' + asset.replace('/products/', '/../products/'), '/media/w640/' + asset.replace('.webp', '.svg')]) {
    assert.equal(cloudinaryDelivery(value, 'example', 640), null, value);
  }
  for (const width of [0, -1, 1.5, 641, 3841, Infinity]) assert.equal(cloudinaryDelivery(source, 'example', width), null);
  for (const path of ['/media/w641/' + asset, '/media/w0640/' + asset, '/media/w640/' + asset + '/../../private.webp', '/media/w640/' + asset + '?url=other']) assert.equal(mediaTarget(path, 'example'), null);
  assert.equal(mediaTarget('/media/w640/' + asset, undefined), null);
  assert.equal(mediaTarget('/media/w640/' + asset, 'cloud/other'), null);
  assert.deepEqual([...mediaRequestHeaders()], [['accept', 'image/webp']]);
});

test('public media routes avoid HTML private caching and confine the CDN hostname', () => {
  const previous = { ...process.env };
  Object.assign(process.env, { APP_ENV: 'development', WEB_ORIGIN: 'http://127.0.0.1:3000', CLOUDINARY_CLOUD_NAME: 'example' });
  try {
    const path = `/media/w640/${asset}`;
    const response = proxy(new NextRequest(mediaOrigin + path, { headers: { cookie: 'synthetic=session', authorization: 'Bearer synthetic', 'x-private-header': 'synthetic' } }));
    assert.equal(response.headers.get('x-middleware-next'), '1');
    assert.equal(response.headers.get('cache-control'), null);
    assert.equal(proxy(new NextRequest(mediaOrigin + path, { method: 'HEAD' })).status, 200);
    assert.equal(proxy(new NextRequest(mediaOrigin + path, { method: 'POST' })).status, 405);
    for (const suffix of ['/admin', '/account', '/', path + '?url=https://other.invalid', '/media/w641/' + asset]) {
      const rejected = proxy(new NextRequest(mediaOrigin + suffix));
      assert.equal(rejected.status, 404); assert.equal(rejected.headers.get('cache-control'), 'no-store');
    }
    assert.equal(proxy(new NextRequest(mediaOrigin + '/cdn/categories/legacy.webp')).headers.get('x-middleware-next'), '1');
    assert.equal(proxy(new NextRequest(mediaOrigin + '/robots.txt')).headers.get('content-type'), 'text/plain');
  } finally { process.env = previous; }
});


test('only successful public raster responses receive immutable CDN caching; credentials stay local', async () => {
  let calls = 0;
  const request = new Request(`${mediaOrigin}/media/w640/${asset}`, { headers: { cookie: 'synthetic=session', authorization: 'Bearer synthetic' } });
  const transport: typeof fetch = async (input, init) => {
    calls++;
    assert.equal(String(input), mediaTarget(new URL(request.url).pathname, 'example')?.href);
    assert.deepEqual([...new Headers(init?.headers)], [['accept', 'image/webp']]);
    assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit');
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private', 'Set-Cookie': 'synthetic=private' } });
  };
  const response = await mediaResponse(request, 'example', transport);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.equal(response.headers.get('vercel-cdn-cache-control'), 'public, s-maxage=31536000');
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
  const head = await mediaResponse(new Request(request.url, { method: 'HEAD' }), 'example', transport);
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const upstream of [new Response('missing', { status: 404 }), new Response('failed', { status: 500 }),
    new Response('<html/>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('large', { headers: { 'Content-Type': 'image/webp', 'Content-Length': '999999999' } }),
    new Response(new Uint8Array(5 * 1024 * 1024 + 1), { headers: { 'Content-Type': 'image/webp' } })]) {
    const error = await mediaResponse(request, 'example', async () => upstream);
    assert.ok([404, 502].includes(error.status)); assert.equal(error.headers.get('cache-control'), 'no-store');
    assert.equal(error.headers.get('vercel-cdn-cache-control'), null);
  }
  assert.equal((await mediaResponse(request, 'example', async () => { throw new Error('synthetic timeout'); })).status, 502);
  assert.equal((await mediaResponse(new Request(request.url + '?url=other'), 'example', transport)).status, 404);
  assert.equal(calls, 2);
});
