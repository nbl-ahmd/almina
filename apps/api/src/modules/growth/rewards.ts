import { customerOrderFilter,normalizedEmail } from './ownership.js';
import { createHash,randomBytes } from 'node:crypto';
import { ObjectId,type Db,type Document,type ClientSession } from 'mongodb';
import { z } from 'zod';
import { rewardsPolicySchema,type RewardsPolicy,type Quote } from '@almina/contracts';
import { HttpError } from '../../errors.js';
const opts={maxTimeMS:3000};
const stringRows=(db:Db,name:string)=>db.collection<Document&{_id:string}>(name);
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const voucherCodeSchema=z.string().regex(/^AM-[A-F0-9]{24}$/);
export async function rewardsPolicy(db:Db,session?:ClientSession):Promise<RewardsPolicy>{
 const row=await stringRows(db,'growth_settings').findOne({_id:'rewards'},{...opts,...(session?{session}:{})});
 if(!row)return rewardsPolicySchema.parse({});
 const {_id,updatedAt,updatedBy,...value}=row;void _id;void updatedAt;void updatedBy;
 const result=rewardsPolicySchema.safeParse(value);if(!result.success)throw new HttpError(503,'SERVICE_UNAVAILABLE');return result.data;
}
export async function saveRewardsPolicy(db:Db,raw:unknown,actor:string){
 const input=rewardsPolicySchema.safeParse(raw);if(!input.success)throw new HttpError(400,'INVALID_REQUEST');
 const value={...input.data,revision:input.data.revision+1},session=db.client.startSession();
 try{await session.withTransaction(async()=>{
 const previous=await rewardsPolicy(db,session),row={...value,updatedAt:new Date(),updatedBy:actor};
 if(input.data.revision===0)await stringRows(db,'growth_settings').insertOne({_id:'rewards',...row},{session});else{const result=await stringRows(db,'growth_settings').updateOne({_id:'rewards',revision:input.data.revision},{$set:row},{session});if(result.matchedCount!==1)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');}
 await db.collection('reward_policy_history').insertOne({previous,next:value,actor,createdAt:new Date()},{session});
 });return value;}
 catch(error){if((error as {code?:unknown}).code===11000)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');throw error;}finally{await session.endSession();}
}
// Only reviewed, general-sale products qualify. Medicine/Rx/unclassified products are excluded.
export function rewardEligible(product:Document,policy:RewardsPolicy){return product.productType==='general'&&product.contentReviewed===true&&policy.eligibleCategoryIds.includes(String(product.category));}
export async function rewardAccount(db:Db,customerId:string){
 const [policy,wallet,customer,vouchers]=await Promise.all([rewardsPolicy(db),stringRows(db,'reward_wallets').findOne({_id:customerId},opts),db.collection('customers').findOne({_id:new ObjectId(customerId)},opts),stringRows(db,'reward_vouchers').find({customerId,state:'available',expiresAt:{$gt:new Date()}},{...opts,projection:{_id:0,code:1,valueMinor:1,expiresAt:1,minimumSpendMinor:1}}).sort({expiresAt:1}).limit(30).toArray()]);
 return {enabled:policy.enabled,points:wallet?.points??0,pointsPerAed:policy.pointsPerAed,pointsPerVoucher:policy.pointsPerVoucher,voucherValueMinor:policy.voucherValueMinor,minimumSpendMinor:policy.minimumSpendMinor,voucherDays:policy.voucherDays,terms:policy.enabled?policy.terms:'',referralCode:customer?.referralCode??null,vouchers};
}
export async function referralCode(db:Db,customerId:string){
 const code=randomBytes(9).toString('hex').toUpperCase();
 const row=await db.collection('customers').findOneAndUpdate({_id:new ObjectId(customerId),referralCode:{$exists:false}},{$set:{referralCode:code}},{returnDocument:'after'});
 return {code:row?.referralCode??(await db.collection('customers').findOne({_id:new ObjectId(customerId)},opts))?.referralCode};
}
export async function attachReferral(db:Db,customer:{id:string;email:string},raw:unknown){
 const input=z.object({code:z.string().regex(/^[A-F0-9]{18}$/)}).strict().safeParse(raw);if(!input.success)throw new HttpError(400,'INVALID_REQUEST');
 const policy=await rewardsPolicy(db);if(!policy.enabled)throw new HttpError(409,'INVALID_TRANSITION');
 const referrer=await db.collection('customers').findOne({referralCode:input.data.code,disabled:{$ne:true}},opts);
 if(!referrer||String(referrer._id)===customer.id)throw new HttpError(400,'INVALID_REQUEST');
 // First delivery is checked again in its transaction; a referral never earns on sign-up.
 if(await db.collection('orders').findOne({...customerOrderFilter(customer.email),status:{$nin:['cancelled','refunded']}},opts))throw new HttpError(409,'INVALID_TRANSITION');
 const result=await db.collection('customers').updateOne({_id:new ObjectId(customer.id),referredBy:{$exists:false},rewardedFirstOrder:{$exists:false}},{$set:{referredBy:String(referrer._id),referralAttachedAt:new Date()}});
 if(!result.modifiedCount)throw new HttpError(409,'INVALID_TRANSITION');return {attached:true};
}
async function credit(db:Db,session:ClientSession,key:string,customerId:string,points:number,orderId:string){
 if(!points)return;
 await stringRows(db,'reward_ledger').insertOne({_id:key,customerId,points,orderId,createdAt:new Date(),reversed:false},{session});
 const result=await stringRows(db,'reward_wallets').updateOne({_id:customerId,$or:[{points:{$lte:1000000000000-points}},{points:{$exists:false}}]},{$inc:{points},$set:{updatedAt:new Date()}},{session,upsert:true});if(!result.matchedCount&&!result.upsertedCount)throw new HttpError(503,'SERVICE_UNAVAILABLE');
}
export async function confirmRewardDelivery(db:Db,raw:unknown,actor:string){
 const input=z.object({orderId:z.string().regex(/^OD[0-9]+$/)}).strict().safeParse(raw);if(!input.success)throw new HttpError(400,'INVALID_REQUEST');
 const session=db.client.startSession();let outcome={awarded:0,replayed:false};
 try{await session.withTransaction(async()=>{
  const order=await db.collection('orders').findOne({orderId:input.data.orderId,schemaVersion:2,status:'dispatched'},{session,...opts});
  if(!order||order.channel==='wholesale')throw new HttpError(409,'INVALID_TRANSITION');
  if(order.rewardDelivery){outcome={awarded:order.rewardDelivery.points??0,replayed:true};return;}
  const policy=await rewardsPolicy(db,session);if(!policy.enabled)throw new HttpError(409,'INVALID_TRANSITION');
  const customer=await db.collection('customers').findOne({email:normalizedEmail(order.customer?.email??''),disabled:{$ne:true},verifiedAt:{$exists:true}},{session,...opts});
  if(!customer)throw new HttpError(409,'INVALID_TRANSITION');
  const ids=order.lines.map((line:Document)=>new ObjectId(line.productId));
  const products=await db.collection('products').find({_id:{$in:ids}},{session,...opts,projection:{productType:1,contentReviewed:1,category:1}}).toArray();
  const eligible=new Set(products.filter(product=>rewardEligible(product,policy)).map(product=>String(product._id)));
  const spend=order.lines.reduce((sum:number,line:Document)=>sum+(eligible.has(line.productId)?line.lineTotalMinor:0),0);
  if(!Number.isSafeInteger(spend)||spend<0)throw new HttpError(503,'COMMERCE_UNAVAILABLE');
  const points=Math.floor(spend/100)*policy.pointsPerAed;
  if(!Number.isSafeInteger(points)||points>1000000)throw new HttpError(503,'COMMERCE_UNAVAILABLE');
  const owner=String(customer._id);
  await credit(db,session,'purchase:'+order.orderId,owner,points,order.orderId);
  if(points>0&&!customer.rewardedFirstOrder){
   const claim=await db.collection('customers').updateOne({_id:customer._id,rewardedFirstOrder:{$exists:false}},{$set:{rewardedFirstOrder:order.orderId}},{session});
   if(claim.modifiedCount&&customer.referredBy){
    await credit(db,session,'welcome:'+order.orderId,owner,policy.welcomePoints,order.orderId);
    const referrer=await db.collection('customers').findOne({_id:new ObjectId(customer.referredBy),disabled:{$ne:true}},{session,...opts});
    if(referrer)await credit(db,session,'referral:'+order.orderId,String(referrer._id),policy.referrerPoints,order.orderId);
   }
  }
  await db.collection('orders').updateOne({_id:order._id,status:'dispatched'},{$set:{rewardDelivery:{confirmedAt:new Date(),actor,points,policyRevision:policy.revision,customerId:owner}}},{session});
  outcome={awarded:points,replayed:false};
 },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});return outcome;}finally{await session.endSession();}
}
export async function redeemPoints(db:Db,customerId:string,raw:unknown){
 const input=z.object({idempotencyKey:z.uuid()}).strict().safeParse(raw);if(!input.success)throw new HttpError(400,'INVALID_REQUEST');
 const key=hash(customerId+':'+input.data.idempotencyKey),session=db.client.startSession();let result:Document|undefined;
 try{await session.withTransaction(async()=>{
  const previous=await stringRows(db,'reward_vouchers').findOne({_id:key},{session,...opts});if(previous){result=previous;return;}
  const policy=await rewardsPolicy(db,session);if(!policy.enabled)throw new HttpError(409,'INVALID_TRANSITION');
  const wallet=await stringRows(db,'reward_wallets').updateOne({_id:customerId,points:{$gte:policy.pointsPerVoucher}},{$inc:{points:-policy.pointsPerVoucher},$set:{updatedAt:new Date()}},{session});
  if(!wallet.modifiedCount)throw new HttpError(409,'INVALID_TRANSITION');
  const voucher={_id:key,customerId,code:'AM-'+randomBytes(12).toString('hex').toUpperCase(),state:'available',valueMinor:policy.voucherValueMinor,pointsCost:policy.pointsPerVoucher,minimumSpendMinor:policy.minimumSpendMinor,eligibleCategoryIds:policy.eligibleCategoryIds,terms:policy.terms,createdAt:new Date(),expiresAt:new Date(Date.now()+policy.voucherDays*86400000)};
  await stringRows(db,'reward_vouchers').insertOne(voucher,{session});result=voucher;
 },{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});
 if(!result)throw new HttpError(503,'SERVICE_UNAVAILABLE');return {code:result.code as string,valueMinor:result.valueMinor as number,expiresAt:result.expiresAt as Date};
 }finally{await session.endSession();}
}
export async function voucherAllocation(db:Db,code:string,customerId:string|undefined,products:Document[],lines:Quote['lines'],session?:ClientSession){
 if(!customerId)throw new HttpError(401,'UNAUTHORIZED');
 const voucher=await stringRows(db,'reward_vouchers').findOne({code,customerId,state:'available',expiresAt:{$gt:new Date()}},{...opts,...(session?{session}:{})});
 if(!voucher)throw new HttpError(409,'VOUCHER_UNAVAILABLE');
 const eligible=new Set(products.filter(product=>rewardEligible(product,{eligibleCategoryIds:voucher.eligibleCategoryIds} as RewardsPolicy)).map(product=>String(product._id)));
 const candidates=lines.filter(line=>eligible.has(line.productId));
 const gross=(line:Quote['lines'][number])=>(line.salePriceMinor??line.unitPriceMinor)*line.quantity;
 const sum=candidates.reduce((total,line)=>total+BigInt(gross(line)),0n);
 if(sum<BigInt(Math.max(voucher.minimumSpendMinor,voucher.valueMinor)))throw new HttpError(422,'VOUCHER_MINIMUM');
 const value=BigInt(voucher.valueMinor),allocation=new Map<string,number>();let remainder=value;
 for(const line of candidates){const part=value*BigInt(gross(line))/sum;allocation.set(line.productId,Number(part));remainder-=part;}
 for(const line of candidates){if(!remainder)break;const current=allocation.get(line.productId)!;if(current<gross(line)){allocation.set(line.productId,current+1);remainder--;}}
 if(remainder)throw new HttpError(503,'COMMERCE_UNAVAILABLE');return {allocation,valueMinor:voucher.valueMinor as number};
}
export async function consumeVoucher(db:Db,session:ClientSession,code:string,customerId:string,orderId:ObjectId){
 const result=await stringRows(db,'reward_vouchers').updateOne({code,customerId,state:'available',expiresAt:{$gt:new Date()}},{$set:{state:'used',orderId,usedAt:new Date()}},{session});
 if(result.modifiedCount!==1)throw new HttpError(409,'VOUCHER_UNAVAILABLE');
}
// Called in the same transaction as cancellation/refund. A refund can leave points debt;
// debt prevents redemptions until earned back rather than silently granting extra rewards.
export async function reverseOrderRewards(db:Db,session:ClientSession,order:Document){
 const credits=await stringRows(db,'reward_ledger').find({orderId:order.orderId,reversed:false},{session,...opts}).toArray();
 for(const entry of credits){await stringRows(db,'reward_ledger').updateOne({_id:entry._id,reversed:false},{$set:{reversed:true,reversedAt:new Date()}},{session});await stringRows(db,'reward_wallets').updateOne({_id:entry.customerId},{$inc:{points:-entry.points}},{session});}
 if(order.totals?.voucher)await stringRows(db,'reward_vouchers').updateOne({code:order.totals.voucher.code,orderId:order._id,state:'used'},{$set:{state:'available'},$unset:{orderId:'',usedAt:''}},{session});
}
