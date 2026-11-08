import { retiredStoreLogin } from './login-availability.js';
import { hash } from 'bcryptjs';
import { ObjectId,type Db,type Document } from 'mongodb';
import { branchCreationSchema,branchLoginInputSchema,orderRoutingSchema,branchWorkspaceSchema } from '@almina/contracts';
import { administrator,serializeStaffWrites } from '../auth/administration.js';
import { readOrderRouting,routingHealth } from '../orders/routing.js';
import { writeOrderRouting } from '../orders/routing-admin.js';
import { zoneAdministration, enableBranchZones } from './service.js';
import { HttpError } from '../../errors.js';
const query={maxTimeMS:3000};
export async function branchWorkspace(db:Db){
 const [{routing,zones,settings},health]=await Promise.all([zoneAdministration(db),routingHealth(db)]);const logins=await db.collection('users').find({accountType:'branch',branchId:{$in:routing.branches.map(branch=>branch.id)}},{...query,projection:{_id:1,branchId:1,username:1,disabled:1,loginRevision:1}}).limit(21).toArray();if(logins.length>20||new Set(logins.map(login=>login.branchId)).size!==logins.length)throw new HttpError(503,'SERVICE_UNAVAILABLE');
 // Deleted branch credentials remain disabled for history, but are not part of the workspace.
 return branchWorkspaceSchema.parse({routing,zones,settings,stockedProducts:[],staffing:health.staffing,legacyStaff:health.legacyStaff,logins:logins.filter(login=>routing.branches.some(branch=>branch.id===login.branchId)).map(login=>({id:String(login._id),branchId:login.branchId,username:login.username,revision:login.loginRevision??0,disabled:login.disabled===true}))});
}
export async function createBranch(db:Db,raw:unknown,actor:string){
 const parsed=branchCreationSchema.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');const value=parsed.data;await administrator(db,actor);
 const password=await hash(value.login.password,12);
 await serializeStaffWrites(db,async session=>{
  const actorId=await administrator(db,actor,session);const receipts=db.collection<Document&{_id:string}>('branch_creation_receipts'),prior=await receipts.findOne({_id:value.branch.id},{session});
  if(prior){if(prior.actor!==actor||prior.username!==value.login.username)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');if(!(await readOrderRouting(db,session)).branches.some(branch=>branch.id===value.branch.id))throw new HttpError(409,'INVALID_TRANSITION');return;}
  const before=await readOrderRouting(db,session);if(before.revision!==value.revision)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');if(before.branches.some(branch=>branch.id===value.branch.id))throw new HttpError(409,'INVALID_TRANSITION');
  const existing=await db.collection('users').findOne({username:value.login.username},{session,projection:{_id:1,accountType:1,role:1,disabled:1,branchId:1}});
  if(existing){
   // A removed store may be recreated with its old login name, but never adopt a
   // person account, a paused current store, its credentials or its history.
   if(!retiredStoreLogin(existing,before))throw new HttpError(409,'BRANCH_LOGIN_CONFLICT');
   const retiredUsername='retired-'+String(existing._id);
   if(await db.collection('users').findOne({username:retiredUsername},{session,projection:{_id:1}}))throw new HttpError(409,'BRANCH_LOGIN_CONFLICT');
   await db.collection('users').updateOne({_id:existing._id},{$set:{username:retiredUsername,retiredUsername:value.login.username},$unset:{subscription:'',pushSubscriptions:''}},{session});
   await db.collection('api_sessions').deleteMany({userId:existing._id},{session});
   await db.collection('auth_administration_audit').insertOne({actorId,targetUserId:existing._id,action:'retire-orphaned-store-login',previousUsername:value.login.username,createdAt:new Date()},{session});
  }
  const branch={...value.branch,enabled:value.branch.enabled??false},next=orderRoutingSchema.safeParse({...before,branches:[...before.branches,branch],fallbackBranchId:before.fallbackBranchId??branch.id});if(!next.success)throw new HttpError(400,'INVALID_REQUEST');
  const userId=new ObjectId();await db.collection('users').insertOne({_id:userId,accountType:'branch',branchId:branch.id,role:'user',name:branch.name,username:value.login.username,password,loginRevision:1,cities:[],disabled:false,createdAt:new Date()},{session});
  await writeOrderRouting(db,next.data,actor,session,!!value.zone&&value.branch.enabled===true);
  if(value.zone){const zone=value.zone,collection=db.collection<Document&{_id:string}>('delivery_zones');if(await collection.findOne({_id:zone.id},{session})||await collection.countDocuments({deletedAt:{$exists:false}},{session})>=100)throw new HttpError(409,'INVALID_TRANSITION');await collection.insertOne({...zone,_id:zone.id,revision:1,updatedAt:new Date()},{session});await db.collection<Document&{_id:string}>('delivery_controls').updateOne({_id:'zones'},{$inc:{revision:1},$setOnInsert:{active:false}},{upsert:true,session});await db.collection('delivery_audit').insertOne({action:'zone-create-with-branch',actor,after:{...zone,revision:1},at:new Date()},{session});}
  if(value.zone&&value.branch.enabled===true)await enableBranchZones(db,session,[branch.id],actor);
  await receipts.insertOne({_id:branch.id,actor,username:value.login.username,userId,createdAt:new Date()},{session});await db.collection('auth_administration_audit').insertOne({actorId,targetUserId:userId,action:'branch-create',branchId:branch.id,createdAt:new Date()},{session});
 });return branchWorkspace(db);
}
export async function saveBranchLogin(db:Db,raw:unknown,actor:string){
 const parsed=branchLoginInputSchema.safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');const value=parsed.data;await administrator(db,actor);const password=await hash(value.password,12);
 await serializeStaffWrites(db,async session=>{
  const actorId=await administrator(db,actor,session),receipts=db.collection<Document&{_id:string}>('branch_login_receipts');const prior=await receipts.findOne({_id:value.key},{session});if(prior){if(prior.actor!==actor||prior.branchId!==value.branchId||prior.username!==value.username)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');return;}
  const policy=await readOrderRouting(db,session),branch=policy.branches.find(row=>row.id===value.branchId);if(!branch)throw new HttpError(404,'NOT_FOUND');const current=await db.collection('users').findOne({accountType:'branch',branchId:branch.id},{session});if((current?String(current._id):null)!==value.expectedLoginId||(current?.loginRevision??0)!==value.expectedRevision)throw new HttpError(409,'IDEMPOTENCY_CONFLICT');
  if(await db.collection('users').findOne({username:value.username,...(current?{_id:{$ne:current._id}}:{})},{session,projection:{_id:1}}))throw new HttpError(409,'BRANCH_LOGIN_CONFLICT');
  const zoneSettings=await db.collection<Document&{_id:string}>('delivery_controls').findOne({_id:'zones'},{session});
  if(!value.enabled&&(policy.active||zoneSettings?.active)&&branch.enabled!==false&&await db.collection('users').countDocuments({role:'user',branchId:branch.id,disabled:{$ne:true},...(current?{_id:{$ne:current._id}}:{})},{session})===0)throw new HttpError(409,'INVALID_TRANSITION');
  const userId=current?._id??new ObjectId();await db.collection('users').updateOne({_id:userId},{$set:{accountType:'branch',role:'user',branchId:branch.id,name:branch.name,username:value.username,password,loginRevision:(current?.loginRevision??0)+1,disabled:!value.enabled,cities:[]},$setOnInsert:{createdAt:new Date()},$unset:{subscription:'',pushSubscriptions:''}},{session,upsert:true});await db.collection('api_sessions').deleteMany({userId},{session});
  await receipts.insertOne({_id:value.key,actor,branchId:branch.id,username:value.username,userId,createdAt:new Date()},{session});await db.collection('auth_administration_audit').insertOne({actorId,targetUserId:userId,action:current?'branch-login-reset':'branch-login-create',branchId:branch.id,createdAt:new Date()},{session});
 });return branchWorkspace(db);
}
