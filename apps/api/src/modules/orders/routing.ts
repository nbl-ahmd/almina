import { z } from 'zod';
import { ObjectId, type Db, type Document, type Filter, type ClientSession } from 'mongodb';
import { deliveryEmirates, orderRoutingSchema, areaKey, areaReplacements, rakEmirateKeys, rakDeliveryAreas, resolveDeliveryArea, routingDecision, type OrderRouting, type Staff } from '@almina/contracts';
import { historicalStatus } from './status.js';
import { HttpError } from '../../errors.js';
const options = { maxTimeMS: 3000 };
const otherEmirateKeys = deliveryEmirates.filter(value => !rakEmirateKeys.includes(areaKey(value))).flatMap(value => [areaKey(value), areaKey(value + ' Emirate')]);
export async function readOrderRouting(db: Db, session?: ClientSession): Promise<OrderRouting> {
  const row = await db.collection<Document & { _id: string }>('growth_settings').findOne({ _id: 'order-routing' }, { ...options, ...(session ? { session } : {}) });
  return orderRoutingSchema.parse(row ? { revision: row.revision, active: row.active, branches: row.branches, fallbackBranchId: row.fallbackBranchId } : {});
}
export function orderArea(order: Document): string | null {
  if (order.routing?.version === 1) return rakDeliveryAreas.some(area => area.id === order.routing.areaId) ? order.routing.areaId : null;
  return resolveDeliveryArea(order.customer ?? {});
}
export function presentRouting(order: Document, policy: OrderRouting) {
  if(order.deliveryAssignment?.branchId) return {areaId:null,areaLabel:order.deliveryAssignment.zoneName,branchId:order.deliveryAssignment.branchId,branchName:policy.branches.find(branch=>branch.id===order.deliveryAssignment.branchId)?.name??order.deliveryAssignment.branchName,needsReview:false,revision:0};
  const areaId = orderArea(order);
  const otherEmirate = typeof order.customer?.emirate === 'string' && otherEmirateKeys.includes(areaKey(order.customer.emirate));
  return { ...routingDecision(areaId, policy), ...(areaId === null && (otherEmirate || order.routing?.reviewedAt instanceof Date) ? { needsReview: false, areaLabel: otherEmirate ? 'Other delivery areas' : 'Verified unlisted area' } : {}), revision: Number.isSafeInteger(order.routing?.revision) ? order.routing.revision : 0 };
}
function mongoKey(field: string): Document {
  let expression: Document = { $toLower: { $trim: { chars: ' \t\r\n', input: { $cond: [{ $eq: [{ $type: field }, 'string'] }, field, ''] } } } };
  for (const [find, replacement] of areaReplacements) expression = { $replaceAll: { input: expression, find, replacement } };
  return expression;
}
// Same exact-alias resolver for pre-migration orders. No fuzzy authorization and no external lookups.
export function legacyAreaExpression(): Document {
  const aliases = new Map<string, string[]>();
  for (const area of rakDeliveryAreas) for (const name of [area.name, ...area.aliases]) {
    const key = areaKey(name); aliases.set(key, [...new Set([...(aliases.get(key) ?? []), area.id])]);
  }
  return { $cond: [{ $in: [mongoKey('$customer.emirate'), rakEmirateKeys] }, { $switch: {
    branches: rakDeliveryAreas.map(area => ({ case: { $in: [mongoKey('$customer.city'), [...aliases].filter(([, ids]) => ids.length === 1 && ids[0] === area.id).map(([key]) => key)] }, then: area.id })), default: null,
  } }, null] };
}
export function areaScope(areaIds: string[], complement = false): Filter<Document> {
  return { $or: [
    { 'routing.version': 1, 'routing.areaId': { [complement ? '$nin' : '$in']: areaIds } },
    { 'routing.version': { $ne: 1 }, $expr: complement ? { $not: [{ $in: [legacyAreaExpression(), areaIds] }] } : { $in: [legacyAreaExpression(), areaIds] } },
  ] };
}
export function addressReviewScope(): Filter<Document> {
  return { $and: [{ deliveryAssignment: { $exists: false } }, areaScope(rakDeliveryAreas.map(area => area.id), true), { 'routing.reviewedAt': { $exists: false } }, { $expr: { $not: [{ $in: [mongoKey('$customer.emirate'), otherEmirateKeys] }] } }] };
}
/** Branch policy replaces legacy city text only after an explicit administrator activation. */
export async function branchOrderFilter(db: Db, user: Staff, legacy: Filter<Document>, session?: ClientSession): Promise<Filter<Document>> {
  if (user.role === 'admin') return legacy;
  const policy = await readOrderRouting(db, session);
  const assigned = user.branchId ? { 'deliveryAssignment.branchId': user.branchId } : { _id: { $in: [] } };
  if (!policy.active) return user.branchId ? { $or: [assigned, { $and: [legacy, { deliveryAssignment: { $exists: false } }] }] } : { ...legacy, deliveryAssignment: { $exists: false } };
  const branch = policy.branches.find(value => value.id === user.branchId);
  if (!branch) return assigned;
  const specific = areaScope(branch.areaIds);
  const fallback = branch.id === policy.fallbackBranchId ? areaScope(policy.branches.flatMap(value => value.areaIds), true) : undefined;
  const named = fallback ? { $or: [specific, fallback] } : specific;
  return { $or: [assigned, { $and: [named, { deliveryAssignment: { $exists: false } }] }] };
}
export async function routingRecipients(db: Db, order: Document): Promise<Filter<Document>> {
  const policy = await readOrderRouting(db);
  const branchId = order.deliveryAssignment?.branchId ?? routingDecision(orderArea(order), policy).branchId;
  return { disabled: { $ne: true }, subscription: { $type: 'object' }, $or: [
    { role: 'admin' }, ...((policy.active || order.deliveryAssignment) ? branchId ? [{ role: 'user', branchId }] : [] : typeof order.customer?.city === 'string' ? [{ role: 'user', cities: order.customer.city }] : []),
  ] };
}
export async function assertBranchAssignment(db: Db, branchId: string | null | undefined, role: string, session?: ClientSession) {
  const policy = await readOrderRouting(db, session);
  if (branchId && !policy.branches.some(branch => branch.id === branchId)) throw new HttpError(400, 'INVALID_REQUEST');
  if (policy.active && role === 'user' && !branchId) throw new HttpError(400, 'INVALID_REQUEST');
}
export async function routingHealth(db: Db) {
  const policy = await readOrderRouting(db);
  const counts = await db.collection('users').aggregate<{ _id: string | null; count: number }>([
    { $match: { role: 'user', disabled: { $ne: true } } }, { $group: { _id: '$branchId', count: { $sum: 1 } } }, { $limit: 100 },
  ], options).toArray();
  return { ...policy, staffing: policy.branches.map(branch => ({ branchId: branch.id, count: counts.find(row => row._id === branch.id)?.count ?? 0 })),
    legacyStaff: counts.filter(row => !policy.branches.some(branch => branch.id === row._id)).reduce((sum, row) => sum + row.count, 0) };
}
export async function repairOrderArea(db: Db, orderId: string, raw: unknown, actor: string) {
  const parsed = z.object({ areaId: z.string().refine(value => rakDeliveryAreas.some(area => area.id === value)).nullable(), revision: z.number().int().nonnegative(), reason: z.string().trim().min(5).max(500) }).strict().safeParse(raw);
  if (!parsed.success || !ObjectId.isValid(orderId)) throw new HttpError(400, 'INVALID_REQUEST');
  const session = db.client.startSession();
  try { await session.withTransaction(async () => {
    if (!ObjectId.isValid(actor) || !await db.collection('users').findOne({ _id: new ObjectId(actor), role: 'admin', disabled: { $ne: true } }, { ...options, session })) throw new HttpError(403, 'FORBIDDEN');
    const order = await db.collection('orders').findOne({ _id: new ObjectId(orderId) }, { ...options, session });
    if (!order) throw new HttpError(404, 'NOT_FOUND');
    if(order.deliveryAssignment)throw new HttpError(409,'INVALID_TRANSITION');
    if ((order.routing?.revision ?? 0) !== parsed.data.revision) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
    await db.collection('orders').updateOne({ _id: order._id }, { $set: { routing: { version: 1, areaId: parsed.data.areaId, revision: parsed.data.revision + 1, reviewedAt: new Date(), reviewedBy: actor } } }, { ...options, session });
    await db.collection('order_routing_audit').insertOne({ orderId: order._id, actor, before: orderArea(order), after: parsed.data.areaId, reason: parsed.data.reason, createdAt: new Date() }, { session });
    // A routing review is a new staff alert, never another customer confirmation email.
    if (['pending', 'confirmed', 'packed'].includes(historicalStatus(order))) await db.collection<Document & { _id: string }>('order_outbox').insertOne({
      _id: `routing-review:${orderId}:${parsed.data.revision + 1}`, orderId: order._id, kind: 'staff-routing-review',
      state: 'not_required', pushState: 'pending', createdAt: new Date(),
    }, { session });
  }); } finally { await session.endSession(); }
  return { message: 'Delivery area reviewed' };
}
