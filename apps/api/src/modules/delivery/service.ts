import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ObjectId, type Db, type Document, type ClientSession } from 'mongodb';
import { deliveryZoneSchema, deliveryPointSchema, zoneSettingsSchema, type DeliveryPoint, type Quote, type ZoneDelivery } from '@almina/contracts';
import { administrator, serializeStaffWrites } from '../auth/administration.js';
import { readOrderRouting } from '../orders/routing.js';
import { historicalStatus } from '../orders/status.js';
import { HttpError } from '../../errors.js';
const query={maxTimeMS:3000};
export async function deliverySettings(db:Db,session?:ClientSession){const row=await db.collection<Document&{_id:string}>('delivery_controls').findOne({_id:'zones'},{...query,...(session?{session}:{})});return zoneSettingsSchema.parse({active:row?.active??false,revision:row?.revision??0});}
export async function touchDelivery(db:Db,session:ClientSession){await db.collection<Document&{_id:string}>('delivery_controls').updateOne({_id:'zones'},{$inc:{orderFence:1},$setOnInsert:{active:false,revision:0}},{session,upsert:true});}
export async function zoneList(db:Db){return (await db.collection('delivery_zones').find({deletedAt:{$exists:false}},query).sort({priority:1,_id:1}).limit(100).toArray()).map(row=>deliveryZoneSchema.parse({...Object.fromEntries(Object.keys(deliveryZoneSchema.shape).map(key=>[key,row[key]])),id:String(row._id)}));}
export async function zoneAdministration(db:Db){return {settings:await deliverySettings(db),zones:await zoneList(db),routing:await readOrderRouting(db)};}
export async function saveZone(db:Db,raw:unknown,actor:string){const parsed=deliveryZoneSchema.extend({enableDelivery:z.boolean().optional()}).safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');const {enableDelivery,...value}=parsed.data;
 await serializeStaffWrites(db,async session=>{await administrator(db,actor,session);const routing=await readOrderRouting(db,session);if(value.branches.some(row=>!routing.branches.some(branch=>branch.id===row.branchId)))throw new HttpError(400,'INVALID_REQUEST');
 const zones=db.collection<Document&{_id:string}>('delivery_zones'),prior=await zones.findOne({_id:value.id},{session});if(prior?.deletedAt|| (prior?.revision??0)!==value.revision)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');if(!prior&&await zones.countDocuments({deletedAt:{$exists:false}},{session})>=100)throw new HttpError(409,'INVALID_TRANSITION');
 await db.collection<Document&{_id:string}>('delivery_controls').updateOne({_id:'zones'},{$inc:{revision:1},$setOnInsert:{active:false}},{upsert:true,session});
 await zones.updateOne({_id:value.id},{$set:{...value,revision:value.revision+1,updatedAt:new Date()}},{upsert:true,session});if(enableDelivery){if(!value.active)throw new HttpError(400,'INVALID_REQUEST');await enableBranchZones(db,session,value.branches.map(row=>row.branchId),actor);}
 await db.collection('delivery_audit').insertOne({action:'zone-save',actor,before:prior,after:{...value,revision:value.revision+1},at:new Date()},{session});});return zoneAdministration(db);}
