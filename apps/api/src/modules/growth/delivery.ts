import { deliverySettings } from '../delivery/service.js';
import { visibleToRetail } from '@almina/contracts';
import { ObjectId,type Db,type Document } from 'mongodb';
import { commercePolicySchema,quoteInputSchema,type CommercePolicy } from '@almina/contracts';
import { randomUUID } from 'node:crypto';
import { calculateQuote } from '../orders/commerce.js';
import { assertServiceable } from './branches.js';
import { HttpError } from '../../errors.js';
import { z } from 'zod';
export async function readDeliveryPolicy(db:Db){const row=await db.collection<Document&{_id:string}>('commerce_policies').findOne({_id:'checkout'},{maxTimeMS:3000});if(!row)throw new HttpError(503,'COMMERCE_UNAVAILABLE');const {_id,...value}=row;void _id;const parsed=commercePolicySchema.safeParse(value);if(!parsed.success)throw new HttpError(503,'COMMERCE_UNAVAILABLE');return parsed.data;}
export async function saveDeliveryPolicy(db:Db,raw:unknown,actor:string){const input=z.object({expectedVersion:z.string().max(100),policy:commercePolicySchema}).strict().safeParse(raw);if(!input.success)throw new HttpError(400,'INVALID_REQUEST');const session=db.client.startSession();let result:CommercePolicy|undefined;try{await session.withTransaction(async()=>{const prior=await readDeliveryPolicy(db);if(prior.version!==input.data.expectedVersion)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');result={...input.data.policy,version:randomUUID()};const updated=await db.collection<Document&{_id:string}>('commerce_policies').updateOne({_id:'checkout',version:input.data.expectedVersion},{$set:result},{session});if(updated.modifiedCount!==1)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');await db.collection('commerce_policy_history').insertOne({actor,previous:prior,next:result,createdAt:new Date()},{session});});return result!;}finally{await session.endSession();}}
export async function previewDelivery(db:Db,raw:unknown){
  const parsed=z.object({emirate:z.string().min(1).max(200),city:z.string().trim().max(200).default(''),items:quoteInputSchema.shape.items}).strict().safeParse(raw);
  if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
  const {items,emirate,city}=parsed.data;
  if((await deliverySettings(db)).active)throw new HttpError(400,'DELIVERY_LOCATION_REQUIRED');
  await assertServiceable(db,{emirate,city});
  const policy=await readDeliveryPolicy(db),rule=policy.delivery.find(item=>item.emirate===emirate);
  if(!rule)throw new HttpError(400,'INVALID_REQUEST');
  const products=await db.collection('products').find({_id:{$in:items.map(item=>new ObjectId(item.productId))}},{maxTimeMS:3000}).toArray();
  const categories=await db.collection('categories').find({_id:{$in:products.map(product=>product.category)},disabled:{$ne:true},archivedAt:{$exists:false}},{maxTimeMS:3000}).toArray();
  const visible=new Set(categories.map(category=>String(category._id)));
  if(products.some(product=>!visibleToRetail(product)||!visible.has(String(product.category))))throw new HttpError(409,'PRODUCT_UNAVAILABLE');
  const quote=calculateQuote({items,customer:{emirate,name:'',mobile:'',email:'',city,address:'',payment:'cash',buildingname:'',flatno:'',note:'',maplink:''}},products,{...policy,minimumOrderMinor:0});
  return {emirate,subtotalMinor:quote.subtotalMinor,deliveryFeeMinor:quote.deliveryFeeMinor,freeAboveMinor:rule.freeAboveMinor??null,remainingMinor:rule.freeAboveMinor===undefined?null:Math.max(0,rule.freeAboveMinor-quote.subtotalMinor),policyVersion:policy.version};
}
