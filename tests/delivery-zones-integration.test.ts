import { updateProductInventory } from '../apps/api/src/modules/inventory/adjustments';
import { previewDelivery } from '../apps/api/src/modules/growth/delivery';
import { stripeFixture } from '../scripts/tooling/stripe-fixture';
import { createStripePayments, prepareStripeStorage, type StripeTransport } from '../apps/api/src/modules/payments/stripe';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient,ObjectId,type Document } from 'mongodb';
import { createCommerceService,quoteHash } from '../apps/api/src/modules/orders/commerce';
import { saveOrderRouting } from '../apps/api/src/modules/orders/routing-admin';
import { saveZone,saveZoneSettings,setBranchInventory,reassignDelivery,deleteZone,deliverySettings,applyZoneQuote,touchDelivery,coverageAt } from '../apps/api/src/modules/delivery/service';
import { retainedOrderList,retainedOrderDetail } from '../apps/api/src/modules/orders/compatibility-reads';
import { routingRecipients, readOrderRouting } from '../apps/api/src/modules/orders/routing';
import { migrateCommerce } from '../scripts/migrations/commerce';
const uri=process.env.COMMERCE_TEST_URI;assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1','Disposable database required');
test('real geospatial coverage, overlap priorities, shared inventory, reassignment and restoration', {skip:!uri},async t=>{
 assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);const client=await new MongoClient(uri!).connect(),db=client.db('almina_zones_'+randomUUID().replaceAll('-',''));
 const actor=String(new ObjectId()),a=randomUUID(),b=randomUUID(),admin={id:actor,username:'synthetic',name:'Synthetic',role:'admin' as const,cities:[]},staffA={...admin,id:String(new ObjectId()),role:'user' as const,branchId:a},staffB={...staffA,id:String(new ObjectId()),branchId:b};
 const category=new ObjectId(),productId=String(new ObjectId()),secondId=String(new ObjectId()),service=createCommerceService(async()=>db);
 const customer={name:'Synthetic',mobile:'0501234567',email:'synthetic@example.invalid',city:'Spelling does not control polygons',emirate:'Ras al-Khaimah',address:'Synthetic address',payment:'cash',coordinates:{latitude:25.75,longitude:55.95}};
 const items=[{productId,quantity:1},{productId:secondId,quantity:1}],input=()=>({customer,items,idempotencyKey:randomUUID()});
 const zone={id:randomUUID(),revision:0,name:'Synthetic test coverage',active:true,color:'#2563eb',priority:100,branches:[{branchId:a,priority:10},{branchId:b,priority:20}],deliveryFeeMinor:500,minimumOrderMinor:1000,estimatedMinutes:45,geometry:{type:'Polygon' as const,coordinates:[[[55.8,25.6],[56.1,25.6],[56.1,25.9],[55.8,25.9],[55.8,25.6]]]}};

 try{
 await db.collection('users').insertMany([{_id:new ObjectId(actor),role:'admin',subscription:{}},{_id:new ObjectId(staffA.id),role:'user',branchId:a,subscription:{}},{_id:new ObjectId(staffB.id),role:'user',branchId:b,subscription:{}}]);
 await db.collection('categories').insertOne({_id:category,name:'Synthetic'});await db.collection('stores').insertOne({status:'open'});
 await db.collection('products').insertMany([productId,secondId].map(id=>({_id:new ObjectId(id),product_id:id,name:'Synthetic product',category,price:20,stock:10,vat:false})));
 await migrateCommerce(db);
 await saveOrderRouting(db,{active:true,revision:0,fallbackBranchId:b,branches:[{id:a,name:'Priority branch',areaIds:[],location:{latitude:25.7,longitude:55.9},enabled:true},{id:b,name:'Nearest branch',areaIds:[],location:customer.coordinates,enabled:true}]},actor);
 let policy=await readOrderRouting(db);
 await t.test('a branch with a dispatched refundable card order cannot be removed',async()=>{
 const c=randomUUID();await saveOrderRouting(db,{...policy,branches:[...policy.branches,{id:c,name:'Synthetic retiring branch',areaIds:[],enabled:false}]},actor);policy=await readOrderRouting(db);const card=await db.collection('orders').insertOne({deliveryAssignment:{branchId:c},status:'dispatched',payment:{provider:'stripe',state:'paid'}});await assert.rejects(saveOrderRouting(db,{...policy,branches:policy.branches.filter(branch=>branch.id!==c)},actor),{code:'INVALID_TRANSITION'});await db.collection('orders').deleteOne({_id:card.insertedId});await saveOrderRouting(db,{...policy,branches:policy.branches.filter(branch=>branch.id!==c)},actor);policy=await readOrderRouting(db);
 });
 await t.test('first inactive checkout fences initialize safely under concurrent transactions',async()=>{await Promise.all(Array.from({length:5},async()=>{const session=client.startSession();try{await session.withTransaction(async()=>{await touchDelivery(db,session);});}finally{await session.endSession();}}));assert.equal((await db.collection<Document&{_id:string}>('delivery_controls').findOne({_id:'zones'}))!.orderFence,5);assert.equal((await deliverySettings(db)).active,false);});
 await t.test('activation cannot race a no-pin order through the previous inactive snapshot',async()=>{
 const temporary={...zone,id:randomUUID(),name:'Synthetic activation fence'};await saveZone(db,temporary,actor);const {coordinates:_point,...manual}=customer;void _point;const legacyQuote=await service.quote({customer:manual,items});let release!:()=>void,ready!:()=>void,attempts=0;const gate=new Promise<void>(resolve=>{release=resolve;}),read=new Promise<void>(resolve=>{ready=resolve;}),session=client.startSession();
 try{const pending=session.withTransaction(async()=>{attempts++;const setting=await deliverySettings(db,session);if(attempts===1){assert.equal(setting.active,false);ready();await gate;}await applyZoneQuote(db,{},legacyQuote,session);await db.collection('orders').insertOne({syntheticActivationRace:true},{session});});await read;try{const settings=await deliverySettings(db);await saveZoneSettings(db,{active:true,revision:settings.revision},actor);}finally{release();}await assert.rejects(pending,{code:'DELIVERY_LOCATION_REQUIRED'});assert.equal(await db.collection('orders').countDocuments(),0);assert.ok(attempts>=2);}finally{await session.endSession();}
 const settings=await deliverySettings(db);await saveZoneSettings(db,{active:false,revision:settings.revision},actor);await deleteZone(db,{id:temporary.id,revision:1},actor);
 });
 await t.test('activation is explicit; unknown pins and outside coverage are rejected without writes',async()=>{
 assert.equal((await deliverySettings(db)).active,false);assert.deepEqual(await coverageAt(db,{latitude:25.7,longitude:55.9}),{status:'unchecked'});await saveZone(db,zone,actor);const settings=await deliverySettings(db);await saveZoneSettings(db,{active:true,revision:settings.revision},actor);
 assert.deepEqual(await coverageAt(db,{latitude:25.7,longitude:55.9}),{status:'serviceable',zoneName:zone.name,estimatedMinutes:45,deliveryFeeMinor:500,minimumOrderMinor:1000});assert.deepEqual(await coverageAt(db,{latitude:24,longitude:54}),{status:'outside'});await assert.rejects(coverageAt(db,{latitude:'x'}),{code:'INVALID_REQUEST'});
 await assert.rejects(previewDelivery(db,{items,emirate:customer.emirate}),{code:'DELIVERY_LOCATION_REQUIRED'});
 const {coordinates:_pin,...manual}=customer;void _pin;await assert.rejects(service.quote({customer:manual,items}),{code:'DELIVERY_LOCATION_REQUIRED'});await assert.rejects(service.quote({customer:{...customer,coordinates:{latitude:24,longitude:54}},items}),{code:'ADDRESS_NOT_SERVICEABLE'});assert.equal(await db.collection('orders').countDocuments(),0);
 });
 await t.test('routing needs no allocations; legacy allocations cannot block the main stock or its adjustments',async()=>{
 await assert.rejects(setBranchInventory(db,{key:randomUUID(),branchId:a,productId,stock:1,revision:0,reason:'Stale client allocation'},actor),{code:'BRANCH_STOCK_RETIRED'});
 await assert.rejects(setBranchInventory(db,{},staffA.id),{code:'FORBIDDEN'});
 assert.equal(await db.collection('branch_inventory').countDocuments(),0);
 assert.equal((await service.quote({customer,items})).delivery!.branchId,a);
 await db.collection('branch_inventory').insertOne({branchId:a,productId:new ObjectId(productId),stock:99,revision:0});
 await updateProductInventory(db,productId,{stock:5,expectedStock:10,stockReason:'Synthetic main stock correction',inventoryKey:randomUUID()},actor);
 assert.equal((await service.quote({customer,items})).delivery!.branchId,a);
 await updateProductInventory(db,productId,{stock:10,expectedStock:5,stockReason:'Synthetic restore fixture stock',inventoryKey:randomUUID()},actor);
 await db.collection<Document&{_id:string}>('growth_settings').updateOne({_id:'serviceability'},{$set:{active:true,emirates:[customer.emirate],blockedCities:[customer.city],notes:'Exact covered pin overrides old text rule',revision:1}},{upsert:true});
 await saveZone(db,{...zone,revision:1,branches:[{branchId:a,priority:10},{branchId:b,priority:10}]},actor);assert.equal((await service.quote({customer,items})).delivery!.branchId,b);await saveZone(db,{...zone,revision:2},actor);
 });
 await t.test('overlapping zones use stable precedence; holes exclude locations and disabled branches are not assigned',async()=>{
 const overlap={...zone,id:randomUUID(),name:'Synthetic overlap',priority:50,deliveryFeeMinor:700};await saveZone(db,overlap,actor);const quote=await service.quote({customer,items});assert.equal(quote.deliveryFeeMinor,700);assert.equal(quote.delivery!.zoneId,overlap.id);await deleteZone(db,{id:overlap.id,revision:1},actor);
 await saveOrderRouting(db,{...policy,branches:policy.branches.map(branch=>branch.id===a?{...branch,enabled:false}:branch)},actor);policy=await readOrderRouting(db);assert.equal((await service.quote({customer,items})).delivery!.branchId,b);
 await saveOrderRouting(db,{...policy,branches:policy.branches.map(branch=>({...branch,enabled:true}))},actor);policy=await readOrderRouting(db);
 const withHole={...zone,revision:3,geometry:{type:'Polygon' as const,coordinates:[...zone.geometry.coordinates,[[55.94,25.74],[55.96,25.74],[55.96,25.76],[55.94,25.76],[55.94,25.74]]]}};await saveZone(db,withHole,actor);await assert.rejects(service.quote({customer,items}),{code:'ADDRESS_NOT_SERVICEABLE'});await saveZone(db,{...zone,revision:4},actor);
 });
 let orderId='';
 await t.test('checkout reserves main stock once and reassigns without moving stock or changing charged totals',async()=>{
 const intent=input(),quote=await service.quote({customer:intent.customer,items:intent.items});const placed=await service.checkout({...intent,acceptedQuoteHash:quoteHash(quote)});orderId=placed.id;await service.checkout({...intent,acceptedQuoteHash:quoteHash(quote)});
 assert.equal((await db.collection('products').findOne({_id:new ObjectId(productId)}))!.stock,9);assert.equal((await db.collection('branch_inventory').findOne({branchId:a,productId:new ObjectId(productId)}))!.stock,99);
 assert.equal((await retainedOrderList(db,{},staffA)).length,1);await assert.rejects(retainedOrderDetail(db,orderId,{},staffB),{code:'NOT_FOUND'});
 await assert.rejects(reassignDelivery(db,orderId,{branchId:b,expectedBranchId:a,reason:'Synthetic reassignment'},staffA.id),{code:'FORBIDDEN'});
 await reassignDelivery(db,orderId,{branchId:b,expectedBranchId:a,reason:'Synthetic branch handoff'},actor);const stored=(await db.collection('orders').findOne({_id:new ObjectId(orderId)}))!;assert.equal(stored.totals.totalMinor,4500);assert.equal(stored.deliveryAssignment.branchId,b);assert.equal(stored.totals.delivery.branchId,a);
 assert.equal(stored.inventory.source,'main');assert.equal((await db.collection('products').findOne({_id:new ObjectId(productId)}))!.stock,9);assert.equal(await db.collection('branch_inventory').countDocuments(),1);
 assert.equal((await retainedOrderList(db,{},staffB)).length,1);assert.equal((await retainedOrderList(db,{},staffA)).length,0);
 const recipients=await db.collection('users').find(await routingRecipients(db,stored)).toArray();assert.deepEqual(recipients.map(row=>String(row._id)).sort(),[actor,staffB.id].sort());
 await service.transition(orderId,{status:'cancelled'},staffB);await service.transition(orderId,{status:'cancelled'},staffB);assert.equal((await db.collection('products').findOne({_id:new ObjectId(productId)}))!.stock,10);assert.equal(await db.collection('branch_inventory').countDocuments(),1);
 });
 await t.test('concurrent final main stock cannot oversell and failed reservations leave no partial order',async()=>{
 await db.collection('products').updateMany({},{$set:{stock:1}});
 const reviewed=await service.quote({customer,items}),attempts=Array.from({length:5},()=>service.checkout({...input(),acceptedQuoteHash:quoteHash(reviewed)}));const results=await Promise.allSettled(attempts);assert.equal(results.filter(row=>row.status==='fulfilled').length,1);for(const id of [productId,secondId]){assert.equal((await db.collection('products').findOne({_id:new ObjectId(id)}))!.stock,0);}assert.equal(await db.collection('checkout_requests').countDocuments(),2);
 });
 await t.test('orders routed to different branches compete for the same final main unit',async()=>{
 await db.collection('products').updateMany({},{$set:{stock:1}});
 const remoteCustomer={...customer,coordinates:{latitude:25.95,longitude:55.95}},remoteZone={...zone,id:randomUUID(),name:'Synthetic second branch only',branches:[{branchId:b,priority:10}],geometry:{type:'Polygon' as const,coordinates:[[[55.8,25.91],[56.1,25.91],[56.1,26],[55.8,26],[55.8,25.91]]]}};
 await saveZone(db,remoteZone,actor);
 const first=await service.quote({customer,items}),second=await service.quote({customer:remoteCustomer,items});assert.equal(first.delivery!.branchId,a);assert.equal(second.delivery!.branchId,b);
 const results=await Promise.allSettled([service.checkout({...input(),acceptedQuoteHash:quoteHash(first)}),service.checkout({...input(),customer:remoteCustomer,acceptedQuoteHash:quoteHash(second)})]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
 for(const id of [productId,secondId])assert.equal((await db.collection('products').findOne({_id:new ObjectId(id)}))!.stock,0);
 assert.equal(await db.collection('checkout_requests').countDocuments(),3);
 await deleteZone(db,{id:remoteZone.id,revision:1},actor);
 });
 await t.test('branch-scoped card confirmation synchronizes the provider and expiry restores main stock once',async()=>{
 const simulated=stripeFixture();let reads=0;
 const remote=async(id:string)=>{reads++;const row=await simulated.transport.retrieve(id.replace("cs_live_","cs_test_")) as Document;return {...row,id:row.id.replace("cs_test_","cs_live_"),livemode:true,payment_intent:row.payment_intent?{...row.payment_intent,status:'succeeded',currency:'aed',amount_received:row.amount_total,latest_charge:{...row.payment_intent.latest_charge,currency:'aed',disputed:false}}:null};};
 const transport:StripeTransport={...simulated.transport,account:async()=>({id:'acct_synthetic_zones',chargesEnabled:true,payoutsEnabled:true}),create:async(params,key)=>{const row=await simulated.transport.create(params,key) as Document;return {...row,id:row.id.replace("cs_test_","cs_live_"),livemode:true};},retrieve:remote,expire:async id=>simulated.transport.expire(id.replace("cs_live_","cs_test_")),refunds:async()=>({succeededMinor:0,pendingMinor:0,failed:false})};
 await prepareStripeStorage(db,true);const payments=createStripePayments(async()=>db,{origin:'https://synthetic.invalid',testMode:false,accountId:'acct_synthetic_zones',transport});const cardCommerce=createCommerceService(async()=>db,payments);
 await db.collection('products').updateMany({},{$set:{stock:10}});
 const paidInput={...input(),customer:{...customer,payment:'stripe'}},paidQuote=await cardCommerce.quote({customer:paidInput.customer,items});const started=await payments.start({...paidInput,acceptedQuoteHash:quoteHash(paidQuote)});const paidOrder=(await db.collection('orders').findOne({orderId:started.orderId}))!;
 await assert.rejects(cardCommerce.transition(String(paidOrder._id),{status:'confirmed'},staffA),{code:'INVALID_TRANSITION'});
 simulated.paid();const beforeReads=reads;await cardCommerce.transition(String(paidOrder._id),{status:'confirmed'},staffA);assert.ok(reads>beforeReads);assert.equal((await db.collection('orders').findOne({_id:paidOrder._id}))!.payment.state,'paid');
 const expiring={...input(),customer:{...customer,payment:'stripe'}},expiringQuote=await cardCommerce.quote({customer:expiring.customer,items});const created=await payments.start({...expiring,acceptedQuoteHash:quoteHash(expiringQuote)});assert.ok(created.orderId);
 const reserved=(await db.collection('products').findOne({_id:new ObjectId(productId)}))!.stock;
 await payments.status({idempotencyKey:expiring.idempotencyKey},true);await payments.status({idempotencyKey:expiring.idempotencyKey},true);
 assert.equal((await db.collection('products').findOne({_id:new ObjectId(productId)}))!.stock,reserved+1);
 });
 await t.test('legacy dual reservations release once on reassignment, even when all main stock is reserved',async()=>{
 const intent=input(),quote=await service.quote({customer,items});const placed=await service.checkout({...intent,acceptedQuoteHash:quoteHash(quote)});
 // Simulate an order placed before shared-stock deployment, not a new reservation.
 await db.collection('orders').updateOne({_id:new ObjectId(placed.id)},{$unset:{'inventory.source':''}});
 await db.collection('branch_inventory').updateOne({branchId:a,productId:new ObjectId(productId)},{$set:{stock:2}});
 await db.collection('branch_inventory').insertOne({branchId:a,productId:new ObjectId(secondId),stock:2});
 await db.collection('products').updateMany({},{$set:{stock:0}});
 await reassignDelivery(db,placed.id,{branchId:b,expectedBranchId:a,reason:'Synthetic legacy handoff'},actor);
 await reassignDelivery(db,placed.id,{branchId:a,expectedBranchId:b,reason:'Synthetic return handoff'},actor);
 assert.equal((await db.collection('branch_inventory').findOne({branchId:a,productId:new ObjectId(productId)}))!.stock,3);
 assert.equal((await db.collection('products').findOne({_id:new ObjectId(productId)}))!.stock,0);
 await service.transition(placed.id,{status:'cancelled'},admin);await service.transition(placed.id,{status:'cancelled'},admin);
 assert.equal((await db.collection('products').findOne({_id:new ObjectId(productId)}))!.stock,1);
 assert.equal((await db.collection('branch_inventory').findOne({branchId:a,productId:new ObjectId(productId)}))!.stock,3);
 });
 await t.test('untouched legacy orders still restore both recorded reservations on cancellation',async()=>{
 const intent=input(),quote=await service.quote({customer,items}),placed=await service.checkout({...intent,acceptedQuoteHash:quoteHash(quote)});
 await db.collection('orders').updateOne({_id:new ObjectId(placed.id)},{$unset:{'inventory.source':''}});
 await service.transition(placed.id,{status:'cancelled'},admin);await service.transition(placed.id,{status:'cancelled'},admin);
 assert.equal((await db.collection('products').findOne({_id:new ObjectId(productId)}))!.stock,1);
 assert.equal((await db.collection('branch_inventory').findOne({branchId:a,productId:new ObjectId(productId)}))!.stock,4);
 });
 await t.test('zone edits do not hide existing orders or change immutable monetary snapshots',async()=>{
 const existing=await db.collection('orders').findOne({status:'pending','deliveryAssignment.branchId':a,'deliveryAssignment.zoneId':zone.id});assert.ok(existing);await deleteZone(db,{id:zone.id,revision:5},actor);assert.ok((await retainedOrderList(db,{},staffA)).some(order=>String(order._id)===String(existing._id)));const detail=await retainedOrderDetail(db,String(existing._id),{},staffA);assert.equal((detail.totals as Document).totalMinor,4500);
 });
 }finally{await db.dropDatabase();await client.close();}
});
