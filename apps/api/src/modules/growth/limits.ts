import { type Db,type Document } from 'mongodb';
import { HttpError } from '../../errors.js';
export async function customerMutationQuota(db:Db,customerId:string){
 const now=Date.now(),minute=Math.floor(now/60000);
 const row=await db.collection<Document&{_id:string}>('customer_auth_limits').findOneAndUpdate({_id:'customer:'+customerId+':'+minute},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(now+120000)}},{upsert:true,returnDocument:'after'});
 if(!row||row.count>120)throw new HttpError(429,'RATE_LIMITED');
}
