import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { MongoClient,ObjectId,type Db,type Document } from 'mongodb';
import {searchQuerySchema,searchEventSchema} from '@almina/contracts/search';
import {AtlasSearchProvider} from '../apps/api/src/modules/search/atlas-provider';
import {readSearchEnvironment} from '../apps/api/src/modules/search/config';
import {semanticHash,semanticText} from '../apps/api/src/modules/search/enrichment';
import {queryHashInput} from '../apps/api/src/modules/search/query-normalizer';
import {saveSearchContext,recordSearchEvent,verifiedSearchAttribution,searchAnalytics} from '../apps/api/src/modules/search/analytics';
import {createCommerceService} from '../apps/api/src/modules/orders/commerce';
import {SearchService} from '../apps/api/src/modules/search/search-service';
import {searchConfiguration} from '../apps/api/src/modules/search/runtime';
import {seedSynonyms} from '../apps/api/src/modules/search/synonyms';
import {createApp} from '../apps/api/src/app';
import {createLogger} from '@almina/config/logger';
import {categoryId,searchProducts} from './fixtures/search/catalog';
const uri=process.env.COMMERCE_TEST_URI;
assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1','Disposable database required');
/** Simulate only mongot retrieval; current-document policy and commerce use a real disposable MongoDB replica set. */
function mongotFixture(db:Db,ids:ObjectId[],vector=false):Db{return new Proxy(db,{get(target,key){if(key==='collection')return (name:string)=>{const collection=target.collection(name);if(name!=='products')return collection;return new Proxy(collection,{get(c,method){if(method==='aggregate')return (pipeline:Document[],options:Document)=>pipeline[0]?.$search||pipeline[0]?.$vectorSearch?{toArray:async()=>ids.map(_id=>({_id,score:vector?0.95:10}))}:c.aggregate(pipeline,options);const member=Reflect.get(c,method);return typeof member==='function'?member.bind(c):member;}});};const member=Reflect.get(target,key);return typeof member==='function'?member.bind(target):member;}});}
test('search current-document policy, attribution, commerce and RBAC on disposable MongoDB',{skip:!uri},async t=>{
 assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
 const client=await new MongoClient(uri!).connect(),db=client.db('search_test_'+randomUUID().replaceAll('-',''));
 const priorAnalytics=process.env.SEARCH_ANALYTICS_ENABLED;process.env.SEARCH_ANALYTICS_ENABLED='true';
 const env=readSearchEnvironment({SEARCH_PROVIDER:'atlas',SEARCH_SEMANTIC_ENABLED:'true',SEARCH_EMBEDDING_DIMENSIONS:'128'});
 try{
 await db.collection('categories').insertOne({_id:categoryId,name:'Personal Care'});await db.collection('products').insertMany(searchProducts);
 const id=searchProducts[0]!._id as ObjectId;
 const provider=()=>new AtlasSearchProvider(mongotFixture(db,searchProducts.map(p=>p._id)),env);
 const input=searchQuerySchema.parse({q:'cream'}),request={input,text:'cream',intent:{concerns:[]},expansions:[]};
 await t.test('all retrievals recheck stale publication/audience/category state',async()=>{
 for(const patch of [{published:false},{disabled:true},{active:false},{archivedAt:new Date()},{audience:'wholesale'},{audience:'invalid'}]){
 await db.collection('products').updateOne({_id:id},{$set:patch});const results=await provider().search(request);assert.ok(!results.some(c=>String(c.product._id)===String(id)));
 await db.collection('products').replaceOne({_id:id},searchProducts[0]!);
 }
 await db.collection('categories').updateOne({_id:categoryId},{$set:{disabled:true}});assert.deepEqual(await provider().search(request),[]);assert.deepEqual((await provider().suggest(input)).products,[]);await db.collection('categories').updateOne({_id:categoryId},{$unset:{disabled:1}});
 });
 await t.test('cached navigation metadata cannot expose a newly disabled category',async()=>{
 const first=await searchConfiguration(db);assert.ok(first.navigation?.some(n=>n.categoryId===String(categoryId)));
 await db.collection('categories').updateOne({_id:categoryId},{$set:{disabled:true}});assert.ok(!(await searchConfiguration(db)).navigation?.some(n=>n.categoryId===String(categoryId)));
 await db.collection('categories').updateOne({_id:categoryId},{$unset:{disabled:1}});
 });
 await t.test('effective current sale price and availability override stale index results',async()=>{
 await db.collection('products').updateOne({_id:id},{$set:{price:100,sale:true,salePrice:20,stock:0}});
 const filtered=await provider().hydrate([String(id)],{...input,maxPrice:25},{concerns:[]});assert.equal(filtered.length,1);assert.equal(filtered[0]!.salePrice,20);
 assert.equal((await provider().hydrate([String(id)],{...input,inStock:true},{concerns:[]})).length,0);
 await db.collection('products').updateOne({_id:id},{$set:{salePrice:40}});assert.equal((await provider().hydrate([String(id)],{...input,maxPrice:25},{concerns:[]})).length,0);
 await db.collection('products').replaceOne({_id:id},searchProducts[0]!);
 });
 await t.test('semantic retrieval rejects clinical, stale model/text, hidden and wrong-audience candidates',async()=>{
 const q='something for dry skin',queryHash=semanticHash(queryHashInput(q,'en'));await db.collection('search_query_vectors').insertOne({queryHash,vector:Array(128).fill(0.1),model:env.EMBEDDING_MODEL,version:1,expiresAt:new Date(Date.now()+100000)});
 for(const row of searchProducts)await db.collection('products').updateOne({_id:row._id},{$set:{searchEmbedding:{model:env.EMBEDDING_MODEL,version:1,semanticTextHash:semanticHash(semanticText(row,'Personal Care'))}}});
 const current=(intent={concerns:[] as string[]})=>new AtlasSearchProvider(mongotFixture(db,[id],true),env).semanticSearch({...request,input:searchQuerySchema.parse({q}),text:q,intent});assert.equal((await current()).length,1);assert.equal((await current({concerns:['sensitive skin']})).length,0);
 for(const patch of [{searchEmbedding:{model:'different-model',version:1,semanticTextHash:semanticHash(semanticText(searchProducts[0]!,'Personal Care'))}},{productType:'otc'},{contentReviewed:false},{published:false},{audience:'wholesale'},{name:'Changed after embedding'}]){await db.collection('products').updateOne({_id:id},{$set:patch});assert.equal((await current()).length,0);await db.collection('products').replaceOne({_id:id},{...searchProducts[0]!,searchEmbedding:{model:env.EMBEDDING_MODEL,version:1,semanticTextHash:semanticHash(semanticText(searchProducts[0]!,'Personal Care'))}});}
 });
 let searchId='';
 await t.test('consented events validate membership and positions, deduplicate and reject query tampering',async()=>{
 const service=new SearchService(provider(),async()=>({synonyms:seedSynonyms,rules:[],brands:['CeraVe']}));const {response}=await service.search(input);searchId=response.searchId;
 await saveSearchContext(db,response);
 assert.equal((await db.collection('search_sessions').findOne({} as never))!.normalizedQuery,undefined);
 const first=response.products[0]!;const event=searchEventSchema.parse({searchId,event:'search_result_clicked',items:[{productId:String(first._id),position:1}]});
 await recordSearchEvent(db,event);await recordSearchEvent(db,event);assert.equal(await db.collection('search_events').countDocuments({event:'search_result_clicked'}),1);
 await assert.rejects(recordSearchEvent(db,{...event,items:[{productId:String(first._id),position:300}]}),{code:'INVALID_REQUEST'});
 await assert.rejects(recordSearchEvent(db,{...event,query:'different query'}),{code:'INVALID_REQUEST'});
 await recordSearchEvent(db,{searchId,event:'search_performed',items:[],query:'cream',locale:'en'});assert.equal((await searchAnalytics(db)).queries[0]!.query,'cream');
 assert.equal((await verifiedSearchAttribution(db,[{searchId,productId:String(first._id),position:1}],[String(first._id)])).length,1);
 });
 await t.test('server-confirmed purchase attribution is atomic, replay-safe and cannot influence totals',async()=>{
 await db.collection('stores').insertOne({status:'open'});await db.collection('commerce_counters').insertOne({_id:'orders' as never,ready:true,value:900});
 await db.collection('commerce_policies').insertOne({_id:'checkout' as never,active:true,version:'search-test',currency:'AED',vatMode:'inclusive',vatRateBps:500,minimumOrderMinor:0,cancellationRestocks:true,delivery:[{emirate:'Ras Al Khaimah',feeMinor:0}]});
 const ctx=await db.collection('search_sessions').findOne({_id:searchId as never});const first=ctx!.items[0];
 const checkout={idempotencyKey:randomUUID(),customer:{name:'Synthetic Customer',email:'synthetic@example.invalid',mobile:'0500000000',emirate:'Ras Al Khaimah',city:'Ras Al Khaimah',address:'Synthetic test',payment:'cash'},items:[{productId:first.productId,quantity:1}],searchAttribution:[{searchId,...first}]};
 const commerce=createCommerceService(async()=>db),order=await commerce.checkout(checkout);assert.equal(order.replayed,false);
 const replay=await commerce.checkout(checkout);assert.equal(replay.replayed,true);assert.equal(replay.id,order.id);
 assert.equal(await db.collection('search_events').countDocuments({event:'search_purchase'}),1);
 const purchase=await db.collection('search_events').findOne({event:'search_purchase'});assert.equal(purchase!.revenueMinor,order.totals.lines[0]!.lineTotalMinor);assert.equal(purchase!.orderId,undefined);assert.equal(purchase!.customer,undefined);
 const modified=await commerce.checkout({...checkout,searchAttribution:[]});assert.equal(modified.id,order.id);assert.equal(await db.collection('search_events').countDocuments({event:'search_purchase'}),1);
 await assert.rejects(commerce.checkout({...checkout,idempotencyKey:randomUUID(),items:[{productId:first.productId,quantity:999}]}),{code:'INSUFFICIENT_STOCK'});assert.equal(await db.collection('search_events').countDocuments({event:'search_purchase'}),1);
 });
 await t.test('admin routes enforce admin RBAC and CSRF; public APIs reject operator injection',async()=>{
 const app=createApp({database:{mode:'enabled',checkReadiness:async()=>true},getDb:async()=>db,logger:createLogger({service:'api',environment:'development',write:()=>{}}),webOrigin:'http://localhost:3000',development:true});
 const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${(server.address() as {port:number}).port}/api/v1`;
 try{assert.equal((await fetch(base+'/admin/search')).status,401);
 const userId=new ObjectId(),token='a'.repeat(43),password='synthetic-password';await db.collection('users').insertOne({_id:userId,username:'search-staff',name:'Synthetic staff',role:'user',cities:[],password});
 const hash=(value:string)=>createHash('sha256').update(value).digest('hex');await db.collection('api_sessions').insertOne({userId,tokenHash:hash(token),scheme:'cookie-v2',passwordFingerprint:hash(password),expiresAt:new Date(Date.now()+100000)});
 assert.equal((await fetch(base+'/admin/search',{headers:{cookie:'almina_session='+token}})).status,403);
 await db.collection('users').updateOne({_id:userId},{$set:{role:'admin'}});
 assert.equal((await fetch(base+'/admin/search',{headers:{cookie:'almina_session='+token}})).status,200);
 const adminHeaders={cookie:'almina_session='+token,'Content-Type':'application/json',origin:'http://localhost:3000','X-CSRF-Protection':'1'};
 const priceBefore=(await db.collection('products').findOne({_id:id}))!.price;
 assert.equal((await fetch(base+'/admin/search/enrichment',{method:'POST',headers:adminHeaders,body:JSON.stringify({productId:String(id),provenance:'curated',reviewed:true,version:1,price:0})})).status,400);
 assert.equal((await db.collection('products').findOne({_id:id}))!.price,priceBefore);
 const synonym={key:'synthetic-curation',type:'one_way',inputs:['synthetic shopper phrase'],outputs:['cream'],enabled:true,locale:'en'};
 assert.equal((await fetch(base+'/admin/search/synonyms',{method:'POST',headers:adminHeaders,body:JSON.stringify(synonym)})).status,200);
 assert.equal((await db.collection('search_synonyms_atlas').findOne({_id:synonym.key as never}))!.mappingType,'explicit');
 assert.equal((await fetch(base+'/admin/search/synonyms',{method:'POST',headers:adminHeaders,body:JSON.stringify({...synonym,enabled:false})})).status,200);
 assert.equal(await db.collection('search_synonyms_atlas').countDocuments({_id:synonym.key as never}),0);
 assert.equal((await fetch(base+'/admin/search/query',{method:'POST',headers:adminHeaders,body:JSON.stringify({q:'gentle everyday cleanser',locale:'en'})})).status,200);
 assert.equal((await db.collection('search_query_queue').findOne({query:'gentle everyday cleanser'}))!.state,'pending');

 assert.equal((await fetch(base+'/admin/search/rules',{method:'POST',headers:{cookie:'almina_session='+token,'Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await fetch(base+'/search?q[$ne]=x')).status,400);assert.equal((await fetch(base+'/search?q=x&page=1000')).status,400);
 assert.equal((await fetch(base+'/search/events',{method:'POST',headers:{'Content-Type':'application/json',origin:'http://localhost:3000','X-CSRF-Protection':'1'},body:'{}'})).status,403);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
 }finally{if(priorAnalytics===undefined)delete process.env.SEARCH_ANALYTICS_ENABLED;else process.env.SEARCH_ANALYTICS_ENABLED=priorAnalytics;await db.dropDatabase();await client.close();}
});
