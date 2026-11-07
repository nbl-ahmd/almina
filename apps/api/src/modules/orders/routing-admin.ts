import { ObjectId, type Db, type Document } from 'mongodb';
import { orderRoutingSchema } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { administrator, serializeStaffWrites } from '../auth/administration.js';
import { readOrderRouting, routingHealth } from './routing.js';
export async function saveOrderRouting(db: Db, raw: unknown, actor: string) {
  const parsed = orderRoutingSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  await administrator(db, actor);
  await serializeStaffWrites(db, async session => {
    await administrator(db, actor, session);
    const before = await readOrderRouting(db, session), value = parsed.data;
    if (before.revision !== value.revision) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
    const ids = value.branches.map(branch => branch.id);
    const removed=before.branches.map(branch=>branch.id).filter(id=>!ids.includes(id));
    if(removed.length && (await db.collection('orders').findOne({'deliveryAssignment.branchId':{$in:removed},$or:[{status:{$in:['pending','confirmed','packed']}},{'payment.provider':'stripe','payment.state':{$nin:['refunded','expired']}}]},{session}) || await db.collection('branch_inventory').findOne({branchId:{$in:removed},stock:{$gt:0}},{session}) || await db.collection('delivery_zones').findOne({active:true,'branches.branchId':{$in:removed},deletedAt:{$exists:false}},{session})))throw new HttpError(409,'INVALID_TRANSITION');
    const zones=await db.collection<Document & {_id:string}>('delivery_controls').findOne({_id:'zones'},{session});
    if(zones?.active&&!value.active)throw new HttpError(409,'INVALID_TRANSITION');
    if(zones)await db.collection<Document & {_id:string}>('delivery_controls').updateOne({_id:'zones'},{$inc:{revision:1}},{session});
    // No active scoped account may silently lose its branch during activation/configuration.
    if (value.active && await db.collection('users').findOne({ role: 'user', disabled: { $ne: true }, branchId: { $nin: ids } }, { session, projection: { _id: 1 } })) throw new HttpError(409, 'INVALID_TRANSITION');
    if (value.active) for (const branchId of value.branches.filter(branch=>branch.enabled!==false).map(branch=>branch.id)) {
      if (!await db.collection('users').findOne({ role: 'user', disabled: { $ne: true }, branchId }, { session, projection: { _id: 1 } })) throw new HttpError(409, 'INVALID_TRANSITION');
    }
    await db.collection<Document & { _id: string }>('growth_settings').updateOne({ _id: 'order-routing' }, { $set: { ...value, revision: value.revision + 1, updatedAt: new Date(), updatedBy: actor } }, { upsert: true, session });
    await db.collection('order_routing_audit').insertOne({ action: 'configure', actor: new ObjectId(actor), before, after: { ...value, revision: value.revision + 1 }, createdAt: new Date() }, { session });
  });
  return routingHealth(db);
}
