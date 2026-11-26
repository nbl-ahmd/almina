import { hash } from 'bcryptjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash,randomUUID } from 'node:crypto';
import { MongoClient,ObjectId,type Document } from 'mongodb';
import { createServer,request } from 'node:http';
import { growthPageSchema } from '@almina/contracts';
import { saveGrowthPage,growthPage,growthPages,savePharmacyProfile,pharmacyProfile } from '../apps/api/src/modules/growth/repository';
import { customerOrderDtoSchema } from '@almina/contracts';
import { requestEmailCode,verifyEmailCode,customerIdentity,customerLogout,customerOrders,customerAddresses,updateCustomerAddresses } from '../apps/api/src/modules/growth/customers';
import { indexSearchBatch,suggestProducts } from '../apps/api/src/modules/growth/search';
import { createApp } from '../apps/api/src/app';
import { createLogger } from '@almina/config/logger';
import { growthMetrics } from '../apps/api/src/modules/growth/metrics';
import { saveRetentionPolicy } from '../apps/api/src/modules/growth/retention';
import { growthProductOptions,growthCategoryOptions } from '../apps/api/src/modules/growth/selectors';
import { branchDirectory,saveBranchDirectory,readServiceability,saveServiceability,assertServiceable } from '../apps/api/src/modules/growth/branches';
const uri=process.env.COMMERCE_TEST_URI;
assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1','Disposable database required');
test('growth content, authentication and search on disposable replica set',{skip:!uri},async t=>{assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);const client=await new MongoClient(uri!).connect(),db=client.db('growth_test_'+randomUUID().replaceAll('-',''));const actor=String(new ObjectId()),secret=process.env.CUSTOMER_AUTH_SECRET;process.env.CUSTOMER_AUTH_SECRET='synthetic-only-test-secret-at-least-32-characters';try{
 await db.collection('customers').createIndex({emailHash:1},{unique:true});
 await t.test('drafts stay private and stale editors cannot overwrite changes',async()=>{const draft=growthPageSchema.parse({kind:'campaign',slug:'summer',title:'Summer care',description:'Current range',body:'Useful content'});const first=await saveGrowthPage(db,draft,actor);await assert.rejects(growthPage(db,'campaign','summer','en'),{code:'NOT_FOUND'});const edited=await saveGrowthPage(db,{...first,published:true},actor);await assert.rejects(saveGrowthPage(db,{...first,title:'Stale'},actor),{code:'IDEMPOTENCY_CONFLICT'});assert.equal((await growthPage(db,'campaign','summer','en')).revision,edited.revision);assert.equal((await growthPages(db)).items.length,1);});
 await t.test('unverified profile is withheld and stale profile edit is rejected',async()=>{const value=await savePharmacyProfile(db,{address:'Synthetic address',revision:0},actor);assert.equal((await pharmacyProfile(db)).address,'');await assert.rejects(savePharmacyProfile(db,{...value,verified:true},actor),{code:'INVALID_REQUEST'});});
 await t.test('email codes expire, limit attempts and cannot create two sessions on replay',async()=>{let code='';const challenge=await requestEmailCode(db,{email:'shopper@example.invalid'},async(_email,value)=>{code=value;});await assert.rejects(verifyEmailCode(db,{...challenge,code:'000000'}),{code:'UNAUTHORIZED'});const results=await Promise.allSettled([verifyEmailCode(db,{...challenge,code}),verifyEmailCode(db,{...challenge,code})]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);const result=results.find(result=>result.status==='fulfilled')!;if(result.status!=='fulfilled')throw new Error('Missing login');const user=await customerIdentity(db,result.value.token);assert.equal(user.email,'shopper@example.invalid');await assert.rejects(customerIdentity(db,'invalid'),{code:'UNAUTHORIZED'});await customerLogout(db,result.value.token);await assert.rejects(customerIdentity(db,result.value.token),{code:'UNAUTHORIZED'});assert.equal(await db.collection('customer_auth_codes').countDocuments(),0);});
 await t.test('verified account reads only matching email orders and no addresses',async()=>{await db.collection('orders').insertMany([{schemaVersion:2,orderId:'OD1',customer:{email:'A@Example.INVALID',address:'private'},status:'confirmed',totals:{totalMinor:20,lines:[]}},{schemaVersion:2,orderId:'OD2',customer:{email:'b@example.invalid',address:'private'},status:'confirmed',totals:{totalMinor:20,lines:[]}}]);const rows=await customerOrders(db,{email:'a@example.invalid'});assert.equal(rows.length,1);assert.equal(rows[0]!.orderId,'OD1');assert.equal('customer' in rows[0]!,false);});
 await t.test('account orders carry status times and the shopper’s own rating, never staff, contact or other shoppers’ data',async()=>{
  const owner=new ObjectId(),stranger=new ObjectId(),productId=new ObjectId().toHexString(),placed=new Date('2026-11-20T08:00:00.000Z');
  await db.collection('orders').insertOne({schemaVersion:2,orderId:'OD900',customer:{email:'timeline@example.invalid',address:'private street',mobile:'0500000000',payment:'cash'},status:'confirmed',createdAt:placed,
   statusHistory:[{status:'pending',at:placed},{status:'confirmed',at:new Date('2026-11-20T09:00:00.000Z'),actorId:new ObjectId()},{status:'not-a-status',at:placed}],
   totals:{totalMinor:3000,deliveryFeeMinor:500,discountMinor:100,subtotalMinor:2500,lines:[{productId,name:'Timeline product',quantity:2,lineTotalMinor:2500,sku:'private-sku'}]}});
  await db.collection<{_id:string}&Record<string,unknown>>('product_reviews').insertMany([{_id:`${owner.toHexString()}:${productId}`,rating:4,moderation:'pending',body:'mine',productId},{_id:`${stranger.toHexString()}:${productId}`,rating:1,moderation:'approved',body:'theirs',productId}]);
  const [row,...rest]=await customerOrders(db,{email:'timeline@example.invalid',id:owner.toHexString()});
  assert.equal(rest.length,0);
  const parsed=customerOrderDtoSchema.parse(row);
  assert.deepEqual(parsed.timeline?.map(entry=>entry.status),['pending','confirmed']);
  assert.equal(parsed.paymentMethod,'cash');assert.deepEqual(parsed.reviews,[{productId,rating:4,moderation:'pending'}]);
  assert.equal(parsed.totals.deliveryFeeMinor,500);
  const raw=JSON.stringify(row);
  for(const secret of ['private street','0500000000','actorId','private-sku','theirs','"customer"','_id'])assert.ok(!raw.includes(secret),secret);
  // An older order without history or a payment choice still reads.
  await db.collection('orders').insertOne({schemaVersion:2,orderId:'OD901',customer:{email:'legacy-shape@example.invalid'},status:'dispatched',createdAt:placed,totals:{totalMinor:100,lines:[]}});
  const older=customerOrderDtoSchema.parse((await customerOrders(db,{email:'legacy-shape@example.invalid'}))[0]);
  assert.equal(older.timeline,undefined);assert.equal(older.paymentMethod,undefined);assert.equal(older.reviews,undefined);
 });
 await t.test('customer address book is private, bounded, default-safe and idempotent',async()=>{const owner=new ObjectId();await db.collection('customers').insertOne({_id:owner,email:'address@example.invalid',emailHash:'address-owner'});const address=(label:string,isDefault:boolean)=>({label,name:'Synthetic Customer',mobile:'+971501234567',emirate:'Ras al-Khaimah',city:'Al Nakheel',address:'Synthetic street',buildingname:'',flatno:'',note:'',maplink:'',isDefault});const firstId=randomUUID(),secondId=randomUUID();await updateCustomerAddresses(db,String(owner),{operation:'add',addressId:firstId,address:{...address('Home',true),coordinates:{latitude:25.75,longitude:55.95}}});await updateCustomerAddresses(db,String(owner),{operation:'add',addressId:secondId,address:address('Work',true)});const rows=await customerAddresses(db,String(owner));assert.equal(rows.length,2);assert.deepEqual(rows.find((item:Document)=>Reflect.get(item,'id')===firstId)?.['coordinates'],{latitude:25.75,longitude:55.95});assert.equal(rows.filter((item:Document)=>Reflect.get(item,'isDefault')===true).length,1);assert.equal(rows.find((item:Document)=>Reflect.get(item,'id')===secondId)?.['isDefault'],true);assert.equal(await customerAddresses(db,String(new ObjectId())).then(value=>value.length),0);await updateCustomerAddresses(db,String(owner),{operation:'add',addressId:secondId,address:address('Work',true)});assert.equal((await customerAddresses(db,String(owner))).length,2);for(let index=0;index<8;index++)await updateCustomerAddresses(db,String(owner),{operation:'add',addressId:randomUUID(),address:address('Other '+index,false)});await assert.rejects(updateCustomerAddresses(db,String(owner),{operation:'add',addressId:randomUUID(),address:address('Overflow',false)}),{code:'IDEMPOTENCY_CONFLICT'});await updateCustomerAddresses(db,String(owner),{operation:'delete',addressId:firstId});assert.equal((await customerAddresses(db,String(owner))).length,9);});
 await t.test('admin growth report aggregates bounded periods without exposing order PII',async()=>{const now=new Date('2026-10-19T12:00:00.000Z'),createdAt=new Date(now.getTime()-86400000);await db.collection('orders').insertMany([{schemaVersion:2,orderId:'OD900001',createdAt,status:'dispatched',customer:{email:'private@example.invalid',address:'hidden'},totals:{totalMinor:500,lines:[{productId:'p1',name:'Synthetic lotion',quantity:2,lineTotalMinor:500}]}},{schemaVersion:2,orderId:'OD900002',createdAt,status:'cancelled',customer:{email:'other@example.invalid',address:'hidden'},totals:{totalMinor:300,lines:[{productId:'p1',name:'Synthetic lotion',quantity:1,lineTotalMinor:300}]}}]);const report=await growthMetrics(db,{days:7},now);assert.equal(report.current.orders,2);assert.equal(report.current.revenueMinor,800);assert.equal(report.current.averageOrderMinor,400);assert.equal(report.current.completed,1);assert.equal(report.current.cancelled,1);assert.equal(report.topProducts[0]!.quantity,3);assert.equal(JSON.stringify(report).includes('private@example.invalid'),false);await db.collection('orders').insertOne({schemaVersion:2,orderId:'OD900003',createdAt:new Date(now.getTime()-2*86400000),status:'dispatched',customer:{email:'PRIVATE@example.invalid',address:'hidden'},totals:{totalMinor:100,lines:[]}});const withRepeat=await growthMetrics(db,{days:7},now);assert.equal(withRepeat.cohorts.length,1);assert.equal(withRepeat.cohorts[0]!.customers,1);assert.equal(withRepeat.cohorts[0]!.repeatCustomers,1);assert.equal(withRepeat.cohorts[0]!.repeatOrders,1);assert.equal(JSON.stringify(withRepeat.cohorts).includes('private@example.invalid'),false);await assert.rejects(growthMetrics(db,{days:365},now),{code:'INVALID_REQUEST'});});
 await t.test('search token index never exposes hidden products or disabled categories',async()=>{const category=new ObjectId();await db.collection('categories').insertOne({_id:category,name:'Skincare'});await db.collection('products').insertMany([{name:'Cetaphil Cleanser 500ml',product_id:'PD1',category},{name:'Cetaphil Hidden 500ml',product_id:'PD2',category,published:false}]);await indexSearchBatch(db);const rows=await suggestProducts(db,'cetaphil 500');assert.equal(rows.length,1);assert.equal(rows[0]!.productId,'PD1');const chosen=await db.collection('products').findOne({product_id:'PD1'});assert.ok(chosen);const byName=await growthProductOptions(db,{q:'cetaphil 500'});assert.equal(byName[0]!.productId,'PD1');const bySavedId=await growthProductOptions(db,{ids:String(chosen._id)});assert.equal(bySavedId[0]!.name,'Cetaphil Cleanser 500ml');assert.equal((await growthCategoryOptions(db)).length,1);await assert.rejects(growthProductOptions(db,{q:'x'}),{code:'INVALID_REQUEST'});await db.collection('categories').updateOne({_id:category},{$set:{disabled:true}});assert.equal((await suggestProducts(db,'cetaphil 500')).length,0);assert.deepEqual(await growthProductOptions(db,{ids:String(chosen._id)}),[]);});
 await t.test('HTTP growth mutation enforces authentication and cross-origin protections',async()=>{const app=createApp({database:{mode:'disabled',checkReadiness:async()=>true},getDb:async()=>db,logger:createLogger({service:'api',environment:'development',write:()=>{}}),development:true,webOrigin:'http://localhost:3000'});const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');const origin=`http://127.0.0.1:${address.port}`;try{const response=await fetch(origin+'/api/v1/admin/growth/page',{method:'POST',headers:{Origin:'http://localhost:3000','Content-Type':'application/json','X-CSRF-Protection':'1'},body:'{}'});assert.equal(response.status,401);const email=await fetch(origin+'/api/v1/customers/email',{method:'POST',headers:{Origin:'https://evil.invalid','Content-Type':'application/json','X-CSRF-Protection':'1'},body:'{}'});assert.equal(email.status,403);const publicPages=await fetch(origin+'/api/v1/growth/pages');assert.equal(publicPages.status,200);const legacyPages=await publicPages.json();assert.equal('homepagePlacement' in legacyPages.data.items[0],false);const modernPages=await fetch(origin+'/api/v1/growth/pages?merchandising=1').then(response=>response.json());assert.equal(modernPages.data.items[0].homepagePlacement,'none');
 const browser={Origin:'http://localhost:3000','Content-Type':'application/json','X-CSRF-Protection':'1'};
 await db.collection('users').insertOne({username:'synthetic-admin',name:'Admin',role:'admin',cities:[],password:await hash('synthetic-password',4)});
 const login=await fetch(origin+'/api/v1/auth/login',{method:'POST',headers:browser,body:JSON.stringify({username:'synthetic-admin',password:'synthetic-password'})});assert.equal(login.status,200);const cookie=login.headers.getSetCookie()[0]!.split(';')[0]!;
 assert.equal((await fetch(origin+'/api/v1/admin/growth/order-costs',{method:'POST',headers:browser,body:'{}'})).status,401);
 assert.equal((await fetch(origin+'/api/v1/admin/growth/order-costs',{method:'POST',headers:{...browser,Cookie:cookie,Origin:'https://evil.invalid'},body:'{}'})).status,403);
 assert.equal((await fetch(origin+'/api/v1/admin/growth/order-costs',{method:'POST',headers:{...browser,Cookie:cookie},body:'{}'})).status,400);

 const guestLogout=await fetch(origin+'/api/v1/customers/logout',{method:'POST',headers:browser,body:'{}'});assert.equal(guestLogout.status,204);assert.ok(guestLogout.headers.getSetCookie().some(value=>value.startsWith('almina_customer=')&&value.includes('Expires=')));
 const hostileLogout=await fetch(origin+'/api/v1/customers/logout',{method:'POST',headers:{...browser,Origin:'https://evil.invalid'},body:'{}'});assert.equal(hostileLogout.status,403);
 // GET registration must not shadow these POST routes with a premature 405.
 const profile=await fetch(origin+'/api/v1/admin/growth/profile',{method:'POST',headers:{...browser,Cookie:cookie},body:JSON.stringify({address:'Synthetic address',revision:1})});assert.equal(profile.status,200);
 const delivery=await fetch(origin+'/api/v1/admin/growth/delivery',{method:'POST',headers:{...browser,Cookie:cookie},body:'{}'});assert.equal(delivery.status,400);
 const saved=await fetch(origin+'/api/v1/customers/saved',{method:'POST',headers:browser,body:'{}'});assert.equal(saved.status,401);
 const hostile=await fetch(origin+'/api/v1/admin/growth/rewards',{method:'POST',headers:{...browser,Cookie:cookie,Origin:'https://evil.invalid'},body:'{}'});assert.equal(hostile.status,403);
 const reviewBody=JSON.stringify({kind:'campaign',slug:'review-draft',title:'Review draft',description:''});
 assert.equal((await fetch(origin+'/api/v1/admin/growth/campaign-review',{method:'POST',headers:browser,body:reviewBody})).status,401);
 assert.equal((await fetch(origin+'/api/v1/admin/growth/campaign-review',{method:'POST',headers:{...browser,Cookie:cookie,Origin:'https://evil.invalid'},body:reviewBody})).status,403);
 assert.equal((await fetch(origin+'/api/v1/admin/growth/campaign-review',{headers:{Cookie:cookie}})).status,405);
 const campaignReview=await fetch(origin+'/api/v1/admin/growth/campaign-review',{method:'POST',headers:{...browser,Cookie:cookie},body:reviewBody});assert.equal(campaignReview.status,200);assert.ok(JSON.stringify(await campaignReview.json()).includes('missing-artwork'));
 assert.equal((await fetch(origin+'/api/v1/growth/campaigns?locale=ar&unexpected=1')).status,400);
 const branchUser=await db.collection('users').insertOne({username:'synthetic-branch',name:'Branch',role:'user',cities:[],password:await hash('synthetic-password',4)});void branchUser;
 const branchLogin=await fetch(origin+'/api/v1/auth/login',{method:'POST',headers:browser,body:JSON.stringify({username:'synthetic-branch',password:'synthetic-password'})});const branchCookie=branchLogin.headers.getSetCookie()[0]!.split(';')[0]!;
 assert.equal((await fetch(origin+'/api/v1/admin/growth/rewards',{headers:{Cookie:branchCookie}})).status,403);
 assert.equal((await fetch(origin+'/api/v1/admin/growth/campaign-review',{method:'POST',headers:{...browser,Cookie:branchCookie},body:reviewBody})).status,403);
 const customerId=new ObjectId(),token='x'.repeat(43);await db.collection('customers').insertOne({_id:customerId,email:'quota@example.invalid',emailHash:'synthetic-quota-owner',verifiedAt:new Date()});await db.collection('customer_sessions').insertOne({_id:createHash('sha256').update(token).digest('hex') as never,customerId,expiresAt:new Date(Date.now()+60000)});
 for(let index=0;index<25;index++){const response=await fetch(origin+'/api/v1/customers/preferences',{method:'POST',headers:{...browser,Cookie:'almina_customer='+token},body:JSON.stringify({marketingEmail:false,marketingWhatsapp:false})});assert.equal(response.status,200,'Customer actions must not exhaust an IP-shared 20-request sign-in quota');}

}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}});
  await t.test('branches stay private until verified and serviceability is inactive until published',async()=>{assert.equal((await branchDirectory(db)).verified,false);assert.equal((await branchDirectory(db)).items.length,0);await assert.rejects(saveBranchDirectory(db,{items:[{name:'Branch',phone:'+971500000000'}],verified:true},actor),{code:'INVALID_REQUEST'});const branchId=randomUUID();await db.collection<Document & {_id:string}>('growth_settings').insertOne({_id:'order-routing',revision:0,active:false,branches:[{id:branchId,name:'Branch',areaIds:[]}],fallbackBranchId:null});const saved=await saveBranchDirectory(db,{items:[{branchId,name:'Browser name cannot replace the registry',phone:'+971500000000',verified:true}],verified:true},actor);assert.equal(saved.revision,1);assert.equal(saved.items[0]!.name,'Branch');await assert.rejects(saveBranchDirectory(db,{...saved,items:[saved.items[0]!,saved.items[0]!]},actor),{code:'INVALID_REQUEST'});assert.equal((await branchDirectory(db)).items[0]!.name,'Branch');const policy=await readServiceability(db);assert.equal(policy.active,false);await assertServiceable(db,{emirate:'Dubai',city:'Anywhere'});await assert.rejects(saveServiceability(db,{active:true,emirates:[]},actor),{code:'INVALID_REQUEST'});await saveServiceability(db,{active:true,emirates:['Ras al-Khaimah'],blockedCities:['Al Nakheel'],notes:'Neighbourhood delivery during pharmacy hours.'},actor);await assertServiceable(db,{emirate:'Ras al-Khaimah',city:'Al Hamra'});await assert.rejects(assertServiceable(db,{emirate:'Ras al-Khaimah',city:'Al Nakheel'}),{code:'ADDRESS_NOT_SERVICEABLE'});await assert.rejects(assertServiceable(db,{emirate:'Dubai',city:'Al Hamra'}),{code:'ADDRESS_NOT_SERVICEABLE'});});
}finally{if(secret===undefined)delete process.env.CUSTOMER_AUTH_SECRET;else process.env.CUSTOMER_AUTH_SECRET=secret;await db.dropDatabase();await client.close();}});

