import { releaseCoupon } from '../coupons/service.js';
import { branchOrderFilter } from '../orders/routing.js';
import { restoreBranch } from '../delivery/service.js';
import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { ObjectId, type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { checkoutInputSchema, stripeStatusInputSchema, type Staff, type OrderStatus } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { createCommerceService, normalizeItems, quoteHash } from '../orders/commerce.js';
import { orderFilter } from '../orders/repository.js';
import { reverseOrderRewards } from '../growth/rewards.js';

const sessionSchema = z.object({
  id:z.string().regex(/^cs_(test|live)_[A-Za-z0-9]+$/), livemode:z.boolean(), mode:z.literal('payment'),
  client_reference_id:z.string(), currency:z.literal('aed'), amount_total:z.number().int().positive(),
  status:z.enum(['open','complete','expired']), payment_status:z.enum(['paid','unpaid','no_payment_required']),
  url:z.string().nullable(), expires_at:z.number().int(),
  payment_intent:z.union([z.string(),z.object({id:z.string(),status:z.string().optional(),currency:z.string().optional(),amount_received:z.number().int().nonnegative().optional(),latest_charge:z.union([z.string(),z.object({amount:z.number().int(),amount_refunded:z.number().int().nonnegative(),currency:z.string().optional(),refunded:z.boolean(),disputed:z.boolean().optional()})]).nullable()})]).nullable(),
});
type Session = z.infer<typeof sessionSchema>;
export type RefundSnapshot={succeededMinor:number;pendingMinor:number;failed:boolean};
export interface StripeTransport {
  create(params:Stripe.Checkout.SessionCreateParams, key:string):Promise<unknown>;
  retrieve(id:string):Promise<unknown>;
  expire(id:string):Promise<unknown>;
  verify(body:Buffer, signature:string):unknown;
  refunds?(intentId:string):Promise<RefundSnapshot>;
  disputeBlocksFulfillment?(intentId:string):Promise<boolean>;
  refund?(intentId:string,key:string):Promise<unknown>;
  account?():Promise<{id:string;chargesEnabled:boolean;payoutsEnabled:boolean}>;
}
export type StripeOptions={origin:string;transport:StripeTransport;testMode?:boolean;accountId?:string;acceptingPayments?:boolean};
export function stripeOptions(env:Readonly<Record<string,string|undefined>>):StripeOptions|undefined {
  const live=env.STRIPE_LIVE_ENABLED==='true', test=env.STRIPE_TEST_ENABLED==='true';
  if(!live&&!test)return;
  if(live&&test)throw new Error('Stripe modes must be isolated');
  if(live ? env.APP_ENV!=='production'||env.DATABASE_ENV!=='production'||!/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_ACCOUNT_ID??'')
    : !['development','staging'].includes(env.APP_ENV??'')||env.DATABASE_ENV==='production')throw new Error('Stripe environment invalid');
  if(!(live?/^(sk|rk)_live_[A-Za-z0-9]+$/:/^(sk|rk)_test_[A-Za-z0-9]+$/).test(env.STRIPE_SECRET_KEY??'')
    ||!/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET??''))throw new Error('Stripe credentials invalid');
  const origin=new URL(env.WEB_ORIGIN??env.GROWTH_WEB_ORIGIN??'');
  if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash
    ||(origin.protocol!=='https:'&&!(env.APP_ENV==='development'&&origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname))))throw new Error('Stripe origin invalid');
  const stripe=new Stripe(env.STRIPE_SECRET_KEY!,{maxNetworkRetries:1,timeout:7000});
  return {origin:origin.origin,testMode:!live,...(live?{accountId:env.STRIPE_ACCOUNT_ID!,acceptingPayments:env.STRIPE_LIVE_ACCEPTING_PAYMENTS==='true'}:{}),transport:{
    create:(params,key)=>stripe.checkout.sessions.create(params,{idempotencyKey:key}),
    retrieve:id=>stripe.checkout.sessions.retrieve(id,{expand:['payment_intent.latest_charge']}),
    expire:id=>stripe.checkout.sessions.expire(id),
    verify:(body,signature)=>stripe.webhooks.constructEvent(body,signature,env.STRIPE_WEBHOOK_SECRET!,300),
    account:async()=>{const a=await stripe.accounts.retrieve(null);return{id:a.id,chargesEnabled:a.charges_enabled,payoutsEnabled:a.payouts_enabled};},
    refunds:async intentId=>{
      const list=await stripe.refunds.list({payment_intent:intentId,limit:100});
      if(list.has_more||list.data.some(r=>!Number.isSafeInteger(r.amount)||r.amount<=0||r.currency!=='aed'||!['succeeded','pending','requires_action','failed','canceled'].includes(r.status??'')))throw new HttpError(503,'SERVICE_UNAVAILABLE');
      return {succeededMinor:list.data.filter(r=>r.status==='succeeded').reduce((sum,r)=>sum+r.amount,0),pendingMinor:list.data.filter(r=>['pending','requires_action'].includes(r.status??'')).reduce((sum,r)=>sum+r.amount,0),failed:list.data.some(r=>r.status==='failed'||r.status==='canceled')};
    },
    disputeBlocksFulfillment:async intentId=>{
      const list=await stripe.disputes.list({payment_intent:intentId,limit:100});
      if(list.has_more)throw new HttpError(503,'SERVICE_UNAVAILABLE');
      return list.data.some(dispute=>!['won','warning_closed'].includes(dispute.status));
    },
    refund:(intentId,key)=>stripe.refunds.create({payment_intent:intentId,metadata:{almina_request:key}},{idempotencyKey:key}),
  }};
}
// Retained alias for existing sandbox tooling; credentials remain strictly mode-bound.
export const stripeTestOptions=stripeOptions;
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const transaction={readConcern:{level:'snapshot' as const},writeConcern:{w:'majority' as const},readPreference:'primary' as const};
export function createStripePayments(getDb:()=>Promise<Db>, options?:StripeOptions, onPaid?:(order:{id:string;orderId:string})=>void) {
  const testMode=options?.testMode!==false;
  const collection=testMode?'stripe_test_attempts':'stripe_payment_attempts';
  const selector={'payment.provider':'stripe','payment.testMode':testMode};
  function configured(){if(!options)throw new HttpError(404,'NOT_FOUND');return options;}
  const commerce=createCommerceService(getDb);
  async function attemptFor(key:string){
    const attempt=await(await getDb()).collection<Document&{_id:string}>(collection).findOne({_id:key});
    if(!attempt)throw new HttpError(404,'NOT_FOUND');return attempt;
  }
  function matches(remote:Session,attempt:Document){
    return remote.livemode===!testMode&&remote.id.startsWith(testMode?'cs_test_':'cs_live_')&&remote.client_reference_id===attempt._id&&remote.amount_total===attempt.totals.totalMinor&&remote.expires_at===Math.floor(attempt.expiresAt.getTime()/1000);
  }
  async function verifiedSession(attempt:Document):Promise<Session>{
    const parsed=sessionSchema.safeParse(await configured().transport.retrieve(attempt.sessionId));
    if(!parsed.success||parsed.data.id!==attempt.sessionId||!matches(parsed.data,attempt))throw new HttpError(503,'SERVICE_UNAVAILABLE');
    if(!testMode&&parsed.data.payment_status==='paid'){
      const pi=typeof parsed.data.payment_intent==='object'?parsed.data.payment_intent:null;
      const charge=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;
      if(!pi||pi.status!=='succeeded'||pi.currency!=='aed'||pi.amount_received!==parsed.data.amount_total||!charge||charge.currency!=='aed'||charge.amount!==parsed.data.amount_total||charge.amount_refunded>charge.amount)throw new HttpError(503,'SERVICE_UNAVAILABLE');
    }
    return parsed.data;
  }
  async function synchronize(key:string){
    const attempt=await attemptFor(key);if(!attempt.sessionId)return;
    const remote=await verifiedSession(attempt),pi=typeof remote.payment_intent==='object'?remote.payment_intent:null;
    const intentId=pi?.id??(typeof remote.payment_intent==='string'?remote.payment_intent:null);
    const charge=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;
    const paid=remote.status==='complete'&&remote.payment_status==='paid';
    let refunds:RefundSnapshot={succeededMinor:0,pendingMinor:0,failed:false};
    if(paid&&intentId&&(!testMode||charge?.amount_refunded)){
      if(configured().transport.refunds)refunds=await configured().transport.refunds!(intentId);
      else if(testMode&&charge)refunds.succeededMinor=charge.refunded?remote.amount_total:charge.amount_refunded;
      else throw new HttpError(503,'SERVICE_UNAVAILABLE');
    }
    if(!Number.isSafeInteger(refunds.succeededMinor)||!Number.isSafeInteger(refunds.pendingMinor)||refunds.succeededMinor<0||refunds.pendingMinor<0)throw new HttpError(503,'SERVICE_UNAVAILABLE');
    const fullRefund=paid&&refunds.succeededMinor===remote.amount_total&&charge?.amount===remote.amount_total;
    if(refunds.succeededMinor>remote.amount_total||refunds.pendingMinor>remote.amount_total)throw new HttpError(503,'SERVICE_UNAVAILABLE');
    const disputed=charge?.disputed&&(intentId&&configured().transport.disputeBlocksFulfillment?await configured().transport.disputeBlocksFulfillment!(intentId):true);
    const observed=fullRefund?'refunded':disputed?'disputed':refunds.pendingMinor>0?'refund_pending':refunds.succeededMinor>0?'partially_refunded':paid?'paid':remote.status==='expired'?'expired':null;
    const db=await getDb(),session=db.client.startSession();
    let notification:{id:string;orderId:string}|undefined;
    try{await session.withTransaction(async()=>{
      notification=undefined;
      const order=await db.collection('orders').findOne({...selector,'payment.attemptId':key},{session});
      if(!order)return;
      const current=order.payment.state;
      const refundReversed=!testMode&&current==='refunded'&&refunds.failed&&!fullRefund;
      const next=fullRefund?'refunded':refundReversed||order.payment.refundIssue?'refund_pending':current==='refunded'||current==='expired'?current:order.payment.refundRequested&&!fullRefund?'refund_pending':observed??current;
      const now=new Date(),fields:Document={'payment.state':next,'payment.checkedAt':now,...(intentId?{'payment.paymentIntentId':intentId}:{})};
      if(paid&&!order.payment.paidAt)fields['payment.paidAt']=now;
      fields['payment.refundedMinor']=refunds.succeededMinor;fields['payment.refundPendingMinor']=refunds.pendingMinor;
      if((order.payment.refundRequested||refundReversed)&&refunds.failed)fields['payment.refundIssue']='Review failed refund in Stripe';
      if(next!==current){
        const expired=next==='expired',refunded=next==='refunded';
        // A monetary refund never proves that dispatched goods have returned.
        const restore=expired||(refunded&&(testMode||order.payment.restoreOnRefund===true));
        if(restore&&!order.inventory.restored){for(const line of order.lines){
          const result=await db.collection('products').updateOne({_id:new ObjectId(line.productId),stock:{$gte:0,$lte:Number.MAX_SAFE_INTEGER-line.quantity,$mod:[1,0]}},{$inc:{stock:line.quantity}},{session});
          if(result.modifiedCount!==1)throw new HttpError(409,'INSUFFICIENT_STOCK');
        }await restoreBranch(db,session,order);fields['inventory.restored']=true;}
        if(expired||refunded){
          const status=expired||order.payment.cancellationRequested?'cancelled':'refunded';
          Object.assign(fields,{status,canceled:status==='cancelled',statusHistory:[...(order.statusHistory??[]),{status,at:now,source:testMode?'stripe_test':'stripe'}]});
          if (expired) await releaseCoupon(db, session, order);
          if(!testMode)await reverseOrderRewards(db,session,order);
        }
      }
      await db.collection('orders').updateOne({_id:order._id},{$set:fields,...(fullRefund?{$unset:{'payment.refundIssue':''}}:{})},{session});
      if(!testMode&&next==='paid'&&!order.payment.refundRequested){
        const jobs=db.collection<Document&{_id:string}>('order_outbox'),jobId=`confirmation:${order._id}`;
        const queued=await jobs.updateOne({_id:jobId},{$setOnInsert:{orderId:order._id,type:'confirmation',state:'pending',attempts:0,createdAt:now}},{session,upsert:true});
        const resumed=await jobs.updateOne({_id:jobId,state:'cancelled'},{$set:{state:'pending'}},{session});
        if(queued.upsertedCount||resumed.modifiedCount)notification={id:String(order._id),orderId:order.orderId};
      }
      if(!testMode&&['refunded','expired','refund_pending','partially_refunded','disputed'].includes(next)){
        await db.collection('order_outbox').updateOne({orderId:order._id,state:'pending'},{$set:{state:'cancelled',pushState:'done'}},{session});
      }
    },transaction);}finally{await session.endSession();}
    if(notification){try{onPaid?.(notification);}catch{/* Durable confirmation/push jobs do not depend on realtime delivery. */}}
  }
  async function finishRequestedRefund(key:string){
    if(testMode)return;
    const db=await getDb(),order=await db.collection('orders').findOne({...selector,'payment.attemptId':key,'payment.refundRequested':true});
    if(!order||order.payment.state==='refunded'||order.payment.refundIssue)return;
    const remote=await verifiedSession(await attemptFor(key));
    const intentId=typeof remote.payment_intent==='object'?remote.payment_intent?.id:remote.payment_intent;
    if(!intentId||remote.payment_status!=='paid'||!configured().transport.refund||!configured().transport.refunds)throw new HttpError(503,'SERVICE_UNAVAILABLE');
    const pi=typeof remote.payment_intent==='object'?remote.payment_intent:null;
    const charge=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;
    if(charge?.disputed&&(!configured().transport.disputeBlocksFulfillment||await configured().transport.disputeBlocksFulfillment!(intentId))){
      await db.collection('orders').updateOne({_id:order._id},{$set:{'payment.refundIssue':'Dispute requires review before refund'}});return;
    }
    const refunds=await configured().transport.refunds!(intentId);
    if(refunds.succeededMinor>=remote.amount_total||refunds.pendingMinor>0)return;
    if(refunds.failed){await db.collection('orders').updateOne({_id:order._id},{$set:{'payment.refundIssue':'Review failed refund in Stripe'}});return;}
    // Bound automatic retries to the provider's idempotency retention window.
    if(!(order.payment.refundRequestedAt instanceof Date)||Date.now()-order.payment.refundRequestedAt.getTime()>20*3600000){
      await db.collection('orders').updateOne({_id:order._id},{$set:{'payment.refundIssue':'Manual refund reconciliation required'}});return;
    }
    await configured().transport.refund!(intentId,'almina-live-refund-'+key);
  }
  async function response(key:string){
    const attempt=await attemptFor(key),order=await(await getDb()).collection('orders').findOne({...selector,'payment.attemptId':key});
    if(!order)throw new HttpError(404,'NOT_FOUND');
    return {orderId:order.orderId,state:order.payment.state,checkoutUrl:order.payment.state==='awaiting_payment'?attempt.checkoutUrl:null,testMode,
      ...(order.createdAt instanceof Date ? {createdAt:order.createdAt.toISOString()}:{}),totals:order.totals,paymentReceived:!!order.payment.paidAt||['paid','partially_refunded','refund_pending','refunded','disputed'].includes(order.payment.state)};
  }
  async function accountReady(){
    try{const account=await configured().transport.account?.();return !!account&&account.id===options?.accountId&&account.chargesEnabled&&account.payoutsEnabled;}catch{return false;}
  }
  return {
    enabled:!!options,
    async availability(){const ready=!!options&&(testMode||await accountReady());return {available:ready&&options?.acceptingPayments!==false,ready,testMode};},
    async start(raw:unknown){
      const config=configured();
      const parsed=checkoutInputSchema.safeParse(raw);
      if(!parsed.success||parsed.data.customer.payment!=='stripe'||!parsed.data.acceptedQuoteHash||parsed.data.voucherCode)throw new HttpError(400,'INVALID_REQUEST');
      const input=parsed.data;input.items=normalizeItems(input.items);
      const key=digest(input.idempotencyKey),fingerprint=digest(JSON.stringify({customer:input.customer,items:input.items,quoteHash:input.acceptedQuoteHash,...(input.couponCode ? {couponCode:input.couponCode} : {})}));
      const db=await getDb(),attempts=db.collection<Document&{_id:string}>(collection);
      let attempt=await attempts.findOne({_id:key});
      if(attempt){
        if(attempt.fingerprint!==fingerprint)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');
        if(await db.collection('orders').findOne({...selector,'payment.attemptId':key},{projection:{_id:1}})){await synchronize(key);return response(key);}
      }
      if(config.acceptingPayments===false)throw new HttpError(409,'COMMERCE_UNAVAILABLE');
      if(!testMode&&!await accountReady())throw new HttpError(409,'COMMERCE_UNAVAILABLE');
      if(!attempt){
        const totals=await commerce.quote({customer:input.customer,items:input.items,...(input.couponCode ? {couponCode:input.couponCode} : {})});
        if(quoteHash(totals)!==input.acceptedQuoteHash)throw new HttpError(409,'PRICE_CHANGED');
        if(totals.totalMinor<200||totals.totalMinor>99999999)throw new HttpError(400,'INVALID_REQUEST');
        const expiresAt=new Date(Math.floor(Date.now()/1000)*1000+3600000);
        try{await attempts.updateOne({_id:key},{$setOnInsert:{fingerprint,totals,expiresAt,testMode,createdAt:new Date()}},{upsert:true});}catch(error){if(!(typeof error==='object'&&error!==null&&'code' in error&&error.code===11000))throw error;}
        attempt=await attemptFor(key);
      }
      if(attempt.fingerprint!==fingerprint)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');
      if(!attempt.sessionId){
        if(attempt.expiresAt.getTime()<Date.now()+30*60000)throw new HttpError(409,'INVALID_TRANSITION');
        const created=sessionSchema.safeParse(await config.transport.create({mode:'payment',adaptive_pricing:{enabled:false},automatic_tax:{enabled:false},allowed_payment_method_types:['card'],
          client_reference_id:key,expires_at:Math.floor(attempt.expiresAt.getTime()/1000),
          line_items:[{price_data:{currency:'aed',unit_amount:attempt.totals.totalMinor,product_data:{name:testMode?'Al Mina Pharmacy — test checkout':'Al Mina Pharmacy order'}},quantity:1}],
          success_url:config.origin+'/checkout/stripe?result=returned',cancel_url:config.origin+'/checkout/stripe?result=cancelled',
        },'almina-'+(testMode?'test':'live')+'-'+key));
        if(!created.success||!matches(created.data,attempt))throw new HttpError(503,'SERVICE_UNAVAILABLE');
        const url=new URL(created.data.url??'https://invalid.invalid');
        if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password)throw new HttpError(503,'SERVICE_UNAVAILABLE');
        await attempts.updateOne({_id:key},{$set:{sessionId:created.data.id,checkoutUrl:url.href}});attempt=await attemptFor(key);
      }
      await commerce.checkout(input,undefined,undefined,{sessionId:attempt.sessionId,attemptId:key,expiresAt:attempt.expiresAt,testMode});
      await synchronize(key);return response(key);
    },
    async status(raw:unknown,cancel=false){
      configured();const parsed=stripeStatusInputSchema.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
      const key=digest(parsed.data.idempotencyKey),attempt=await attemptFor(key);
      if(cancel&&attempt.sessionId){const remote=await verifiedSession(attempt);
        if(remote.status==='open'){try{await configured().transport.expire(remote.id);}catch{if((await verifiedSession(attempt)).status==='open')throw new HttpError(503,'SERVICE_UNAVAILABLE');}}
      }
      await synchronize(key);return response(key);
    },
    async beforeTransition(id:string,input:{status:OrderStatus},staff:Staff){
      const db=await getDb(),order=await db.collection('orders').findOne({...await branchOrderFilter(db,staff,orderFilter({limit:1},staff)),_id:new ObjectId(id)});
      if(!order||order.payment?.provider!=='stripe')return;
      if(!options||order.payment.testMode!==testMode||testMode)throw new HttpError(409,'INVALID_TRANSITION');
      const key=order.payment.attemptId;await synchronize(key);
      if(!['cancelled','refunded'].includes(input.status))return;
      const latest=await db.collection('orders').findOne({_id:order._id});if(!latest)throw new HttpError(404,'NOT_FOUND');
      if(latest.status===input.status)return;
      if(latest.payment.state==='awaiting_payment'){
        if(input.status!=='cancelled')throw new HttpError(409,'INVALID_TRANSITION');
        const remote=await verifiedSession(await attemptFor(key));
        if(remote.status==='open'){try{await configured().transport.expire(remote.id);}catch{if((await verifiedSession(await attemptFor(key))).status==='open')throw new HttpError(503,'SERVICE_UNAVAILABLE');}}
        await synchronize(key);
      }
      const refreshed=await db.collection('orders').findOne({_id:order._id});if(!refreshed||refreshed.status===input.status)return;
      if(staff.role!=='admin')throw new HttpError(403,'FORBIDDEN');
      if(input.status==='cancelled'&&(!['pending','confirmed','packed'].includes(refreshed.status)||refreshed.dispatched))throw new HttpError(409,'INVALID_TRANSITION');
      if(!['paid','partially_refunded','refund_pending'].includes(refreshed.payment.state))throw new HttpError(409,'INVALID_TRANSITION');
      // This write fences dispatch before calling the provider. It is not a refund acknowledgement.
      const claimed=await db.collection('orders').updateOne({_id:order._id,status:refreshed.status,'payment.state':refreshed.payment.state,'payment.refundRequested':{$ne:true}},{$set:{
        'payment.refundRequested':true,'payment.refundRequestedAt':new Date(),'payment.state':'refund_pending',
        'payment.cancellationRequested':input.status==='cancelled','payment.restoreOnRefund':input.status==='cancelled'&&refreshed.cancellationRestocks===true,
      }});
      if(!claimed.modifiedCount&&!refreshed.payment.refundRequested)throw new HttpError(409,'INVALID_TRANSITION');
      // The bounded reconciler executes the durable refund request outside HTTP/Mongo transactions.
    },
    async webhook(body:Buffer,signature:string){
      const config=configured();let raw:unknown;try{raw=config.transport.verify(body,signature);}catch{throw new HttpError(400,'INVALID_REQUEST');}
      const event=z.object({id:z.string(),livemode:z.boolean(),type:z.string(),data:z.object({object:z.unknown()})}).safeParse(raw);
      if(!event.success||event.data.livemode!==!testMode)throw new HttpError(400,'INVALID_REQUEST');
      if(['checkout.session.completed','checkout.session.expired'].includes(event.data.type)){
        const reference=z.object({client_reference_id:z.string().nullable().optional(),id:z.string()}).safeParse(event.data.data.object);
        if(!reference.success)throw new HttpError(400,'INVALID_REQUEST');
        if(!reference.data.client_reference_id||!/^[a-f0-9]{64}$/.test(reference.data.client_reference_id))return;
        const attempt=await(await getDb()).collection<Document&{_id:string}>(collection).findOne({_id:reference.data.client_reference_id});
        if(!attempt?.sessionId)return;if(attempt.sessionId!==reference.data.id)throw new HttpError(400,'INVALID_REQUEST');await synchronize(attempt._id);
      }else if(['charge.refunded','refund.updated','refund.failed','charge.dispute.created','charge.dispute.closed'].includes(event.data.type)){
        const object=z.object({payment_intent:z.union([z.string(),z.object({id:z.string()})]).nullable().optional()}).safeParse(event.data.data.object);
        if(!object.success)return;
        const pi=typeof object.data.payment_intent==='string'?object.data.payment_intent:object.data.payment_intent?.id;if(!pi)return;
        const order=await(await getDb()).collection('orders').findOne({...selector,'payment.paymentIntentId':pi});if(order)await synchronize(order.payment.attemptId);
      }
    },
    async reconcile(sweepPaid=true){
      if(!options)return;const db=await getDb();
      const urgent=await db.collection('orders').find({...selector,'payment.state':{$in:['awaiting_payment','refund_pending','partially_refunded','disputed']}}).sort({'payment.checkedAt':1}).limit(10).toArray();
      // Paid orders are already settled; re-checking them with Stripe is a slow safety sweep, not a per-minute job.
      const paid=sweepPaid?await db.collection('orders').find({...selector,'payment.state':'paid'}).sort({'payment.checkedAt':1}).limit(10).toArray():[];
      let failed=false;
      for(const order of [...urgent,...paid]){try{await finishRequestedRefund(order.payment.attemptId);await synchronize(order.payment.attemptId);}catch{failed=true;await db.collection('orders').updateOne({_id:order._id},{$set:{'payment.checkedAt':new Date()}});}}
      if(failed)throw new HttpError(503,'SERVICE_UNAVAILABLE');
    },
  };
}
export type StripePayments=ReturnType<typeof createStripePayments>;
export function stripeReconciler(payments:StripePayments,onFailure:()=>void){
  let running:Promise<void>|undefined,stopped=false,lastPaidSweep=0;
  const tick=()=>{if(stopped)return Promise.resolve();const sweep=Date.now()-lastPaidSweep>=900000;if(sweep)lastPaidSweep=Date.now();return running??=(payments.reconcile(sweep).catch(onFailure).finally(()=>{running=undefined;}));};
  const timer=payments.enabled?setInterval(()=>{void tick();},60000):undefined;timer?.unref();
  return {tick,stop:async()=>{stopped=true;if(timer)clearInterval(timer);await running;}};
}
export async function prepareStripeStorage(db:Db,enabled:boolean){
  if(!enabled)return;
  await db.collection('orders').createIndex({'payment.attemptId':1},{name:'stripe_test_attempt_unique',unique:true,partialFilterExpression:{'payment.provider':'stripe','payment.testMode':true}});
  await db.collection('orders').createIndex({'payment.attemptId':1},{name:'stripe_live_attempt_unique',unique:true,partialFilterExpression:{'payment.provider':'stripe','payment.testMode':false}});
  await db.collection('orders').createIndex({'payment.provider':1,'payment.testMode':1,'payment.state':1,'payment.checkedAt':1},{name:'stripe_test_reconcile'});
  await db.collection('orders').createIndex({'payment.provider':1,'payment.testMode':1,'payment.paymentIntentId':1},{name:'stripe_payment_intent_lookup'});
}
