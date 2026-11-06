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

test('patched redirect client strips cross-realm custom credential headers across origins',async()=>{
 const {createServer}=await import('node:http');
 const {createRequire}=await import('node:module');
 const {runInNewContext}=await import('node:vm');
 const redirect=createRequire(import.meta.url)('follow-redirects') as {http:{get(options:Record<string,unknown>,callback:(response:import('node:http').IncomingMessage)=>void):import('node:http').ClientRequest}};
 let forwarded:string|undefined;
 const destination=createServer((req,res)=>{forwarded=req.headers['x-custom-token'] as string|undefined;res.end('ok');});
 const source=createServer((_req,res)=>{const address=destination.address() as import('node:net').AddressInfo;res.writeHead(302,{Location:`http://127.0.0.1:${address.port}/`});res.end();});
 try{
  await new Promise<void>(resolve=>destination.listen(0,'127.0.0.1',resolve));
  await new Promise<void>(resolve=>source.listen(0,'127.0.0.1',resolve));
  const address=source.address() as import('node:net').AddressInfo;
  await new Promise<void>((resolve,reject)=>{redirect.http.get({hostname:'127.0.0.1',port:address.port,path:'/',headers:{'X-Custom-Token':'synthetic-test-token'},sensitiveHeaders:runInNewContext('["X-Custom-Token"]')},response=>{response.resume();response.on('end',resolve);response.on('error',reject);}).on('error',reject);});
  assert.equal(forwarded,undefined);
 }finally{
  await Promise.all([new Promise<void>(resolve=>source.close(()=>resolve())),new Promise<void>(resolve=>destination.close(()=>resolve()))]);
 }
});
