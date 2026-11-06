import assert from 'node:assert/strict';
import {test} from 'node:test';
import {isDataRequest,dataContentSecurityPolicy,publicSitemapCache} from '../apps/web/src/lib/security/request-work';

test('only API and exact public metadata routes bypass HTML nonce generation',()=>{
 for(const path of ['/api','/api/checkout/quote','/api/admin/events','/robots.txt','/sitemap.xml','/sitemaps/products/first.xml'])assert.equal(isDataRequest(path),true,path);
 for(const path of ['/','/products','/account','/checkout','/admin','/apiary','/sitemap.xml/extra','/sitemaps/products/first.xml/extra','/sitemaps/unknown/first.xml'])assert.equal(isDataRequest(path),false,path);
 assert.match(dataContentSecurityPolicy,/default-src 'none'/);
 assert.match(dataContentSecurityPolicy,/frame-ancestors 'none'/);
 assert.match(dataContentSecurityPolicy,/base-uri 'none'/);
 assert.ok(!dataContentSecurityPolicy.includes('unsafe-inline'));
});
test('public sitemap caching is bounded without stale-while-revalidate',()=>{
 assert.equal(publicSitemapCache,'public, max-age=0, s-maxage=300');
});

test('unchanged order stream reconnect does not force an admin rerender; real changes and revocation still invalidate',async()=>{
 const {orderEventStream}=await import('../apps/web/src/lib/admin/order-stream');
 async function read(lastEventId?:string,values=['private state A']){
  const samples=[...values.map(signature=>({state:'ready' as const,signature})),{state:'revoked' as const}];
  const stream=orderEventStream({signal:new AbortController().signal,intervalMs:1,lastEventId,sample:async()=>samples.shift()!});
  let output='';for await(const chunk of stream)output+=new TextDecoder().decode(chunk);return output;
 }
 const initial=await read();assert.match(initial,/event: reconcile/);assert.ok(!initial.includes('private state'));
 const id=/id: ([a-f0-9]{64})/.exec(initial)![1];
 const same=await read(id);assert.ok(!same.includes('event: reconcile'));assert.ok(!same.includes('event: orders'));assert.match(same,/event: revoked/);
 const changed=await read(id,['private state B']);assert.match(changed,/event: orders/);assert.ok(!changed.includes('private state'));
 assert.match(await read('bad\nforged'),/event: reconcile/);
});
