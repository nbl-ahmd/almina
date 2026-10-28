import {stripeFixture} from './stripe-fixture.js';
// Real Stripe TEST API + disposable local MongoDB. Never uses application database credentials.
import {parseEnv} from 'node:util';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {MongoMemoryReplSet} from 'mongodb-memory-server-core';
import {MongoClient,ObjectId} from 'mongodb';
import {assertExclusiveLoopbackPorts} from './e2e-ownership.mjs';
import {migrateCommerce} from '../migrations/commerce.js';
const root=new URL('../../',import.meta.url),require=createRequire(import.meta.url);
const domain=require('../../backend/commerce/dist/service.cjs');
const {createLegacyApp}=require('../../backend/app.js');
const origin='http://127.0.0.1:4890';
let replica:MongoMemoryReplSet|undefined,client:MongoClient|undefined,child:ReturnType<typeof spawn>|undefined,server:ReturnType<typeof createServer>|undefined;
let worker:{stop:()=>Promise<void>}|undefined;
let stopping=false;
async function stop(){if(stopping)return;stopping=true;child?.kill('SIGTERM');await worker?.stop();server?.closeAllConnections();if(server)await new Promise<void>(resolve=>server!.close(()=>resolve()));await client?.close();await replica?.stop();}
for(const signal of ['SIGTERM','SIGINT'] as const)process.once(signal,()=>{void stop();});
try{
  await assertExclusiveLoopbackPorts([4890,4891]);
  const fixture=process.argv.includes('--fixture')?stripeFixture():null;
  const privateEnv=fixture?{}:parseEnv(await readFile(new URL('.env.stripe-test.local',root),'utf8'));
  const config=fixture?{origin,transport:fixture.transport}:domain.stripeTestOptions({APP_ENV:'development',DATABASE_ENV:'development',WEB_ORIGIN:origin,STRIPE_TEST_ENABLED:'true',STRIPE_SECRET_KEY:privateEnv.STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET:privateEnv.STRIPE_WEBHOOK_SECRET});
  replica=await MongoMemoryReplSet.create({binary:{version:'8.0.17'},replSet:{count:1,name:'almina_stripe_sandbox',ip:'127.0.0.1'}});
  const uri=replica.getUri();if(!/^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_stripe_sandbox$/.test(uri))throw new Error('Unsafe sandbox');
  client=await new MongoClient(uri).connect();const db=client.db('almina_stripe_sandbox_'+randomUUID().replaceAll('-',''));
  const category=new ObjectId();await db.collection('categories').insertOne({_id:category,name:'Sandbox care',disabled:false});
  await db.collection('products').insertOne({_id:new ObjectId('bbbbbbbbbbbbbbbbbbbbbbbb'),product_id:'PDSTRIPETEST',name:'Stripe sandbox care product',description:'Synthetic test product. No real order will be delivered.',category,price:20,stock:20,vat:true,published:true,active:true,disabled:false,contentReviewed:true,productType:'general',images:[]});
  await db.collection('stores').insertOne({status:'open'});await migrateCommerce(db);await domain.prepareStripeStorage(db,true);
  const payments=domain.createStripePayments(async()=>db,config);
  const app=createLegacyApp({getCommerceDb:()=>db,origins:[origin],development:true,stripePayments:payments});
  worker=domain.stripeReconciler(payments,()=>console.error('Stripe sandbox reconciliation unavailable'));
  server=createServer(app);await new Promise<void>(resolve=>server!.listen(4891,'127.0.0.1',resolve));
  const nextRequire=createRequire(new URL('apps/web/package.json',root));
  const env=Object.fromEntries(Object.entries({PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NODE_ENV:'development',APP_ENV:'development',DATABASE_MODE:'disabled',WEB_ORIGIN:origin,API_ORIGIN:'http://127.0.0.1:4891',LEGACY_API_ORIGIN:'http://127.0.0.1:4891',CHECKOUT_ENABLED:'true',STRIPE_TEST_ENABLED:'true',NEXT_TELEMETRY_DISABLED:'1',AL_MINA_ISOLATED_BUILD:'1',AL_MINA_VERIFICATION_TAG:'stripe-sandbox'}).filter(([,value])=>value!==undefined));
  child=spawn(process.execPath,[nextRequire.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','4890'],{cwd:fileURLToPath(new URL('apps/web/',root)),env,stdio:'inherit'});
  child.once('exit',()=>{void stop();});
  if(fixture)console.log('SYNTHETIC provider preview: no Stripe API calls.');
  console.log('Stripe TEST sandbox: '+origin+'/products');
  console.log('Forward Stripe test webhooks to http://127.0.0.1:4891/api/v1/payments/stripe/webhook. Synthetic database only; no notification workers.');
}catch{console.error('Stripe sandbox did not start. Check test-only credentials in .env.stripe-test.local and free ports 4890/4891.');process.exitCode=1;await stop();}
