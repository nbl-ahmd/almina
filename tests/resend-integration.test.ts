import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { Resend } from 'resend';
import { reserveEmailBudget, EmailBudgetExceeded, sendApplicationEmail, emailHash } from '../apps/api/src/modules/notifications/provider';
import { prepareEmailStorage } from '../apps/api/src/modules/notifications/storage';
import { recordEmailEvent } from '../apps/api/src/modules/notifications/email-routes';
import { createApp } from '../apps/api/src/app';
import { unsubscribeReminder } from '../apps/api/src/modules/growth/retention';

const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database required');
test('Resend quotas, acceptance, signatures and unsubscribe remain safe on a disposable database', {skip:!uri}, async t => {
  assert.match(uri!,/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client=await new MongoClient(uri!).connect(),db=client.db('email_test_'+randomUUID().replaceAll('-',''));
  const settings={EMAIL_PROVIDER:'resend',RESEND_API_KEY:'re_synthetic_only',RESEND_MARKETING_API_KEY:'re_synthetic_reminders',EMAIL_TRANSACTIONAL_DOMAIN:'notify.example.invalid',EMAIL_MARKETING_DOMAIN:'news.example.invalid',EMAIL_REPLY_TO:'support@example.invalid',EMAIL_PUBLIC_API_ORIGIN:'https://api.example.invalid',RESEND_WEBHOOK_SECRET:'whsec_'+randomBytes(32).toString('base64')};
  const previous=Object.fromEntries(Object.keys(settings).map(key=>[key,process.env[key]]));Object.assign(process.env,settings);
  try {
    await prepareEmailStorage(db); await prepareEmailStorage(db);
    assert.ok((await db.collection('customer_auth_codes').listIndexes().toArray()).some(index=>index.expireAfterSeconds===0));
    await t.test('concurrent reminder sends stop at twenty while essential email retains capacity',async()=>{
      const now=new Date('2026-10-22T10:00:00Z');
      const reminders=await Promise.allSettled(Array.from({length:30},()=>reserveEmailBudget(db,true,now)));
      assert.equal(reminders.filter(row=>row.status==='fulfilled').length,20);
      const critical=await Promise.allSettled(Array.from({length:90},()=>reserveEmailBudget(db,false,now)));
      assert.equal(critical.filter(row=>row.status==='fulfilled').length,80);
      await assert.rejects(reserveEmailBudget(db,false,now),EmailBudgetExceeded);
      await reserveEmailBudget(db,false,new Date('2026-10-23T00:00:00Z'));
      await db.collection('email_usage').updateOne({_id:'2026-10' as never},{$set:{total:3000}});
      await assert.rejects(reserveEmailBudget(db,false,new Date('2026-10-24T00:00:00Z')),EmailBudgetExceeded);
      await db.collection('email_usage').deleteMany({});
    });
    const recipient='owner@example.invalid',emailId=randomUUID();let calls=0;let keys:string[]=[];
    const fake=()=>{const resend=new Resend('re_synthetic_only');resend.emails.send=async(_message,options)=>{calls++;keys.push(options?.idempotencyKey??'');return {data:{id:emailId},error:null,headers:null};};return resend;};
    await t.test('provider checks acceptance, preserves event idempotency and hides diagnostic details',async()=>{
      const message={kind:'signin' as const,to:recipient,eventId:'synthetic-attempt',variables:{CODE:'123456'}};
      await sendApplicationEmail(db,message,undefined,fake); await sendApplicationEmail(db,message,undefined,fake);
      assert.equal(keys[0],keys[1]);assert.equal(await db.collection('email_delivery').countDocuments({}),1);
      keys=[];let failures=0;
      const flaky=()=>{const resend=fake();resend.emails.send=async(_message,options)=>{keys.push(options?.idempotencyKey??'');failures++;return failures===1?{data:null,error:{name:'application_error',message:'synthetic private provider data',statusCode:500},headers:null}:{data:{id:randomUUID()},error:null,headers:null};};return resend;};
      await sendApplicationEmail(db,{...message,eventId:'retry'},undefined,flaky);assert.equal(failures,2);assert.equal(keys[0],keys[1]);
      const rejected=()=>{const resend=fake();resend.emails.send=async()=>({data:null,error:{name:'validation_error',message:'synthetic private provider data',statusCode:422},headers:null});return resend;};
      await assert.rejects(sendApplicationEmail(db,{...message,eventId:'reject'},undefined,rejected),error=>error instanceof Error&&error.message==='SERVICE_UNAVAILABLE');
    });
    await t.test('complaints block reminders but preserve account email; hard bounces block all sends',async()=>{
      const event={type:'email.complained',created_at:new Date().toISOString(),data:{email_id:emailId,to:[recipient]}};
      await recordEmailEvent(db,event,'msg_complaint123');await recordEmailEvent(db,event,'msg_complaint123');
      assert.equal(await db.collection('email_events').countDocuments({}),1);
      const count=calls;
      await assert.rejects(sendApplicationEmail(db,{kind:'cart',to:recipient,eventId:'cart',variables:{CANCEL_URL:'https://example.invalid/unsubscribe?token='+'a'.repeat(43),ACCOUNT_URL:'https://example.invalid/account'}},undefined,fake),{code:'SERVICE_UNAVAILABLE'});
      assert.equal(calls,count);await sendApplicationEmail(db,{kind:'signin',to:recipient,eventId:'essential',variables:{CODE:'123456'}},undefined,fake);
      await recordEmailEvent(db,{...event,type:'email.bounced'},'msg_bounce123');
      await recordEmailEvent(db,{...event,type:'email.delivered'},'msg_delivered123');
      await assert.rejects(sendApplicationEmail(db,{kind:'signin',to:recipient,eventId:'bounced',variables:{CODE:'123456'}},undefined,fake),{code:'SERVICE_UNAVAILABLE'});
      const blocked=await db.collection('email_suppressions').findOne({_id:emailHash(recipient) as never});assert.equal(blocked?.hardBounce,true);
      assert.ok(!JSON.stringify(await db.collection('email_events').find({}).toArray()).includes(recipient));
    });
    await t.test('webhooks reject invalid, expired and modified signatures; one-click cancels only its token',async()=>{
      const app=createApp({database:{mode:'enabled',checkReadiness:async()=>true},logger:{log:()=>undefined},getDb:async()=>db,development:true});
      const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const address=server.address();assert.ok(address&&typeof address!=='string');const origin='http://127.0.0.1:'+address.port;
      try {
        const body=JSON.stringify({type:'email.delivered',created_at:new Date().toISOString(),data:{email_id:randomUUID(),to:[recipient]}}),id='msg_signed123';
        const signed=(time:number)=>({'content-type':'application/json','svix-id':id,'svix-timestamp':String(time),'svix-signature':'v1,'+createHmac('sha256',Buffer.from(settings.RESEND_WEBHOOK_SECRET.slice(6),'base64')).update(`${id}.${time}.${body}`).digest('base64')});
        const now=Math.floor(Date.now()/1000);
        assert.equal((await fetch(origin+'/api/v1/email/webhook',{method:'POST',headers:signed(now),body})).status,204);
        assert.equal((await fetch(origin+'/api/v1/email/webhook',{method:'POST',headers:signed(now),body:body.replace('delivered','bounced')})).status,403);
        assert.equal((await fetch(origin+'/api/v1/email/webhook',{method:'POST',headers:signed(now-1000),body})).status,403);
        const token='a'.repeat(43);await db.collection('customer_reminders').insertOne({unsubscribeHash:emailHash(token),state:'waiting'});
        const url=origin+'/api/v1/email/unsubscribe/'+token;
        assert.equal((await fetch(url)).status,404);
        assert.equal((await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click'})).status,204);
        assert.equal((await db.collection('customer_reminders').findOne({unsubscribeHash:emailHash(token)}))?.state,'cancelled');
        await unsubscribeReminder(db,token); // Replay remains harmless.
      } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
    });
  } finally {for(const key of Object.keys(settings)){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}await db.dropDatabase();await client.close();}
});
