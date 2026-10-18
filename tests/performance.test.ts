import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogReadPolicy } from '../apps/web/src/lib/catalog/cache-policy';
import { authorizeCatalogRevalidation } from '../apps/web/src/lib/catalog/revalidation';
import { measureCatalogQuery } from '../apps/api/src/modules/catalog/timing';
import { createLogger } from '@almina/config/logger';

test('persistent cache is restricted to category/banner presentation; commerce and visibility reads remain fresh', () => {
  for (const path of ['/api/products', '/api/products/details/PD0001', '/api/products/aaaaaaaaaaaaaaaaaaaaaaaa', '/api/store/status', '/api/orders', '/api/category?filter=x']) {
    assert.deepEqual(catalogReadPolicy(path, true), { cache: 'no-store' });
  }
  assert.deepEqual(catalogReadPolicy('/api/category'), { cache: 'no-store' });
  assert.deepEqual(catalogReadPolicy('/api/category', true), { cache: 'force-cache', next: { revalidate: 60, tags: ['catalog:categories'] } });
  assert.deepEqual(catalogReadPolicy('/api/banners', true), { cache: 'force-cache', next: { revalidate: 60, tags: ['catalog:banners'] } });
});
const environment = { WEB_ORIGIN: 'https://web.example.invalid', API_ORIGIN: 'https://api.example.invalid' };
function request(patch: Record<string, string> = {}, body = '{"kind":"categories"}') {
  return new Request(environment.WEB_ORIGIN + '/api/catalog/revalidate', { method: 'POST', headers: {
    origin: environment.WEB_ORIGIN, 'x-csrf-protection': '1', cookie: '__Host-almina-session=synthetic', 'content-type': 'application/json', ...patch,
  }, body });
}
function identity(role: string): typeof fetch {
  return async (url, options) => {
    assert.equal(String(url), environment.API_ORIGIN + '/api/v1/auth/me');
    assert.equal(options?.cache, 'no-store'); assert.equal(options?.redirect, 'error');
    assert.equal(new Headers(options?.headers).get('cookie'), '__Host-almina-session=synthetic');
    return Response.json({ requestId: '00000000-0000-4000-8000-000000000000', data: {
      id: 'aaaaaaaaaaaaaaaaaaaaaaaa', username: 'synthetic', name: 'Synthetic', role, cities: [],
    } });
  };
}
test('tag purge requires current server admin identity, same origin and CSRF header', async () => {
  assert.equal(await authorizeCatalogRevalidation(request(), environment, identity('admin')), 'catalog:categories');
  assert.equal(await authorizeCatalogRevalidation(request({}, '{"kind":"banners"}'), environment, identity('admin')), 'catalog:banners');
  for (const patch of [{ origin: 'https://attacker.invalid' }, { origin: '' }, { 'x-csrf-protection': '' }]) {
    await assert.rejects(authorizeCatalogRevalidation(request(patch), environment, identity('admin')), { status: 403 });
  }
  await assert.rejects(authorizeCatalogRevalidation(request({ cookie: '' }), environment, identity('admin')), { status: 401 });
  await assert.rejects(authorizeCatalogRevalidation(request(), environment, identity('user')), { status: 403 });
  await assert.rejects(authorizeCatalogRevalidation(request(), environment, async () => new Response(null, { status: 401 })), { status: 401 });
  await assert.rejects(authorizeCatalogRevalidation(request(), environment, async () => { throw new Error('Upstream unavailable'); }), { status: 503 });
  await assert.rejects(authorizeCatalogRevalidation(request(), environment, async () => Response.json({ role: 'admin' })), { status: 503 });
});
test('cache purge rejects arbitrary tags, oversized streamed bodies and caller-supplied roles', async () => {
  for (const body of ['{"kind":"products"}', '{"kind":"categories","role":"admin"}', 'not-json']) {
    await assert.rejects(authorizeCatalogRevalidation(request({}, body), environment, identity('admin')), { status: 400 });
  }
  await assert.rejects(authorizeCatalogRevalidation(request({}, ' '.repeat(1025)), environment, identity('admin')), { status: 413 });
  await assert.rejects(authorizeCatalogRevalidation(request({ 'content-type': 'text/plain' }), environment, identity('admin')), { status: 415 });
});
test('query timing preserves success/failure and emits only bounded operational fields', async () => {
  const observations: Parameters<NonNullable<Parameters<typeof measureCatalogQuery>[2]>>[0][] = [];
  assert.equal(await measureCatalogQuery('products', async () => 42, value => observations.push(value)), 42);
  const failure = new Error('Synthetic failure');
  await assert.rejects(measureCatalogQuery('category', async () => { throw failure; }, value => observations.push(value)), error => error === failure);
  assert.deepEqual(observations.map(value => value.success), [true, false]);
  assert.ok(observations.every(value => value.durationMs >= 0));
  assert.equal(await measureCatalogQuery('products', async () => 42, () => { throw failure; }), 42);
  const logs: string[] = [];
  const logger = createLogger({ service: 'api', environment: 'development', write: line => logs.push(line) });
  logger.log('info', 'catalog_query', { operation: 'products', durationMs: 1.25 });
  logger.log('warn', 'catalog_query', { operation: 'private@example.invalid', durationMs: 0.5 });
  assert.equal(JSON.parse(logs[0]!).operation, 'products');
  assert.equal('operation' in JSON.parse(logs[1]!), false);
});

test('Cloudinary product delivery preserves account validation and creates width-specific CDN URLs', async () => {
  const {cloudinaryDelivery}=await import('../apps/web/src/lib/catalog/image-delivery');
  const src='https://res.cloudinary.com/example/image/upload/v123/products/one.webp';
  assert.equal(cloudinaryDelivery(src,'example',320),'https://res.cloudinary.com/example/image/upload/c_limit,w_320,q_auto,f_auto/v123/products/one.webp');
  assert.equal(cloudinaryDelivery(src,'example',640)?.includes('w_640'),true);
  for(const value of [src.replace('/example/','/other/'),src+'?token=private',src.replace('https:','http:'),'/product-placeholder.svg','https://user:pass@res.cloudinary.com/example/image/upload/a.webp'])assert.equal(cloudinaryDelivery(value,'example',640),null);
  for(const width of [0,-1,1.5,3841,Infinity])assert.equal(cloudinaryDelivery(src,'example',width),null);
  assert.equal(cloudinaryDelivery(src,undefined,640),null);
});