// A GET registration with its own 405 catch-all once shadowed both of these POST routes.
test('signed-in customers save addresses and reminders over HTTP with every mutation guard intact',{skip:!uri},async()=>{
 assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
 const client=await new MongoClient(uri!).connect(),db=client.db('customer_routes_'+randomUUID().replaceAll('-',''));
 const keys=['GROWTH_EMAIL_ENABLED','CUSTOMER_EMAIL_USER','CUSTOMER_EMAIL_PASSWORD'] as const,previous=keys.map(key=>process.env[key]);
 // Marks the reminder provider ready. No delivery worker runs, so nothing is sent.
 process.env.GROWTH_EMAIL_ENABLED='true';process.env.CUSTOMER_EMAIL_USER='synthetic@example.invalid';process.env.CUSTOMER_EMAIL_PASSWORD='synthetic-only';
 const app=createApp({database:{mode:'disabled',checkReadiness:async()=>true},getDb:async()=>db,logger:createLogger({service:'api',environment:'development',write:()=>{}}),development:true,webOrigin:'http://localhost:3000'});
 const server=createServer(app);
 try{
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const bound=server.address();assert.ok(bound&&typeof bound!=='string');
  const base=`http://127.0.0.1:${bound.port}/api/v1/customers/`;
  const customerId=new ObjectId(),category=new ObjectId(),productId=new ObjectId(),token='y'.repeat(43);
  await db.collection('customers').insertOne({_id:customerId,email:'routes@example.invalid',emailHash:'synthetic-route-owner',verifiedAt:new Date()});
  await db.collection('customer_sessions').insertOne({_id:createHash('sha256').update(token).digest('hex') as never,customerId,expiresAt:new Date(Date.now()+600000)});
  await db.collection('categories').insertOne({_id:category,name:'Synthetic general'});
  await db.collection('products').insertOne({_id:productId,name:'Synthetic care',product_id:'SYNTHETIC-CARE',category,productType:'general',contentReviewed:true,published:true,stock:0,price:10});
  await saveRetentionPolicy(db,{revision:0,enabled:true,restock:true,priceDrop:true,replenishment:true,cartRecovery:true},String(new ObjectId()));
  const browser={Origin:'http://localhost:3000','Content-Type':'application/json','X-CSRF-Protection':'1'};
  const signedIn={...browser,Cookie:'almina_customer='+token};
  const addressId=randomUUID();
  const cases=[
   {path:'addresses',body:{operation:'add',addressId,address:{label:'Home',name:'Synthetic Customer',mobile:'+971501234567',emirate:'Ras al-Khaimah',city:'Al Nakheel',address:'Synthetic street'}},savedId:addressId},
   {path:'reminders',body:{operation:'subscribe',kind:'restock',consent:true,productId:String(productId)},savedId:`${customerId}:restock:${productId}`},
  ];
  const stored=async()=>(await db.collection('customers').findOne({_id:customerId}))?.addresses?.length??0;
  const reminders=()=>db.collection('customer_reminders').countDocuments();
  for(const {path,body,savedId} of cases){
   const post=(headers:Record<string,string>)=>fetch(base+path,{method:'POST',headers,body:JSON.stringify(body)});
   assert.equal((await post(browser)).status,401,path+' guest');
   const {'X-CSRF-Protection':_csrf,...withoutCsrf}=signedIn;void _csrf;
   for(const headers of [withoutCsrf,{...signedIn,'Sec-Fetch-Site':'cross-site'},{...signedIn,Origin:'https://evil.invalid'}])assert.equal((await post(headers)).status,403,path+' cross-site');
   assert.equal(await stored()+await reminders(),path==='addresses'?0:1,path+' refused requests must not write');
   const saved=await post(signedIn);assert.equal(saved.status,200,path+' save');assert.ok(saved.headers.get('ratelimit'),path+' rate limit');
   assert.deepEqual(((await saved.json()) as {data:{id:string}[]}).data.map(row=>row.id),[savedId]);
   const read=await fetch(base+path,{headers:{Cookie:signedIn.Cookie}});assert.equal(read.status,200);
   assert.deepEqual(((await read.json()) as {data:{id:string}[]}).data.map(row=>row.id),[savedId]);
   assert.equal((await fetch(base+path,{method:'HEAD',headers:{Cookie:signedIn.Cookie}})).status,200);
   const getWithBody=await new Promise<number>((resolve,reject)=>{const call=request(base+path,{method:'GET',headers:{Cookie:signedIn.Cookie,'Content-Type':'application/json','Content-Length':'2'}},response=>{response.resume();resolve(response.statusCode!);});call.on('error',reject);call.end('{}');});
   assert.equal(getWithBody,400,path+' GET body');
   const wrongMethod=await fetch(base+path,{method:'PUT',headers:signedIn,body:'{}'});assert.equal(wrongMethod.status,405);assert.equal(wrongMethod.headers.get('allow'),'GET, HEAD, POST');
  }
  // Exhaust this and the next minute's bucket so a minute rollover cannot skip the check.
  const minute=Math.floor(Date.now()/60000);
  for(const bucket of [minute,minute+1])await db.collection<Document&{_id:string}>('customer_auth_limits').updateOne({_id:`customer:${customerId}:${bucket}`},{$set:{count:120,expiresAt:new Date(Date.now()+180000)}},{upsert:true});
  for(const {path,body} of cases)assert.equal((await fetch(base+path,{method:'POST',headers:signedIn,body:JSON.stringify(body)})).status,429,path+' mutation quota');
 }finally{
  if(server.listening)await new Promise<void>(resolve=>server.close(()=>resolve()));
  keys.forEach((key,index)=>{const value=previous[index];if(value===undefined)delete process.env[key];else process.env[key]=value;});
  await db.dropDatabase();await client.close();
 }
});
