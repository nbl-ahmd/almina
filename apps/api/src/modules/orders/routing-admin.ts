import { ObjectId, type Db, type Document, type ClientSession } from 'mongodb';
import { orderRoutingSchema, type OrderRouting } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { administrator, serializeStaffWrites } from '../auth/administration.js';
import { readOrderRouting, routingHealth } from './routing.js';
export async function saveOrderRouting(db: Db, raw: unknown, actor: string) {
  const parsed = orderRoutingSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  await administrator(db, actor);
  await serializeStaffWrites(db, async session => {
    await writeOrderRouting(db, parsed.data, actor, session);
  });
  return routingHealth(db);
}

export async function writeOrderRouting(db:Db,value:OrderRouting,actor:string,session:ClientSession,activatingPolygons=false){
    await administrator(db, actor, session);
    const before = await readOrderRouting(db, session);
    if (before.revision !== value.revision) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
    const zoneMode=activatingPolygons||(await db.collection<Document & {_id:string}>('delivery_controls').findOne({_id:'zones'},{session}))?.active===true;
    if(!zoneMode&&value.active&&!value.branches.some(branch=>branch.id===value.fallbackBranchId&&branch.enabled!==false))throw new HttpError(409,'INVALID_TRANSITION');
    const ids = value.branches.map(branch => branch.id);
    const removed=before.branches.map(branch=>branch.id).filter(id=>!ids.includes(id));
    if(removed.length && (await db.collection('orders').findOne({'deliveryAssignment.branchId':{$in:removed},$or:[{status:{$in:['pending','confirmed','packed']}},{'payment.provider':'stripe','payment.state':{$nin:['refunded','expired']}}]},{session}) || await db.collection('delivery_zones').findOne({active:true,'branches.branchId':{$in:removed},deletedAt:{$exists:false}},{session})))throw new HttpError(409,'INVALID_TRANSITION');
    if(removed.length&&await db.collection('users').findOne({role:'user',accountType:{$ne:'branch'},branchId:{$in:removed},disabled:{$ne:true}},{session,projection:{_id:1}}))throw new HttpError(409,'INVALID_TRANSITION');
    const zones=await db.collection<Document & {_id:string}>('delivery_controls').findOne({_id:'zones'},{session});
    if(zones)await db.collection<Document & {_id:string}>('delivery_controls').updateOne({_id:'zones'},{$inc:{revision:1}},{session});
    if(removed.length){const logins=await db.collection('users').find({accountType:'branch',branchId:{$in:removed}},{session,projection:{_id:1}}).limit(20).toArray();await db.collection('users').updateMany({accountType:'branch',branchId:{$in:removed}},{$set:{disabled:true,deactivatedAt:new Date(),deactivatedBy:new ObjectId(actor)}},{session});if(logins.length)await db.collection('api_sessions').deleteMany({userId:{$in:logins.map(login=>login._id)}},{session});}
    for(const branch of value.branches)await db.collection('users').updateMany({accountType:'branch',branchId:branch.id},{$set:{name:branch.name}},{session});
    // No active scoped account may silently lose its branch during activation/configuration.
    if (!zoneMode && value.active && await db.collection('users').findOne({ role: 'user', disabled: { $ne: true }, branchId: { $nin: ids } }, { session, projection: { _id: 1 } })) throw new HttpError(409, 'INVALID_TRANSITION');
    if (!zoneMode && value.active) for (const branchId of value.branches.filter(branch=>branch.enabled!==false).map(branch=>branch.id)) {
      if (!await db.collection('users').findOne({ role: 'user', disabled: { $ne: true }, branchId }, { session, projection: { _id: 1 } })) throw new HttpError(409, 'INVALID_TRANSITION');
    }
    await db.collection<Document & { _id: string }>('growth_settings').updateOne({ _id: 'order-routing' }, { $set: { ...value, revision: value.revision + 1, updatedAt: new Date(), updatedBy: actor } }, { upsert: true, session });
    await db.collection('order_routing_audit').insertOne({ action: 'configure', actor: new ObjectId(actor), before, after: { ...value, revision: value.revision + 1 }, createdAt: new Date() }, { session });
}
