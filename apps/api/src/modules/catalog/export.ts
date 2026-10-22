import { retailAudienceFilter } from './audience.js';
import { ObjectId, type Db } from 'mongodb';
import { z } from 'zod';
import { compatibilityProductProjection } from './compatibility-reads.js';
import { HttpError } from '../../errors.js';
export async function catalogExportState(db:Db) {
  const [store,policy]=await Promise.all([db.collection('stores').findOne({},{projection:{status:1},maxTimeMS:3000}),db.collection('commerce_policies').findOne({active:true},{projection:{vatMode:1,vatRateBps:1},maxTimeMS:3000})]);
  return {storeOpen:store?.status==='open',policyReady:policy?.vatMode==='inclusive'&&policy.vatRateBps===500};
}
export async function catalogExportPage(db:Db,raw:unknown) {
  const parsed=z.object({channel:z.enum(['google','meta']),cursor:z.string().regex(/^[a-f0-9]{24}$/i).optional()}).strict().safeParse(raw);
  if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
  const {channel,cursor}=parsed.data;
  const rows=await db.collection('products').aggregate([
    {$match:{...retailAudienceFilter,[channel==='google'?'googleApproved':'metaApproved']:true,disabled:{$ne:true},published:{$ne:false},active:{$ne:false},archivedAt:{$exists:false},...(cursor?{_id:{$gt:new ObjectId(cursor)}}:{})}},
    {$sort:{_id:1}},{$lookup:{from:'categories',localField:'category',foreignField:'_id',as:'category',pipeline:[{$match:{disabled:{$ne:true},archivedAt:{$exists:false}}},{$project:{_id:1,name:1}}]}},{$unwind:'$category'},{$limit:101},{$project:compatibilityProductProjection},
  ],{maxTimeMS:5000,allowDiskUse:false}).toArray();
  return {products:rows.slice(0,100),nextCursor:rows.length>100?String(rows[99]!._id):null,...await catalogExportState(db)};
}
