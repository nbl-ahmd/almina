import { ObjectId, type Db } from 'mongodb';
import { orderCostInputSchema, orderCostViewSchema } from '@almina/contracts';
import { HttpError } from '../../errors.js';

/** Costs are separate administrative records. Checkout prices and order snapshots are immutable. */
export async function orderCosts(db: Db, orderId: string) {
  if (!ObjectId.isValid(orderId)) throw new HttpError(400,'INVALID_REQUEST');
  const id = new ObjectId(orderId);
  if (!await db.collection('orders').findOne({_id:id,schemaVersion:2},{projection:{_id:1}})) throw new HttpError(404,'NOT_FOUND');
  const row = await db.collection('order_costs').findOne({_id:id});
  return orderCostViewSchema.parse({orderId,revision:row?.revision??0,recorded:!!row,
    productCostMinor:row?.productCostMinor??null,fulfilmentCostMinor:row?.fulfilmentCostMinor??null,feesMinor:row?.feesMinor??null});
}
export async function recordOrderCosts(db: Db, raw: unknown, actor: string) {
  const parsed = orderCostInputSchema.safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(actor)) throw new HttpError(400,'INVALID_REQUEST');
  const {orderId,expectedRevision,...costs} = parsed.data;
  if (!Number.isSafeInteger(costs.productCostMinor+costs.fulfilmentCostMinor+costs.feesMinor)) throw new HttpError(400,'INVALID_REQUEST');
  const id = new ObjectId(orderId), session = db.client.startSession();
  try {
    await session.withTransaction(async()=>{
      if (!await db.collection('orders').findOne({_id:id,schemaVersion:2},{session,projection:{_id:1}})) throw new HttpError(404,'NOT_FOUND');
      const previous = await db.collection('order_costs').findOne({_id:id},{session});
      if ((previous?.revision??0)!==expectedRevision) throw new HttpError(409,'IDEMPOTENCY_CONFLICT');
      const next = {...costs,revision:expectedRevision+1,recordedAt:new Date(),actor};
      await db.collection('order_cost_history').insertOne({orderId:id,previous:previous?{productCostMinor:previous.productCostMinor,fulfilmentCostMinor:previous.fulfilmentCostMinor,feesMinor:previous.feesMinor,revision:previous.revision}:null,...next},{session});
      await db.collection('order_costs').replaceOne({_id:id},{_id:id,...next},{session,upsert:true});
    });
    return orderCosts(db,orderId);
  } finally { await session.endSession(); }
}
