import { createHash } from 'node:crypto';
import type { Db, Document } from 'mongodb';
import { HttpError } from '../../errors.js';
import type { CommerceEvent } from '@almina/contracts/commerce-events';

/** Daily aggregate counters only; no identity, IP, query text, product or URL is stored. */
export async function recordGrowthActivity(db:Db,event:CommerceEvent,campaign?:string,now=new Date()) {
  if (campaign && !await db.collection('growth_pages').findOne({kind:'campaign',slug:campaign,published:true,healthContent:{$ne:true},$and:[{$or:[{startsAt:null},{startsAt:{$lte:now.toISOString()}}]},{$or:[{endsAt:null},{endsAt:{$gt:now.toISOString()}}]}]},{projection:{_id:1}})) throw new HttpError(400,'INVALID_REQUEST');
  const day=now.toISOString().slice(0,10),id=createHash('sha256').update(day+':'+event+':'+(campaign??'')).digest('hex');
  try {
    await db.collection<Document & {_id:string}>('growth_activity').updateOne({_id:id,count:{$not:{$gte:100000}}},
      {$inc:{count:1},$setOnInsert:{day,event,...(campaign?{campaign}:{}),expiresAt:new Date(now.getTime()+90*86400000)}},{upsert:true});
  } catch(error) {
    if(error&&typeof error==='object'&&'code'in error&&error.code===11000)throw new HttpError(429,'RATE_LIMITED');
    throw error;
  }
}
export async function activityReport(db:Db,start:Date,end:Date){
  const match={$match:{day:{$gte:start.toISOString().slice(0,10),$lte:end.toISOString().slice(0,10)}}};
  const [activity,campaigns]=await Promise.all([
    db.collection('growth_activity').aggregate<{event:string;count:number}>([match,{$group:{_id:'$event',count:{$sum:'$count'}}},{$project:{_id:0,event:'$_id',count:1}},{$sort:{event:1}}],{maxTimeMS:5000}).toArray(),
    db.collection('growth_activity').aggregate<{slug:string;views:number;clicks:number}>([match,{$match:{campaign:{$type:'string'}}},{$group:{_id:'$campaign',views:{$sum:{$cond:[{$eq:['$event','campaign_viewed']},'$count',0]}},clicks:{$sum:{$cond:[{$eq:['$event','campaign_clicked']},'$count',0]}}}},{$sort:{clicks:-1,views:-1,_id:1}},{$limit:50},{$project:{_id:0,slug:'$_id',views:1,clicks:1}}],{maxTimeMS:5000}).toArray(),
  ]);
  return {activity,campaigns};
}
