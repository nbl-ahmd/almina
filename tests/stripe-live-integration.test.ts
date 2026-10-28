import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {test} from 'node:test';
import {MongoClient,ObjectId,type Document} from 'mongodb';
import Stripe from 'stripe';
import {createStripePayments,prepareStripeStorage,type StripeTransport,type RefundSnapshot} from '../apps/api/src/modules/payments/stripe.js';
import {createCommerceService,quoteHash} from '../apps/api/src/modules/orders/commerce.js';
import {migrateCommerce} from '../scripts/migrations/commerce.js';
import {orderOutbox} from '../apps/api/src/modules/notifications/outbox.js';
const uri=process.env.COMMERCE_TEST_URI;assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1');
test('live-mode state machine with simulated provider and real isolated replica set', {skip:!uri},async t=>{
  assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client=await new MongoClient(uri!).connect(),db=client.db('almina_live_test_'+randomUUID().replaceAll('-',''));
  const category=new ObjectId(),admin={id:String(new ObjectId()),username:'synthetic',name:'Synthetic',role:'admin' as const,cities:[]};
  const customer={name:'Synthetic',email:'synthetic@example.invalid',mobile:'0500000000',emirate:'Ras al-Khaimah',city:'Synthetic City',address:'Synthetic address',payment:'stripe'};
  const sessions=new Map<string,Document>(),providerKeys=new Map<string,string>(),refundSnapshots=new Map<string,RefundSnapshot>(),refundKeys=new Set<string>();
  const secret='whsec_'+randomBytes(32).toString('hex'),sdk=new Stripe('sk_test_'+randomBytes(32).toString('hex'));
  let accountReady=true,refundBehavior:'succeeded'|'pending'|'failed'|'timeout'='succeeded',refundCalls=0,modeMismatch=false;
  const transport:StripeTransport={
    account:async()=>({id:'acct_synthetic',chargesEnabled:accountReady,payoutsEnabled:true}),
    create:async(params,key)=>{
      let id=providerKeys.get(key);if(!id){id='cs_live_'+randomUUID().replaceAll('-','');providerKeys.set(key,id);sessions.set(id,{id,livemode:!modeMismatch,mode:'payment',client_reference_id:params.client_reference_id,currency:'aed',amount_total:params.line_items![0]!.price_data!.unit_amount,status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/'+id,expires_at:params.expires_at,payment_intent:null});}return sessions.get(id);
    },
    retrieve:async id=>sessions.get(id),expire:async id=>{sessions.get(id)!.status='expired';return sessions.get(id);},verify:(body,signature)=>sdk.webhooks.constructEvent(body,signature,secret,300),
    refunds:async intent=>refundSnapshots.get(intent)??{succeededMinor:0,pendingMinor:0,failed:false},
    refund:async(intent,key)=>{
      refundCalls++;if(refundKeys.has(key))return;refundKeys.add(key);
      const remote=[...sessions.values()].find(s=>s.payment_intent?.id===intent)!;assert.ok(remote);
      remote.payment_intent.latest_charge.amount_refunded=refundBehavior==='failed'?0:remote.amount_total;
      remote.payment_intent.latest_charge.refunded=refundBehavior==='succeeded';
      refundSnapshots.set(intent,{succeededMinor:refundBehavior==='succeeded'?remote.amount_total:0,pendingMinor:['pending','timeout'].includes(refundBehavior)?remote.amount_total:0,failed:refundBehavior==='failed'});
      if(refundBehavior==='timeout')throw new Error('Synthetic timeout after provider acceptance');
    },
  };
  const payments=createStripePayments(async()=>db,{origin:'https://synthetic.invalid',testMode:false,accountId:'acct_synthetic',transport});
  const commerce=createCommerceService(async()=>db,payments);
  async function intent(){const id=new ObjectId();await db.collection('products').insertOne({_id:id,product_id:'PD'+id,name:'Synthetic',category,stock:5,price:20,vat:true});const input={customer,items:[{productId:String(id),quantity:1}],idempotencyKey:randomUUID()};return{...input,acceptedQuoteHash:quoteHash(await commerce.quote({customer,items:input.items}))};}
  async function remoteFor(orderId:string){const order=await db.collection('orders').findOne({orderId});assert.ok(order);return sessions.get(order.payment.sessionId)!;}
  function pay(remote:Document){remote.status='complete';remote.payment_status='paid';remote.payment_intent={id:'pi_'+randomUUID(),status:'succeeded',currency:'aed',amount_received:remote.amount_total,latest_charge:{currency:'aed',amount:remote.amount_total,amount_refunded:0,refunded:false,disputed:false}};}
  async function stock(input:Awaited<ReturnType<typeof intent>>){return(await db.collection('products').findOne({_id:new ObjectId(input.items[0]!.productId)}))!.stock;}
  async function order(orderId:string){const doc=await db.collection('orders').findOne({orderId});assert.ok(doc);return doc;}
  try{
    await db.collection('stores').insertOne({status:'open'});await db.collection('categories').insertOne({_id:category,name:'Synthetic'});await migrateCommerce(db);await prepareStripeStorage(db,true);await prepareStripeStorage(db,true);
    await t.test('readiness and mode mismatch fail closed before reserving stock',async()=>{
      const input=await intent();accountReady=false;await assert.rejects(payments.start(input),{code:'COMMERCE_UNAVAILABLE'});assert.equal(await stock(input),5);accountReady=true;
      modeMismatch=true;await assert.rejects(payments.start(input),{code:'SERVICE_UNAVAILABLE'});assert.equal(await stock(input),5);modeMismatch=false;
    });
    await t.test('pausing new payments keeps existing status, cancellation and retries available',async()=>{
      const input=await intent(),started=await payments.start(input);
      const paused=createStripePayments(async()=>db,{origin:'https://synthetic.invalid',testMode:false,accountId:'acct_synthetic',transport,acceptingPayments:false});
      assert.equal((await paused.availability()).available,false);
      await assert.rejects(paused.start(await intent()),{code:'COMMERCE_UNAVAILABLE'});
      assert.equal((await paused.start(input)).orderId,started.orderId);
      await paused.status({idempotencyKey:input.idempotencyKey},true);assert.equal(await stock(input),5);
    });
    await t.test('unpaid orders cannot fulfil or notify; verified payment queues once and permits normal dispatch',async()=>{
      const input=await intent(),started=await payments.start(input),doc=await order(started.orderId);
      assert.equal(started.testMode,false);assert.equal(started.paymentReceived,false);
      await assert.rejects(commerce.transition(String(doc._id),{status:'confirmed'},admin),{code:'INVALID_TRANSITION'});
      assert.equal(await db.collection('order_outbox').countDocuments({orderId:doc._id}),0);
      pay(await remoteFor(started.orderId));await Promise.all(Array.from({length:5},()=>payments.status({idempotencyKey:input.idempotencyKey})));
      assert.equal(await db.collection('order_outbox').countDocuments({orderId:doc._id}),1);
      assert.equal((await payments.status({idempotencyKey:input.idempotencyKey})).paymentReceived,true);
      await commerce.transition(String(doc._id),{status:'confirmed'},admin);await commerce.transition(String(doc._id),{status:'packed'},admin);await commerce.transition(String(doc._id),{status:'dispatched',billno:'12345',billamount:20},admin);
      assert.equal(await stock(input),4);assert.equal((await order(started.orderId)).status,'dispatched');
    });
    await t.test('under-capture or mismatched charge currency cannot mark an order paid',async()=>{
      const input=await intent(),started=await payments.start(input),doc=await order(started.orderId),remote=await remoteFor(started.orderId);pay(remote);
      for(const [field,value] of [['status','requires_capture'],['amount_received',1],['currency','usd']] as const){const previous=remote.payment_intent[field];remote.payment_intent[field]=value;await assert.rejects(payments.status({idempotencyKey:input.idempotencyKey}),{code:'SERVICE_UNAVAILABLE'});remote.payment_intent[field]=previous;}
      remote.payment_intent.latest_charge.currency='usd';await assert.rejects(commerce.transition(String(doc._id),{status:'confirmed'},admin),{code:'SERVICE_UNAVAILABLE'});
      assert.equal((await order(started.orderId)).payment.state,'awaiting_payment');assert.equal(await db.collection('order_outbox').countDocuments({orderId:doc._id}),0);
      remote.status='expired';remote.payment_status='unpaid';remote.payment_intent=null;await payments.status({idempotencyKey:input.idempotencyKey});assert.equal(await stock(input),5);
    });
    await t.test('paid cancellation fences dispatch, queues one refund, and restores exactly once after confirmation',async()=>{
      const input=await intent(),started=await payments.start(input),doc=await order(started.orderId);pay(await remoteFor(started.orderId));await payments.status({idempotencyKey:input.idempotencyKey});
      await assert.rejects(commerce.transition(String(doc._id),{status:'cancelled'},{...admin,role:'user',cities:['Synthetic City']}),{status:403});
      await assert.rejects(commerce.transition(String(doc._id),{status:'cancelled',billamount:1},admin),{code:'INVALID_REQUEST'});
      const before=refundCalls;await commerce.transition(String(doc._id),{status:'cancelled'},admin);
      assert.equal((await order(started.orderId)).payment.state,'refund_pending');assert.equal(await stock(input),4);assert.equal(refundCalls,before);
      await assert.rejects(commerce.transition(String(doc._id),{status:'dispatched',billno:'12345',billamount:20},admin,true),{code:'INVALID_TRANSITION'});
      await payments.reconcile();await payments.reconcile();
      assert.equal(refundCalls,before+1);assert.equal((await order(started.orderId)).status,'cancelled');assert.equal(await stock(input),5);
      await commerce.transition(String(doc._id),{status:'cancelled'},admin);assert.equal(await stock(input),5);
    });
    await t.test('pending and uncertain refunds do not restock or permit dispatch',async()=>{
      for(const behavior of ['pending','timeout'] as const){refundBehavior=behavior;
        const input=await intent(),started=await payments.start(input),doc=await order(started.orderId),remote=await remoteFor(started.orderId);pay(remote);await payments.status({idempotencyKey:input.idempotencyKey});
        await commerce.transition(String(doc._id),{status:'cancelled'},admin);const before=refundCalls;
        try{await payments.reconcile();}catch{/* An uncertain provider result is retried from durable state. */}
        await payments.reconcile();assert.equal(refundCalls,before+1);assert.equal(await stock(input),4);
        assert.equal((await order(started.orderId)).payment.state,'refund_pending');
        refundSnapshots.set(remote.payment_intent.id,{succeededMinor:remote.amount_total,pendingMinor:0,failed:false});remote.payment_intent.latest_charge.refunded=true;
        await payments.reconcile();assert.equal(await stock(input),5);assert.equal((await order(started.orderId)).status,'cancelled');
      }refundBehavior='succeeded';
    });
    await t.test('post-dispatch and dashboard refunds never invent returned stock; partial refunds and disputes block fulfilment',async()=>{
      const input=await intent(),started=await payments.start(input),doc=await order(started.orderId),remote=await remoteFor(started.orderId);pay(remote);await payments.status({idempotencyKey:input.idempotencyKey});
      remote.payment_intent.latest_charge.amount_refunded=500;refundSnapshots.set(remote.payment_intent.id,{succeededMinor:500,pendingMinor:0,failed:false});
      await payments.status({idempotencyKey:input.idempotencyKey});await assert.rejects(commerce.transition(String(doc._id),{status:'confirmed'},admin),{code:'INVALID_TRANSITION'});assert.equal(await stock(input),4);
      remote.payment_intent.latest_charge.amount_refunded=remote.amount_total;remote.payment_intent.latest_charge.refunded=true;refundSnapshots.set(remote.payment_intent.id,{succeededMinor:remote.amount_total,pendingMinor:0,failed:false});
      await payments.status({idempotencyKey:input.idempotencyKey});assert.equal((await order(started.orderId)).status,'refunded');assert.equal(await stock(input),4);
      const second=await intent(),secondStarted=await payments.start(second),secondDoc=await order(secondStarted.orderId),secondRemote=await remoteFor(secondStarted.orderId);pay(secondRemote);await payments.status({idempotencyKey:second.idempotencyKey});
      await commerce.transition(String(secondDoc._id),{status:'dispatched',billno:'54321',billamount:20},admin,true);
      await assert.rejects(commerce.transition(String(secondDoc._id),{status:'cancelled'},admin),{code:'INVALID_TRANSITION'});
      await commerce.transition(String(secondDoc._id),{status:'refunded'},admin);await payments.reconcile();assert.equal((await order(secondStarted.orderId)).status,'refunded');assert.equal(await stock(second),4);
      const third=await intent(),thirdStarted=await payments.start(third),thirdDoc=await order(thirdStarted.orderId),thirdRemote=await remoteFor(thirdStarted.orderId);pay(thirdRemote);thirdRemote.payment_intent.latest_charge.disputed=true;
      await payments.status({idempotencyKey:third.idempotencyKey});await assert.rejects(commerce.transition(String(thirdDoc._id),{status:'confirmed'},admin),{code:'INVALID_TRANSITION'});
      transport.disputeBlocksFulfillment=async()=>false;await payments.status({idempotencyKey:third.idempotencyKey});await commerce.transition(String(thirdDoc._id),{status:'confirmed'},admin);delete transport.disputeBlocksFulfillment;
    });
    await t.test('a dispute opening after cancellation is requested stops automatic refunds',async()=>{
      const input=await intent(),started=await payments.start(input),doc=await order(started.orderId),remote=await remoteFor(started.orderId);pay(remote);await payments.status({idempotencyKey:input.idempotencyKey});
      await commerce.transition(String(doc._id),{status:'cancelled'},admin);remote.payment_intent.latest_charge.disputed=true;
      const before=refundCalls;await payments.reconcile();assert.equal(refundCalls,before);assert.equal(await stock(input),4);assert.match((await order(started.orderId)).payment.refundIssue,/Dispute/);
    });
    await t.test('failed refunds are visible and do not repeatedly initiate money movements',async()=>{
      refundBehavior='failed';const input=await intent(),started=await payments.start(input),doc=await order(started.orderId),remote=await remoteFor(started.orderId);pay(remote);await payments.status({idempotencyKey:input.idempotencyKey});
      await commerce.transition(String(doc._id),{status:'cancelled'},admin);const before=refundCalls;await payments.reconcile();await payments.reconcile();assert.equal(refundCalls,before+1);
      assert.equal(await stock(input),4);assert.ok((await order(started.orderId)).payment.refundIssue);refundBehavior='succeeded';
    });
    await t.test('refund webhooks verify mode and queued emails stop after payment state changes',async()=>{
      const input=await intent(),started=await payments.start(input),doc=await order(started.orderId),remote=await remoteFor(started.orderId);pay(remote);await payments.status({idempotencyKey:input.idempotencyKey});
      const raw=JSON.stringify({id:'evt_synthetic',livemode:true,type:'charge.refunded',data:{object:{payment_intent:remote.payment_intent.id}}});
      remote.payment_intent.latest_charge.refunded=true;remote.payment_intent.latest_charge.amount_refunded=remote.amount_total;refundSnapshots.set(remote.payment_intent.id,{succeededMinor:remote.amount_total,pendingMinor:0,failed:false});
      await payments.webhook(Buffer.from(raw),sdk.webhooks.generateTestHeaderString({payload:raw,secret}));assert.equal((await order(started.orderId)).status,'refunded');
      const wrong=raw.replace('"livemode":true','"livemode":false');await assert.rejects(payments.webhook(Buffer.from(wrong),sdk.webhooks.generateTestHeaderString({payload:wrong,secret})),{code:'INVALID_REQUEST'});
      let sent=0;await db.collection('order_outbox').deleteMany({orderId:{$ne:doc._id}});await db.collection('order_outbox').updateOne({orderId:doc._id},{$set:{state:'pending'}});
      const worker=orderOutbox(async()=>db,{send:async()=>{sent++;},onFailure:()=>assert.fail('Unexpected notification failure')});try{await worker.tick();}finally{await worker.stop();}assert.equal(sent,0);
    });
  }finally{assert.match(db.databaseName,/^almina_live_test_[a-f0-9]{32}$/);await db.dropDatabase();await client.close();}
});
