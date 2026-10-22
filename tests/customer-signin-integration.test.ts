import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { saveWholesaleType, saveWholesaleAccount, issueWholesaleInvite, acceptWholesaleInvite, wholesaleAccess } from '../apps/api/src/modules/wholesale/repository';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { googleSignIn, requestEmailCode, verifyEmailCode, customerIdentity } from '../apps/api/src/modules/growth/customers';
const uri=process.env.COMMERCE_TEST_URI;
assert.ok(uri||process.env.REQUIRE_DATABASE_TESTS!=='1','Disposable database required');
test('customer Google and email identity safeguards',{skip:!uri},async t=>{
 assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
 const client=await new MongoClient(uri!).connect(),db=client.db('customer_signin_'+randomUUID().replaceAll('-',''));
 const previous={secret:process.env.CUSTOMER_AUTH_SECRET,google:process.env.CUSTOMER_GOOGLE_CLIENT_ID};
 const aud='synthetic.apps.googleusercontent.com',keys=await generateKeyPair('RS256'),jwk=await exportJWK(keys.publicKey);jwk.kid='synthetic';jwk.alg='RS256';
 const keySet=createLocalJWKSet({keys:[jwk]});
 async function sign(email='shopper@gmail.com',sub='google-one',extra:Record<string,unknown>={}){return new SignJWT({email,sub,email_verified:true,iss:'https://accounts.google.com',aud,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,...extra}).setProtectedHeader({alg:'RS256',kid:'synthetic'}).sign(keys.privateKey);}
 process.env.CUSTOMER_AUTH_SECRET='synthetic-customer-secret-at-least-32-characters';process.env.CUSTOMER_GOOGLE_CLIENT_ID=aud;
 try{
  await db.collection('customers').createIndex({emailHash:1},{unique:true});
  await t.test('Google fails closed until provider identity uniqueness is installed',async()=>{
   await assert.rejects(googleSignIn(db,{idToken:await sign()},keySet),{code:'SERVICE_UNAVAILABLE'});
   assert.equal(await db.collection('customer_sessions').countDocuments(),0);
   await db.collection('customers').createIndex({googleSub:1},{unique:true,partialFilterExpression:{googleSub:{$type:'string'}}});
  });
  await t.test('first sign-in creates one account, repeat sign-in and email code use the same account',async()=>{
   const first=await googleSignIn(db,{idToken:await sign()},keySet),again=await googleSignIn(db,{idToken:await sign()},keySet);
   assert.equal(first.customer.id,again.customer.id);assert.equal((await customerIdentity(db,first.token)).email,'shopper@gmail.com');
   let code='';const challenge=await requestEmailCode(db,{email:' Shopper@Gmail.com '},async(_email,value)=>{code=value;});
   const email=await verifyEmailCode(db,{...challenge,code});assert.equal(email.customer.id,first.customer.id);
   const account=await db.collection('customers').findOne({email:'shopper@gmail.com'});assert.equal(account!.marketingEmail,false);assert.equal(account!.marketingWhatsapp,false);
   assert.notEqual(first.token,again.token);assert.equal(await db.collection('customer_sessions').countDocuments({_id:first.token as never}),0);
  });
  await t.test('Google sign-in grants business access only after the matching approved invitation is accepted', async()=>{
   const adminId=String(new ObjectId());
   await saveWholesaleType(db,{id:'salon',name:'Salon',active:true,allowMedicines:false,revision:0},adminId);
   const approved=await saveWholesaleAccount(db,{email:'shopper@gmail.com',businessName:'Synthetic Salon',typeId:'salon',approval:'approved',verificationReference:'Synthetic verified business',scope:'assigned',productIds:[],categoryIds:[],revision:0},adminId);
   const login=await googleSignIn(db,{idToken:await sign()},keySet);
   await assert.rejects(wholesaleAccess(db,login.customer),{status:403});
   const invite=await issueWholesaleInvite(db,{email:login.customer.email,revision:approved.revision},adminId);
   const other=await googleSignIn(db,{idToken:await sign('other@gmail.com','google-other')},keySet);
   await assert.rejects(acceptWholesaleInvite(db,other.customer.email,{token:invite.token}),{status:403});
   await acceptWholesaleInvite(db,login.customer.email,{token:invite.token});
   const returning=await googleSignIn(db,{idToken:await sign()},keySet);
   assert.equal(returning.customer.id,login.customer.id);
   assert.equal((await wholesaleAccess(db,returning.customer)).businessName,'Synthetic Salon');
   await db.collection('wholesale_accounts').updateOne({email:login.customer.email},{$set:{approval:'suspended'}});
   await assert.rejects(wholesaleAccess(db,returning.customer),{status:403});
  });
  await t.test('Google binding cannot be overwritten or moved to a different mailbox',async()=>{
   const count=await db.collection('customer_sessions').countDocuments();
   await assert.rejects(googleSignIn(db,{idToken:await sign('shopper@gmail.com','other-sub')},keySet),{code:'UNAUTHORIZED'});
   await assert.rejects(googleSignIn(db,{idToken:await sign('changed@gmail.com')},keySet),{code:'FORBIDDEN'});
   assert.equal(await db.collection('customer_sessions').countDocuments(),count);assert.equal(await db.collection('customers').countDocuments({googleSub:'google-one'}),1);
  });
  await t.test('third-party mailboxes require email verification; Workspace identity is accepted',async()=>{
   await assert.rejects(googleSignIn(db,{idToken:await sign('external@example.invalid','external')},keySet),{code:'FORBIDDEN'});
   const workspace=await googleSignIn(db,{idToken:await sign('worker@example.invalid','workspace',{hd:'example.invalid'})},keySet);assert.equal(workspace.customer.email,'worker@example.invalid');
  });
  await t.test('disabled customer cannot receive new Google or email sessions',async()=>{
   const email='shopper@gmail.com';await db.collection('customers').updateOne({email},{$set:{disabled:true}});
   const count=await db.collection('customer_sessions').countDocuments();
   await assert.rejects(googleSignIn(db,{idToken:await sign()},keySet),{code:'UNAUTHORIZED'});
   let code='';const challenge=await requestEmailCode(db,{email},async(_email,value)=>{code=value;});
   await assert.rejects(verifyEmailCode(db,{...challenge,code}),{code:'UNAUTHORIZED'});
   assert.equal(await db.collection('customer_sessions').countDocuments(),count);
   const account=await db.collection('customers').findOne({emailHash:createHash('sha256').update(email).digest('hex')});assert.equal(account!.disabled,true);
  });
 }finally{for(const[name,value]of Object.entries({CUSTOMER_AUTH_SECRET:previous.secret,CUSTOMER_GOOGLE_CLIENT_ID:previous.google})){if(value===undefined)delete process.env[name];else process.env[name]=value;}await db.dropDatabase();await client.close();}
});