export async function deleteZone(db:Db,raw:unknown,actor:string){const value=z.object({id:z.uuid(),revision:z.number().int().nonnegative()}).strict().safeParse(raw);if(!value.success)throw new HttpError(400,'INVALID_REQUEST');await serializeStaffWrites(db,async session=>{await administrator(db,actor,session);const result=await db.collection<Document&{_id:string}>('delivery_zones').updateOne({_id:value.data.id,revision:value.data.revision,deletedAt:{$exists:false}},{$set:{active:false,deletedAt:new Date()},$inc:{revision:1}},{session});if(result.modifiedCount!==1)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');await touchDelivery(db,session);await db.collection('delivery_audit').insertOne({action:'zone-delete',actor,...value.data,at:new Date()},{session});});return zoneAdministration(db);}
/** The saved branch polygon is both delivery coverage and the receiving assignment. */
export async function enableBranchZones(db:Db,session:ClientSession,branchIds:string[],actor:string){
 await administrator(db,actor,session);
 const policy=await readOrderRouting(db,session);
 for(const id of branchIds){
  const branch=policy.branches.find(row=>row.id===id);
  if(!branch?.location||!await db.collection('users').findOne({role:'user',branchId:id,disabled:{$ne:true}},{session,projection:{_id:1}})||!await db.collection('delivery_zones').findOne({active:true,deletedAt:{$exists:false},'branches.branchId':id},{session,projection:{_id:1}}))throw new HttpError(409,'DELIVERY_SETUP_REQUIRED');
 }
 await requireZoneIndex(db);
 const next={...policy,branches:policy.branches.map(branch=>branchIds.includes(branch.id)?{...branch,enabled:true}:branch),revision:policy.revision+1};
 await db.collection<Document&{_id:string}>('growth_settings').updateOne({_id:'order-routing'},{$set:{...next,updatedAt:new Date(),updatedBy:actor}},{session});
 await db.collection<Document&{_id:string}>('delivery_controls').updateOne({_id:'zones'},{$set:{active:true},$inc:{revision:1},$setOnInsert:{orderFence:0}},{session,upsert:true});
 await db.collection('delivery_audit').insertOne({action:'branch-zone-enable',actor,branchIds,at:new Date()},{session});
}
async function requireZoneIndex(db:Db){let ready=false;try{ready=(await db.collection('delivery_zones').listIndexes().toArray()).some(index=>index.key?.geometry==='2dsphere');}catch{throw new HttpError(409,'DELIVERY_SETUP_REQUIRED');}if(!ready)throw new HttpError(409,'DELIVERY_SETUP_REQUIRED');}
export async function saveZoneSettings(db:Db,raw:unknown,actor:string){const parsed=zoneSettingsSchema.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');await serializeStaffWrites(db,async session=>{await administrator(db,actor,session);const before=await deliverySettings(db,session);if(before.revision!==parsed.data.revision)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');if(parsed.data.active){
 const policy=await readOrderRouting(db,session);if(!policy.branches.some(branch=>branch.enabled!==false&&branch.location))throw new HttpError(409,'DELIVERY_SETUP_REQUIRED');
 if(!await db.collection('delivery_zones').findOne({active:true,deletedAt:{$exists:false}},{session}))throw new HttpError(409,'DELIVERY_SETUP_REQUIRED');
 await requireZoneIndex(db);
 }
 await db.collection<Document&{_id:string}>('delivery_controls').updateOne({_id:'zones'},{$set:{active:parsed.data.active,revision:before.revision+1},$setOnInsert:{orderFence:0}},{session,upsert:true});await db.collection('delivery_audit').insertOne({action:'zone-activation',actor,before,after:parsed.data,at:new Date()},{session});});return zoneAdministration(db);}
