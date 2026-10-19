import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient,ObjectId } from 'mongodb';
import { saveRewardsPolicy,rewardsPolicy,rewardAccount,confirmRewardDelivery,redeemPoints,attachReferral,referralCode } from '../apps/api/src/modules/growth/rewards';
import { createCommerceService,quoteHash,calculateQuote } from '../apps/api/src/modules/orders/commerce';
import { submitReview,moderateReview,publicReviews } from '../apps/api/src/modules/growth/reviews';
import { customerSaved,updateCustomerSaved } from '../apps/api/src/modules/growth/saved';
import { approvedPolicy } from '../scripts/migrations/commerce';
const uri=process.env.COMMERCE_TEST_URI;
assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1','Disposable database required');
test('rewards, saved products, reviews and voucher checkout',{skip:!uri},async t=>{
 assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
 const client=await new MongoClient(uri!).connect(),db=client.db('rewards_'+randomUUID().replaceAll('-',''));
 const category=new ObjectId(),product=new ObjectId(),medicine=new ObjectId(),owner=new ObjectId(),referrer=new ObjectId(),actor=String(new ObjectId());
 const shopper={name:'Synthetic',mobile:'0501234567',email:'buyer@example.invalid',emirate:'Ras al-Khaimah',city:'City',address:'Synthetic test',payment:'cash' as const,note:'',buildingname:'',flatno:'',maplink:''};
 const item={_id:product,name:'General care',product_id:'PD1',category,price:50,stock:50,vat:true,published:true,productType:'general',contentReviewed:true};
 try{
 await db.collection('categories').insertOne({_id:category,name:'Personal care'});
 await db.collection('products').insertMany([item,{...item,_id:medicine,name:'Medicine',product_id:'PD2',productType:'otc'}]);
 await db.collection('customers').insertMany([{_id:owner,email:shopper.email,verifiedAt:new Date()},{_id:referrer,email:'referrer@example.invalid',verifiedAt:new Date()}]);
 await db.collection('commerce_policies').insertOne({_id:'checkout' as never,...approvedPolicy});
 await db.collection('stores').insertOne({status:'open'});
 await db.collection('commerce_counters').insertOne({_id:'orders' as never,ready:true,value:5050});
 await db.collection('reward_vouchers').createIndex({code:1},{unique:true});
 const service=createCommerceService(async()=>db);
 let code='';
 await t.test('rules default inactive; incomplete rules and stale admin writes rejected',async()=>{
 assert.equal((await rewardsPolicy(db)).enabled,false);
 await assert.rejects(saveRewardsPolicy(db,{enabled:true},actor),{code:'INVALID_REQUEST'});
 const policy=await saveRewardsPolicy(db,{enabled:true,pointsPerAed:10,pointsPerVoucher:100,voucherValueMinor:1000,minimumSpendMinor:2000,eligibleCategoryIds:[String(category)],referrerPoints:10,welcomePoints:5,terms:'Reviewed general-sale products only. No cash. Refunds reverse points.'},actor);
 assert.equal(policy.revision,1);await assert.rejects(saveRewardsPolicy(db,{...policy,revision:0},actor),{code:'IDEMPOTENCY_CONFLICT'});
 });
 await t.test('referral earns nothing at sign-up, rejects self and repeated attachments',async()=>{
 const invite=await referralCode(db,String(referrer));await assert.rejects(attachReferral(db,{id:String(referrer),email:'referrer@example.invalid'},invite),{code:'INVALID_REQUEST'});
 await attachReferral(db,{id:String(owner),email:shopper.email},invite);
 assert.equal((await rewardAccount(db,String(owner))).points,0);
 await assert.rejects(attachReferral(db,{id:String(owner),email:shopper.email},invite),{code:'INVALID_TRANSITION'});
 });
 await t.test('only confirmed delivery awards once, medicine excluded and referrals idempotent',async()=>{
 await db.collection('orders').insertOne({schemaVersion:2,orderId:'OD1',status:'dispatched',customer:{...shopper,email:'Buyer@Example.INVALID'},lines:[{productId:String(product),lineTotalMinor:5000},{productId:String(medicine),lineTotalMinor:10000}]});
 const result=await Promise.all([confirmRewardDelivery(db,{orderId:'OD1'},actor),confirmRewardDelivery(db,{orderId:'OD1'},actor)]);
 assert.equal(result.filter(row=>!row.replayed).length,1);
 assert.equal((await rewardAccount(db,String(owner))).points,505);
 assert.equal((await rewardAccount(db,String(referrer))).points,10);
 await assert.rejects(confirmRewardDelivery(db,{orderId:'OD999'},actor),{code:'INVALID_TRANSITION'});
 });
 await t.test('redemption idempotency, available balance and private ownership',async()=>{
 const key=randomUUID();const first=await redeemPoints(db,String(owner),{idempotencyKey:key});const replay=await redeemPoints(db,String(owner),{idempotencyKey:key});assert.equal(first.code,replay.code);code=first.code;
 assert.equal((await rewardAccount(db,String(owner))).points,405);
 await assert.rejects(redeemPoints(db,String(referrer),{idempotencyKey:randomUUID()}),{code:'INVALID_TRANSITION'});
 assert.equal((await rewardAccount(db,String(referrer))).vouchers.length,0);
 });
 await t.test('voucher is server-priced, eligible only, sign-in required and tax recalculated',async()=>{
 const input={customer:shopper,items:[{productId:String(product),quantity:1}],voucherCode:code};
 await assert.rejects(service.quote(input),{code:'UNAUTHORIZED'});await assert.rejects(service.quote(input,String(referrer)),{code:'VOUCHER_UNAVAILABLE'});
 await assert.rejects(service.quote({...input,items:[{productId:String(medicine),quantity:1}]},String(owner)),{code:'VOUCHER_MINIMUM'});
 const quote=await service.quote(input,String(owner));assert.equal(quote.totalMinor,4000);assert.equal(quote.voucher?.discountMinor,1000);assert.equal(quote.taxMinor,190);
 const exclusive=calculateQuote(input,[item],{...approvedPolicy,vatMode:'exclusive'},{code,allocation:new Map([[String(product),1000]])});assert.equal(exclusive.totalMinor,4200);assert.equal(exclusive.taxMinor,200);
 });
 await t.test('concurrent checkouts cannot consume the voucher twice; replay and cancellation restore correctly',async()=>{
 const input={customer:shopper,items:[{productId:String(product),quantity:1}],voucherCode:code};const quote=await service.quote(input,String(owner));const intents=[0,1].map(()=>({...input,acceptedQuoteHash:quoteHash(quote),idempotencyKey:randomUUID()}));
 const results=await Promise.allSettled(intents.map(value=>service.checkout(value,String(owner))));assert.equal(results.filter(row=>row.status==='fulfilled').length,1);
 const index=results.findIndex(row=>row.status==='fulfilled'),row=results[index]!;if(row.status!=='fulfilled')throw Error('Missing order');
 assert.equal((await service.checkout(intents[index],String(owner))).id,row.value.id);
 assert.equal((await db.collection('products').findOne({_id:product}))!.stock,49);
 await service.transition(row.value.id,{status:'cancelled'},{id:actor,role:'admin',username:'admin',name:'Test'} as never);
 assert.equal((await rewardAccount(db,String(owner))).vouchers.length,1);
 assert.equal((await db.collection('products').findOne({_id:product}))!.stock,50);
 await db.collection('reward_vouchers').updateOne({code},{$set:{expiresAt:new Date(0)}});
 await assert.rejects(service.quote(input,String(owner)),{code:'VOUCHER_UNAVAILABLE'});
 });
 await t.test('refund reverses purchase and referral credits once',async()=>{
 const order=await db.collection('orders').findOne({orderId:'OD1'});await service.transition(String(order!._id),{status:'refunded'},{id:actor,role:'admin'} as never);await service.transition(String(order!._id),{status:'refunded'},{id:actor,role:'admin'} as never);
 assert.equal((await rewardAccount(db,String(owner))).points,-100);assert.equal((await rewardAccount(db,String(referrer))).points,0);
 await assert.rejects(redeemPoints(db,String(owner),{idempotencyKey:randomUUID()}),{code:'INVALID_TRANSITION'});
 });
 await t.test('saved lists isolate accounts and reject hidden products',async()=>{
 await updateCustomerSaved(db,String(owner),{productId:String(product)});await updateCustomerSaved(db,String(owner),{productId:String(product)});assert.deepEqual((await customerSaved(db,String(owner))).ids,[String(product)]);assert.deepEqual((await customerSaved(db,String(referrer))).ids,[]);
 await updateCustomerSaved(db,String(owner),{productId:String(product),remove:true});assert.deepEqual((await customerSaved(db,String(owner))).ids,[]);
 });
 await t.test('only owners can review; approval required and refunded orders excluded',async()=>{
 await db.collection('orders').insertOne({schemaVersion:2,orderId:'OD99',status:'confirmed',customer:{...shopper,email:'Buyer@Example.INVALID'},lines:[{productId:String(product)}]});
 const review={productId:String(product),orderId:'OD99',rating:5,displayName:'Verified shopper',title:'Helpful',body:'Synthetic test review, not real content.'};
 await assert.rejects(submitReview(db,{id:String(referrer),email:'referrer@example.invalid'},review),{code:'FORBIDDEN'});
 await submitReview(db,{id:String(owner),email:shopper.email},review);assert.equal((await publicReviews(db,String(product))).ratingCount,0);
 await moderateReview(db,{id:String(owner)+':'+String(product),status:'approved'},actor);assert.equal((await publicReviews(db,String(product))).ratingCount,1);
 await db.collection('orders').updateOne({orderId:'OD99'},{$set:{status:'refunded'}});assert.equal((await publicReviews(db,String(product))).ratingCount,0);
 });
 }finally{await db.dropDatabase();await client.close();}
});
