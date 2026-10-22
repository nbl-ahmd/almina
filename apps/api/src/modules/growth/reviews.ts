import { retailAudienceFilter } from '../catalog/audience.js';
import { customerOrderFilter } from './ownership.js';
import { ObjectId,type Db,type Document } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
export const reviewInput=z.object({productId:z.string().regex(/^[a-f0-9]{24}$/i),orderId:z.string().regex(/^OD[0-9]+$/),rating:z.number().int().min(1).max(5),displayName:z.string().trim().min(2).max(40),title:z.string().trim().max(100),body:z.string().trim().min(10).max(1800)}).strict();
const eligibleOrder={schemaVersion:2,status:{$in:['confirmed','packed','dispatched']}};
export async function submitReview(db:Db,customer:{id:string;email:string},raw:unknown){const parsed=reviewInput.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');const value=parsed.data;const order=await db.collection('orders').findOne({...eligibleOrder,orderId:value.orderId,...customerOrderFilter(customer.email),'lines.productId':value.productId},{maxTimeMS:3000,projection:{_id:1}});if(!order)throw new HttpError(403,'FORBIDDEN');const product=await db.collection('products').findOne({_id:new ObjectId(value.productId),...retailAudienceFilter,published:{$ne:false},disabled:{$ne:true},archivedAt:{$exists:false}},{maxTimeMS:3000,projection:{_id:1}});if(!product)throw new HttpError(404,'NOT_FOUND');const id=customer.id+':'+value.productId;await db.collection<Document&{_id:string}>('product_reviews').updateOne({_id:id},{$setOnInsert:{...value,customerId:customer.id,verifiedPurchase:true,moderation:'pending',createdAt:new Date()}},{upsert:true});return {status:'pending' as const};}
export async function publicReviews(db:Db,productId:string){
 const product=await db.collection('products').findOne({_id:new ObjectId(productId),...retailAudienceFilter,published:{$ne:false},active:{$ne:false},disabled:{$ne:true},archivedAt:{$exists:false}},{maxTimeMS:3000,projection:{category:1}});
 if(!product||!await db.collection('categories').findOne({_id:product.category,disabled:{$ne:true},archivedAt:{$exists:false}},{maxTimeMS:3000,projection:{_id:1}}))return {items:[],ratingCount:0,average:null};
 const [result]=await db.collection('product_reviews').aggregate([
  {$match:{productId,moderation:'approved'}},
  {$lookup:{from:'orders',let:{orderId:'$orderId'},pipeline:[{$match:{$expr:{$eq:['$orderId','$$orderId']},...eligibleOrder}},{$project:{_id:1}}],as:'validOrder'}},
  {$match:{'validOrder.0':{$exists:true}}},
  {$facet:{items:[{$sort:{createdAt:-1}},{$limit:10},{$project:{_id:0,rating:1,displayName:1,title:1,body:1,createdAt:1,verifiedPurchase:1}}],stats:[{$group:{_id:null,count:{$sum:1},average:{$avg:'$rating'}}}]}}
 ],{maxTimeMS:3000}).toArray();
 const stats=result?.stats?.[0];return {items:result?.items??[],ratingCount:stats?.count??0,average:stats?Math.round(stats.average*10)/10:null};
}
export async function moderateReview(db:Db,raw:unknown,actor:string){const parsed=z.object({id:z.string().max(80).regex(/^[a-f0-9]{24}:[a-f0-9]{24}$/i),status:z.enum(['approved','rejected'])}).strict().safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');const result=await db.collection<Document&{_id:string}>('product_reviews').updateOne({_id:parsed.data.id,moderation:'pending'},{$set:{moderation:parsed.data.status,moderatedBy:actor,moderatedAt:new Date()}});if(!result.matchedCount)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');return {status:parsed.data.status};}
