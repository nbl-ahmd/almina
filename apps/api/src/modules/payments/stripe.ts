import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { ObjectId, type Db, type Document } from 'mongodb';
import { z } from 'zod';
import { checkoutInputSchema, stripeStatusInputSchema } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { createCommerceService, normalizeItems, quoteHash } from '../orders/commerce.js';

const sessionSchema = z.object({
  id:z.string().startsWith('cs_test_'), livemode:z.literal(false), mode:z.literal('payment'),
  client_reference_id:z.string(), currency:z.literal('aed'), amount_total:z.number().int().positive(),
  status:z.enum(['open','complete','expired']), payment_status:z.enum(['paid','unpaid','no_payment_required']),
  url:z.string().nullable(), expires_at:z.number().int(),
  payment_intent:z.union([z.string(),z.object({id:z.string(),latest_charge:z.union([z.string(),z.object({amount:z.number().int(),amount_refunded:z.number().int(),refunded:z.boolean()})]).nullable()})]).nullable(),
});
type Session = z.infer<typeof sessionSchema>;
export interface StripeTransport {
  create(params:Stripe.Checkout.SessionCreateParams, key:string):Promise<unknown>;
  retrieve(id:string):Promise<unknown>;
  expire(id:string):Promise<unknown>;
  verify(body:Buffer, signature:string):unknown;
}
export type StripeOptions = {origin:string; transport:StripeTransport};
export function stripeTestOptions(env:Readonly<Record<string,string|undefined>>):StripeOptions|undefined {
  if (env.STRIPE_TEST_ENABLED !== 'true') return;
  // A test payment must never consume real production inventory.
  if (!['development','staging'].includes(env.APP_ENV ?? '') || env.DATABASE_ENV === 'production'
    || !/^(sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? '')
    || !/^whsec_[A-Za-z0-9]+$/.test(env.STRIPE_WEBHOOK_SECRET ?? '')) throw new Error('Stripe test configuration invalid');
  const origin = new URL(env.WEB_ORIGIN ?? '');
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash
    || (origin.protocol !== 'https:' && !(env.APP_ENV === 'development' && origin.protocol === 'http:' && ['localhost','127.0.0.1'].includes(origin.hostname)))) throw new Error('Stripe origin invalid');
  const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {maxNetworkRetries:1,timeout:7000});
  return {origin:origin.origin,transport:{
    create:(params,key)=>stripe.checkout.sessions.create(params,{idempotencyKey:key}),
    retrieve:id=>stripe.checkout.sessions.retrieve(id,{expand:['payment_intent.latest_charge']}),
    expire:id=>stripe.checkout.sessions.expire(id),
    verify:(body,signature)=>stripe.webhooks.constructEvent(body,signature,env.STRIPE_WEBHOOK_SECRET!,300),
  }};
}
const digest = (value:string)=>createHash('sha256').update(value).digest('hex');
const transaction = {readConcern:{level:'snapshot' as const},writeConcern:{w:'majority' as const},readPreference:'primary' as const};
export function createStripePayments(getDb:()=>Promise<Db>, options?:StripeOptions) {
  function configured() { if (!options) throw new HttpError(404,'NOT_FOUND'); return options; }
  const commerce=createCommerceService(getDb);
  async function attemptFor(key:string) {
    const attempt=await (await getDb()).collection<Document&{_id:string}>('stripe_test_attempts').findOne({_id:key});
    if(!attempt)throw new HttpError(404,'NOT_FOUND');
    return attempt;
  }
  async function verifiedSession(attempt:Document):Promise<Session> {
    const parsed=sessionSchema.safeParse(await configured().transport.retrieve(attempt.sessionId));
    if(!parsed.success || parsed.data.id!==attempt.sessionId || parsed.data.client_reference_id!==attempt._id || parsed.data.amount_total!==attempt.totals.totalMinor
      || parsed.data.expires_at!==Math.floor(attempt.expiresAt.getTime()/1000)) throw new HttpError(503,'SERVICE_UNAVAILABLE');
    return parsed.data;
  }
  async function synchronize(key:string) {
    const attempt=await attemptFor(key);
    if(!attempt.sessionId)return;
    const remote=await verifiedSession(attempt);
    const pi=typeof remote.payment_intent==='object'?remote.payment_intent:null;
    const charge=pi&&typeof pi.latest_charge==='object'?pi.latest_charge:null;
    const refunded=charge?.refunded===true&&charge.amount_refunded===remote.amount_total&&charge.amount===remote.amount_total;
    const state=refunded?'refunded':remote.status==='complete'&&remote.payment_status==='paid'?'paid':remote.status==='expired'?'expired':null;
    const db=await getDb(), session=db.client.startSession();
    try { await session.withTransaction(async()=>{
      const order=await db.collection('orders').findOne({'payment.attemptId':key,'payment.provider':'stripe','payment.testMode':true},{session});
      if(!order)return; // Session can expire before an order/stock reservation exists.
      const current=order.payment.state;
      // Terminal observations cannot be reversed by delayed or concurrent webhook delivery.
      const next=current==='refunded'||current==='expired'?current:state??current;
      if(next!==current){
        if(['expired','refunded'].includes(next)&&!order.inventory.restored){
          for(const line of order.lines){
            const restored=await db.collection('products').updateOne({_id:new ObjectId(line.productId),stock:{$gte:0,$lte:Number.MAX_SAFE_INTEGER-line.quantity,$mod:[1,0]}},{$inc:{stock:line.quantity}},{session});
            if(restored.modifiedCount!==1)throw new HttpError(409,'INSUFFICIENT_STOCK');
          }
        }
        const terminal=['expired','refunded'].includes(next);
        await db.collection<Document&{statusHistory:Document[]}>('orders').updateOne({_id:order._id},{
          $set:{'payment.state':next,'payment.paymentIntentId':pi?.id??remote.payment_intent,
            ...(terminal?{status:next==='expired'?'cancelled':'refunded',canceled:next==='expired','inventory.restored':true,statusHistory:[...(order.statusHistory??[]),{status:next==='expired'?'cancelled':'refunded',at:new Date(),source:'stripe_test'}]}:{}),
            'payment.checkedAt':new Date()},

        },{session});
      }else await db.collection('orders').updateOne({_id:order._id},{$set:{'payment.checkedAt':new Date()}},{session});
      // Test orders intentionally have no confirmation outbox or fulfilment event.
    },transaction); }finally{await session.endSession();}
  }
  async function response(key:string) {
    const db=await getDb(), attempt=await attemptFor(key);
    const order=await db.collection('orders').findOne({'payment.attemptId':key,'payment.testMode':true});
    if(!order)throw new HttpError(404,'NOT_FOUND');
    return {orderId:order.orderId,state:order.payment.state,checkoutUrl:order.payment.state==='awaiting_payment'?attempt.checkoutUrl:null,testMode:true as const};
  }
  return {
    enabled:!!options,
    async start(raw:unknown){
      const config=configured(), parsed=checkoutInputSchema.safeParse(raw);
      if(!parsed.success||parsed.data.customer.payment!=='stripe'||!parsed.data.acceptedQuoteHash||parsed.data.voucherCode)throw new HttpError(400,'INVALID_REQUEST');
      const input=parsed.data; input.items=normalizeItems(input.items);
      const key=digest(input.idempotencyKey), fingerprint=digest(JSON.stringify({customer:input.customer,items:input.items,quoteHash:input.acceptedQuoteHash}));
      const db=await getDb(), attempts=db.collection<Document&{_id:string}>('stripe_test_attempts');
      let attempt=await attempts.findOne({_id:key});
      if(!attempt){
        const totals=await commerce.quote({customer:input.customer,items:input.items});
        if(quoteHash(totals)!==input.acceptedQuoteHash)throw new HttpError(409,'PRICE_CHANGED');
        if(totals.totalMinor<200||totals.totalMinor>99999999)throw new HttpError(400,'INVALID_REQUEST');
        const expiresAt=new Date(Math.floor(Date.now()/1000)*1000+3600000);
        try{await attempts.updateOne({_id:key},{$setOnInsert:{fingerprint,totals,expiresAt,createdAt:new Date()}},{upsert:true});}catch(error){if(!(typeof error==='object'&&error!==null&&'code' in error&&error.code===11000))throw error;}
        attempt=await attemptFor(key);
      }
      if(attempt.fingerprint!==fingerprint)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');
      if(!attempt.sessionId){
        // An undisclosed session holds no stock; an old setup can safely require a fresh review.
        if(attempt.expiresAt.getTime()<Date.now()+30*60000)throw new HttpError(409,'INVALID_TRANSITION');
        // Stable persisted parameters and provider idempotency survive timeouts/process restarts.
        // Stock is not reserved until the provider session is durably recorded.
        const created=sessionSchema.safeParse(await config.transport.create({mode:'payment',adaptive_pricing:{enabled:false},allowed_payment_method_types:['card'],
          client_reference_id:key,expires_at:Math.floor(attempt.expiresAt.getTime()/1000),
          line_items:[{price_data:{currency:'aed',unit_amount:attempt.totals.totalMinor,product_data:{name:'Al Mina Pharmacy — test checkout'}},quantity:1}],
          success_url:config.origin+'/checkout/stripe?result=returned',cancel_url:config.origin+'/checkout/stripe?result=cancelled',
        },'almina-test-'+key));
        if(!created.success||created.data.client_reference_id!==key||created.data.amount_total!==attempt.totals.totalMinor||created.data.expires_at!==Math.floor(attempt.expiresAt.getTime()/1000))throw new HttpError(503,'SERVICE_UNAVAILABLE');
        const url=new URL(created.data.url??'https://invalid.invalid');
        if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com'||url.username||url.password)throw new HttpError(503,'SERVICE_UNAVAILABLE');
        await attempts.updateOne({_id:key},{$set:{sessionId:created.data.id,checkoutUrl:url.href}});
        attempt=await attemptFor(key);
      }
      await commerce.checkout(input,undefined,undefined,{sessionId:attempt.sessionId,attemptId:key,expiresAt:attempt.expiresAt});
      await synchronize(key);
      return response(key);
    },
    async status(raw:unknown,cancel=false){
      configured();const parsed=stripeStatusInputSchema.safeParse(raw);
      if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
      const key=digest(parsed.data.idempotencyKey),attempt=await attemptFor(key);
      if(cancel&&attempt.sessionId){
        const remote=await verifiedSession(attempt);
        if(remote.status==='open'){try{await configured().transport.expire(remote.id);}catch{if((await verifiedSession(attempt)).status==='open')throw new HttpError(503,'SERVICE_UNAVAILABLE');}}
      }
      await synchronize(key);return response(key);
    },
    async webhook(body:Buffer,signature:string){
      const config=configured();let raw:unknown;
      try{raw=config.transport.verify(body,signature);}catch{throw new HttpError(400,'INVALID_REQUEST');}
      const event=z.object({id:z.string(),livemode:z.literal(false),type:z.string(),data:z.object({object:z.unknown()})}).safeParse(raw);
      if(!event.success)throw new HttpError(400,'INVALID_REQUEST');
      if(!['checkout.session.completed','checkout.session.expired'].includes(event.data.type))return;
      const reference=z.object({client_reference_id:z.string().nullable().optional(),id:z.string().startsWith('cs_test_')}).safeParse(event.data.data.object);
      if(!reference.success)throw new HttpError(400,'INVALID_REQUEST');
      if(!reference.data.client_reference_id||!/^[a-f0-9]{64}$/.test(reference.data.client_reference_id))return;
      // Ignore other applications' sessions in the same Stripe test account.
      const attempt=await (await getDb()).collection<Document&{_id:string}>('stripe_test_attempts').findOne({_id:reference.data.client_reference_id});
      if(!attempt?.sessionId)return;
      if(attempt.sessionId!==reference.data.id)throw new HttpError(400,'INVALID_REQUEST');
      await synchronize(attempt._id);
    },
    async reconcile(){
      if(!options)return;
      const db=await getDb();
      const pending=await db.collection('orders').find({'payment.provider':'stripe','payment.testMode':true,'payment.state':{$in:['awaiting_payment','paid']}}).sort({'payment.checkedAt':1}).limit(20).toArray();
      let failed=false;
      for(const order of pending){try{await synchronize(order.payment.attemptId);}catch{failed=true;await db.collection('orders').updateOne({_id:order._id},{$set:{'payment.checkedAt':new Date()}});}}
      if(failed)throw new HttpError(503,'SERVICE_UNAVAILABLE');
    },
  };
}
export type StripePayments=ReturnType<typeof createStripePayments>;
export function stripeReconciler(payments:StripePayments,onFailure:()=>void){
  let running:Promise<void>|undefined;
  const tick=()=>running??=(payments.reconcile().catch(onFailure).finally(()=>{running=undefined;}));
  const timer=payments.enabled?setInterval(()=>{void tick();},60000):undefined;timer?.unref();
  return {tick,stop:async()=>{if(timer)clearInterval(timer);await running;}};
}

export async function prepareStripeStorage(db:Db, enabled:boolean){
  if(!enabled)return;
  await db.collection('orders').createIndex({'payment.attemptId':1},{name:'stripe_test_attempt_unique',unique:true,partialFilterExpression:{'payment.provider':'stripe','payment.testMode':true}});
  await db.collection('orders').createIndex({'payment.provider':1,'payment.testMode':1,'payment.state':1,'payment.checkedAt':1},{name:'stripe_test_reconcile'});
}
