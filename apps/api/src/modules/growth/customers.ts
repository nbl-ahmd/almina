import { customerOrderFilter } from './ownership.js';
import { randomBytes,randomInt,createHash,createHmac,timingSafeEqual } from 'node:crypto';
import { ObjectId,type Db,type Document } from 'mongodb';
import { createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey } from 'jose';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const emailSchema=z.email().max(254).transform(value=>value.trim().toLowerCase());
const tokenSchema=z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const jwks=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'),{timeoutDuration:5000});
const sessionMs=30*86400000;
export const customerCookie=(development=false)=>development?'almina_customer':'__Host-almina_customer';
export function customerToken(cookie:string|undefined,development=false){const prefix=customerCookie(development)+'=';const parts=String(cookie??'').split(';').map(part=>part.trim()).filter(part=>part.startsWith(prefix));return parts.length===1&&tokenSchema.safeParse(parts[0]!.slice(prefix.length)).success?parts[0]!.slice(prefix.length):undefined;}
export function customerAuthOptions(){return {googleClientId:process.env.CUSTOMER_GOOGLE_CLIENT_ID?.endsWith('.apps.googleusercontent.com')?process.env.CUSTOMER_GOOGLE_CLIENT_ID:null,emailEnabled:Boolean(process.env.CUSTOMER_AUTH_SECRET&&process.env.CUSTOMER_AUTH_SECRET.length>=32&&process.env.CUSTOMER_EMAIL_USER&&process.env.CUSTOMER_EMAIL_PASSWORD)};}
function codeHash(id:string,code:string){const secret=process.env.CUSTOMER_AUTH_SECRET;if(!secret||secret.length<32)throw new HttpError(503,'SERVICE_UNAVAILABLE');return createHmac('sha256',secret).update(id+':'+code).digest('hex');}
export async function requestEmailCode(db:Db,raw:unknown,deliver?:(email:string,code:string)=>Promise<void>){
 const parsed=z.object({email:emailSchema}).strict().safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');
 if(!deliver&&!customerAuthOptions().emailEnabled)throw new HttpError(503,'SERVICE_UNAVAILABLE');
 const email=parsed.data.email,emailHash=hash(email),now=new Date(),quotaId=emailHash+':'+Math.floor(Date.now()/3600000);
 const quota=await db.collection<Document&{_id:string}>('customer_auth_limits').findOneAndUpdate({_id:quotaId},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(Date.now()+3600000)}},{upsert:true,returnDocument:'after'});
 if(!quota||quota.count>5)throw new HttpError(429,'RATE_LIMITED');
 const id=randomBytes(32).toString('base64url'),code=String(randomInt(100000,1000000));
 await db.collection<Document&{_id:string}>('customer_auth_codes').insertOne({_id:hash(id),email,emailHash,codeHash:codeHash(id,code),attempts:0,expiresAt:new Date(Date.now()+10*60000),createdAt:now});
 try {if(deliver)await deliver(email,code);else{const transport=nodemailer.createTransport({host:'smtp.office365.com',port:587,secure:false,requireTLS:true,auth:{user:process.env.CUSTOMER_EMAIL_USER,pass:process.env.CUSTOMER_EMAIL_PASSWORD},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:4000,greetingTimeout:4000,socketTimeout:7000,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});try{await transport.sendMail({from:process.env.CUSTOMER_EMAIL_USER,to:email,subject:'Your Al Mina sign-in code',text:`Your Al Mina Pharmacy sign-in code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.`});}finally{transport.close();}}}catch{await db.collection<Document&{_id:string}>('customer_auth_codes').deleteOne({_id:hash(id)});throw new HttpError(503,'SERVICE_UNAVAILABLE');}
 return {challenge:id};
}
async function startSession(db:Db,email:string,provider:'email'|'google',googleSub?:string){
 // A deployed schema must enforce ownership uniqueness before any customer session exists.
 const indexes=await db.collection('customers').listIndexes().toArray();
 if(!indexes.some(index=>index.unique===true&&index.key.emailHash===1&&Object.keys(index.key).length===1))throw new HttpError(503,'SERVICE_UNAVAILABLE');
 const key=hash(email),now=new Date();
 const customer=await db.collection('customers').findOneAndUpdate({emailHash:key},{$set:{email,verifiedAt:now,lastLoginAt:now,...(googleSub?{googleSub}:{})},$setOnInsert:{createdAt:now,marketingEmail:false,marketingWhatsapp:false,provider}},{upsert:true,returnDocument:'after'});
 if(!customer)throw new HttpError(503,'SERVICE_UNAVAILABLE');
 const token=randomBytes(32).toString('base64url');
 await db.collection<Document&{_id:string}>('customer_sessions').insertOne({_id:hash(token),customerId:customer._id,createdAt:now,expiresAt:new Date(Date.now()+sessionMs)});
 return {token,customer:{id:String(customer._id),email:customer.email}};
}
export async function verifyEmailCode(db:Db,raw:unknown){const parsed=z.object({challenge:tokenSchema,code:z.string().regex(/^\d{6}$/)}).strict().safeParse(raw);if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');const value=parsed.data,id=hash(value.challenge);const record=await db.collection<Document&{_id:string}>('customer_auth_codes').findOneAndUpdate({_id:id,expiresAt:{$gt:new Date()},attempts:{$lt:5}},{$inc:{attempts:1}},{returnDocument:'after'});if(!record||!timingSafeEqual(Buffer.from(record.codeHash,'hex'),Buffer.from(codeHash(value.challenge,value.code),'hex')))throw new HttpError(401,'UNAUTHORIZED');const consumed=await db.collection<Document&{_id:string}>('customer_auth_codes').deleteOne({_id:id,codeHash:record.codeHash});if(consumed.deletedCount!==1)throw new HttpError(401,'UNAUTHORIZED');return startSession(db,record.email,'email');}
export async function googleSignIn(db:Db,raw:unknown){const parsed=z.object({idToken:z.string().min(100).max(10000)}).strict().safeParse(raw);const clientId=customerAuthOptions().googleClientId;if(!parsed.success)throw new HttpError(400,'INVALID_REQUEST');if(!clientId)throw new HttpError(503,'SERVICE_UNAVAILABLE');const payload=await verifyGoogleCredential(parsed.data.idToken,clientId);return startSession(db,emailSchema.parse(payload.email),'google',payload.sub);}
export async function customerIdentity(db:Db,token:string|undefined){if(!token)throw new HttpError(401,'UNAUTHORIZED');const session=await db.collection<Document&{_id:string}>('customer_sessions').findOne({_id:hash(token),expiresAt:{$gt:new Date()}},{maxTimeMS:3000});if(!session)throw new HttpError(401,'UNAUTHORIZED');const user=await db.collection('customers').findOne({_id:session.customerId,disabled:{$ne:true}},{maxTimeMS:3000});if(!user)throw new HttpError(401,'UNAUTHORIZED');return {id:String(user._id),email:String(user.email),marketingEmail:user.marketingEmail===true,marketingWhatsapp:user.marketingWhatsapp===true};}
export async function customerLogout(db:Db,token:string|undefined){if(token)await db.collection<Document&{_id:string}>('customer_sessions').deleteOne({_id:hash(token)});}
export async function customerOrders(db:Db,customer:{email:string}){return db.collection('orders').find({...customerOrderFilter(customer.email),schemaVersion:2},{maxTimeMS:3000,projection:{orderId:1,status:1,createdAt:1,'totals.totalMinor':1,'totals.lines.productId':1,'totals.lines.name':1,'totals.lines.quantity':1}}).sort({_id:-1}).limit(30).toArray();}
export async function saveCustomerPreferences(db:Db,id:string,raw:unknown){const input=z.object({marketingEmail:z.boolean(),marketingWhatsapp:z.boolean()}).strict().safeParse(raw);if(!input.success)throw new HttpError(400,'INVALID_REQUEST');await db.collection('customers').updateOne({_id:new ObjectId(id)},{$set:{...input.data,consentUpdatedAt:new Date(),consentVersion:'growth-v1'}});return input.data;}

const addressSchema=z.object({label:z.string().trim().min(1).max(40),name:z.string().trim().min(1).max(200),mobile:z.string().regex(/^\+?[0-9]{9,15}$/),emirate:z.string().trim().min(1).max(200),city:z.string().trim().min(1).max(200),address:z.string().trim().min(1).max(1000),buildingname:z.string().trim().max(200).default(''),flatno:z.string().trim().max(200).default(''),note:z.string().trim().max(1000).default(''),maplink:z.union([z.literal(''),z.url().max(2048).refine(value=>value.startsWith('https://'))]).default(''),isDefault:z.boolean().default(false)}).strict();
const addressId=z.string().uuid();
export async function customerAddresses(db:Db,id:string){const row=await db.collection('customers').findOne({_id:new ObjectId(id)},{maxTimeMS:3000,projection:{addresses:1}});return Array.isArray(row?.addresses)?row.addresses.slice(0,10):[];}
export async function updateCustomerAddresses(db:Db,id:string,raw:unknown){
 const input=z.discriminatedUnion('operation',[z.object({operation:z.literal('add'),addressId,address:addressSchema}).strict(),z.object({operation:z.literal('update'),addressId,address:addressSchema}).strict(),z.object({operation:z.literal('delete'),addressId}).strict()]).safeParse(raw);
 if(!input.success)throw new HttpError(400,'INVALID_REQUEST');const customerId=new ObjectId(id),addresses=db.collection('customers');
 if(input.data.operation==='add'){
  const row=await addresses.findOneAndUpdate({_id:customerId,$expr:{$lt:[{$size:{$ifNull:['$addresses',[]]}},10]},addresses:{$not:{$elemMatch:{id:input.data.addressId}}}},[{$set:{addresses:{$concatArrays:[{$map:{input:{$ifNull:['$addresses',[]]},as:'address',in:input.data.address.isDefault?{$mergeObjects:['$$address',{isDefault:false}]}:'$$address'}},[{id:input.data.addressId,...input.data.address,createdAt:new Date()}]]},updatedAt:'$$NOW'}}],{returnDocument:'after',projection:{addresses:1}});
  if(!row){const current=await addresses.findOne({_id:customerId},{projection:{addresses:1}});if(current?.addresses?.some((address:Document)=>address.id===input.data.addressId))return customerAddresses(db,id);throw new HttpError(409,'IDEMPOTENCY_CONFLICT');}
 }else if(input.data.operation==='delete'){
  await addresses.updateOne({_id:customerId},[{$set:{addresses:{$filter:{input:{$ifNull:['$addresses',[]]},as:'address',cond:{$ne:['$$address.id',input.data.addressId]}}},updatedAt:'$$NOW'}}]);
 }else{
  const result=await addresses.updateOne({_id:customerId,'addresses.id':input.data.addressId},[{$set:{addresses:{$map:{input:{$ifNull:['$addresses',[]]},as:'address',in:{$cond:[{$eq:['$$address.id',input.data.addressId]},{id:input.data.addressId,...input.data.address,createdAt:'$$address.createdAt'},input.data.address.isDefault?{$mergeObjects:['$$address',{isDefault:false}]}:'$$address']}}},updatedAt:'$$NOW'}}]);
  if(!result.matchedCount)throw new HttpError(404,'NOT_FOUND');
 }
 return customerAddresses(db,id);
}

export async function verifyGoogleCredential(token:string,clientId:string,keySet:JWTVerifyGetKey=jwks){
 let payload;try{payload=(await jwtVerify(token,keySet,{issuer:['https://accounts.google.com','accounts.google.com'],audience:clientId,algorithms:['RS256'],maxTokenAge:'10m'})).payload;}catch{throw new HttpError(401,'UNAUTHORIZED');}
 if(payload.email_verified!==true||typeof payload.sub!=='string'||!emailSchema.safeParse(payload.email).success)throw new HttpError(401,'UNAUTHORIZED');return {...payload,sub:payload.sub,email:emailSchema.parse(payload.email)};
}
