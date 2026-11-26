import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isProductFamilyConflict, catalogMutationTags, readAdminBody, GatewayBodyTooLarge } from '../apps/web/src/lib/admin/gateway-policy';
import { adminBodyLimit } from '../apps/web/src/lib/admin/upload-limits';
import { orderLinePresentation } from '../apps/web/src/lib/admin/order-lines';

test('oversized declared uploads are refused without reading and chunked bodies are cancelled at the gateway limit', async () => {
  await assert.rejects(readAdminBody(new Request('http://local.invalid', { method: 'POST', headers: { 'content-length': String(adminBodyLimit + 1) } })), GatewayBodyTooLarge);
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(adminBodyLimit)); controller.enqueue(new Uint8Array(1)); },
    cancel() { cancelled = true; },
  });
  const request = new Request('http://local.invalid', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  await assert.rejects(readAdminBody(request), GatewayBodyTooLarge);
  assert.equal(cancelled, true);
  assert.equal((await readAdminBody(new Request('http://local.invalid', { method: 'POST', body: 'small input' })))?.toString(), 'small input');
});
test('only reviewed successful mutation destinations affect presentation cache tags', () => {
  const id = 'a'.repeat(24);
  for (const path of ['category', `category/${id}`, `category/disable/${id}`, 'recovery/commit', 'batch']) {
    assert.deepEqual(catalogMutationTags('POST', path), ['catalog:categories', 'catalog:products']);
  }
  assert.deepEqual(catalogMutationTags('DELETE', `banners/${id}`), ['catalog:banners']);
  for (const path of ['products', `products/${id}`, `products/publish/${id}`]) assert.deepEqual(catalogMutationTags('PUT', path), ['catalog:products']);
  for (const path of ['orders', 'auth/login', 'products/../orders', 'category/../orders', 'banners/invalid']) assert.deepEqual(catalogMutationTags('PUT', path), []);
  assert.deepEqual(catalogMutationTags('GET', 'category'), []);
});
test('sale order presentation uses its recorded charged unit price and preserves unknown historical totals', () => {
  const line = { quantity: 2, _id: { price: 25, sale: true, salePrice: 20 }, lineTotalMinor: 4000 };
  const shown = orderLinePresentation(line, true);
  assert.equal(shown.displayedUnitPrice, '20.00'); assert.equal(shown.recordedLineTotal, '40.00');
  assert.equal(line._id.price, 25); assert.equal(line.lineTotalMinor, 4000);
  assert.equal(orderLinePresentation(line, false).recordedLineTotal, null);
  assert.equal(orderLinePresentation({ _id: { price: null } }, false).displayedUnitPrice, null);
});

test('family error forwarding is scoped to reviewed product writes and never accepts upstream text',()=>{
  const body={code:'PRODUCT_FAMILY_CONFLICT',message:'Untrusted upstream detail'};
  assert.equal(isProductFamilyConflict('products','POST',409,body),true);
  assert.equal(isProductFamilyConflict('products/'+ 'a'.repeat(24),'PUT',409,body),true);
  for(const path of ['orders','auth/login','products/invalid','products/publish/'+ 'a'.repeat(24)]) assert.equal(isProductFamilyConflict(path,'PUT',409,body),false);
  assert.equal(isProductFamilyConflict('products','GET',409,body),false);
  assert.equal(isProductFamilyConflict('products','PUT',500,body),false);
  for(const value of [null,'PRODUCT_FAMILY_CONFLICT',{error:'PRODUCT_FAMILY_CONFLICT'},{code:'INTERNAL_ERROR'}]) assert.equal(isProductFamilyConflict('products','PUT',409,value),false);
});
