import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import Stripe from 'stripe';
import {MongoClient,ObjectId,type Document} from 'mongodb';
import {createLogger} from '@almina/config/logger';
import {createStripePayments,prepareStripeStorage,type StripeTransport} from '../apps/api/src/modules/payments/stripe.js';
import {createCommerceService,quoteHash} from '../apps/api/src/modules/orders/commerce.js';
import {createApp} from '../apps/api/src/app.js';
import {migrateCommerce} from '../scripts/migrations/commerce.js';
const uri=process.env.COMMERCE_TEST_URI;
assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1');
test('Stripe test payments on disposable replica set', {skip:!uri},async t=>{
  assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client=await new MongoClient(uri!).connect(),db=client.db('almina_stripe_test_'+randomUUID().replaceAll('-',''));
  const signingSecret='whsec_'+randomBytes(32).toString('hex');
  const sdk=new Stripe('sk_test_'+randomBytes(32).toString('hex'));
  const sessions=new Map<string,Document>(),providerKeys=new Map<string,string>();
  let createCalls=0,uncertain=false,expires=0;
  const transport:StripeTransport={
    async create(params,key){
      createCalls++;assert.deepEqual(params.adaptive_pricing,{enabled:false});assert.deepEqual(params.allowed_payment_method_types,['card']);
      let id=providerKeys.get(key);
      if(!id){id='cs_test_'+randomUUID().replaceAll('-','');providerKeys.set(key,id);sessions.set(id,{id,livemode:false,mode:'payment',client_reference_id:params.client_reference_id,currency:'aed',amount_total:params.line_items![0]!.price_data!.unit_amount,status:'open',payment_status:'unpaid',url:'https://checkout.stripe.com/c/pay/'+id,expires_at:params.expires_at,payment_intent:null});}
      if(uncertain){uncertain=false;throw new Error('Synthetic provider timeout after creation');}
      return sessions.get(id);
    },
    async retrieve(id){assert.ok(sessions.has(id));return sessions.get(id);},
    async expire(id){expires++;sessions.get(id)!.status='expired';return sessions.get(id);},
    verify:(body,signature)=>sdk.webhooks.constructEvent(body,signature,signingSecret,300),
  };
  const payments=createStripePayments(async()=>db,{origin:'http://localhost:3000',transport}),commerce=createCommerceService(async()=>db);
  const customer={name:'Synthetic',mobile:'0501234567',email:'test@example.invalid',emirate:'Ras al-Khaimah',city:'City A',address:'Synthetic address',payment:'stripe'};
  const category=new ObjectId();
  async function intent(stock=4){
    const id=new ObjectId();await db.collection('products').insertOne({_id:id,product_id:'PD'+id,name:'Synthetic product',category,price:20,stock,vat:true});
    const body={customer,items:[{productId:String(id),quantity:1}],idempotencyKey:randomUUID()};
    return {...body,acceptedQuoteHash:quoteHash(await commerce.quote({customer,items:body.items}))};
  }
  async function remoteFor(orderId:string){const order=await db.collection('orders').findOne({orderId});assert.ok(order);return sessions.get(order.payment.sessionId)!;}
  function paid(remote:Document){remote.status='complete';remote.payment_status='paid';remote.payment_intent={id:'pi_'+randomUUID(),latest_charge:{amount:remote.amount_total,amount_refunded:0,refunded:false}};}
  function event(remote:Document,type='checkout.session.completed'){return JSON.stringify({id:'evt_'+randomUUID(),livemode:false,type,data:{object:{id:remote.id,client_reference_id:remote.client_reference_id}}});}
  async function deliver(remote:Document,type?:string){const body=event(remote,type);await payments.webhook(Buffer.from(body),sdk.webhooks.generateTestHeaderString({payload:body,secret:signingSecret}));}
  try{
    await db.collection('stores').insertOne({status:'open'});await db.collection('categories').insertOne({_id:category,name:'Synthetic'});await migrateCommerce(db);await prepareStripeStorage(db,true);await prepareStripeStorage(db,true);
    await t.test('default checkout cannot bypass provider; forged price and quote fail before stock mutation',async()=>{
      const body=await intent();await assert.rejects(commerce.checkout(body),{code:'INVALID_REQUEST'});
      await assert.rejects(payments.start({...body,totalMinor:1}),{code:'INVALID_REQUEST'});
      await assert.rejects(payments.start({...body,acceptedQuoteHash:'0'.repeat(64)}),{code:'PRICE_CHANGED'});
      assert.equal(await db.collection('orders').countDocuments(),0);assert.equal(createCalls,0);
    });
    await t.test('concurrent retries reserve once, send no notifications, block fulfilment, verify payment and full refund once',async()=>{
      const body=await intent();const outcomes=await Promise.all(Array.from({length:8},()=>payments.start(body)));
      assert.equal(new Set(outcomes.map(x=>x.orderId)).size,1);assert.equal(outcomes[0]!.state,'awaiting_payment');
      assert.equal(await db.collection('order_outbox').countDocuments(),0);
      assert.equal((await db.collection('products').findOne({_id:new ObjectId(body.items[0]!.productId)}))!.stock,3);
      const doc=await db.collection('orders').findOne({orderId:outcomes[0]!.orderId});
      await assert.rejects(commerce.transition(String(doc!._id),{status:'confirmed'},{id:String(new ObjectId()),name:'Test',username:'test',role:'admin',cities:[]}),{code:'INVALID_TRANSITION'});
      await assert.rejects(payments.start({...body,customer:{...body.customer,name:'Changed'}}),{code:'IDEMPOTENCY_CONFLICT'});
      const remote=await remoteFor(outcomes[0]!.orderId);await deliver(remote);assert.equal((await payments.status({idempotencyKey:body.idempotencyKey})).state,'awaiting_payment');
      paid(remote);await Promise.all(Array.from({length:5},()=>deliver(remote)));assert.equal((await payments.status({idempotencyKey:body.idempotencyKey})).state,'paid');
      remote.payment_intent.latest_charge.amount_refunded=remote.amount_total;remote.payment_intent.latest_charge.refunded=true;
      await Promise.all([payments.reconcile(),payments.status({idempotencyKey:body.idempotencyKey})]);
      assert.equal((await payments.status({idempotencyKey:body.idempotencyKey})).state,'refunded');
      assert.equal((await db.collection('products').findOne({_id:new ObjectId(body.items[0]!.productId)}))!.stock,4);
      await deliver(remote,'checkout.session.expired');assert.equal((await payments.status({idempotencyKey:body.idempotencyKey})).state,'refunded');
      assert.equal(await db.collection('order_outbox').countDocuments(),0);
    });
    await t.test('provider uncertainty reserves no stock; retry reuses the same remote session',async()=>{
      const body=await intent();uncertain=true;await assert.rejects(payments.start(body));
      assert.equal((await db.collection('products').findOne({_id:new ObjectId(body.items[0]!.productId)}))!.stock,4);
      const before=sessions.size;await payments.start(body);assert.equal(sessions.size,before);
      const stale=await intent();uncertain=true;await assert.rejects(payments.start(stale));
      const attempts=db.collection('stripe_test_attempts');const last=await attempts.findOne({sessionId:{$exists:false}});assert.ok(last);
      await attempts.updateOne({_id:last._id},{$set:{expiresAt:new Date(Date.now()+5*60000)}});
      const calls=createCalls;await assert.rejects(payments.start(stale),{code:'INVALID_TRANSITION'});assert.equal(createCalls,calls);
      assert.equal((await db.collection('products').findOne({_id:new ObjectId(stale.items[0]!.productId)}))!.stock,4);
    });
    await t.test('cancellation expires at provider first and releases once; paid cancel races never release paid stock',async()=>{
      const body=await intent();const started=await payments.start(body);
      await Promise.all(Array.from({length:5},()=>payments.status({idempotencyKey:body.idempotencyKey},true)));
      assert.equal((await payments.status({idempotencyKey:body.idempotencyKey})).state,'expired');
      assert.equal((await db.collection('products').findOne({_id:new ObjectId(body.items[0]!.productId)}))!.stock,4);
      const second=await intent();const started2=await payments.start(second),remote=await remoteFor(started2.orderId);paid(remote);const before=expires;
      assert.equal((await payments.status({idempotencyKey:second.idempotencyKey},true)).state,'paid');assert.equal(expires,before);
      assert.equal((await db.collection('products').findOne({_id:new ObjectId(second.items[0]!.productId)}))!.stock,3);
      assert.ok(started.orderId);
    });
    await t.test('last unit concurrency cannot oversell and lost expiry webhooks reconcile',async()=>{
      const body=await intent(1);const outcomes=await Promise.allSettled([payments.start(body),payments.start({...body,idempotencyKey:randomUUID()})]);
      assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
      const success=outcomes.find(x=>x.status==='fulfilled');assert.ok(success&&success.status==='fulfilled');
      const remote=await remoteFor(success.value.orderId);remote.status='expired';await payments.reconcile();
      assert.equal((await db.collection('products').findOne({_id:new ObjectId(body.items[0]!.productId)}))!.stock,1);
    });
    await t.test('tampered amount, live mode, currency and session association cannot mark paid',async()=>{
      const body=await intent();const result=await payments.start(body),remote=await remoteFor(result.orderId);paid(remote);
      for(const [field,value] of [['amount_total',1],['livemode',true],['currency','usd'],['client_reference_id','0'.repeat(64)],['id','cs_test_other']] as const){const original=remote[field];remote[field]=value;await assert.rejects(payments.status({idempotencyKey:body.idempotencyKey}),{code:'SERVICE_UNAVAILABLE'});remote[field]=original;}
    });
    await t.test('real HTTP raw-body signature, stale signature, CSRF and disabled boundaries',async()=>{
      const app=createApp({database:{mode:'enabled',checkReadiness:async()=>true},getDb:async()=>db,logger:createLogger({service:'api',environment:'development',write:()=>undefined}),webOrigin:'http://localhost:3000',development:true,stripePayments:payments});
      const server=createServer(app);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');const origin='http://127.0.0.1:'+address.port;
      try{
        const body=await intent(),headers={Origin:'http://localhost:3000','X-CSRF-Protection':'1','Content-Type':'application/json'};
        const response=await fetch(origin+'/api/v1/payments/stripe/start',{method:'POST',headers,body:JSON.stringify(body)});assert.equal(response.status,200);
        const payload=await response.json(),remote=await remoteFor(payload.data.orderId);paid(remote);const raw=event(remote);
        const endpoint=origin+'/api/v1/payments/stripe/webhook';
        for(const signature of ['invalid',sdk.webhooks.generateTestHeaderString({payload:raw,secret:signingSecret,timestamp:1})])assert.equal((await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':signature},body:raw})).status,400);
        const unrelated=JSON.stringify({id:'evt_unrelated',livemode:false,type:'checkout.session.expired',data:{object:{id:'cs_test_other_application',client_reference_id:null}}});
        assert.equal((await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':sdk.webhooks.generateTestHeaderString({payload:unrelated,secret:signingSecret})},body:unrelated})).status,200);
        const signature=sdk.webhooks.generateTestHeaderString({payload:raw,secret:signingSecret});
        assert.equal((await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':signature},body:raw+' '})).status,400);
        for(let i=0;i<2;i++)assert.equal((await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':signature},body:raw})).status,200);
        assert.equal((await payments.status({idempotencyKey:body.idempotencyKey})).state,'paid');
        assert.equal((await fetch(origin+'/api/v1/payments/stripe/status',{method:'POST',headers:{...headers,Origin:'https://other.invalid'},body:JSON.stringify({idempotencyKey:body.idempotencyKey})})).status,403);
      }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
      const disabled=createStripePayments(async()=>db);await assert.rejects(disabled.start({}),{status:404});
      // The retained mount executes this exact app before its legacy JSON/body boundary.
      const require=createRequire(import.meta.url),{createLegacyApp}=require('../backend/app.js');const retained=createLegacyApp({getCommerceDb:()=>db,origins:['http://localhost:3000'],development:true,routers:{}});
      assert.equal(retained.locals.stripePayments.enabled,false);
    });
  }finally{assert.match(db.databaseName,/^almina_stripe_test_[a-f0-9]{32}$/);await db.dropDatabase();await client.close();}
});