export function distanceMeters(a:DeliveryPoint,b:DeliveryPoint){const radians=(value:number)=>value*Math.PI/180;const dlat=radians(b.latitude-a.latitude),dlon=radians(b.longitude-a.longitude),x=Math.sin(dlat/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(dlon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
type Candidate={delivery:ZoneDelivery;fee:number;minimum:number;priority:number;distance:number};
export async function selectDelivery(db:Db,customer:{coordinates?:DeliveryPoint|undefined},quote:Quote,session?:ClientSession,targetBranch?:string):Promise<Candidate|null>{
 const settings=await deliverySettings(db,session);if(!settings.active)return null;if(!customer.coordinates)throw new HttpError(422,'DELIVERY_LOCATION_REQUIRED');
 const point=deliveryPointSchema.parse(customer.coordinates),options={...query,...(session?{session}:{})};
 const zones=await db.collection('delivery_zones').find({active:true,deletedAt:{$exists:false},geometry:{$geoIntersects:{$geometry:{type:'Point',coordinates:[point.longitude,point.latitude]}}}},options).sort({priority:1,_id:1}).limit(101).toArray();
 if(zones.length>100)throw new HttpError(503,'SERVICE_UNAVAILABLE');if(!zones.length)throw new HttpError(422,'ADDRESS_NOT_SERVICEABLE');
 const policy=await readOrderRouting(db,session),branches=policy.branches.filter(branch=>branch.enabled!==false&&branch.location&&(!targetBranch||branch.id===targetBranch));
 const receiving=await db.collection('users').find({role:'user',disabled:{$ne:true},branchId:{$in:branches.map(branch=>branch.id)}},{...options,projection:{branchId:1}}).limit(1001).toArray();if(receiving.length>1000)throw new HttpError(503,'SERVICE_UNAVAILABLE');
 const candidates:Candidate[]=[];let minimumFailed=false;
 for(const branch of branches){if(!receiving.some(user=>user.branchId===branch.id))continue;const eligible=zones.filter(zone=>zone.branches.some((row:{branchId:string})=>row.branchId===branch.id));if(!eligible.length)continue;
 const zone=eligible[0]!,assignment=zone.branches.find((row:{branchId:string})=>row.branchId===branch.id)!;
 if(quote.subtotalMinor<Math.max(quote.minimumOrderMinor,zone.minimumOrderMinor)){minimumFailed=true;continue;}
 candidates.push({delivery:{branchId:branch.id,branchName:branch.name,zoneId:String(zone._id),zoneName:zone.name,zoneRevision:zone.revision,estimatedMinutes:zone.estimatedMinutes},fee:zone.deliveryFeeMinor,minimum:Math.max(quote.minimumOrderMinor,zone.minimumOrderMinor),priority:assignment.priority,distance:distanceMeters(point,branch.location!)});
 }
 candidates.sort((a,b)=>a.priority-b.priority||a.distance-b.distance||a.delivery.branchId.localeCompare(b.delivery.branchId));
 if(!candidates.length)throw new HttpError(422,minimumFailed?'MINIMUM_ORDER':'ADDRESS_NOT_SERVICEABLE');return candidates[0]!;
}
export async function applyZoneQuote(db:Db,customer:{coordinates?:DeliveryPoint|undefined},quote:Quote,session?:ClientSession):Promise<Quote>{if(session)await touchDelivery(db,session);const selected=await selectDelivery(db,customer,quote,session);if(!selected)return quote;const total=BigInt(quote.totalMinor)-BigInt(quote.deliveryFeeMinor)+BigInt(selected.fee);if(total>BigInt(Number.MAX_SAFE_INTEGER))throw new HttpError(503,'COMMERCE_UNAVAILABLE');return {...quote,delivery:selected.delivery,deliveryFeeMinor:selected.fee,minimumOrderMinor:selected.minimum,totalMinor:Number(total)};}
export async function restoreBranch(db:Db,session:ClientSession,order:Document){// Only pre-shared-stock orders hold a second reservation. Never credit it twice.
 if(!order.deliveryAssignment?.branchId||order.inventory?.source==='main'||order.inventory?.branchReservationReleased)return;for(const line of order.lines){const result=await db.collection('branch_inventory').updateOne({branchId:order.deliveryAssignment.branchId,productId:new ObjectId(line.productId),stock:{$gte:0,$lte:Number.MAX_SAFE_INTEGER-line.quantity,$mod:[1,0]}},{$inc:{stock:line.quantity,revision:1}},{session});if(result.modifiedCount!==1)throw new HttpError(409,'INSUFFICIENT_STOCK');}}
export async function branchInventory(db:Db,raw:unknown){const value=z.object({branchId:z.uuid(),q:z.string().trim().max(60).optional(),before:z.string().regex(/^[a-f0-9]{24}$/i).optional()}).strict().safeParse(raw);if(!value.success)throw new HttpError(400,'INVALID_REQUEST');const filter:Document={...(value.data.before?{_id:{$lt:new ObjectId(value.data.before)}}:{}),...(value.data.q?{product_id:value.data.q}:{})};const products=await db.collection('products').find(filter,{...query,projection:{name:1,product_id:1,stock:1}}).sort({_id:-1}).limit(25).toArray();return products.map(row=>({...row,id:String(row._id),availableGlobal:row.stock,branchStock:row.stock,revision:0}));}
// Retain the protected legacy endpoint, but do not allow stale clients to create allocations.
export async function setBranchInventory(db:Db,_raw:unknown,actor:string){await administrator(db,actor);throw new HttpError(409,'BRANCH_STOCK_RETIRED');}

export async function reassignDelivery(db:Db,orderId:string,raw:unknown,actor:string){const parsed=z.object({branchId:z.uuid(),expectedBranchId:z.uuid(),reason:z.string().trim().min(5).max(500)}).strict().safeParse(raw);if(!parsed.success||!ObjectId.isValid(orderId))throw new HttpError(400,'INVALID_REQUEST');const value=parsed.data;await serializeStaffWrites(db,async session=>{await administrator(db,actor,session);const order=await db.collection('orders').findOne({_id:new ObjectId(orderId)},{session});if(!order||!order.deliveryAssignment)throw new HttpError(404,'NOT_FOUND');if(order.deliveryAssignment.branchId!==value.expectedBranchId)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');if(!['pending','confirmed','packed'].includes(historicalStatus(order))||order.inventory?.restored||order.payment?.refundRequested)throw new HttpError(409,'INVALID_TRANSITION');if(order.deliveryAssignment.branchId===value.branchId)return;
 const selected=await selectDelivery(db,order.customer,order.totals,session,value.branchId);if(!selected||selected.fee!==order.totals.deliveryFeeMinor)throw new HttpError(409,'PRICE_CHANGED');await touchDelivery(db,session);await restoreBranch(db,session,order);
 await db.collection('orders').updateOne({_id:order._id},{$set:{deliveryAssignment:selected.delivery,'inventory.branchReservationReleased':true,assignmentHistory:[...(Array.isArray(order.assignmentHistory)?order.assignmentHistory:[]),{from:order.deliveryAssignment.branchId,to:value.branchId,actor,reason:value.reason,at:new Date()}]}},{session});await db.collection('delivery_audit').insertOne({action:'order-reassign',orderId:order._id,actor,...value,at:new Date()},{session});await db.collection<Document&{_id:string}>('order_outbox').insertOne({_id:`branch-reassign:${orderId}:${randomUUID()}`,orderId:order._id,state:'not_required',pushState:'pending',createdAt:new Date()},{session});});return {message:'Order reassigned; main stock reservation unchanged'};}
