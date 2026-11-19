import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createECDH, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { ObjectId, type MongoClient, type Db, type Document } from 'mongodb';
import { staffDeviceFingerprints } from '../apps/api/src/modules/notifications/settings';
import { staffPushOutbox } from '../apps/api/src/modules/notifications/push-outbox';
import { PushFailure } from '../apps/api/src/modules/notifications/push';
import { operationsSnapshot } from '../apps/api/src/modules/operations/snapshot';
import { createOperationalMetrics } from '../apps/api/src/modules/operations/metrics';
import { operationsSnapshotSchema } from '@almina/contracts';
import { registerStaffSubscription, removeStaffSubscription } from '../apps/api/src/modules/notifications/subscriptions';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('subscription persistence is current-staff-only, repeatable and never overwrites another account or commerce data', { skip: !uri }, async () => {
  const f = await fixture();
  const actor = new ObjectId(), other = new ObjectId(), original = subscription('other'), value = subscription('self');
  try {
    await f.db.collection('users').insertMany([{ _id: actor, role: 'user' }, { _id: other, role: 'admin', subscription: original }]);
    await f.db.collection('products').insertOne({ product_id: 'PD0001', stock: 4, price: 12.5 });
    for (let attempt = 0; attempt < 2; attempt++) await registerStaffSubscription(f.db, { subscription: value, userId: other.toHexString() }, actor.toHexString(), {});
    assert.deepEqual((await f.db.collection('users').findOne({ _id: actor }))!.subscription, value);
    assert.deepEqual((await f.db.collection('users').findOne({ _id: other }))!.subscription, original);
    await f.db.collection('users').updateOne({ _id: actor }, { $set: { disabled: true } });
    await assert.rejects(registerStaffSubscription(f.db, { subscription: subscription('replacement') }, actor.toHexString(), {}), { status: 401 });
    await assert.rejects(removeStaffSubscription(f.db, {}, actor.toHexString(), {}), { status: 401 });
    assert.deepEqual((await f.db.collection('users').findOne({ _id: actor }))!.subscription, value);
    await f.db.collection('users').updateOne({ _id: actor }, { $unset: { disabled: '' } });
    for (let attempt = 0; attempt < 2; attempt++) await removeStaffSubscription(f.db, { userId: other.toHexString() }, actor.toHexString(), {});
    assert.equal((await f.db.collection('users').findOne({ _id: actor }))!.subscription, undefined);
    assert.deepEqual((await f.db.collection('users').findOne({ _id: other }))!.subscription, original);
    await assert.rejects(registerStaffSubscription(f.db, { subscription: value }, new ObjectId().toHexString(), {}), { status: 401 });
    await f.db.collection('users').updateOne({ _id: actor }, { $set: { role: 'customer' } });
    await assert.rejects(registerStaffSubscription(f.db, { subscription: value }, actor.toHexString(), {}), { status: 401 });
    assert.equal(await f.db.collection('users').countDocuments(), 2);
    assert.equal(await f.db.collection('orders').countDocuments(), 0);
    const product = await f.db.collection('products').findOne({ product_id: 'PD0001' });
    assert.equal(product!.stock, 4); assert.equal(product!.price, 12.5);
  } finally { await f.close(); }
});
function subscription(suffix = 'synthetic') {
  const curve = createECDH('prime256v1'); curve.generateKeys();
  return { endpoint: 'https://fcm.googleapis.com/' + suffix, keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
}
async function fixture(monitorCommands = false) {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  // Exercise the retained driver's separate BSON constructors, as production native getDb does.
  const require = createRequire(new URL('../backend/package.json', import.meta.url));
  const NativeClient = require('mongodb').MongoClient as typeof MongoClient;
  const client = await new NativeClient(uri!, { monitorCommands }).connect(), db = client.db('almina_push_' + randomUUID().replaceAll('-', ''));
  const workers: Awaited<ReturnType<typeof staffPushOutbox>>[] = [];
  return { client, db, workers, async close() { for (const worker of workers) await worker.stop(); await db.dropDatabase(); await client.close(); } };
}
async function seed(db: Db, id = 'confirmation:synthetic') {
  const orderId = new ObjectId();
  await db.collection('orders').insertOne({ _id: orderId, customer: { city: 'City A', name: 'synthetic-private' } });
  await db.collection<Document & { _id: string }>('order_outbox').insertOne({ _id: id, orderId, state: 'sent', attempts: 2, createdAt: new Date() });
  return orderId;
}
test('shared store registrations keep multiple devices, remove only the chosen device, and send once per remaining device', { skip: !uri }, async () => {
  const f=await fixture(), actor=new ObjectId(), first=subscription('store-first'), second=subscription('store-second'), third=subscription('store-third');
  const sent:string[]=[];
  try{
    await f.db.collection('users').insertOne({_id:actor,role:'admin',subscription:first});
    await Promise.all([second,third].map(value=>registerStaffSubscription(f.db,{subscription:value},String(actor),{})));
    let user=await f.db.collection('users').findOne({_id:actor});
    assert.equal(user!.pushSubscriptions.length,3);const devices=await staffDeviceFingerprints(f.db,String(actor));assert.equal(devices.length,3);assert.ok(devices.every(id=>/^[a-f0-9]{64}$/.test(id)));assert.deepEqual(await staffDeviceFingerprints(f.db,String(new ObjectId())),[]);
    await registerStaffSubscription(f.db,{subscription:second},String(actor),{});
    assert.equal((await f.db.collection('users').findOne({_id:actor}))!.pushSubscriptions.length,3);
    await removeStaffSubscription(f.db,{endpoint:second.endpoint},String(actor),{});
    user=await f.db.collection('users').findOne({_id:actor});assert.equal(user!.pushSubscriptions.length,2);assert.notEqual(user!.subscription.endpoint,second.endpoint);
    const worker=await staffPushOutbox(()=>f.db,{send:async value=>{sent.push(value.endpoint);},onFailure:()=>assert.fail('Unexpected push failure'),intervalMs:60000});f.workers.push(worker);
    await seed(f.db,'confirmation:multiple-devices');for(let i=0;i<6;i++)await worker.tick();
    assert.deepEqual(sent.sort(),[first.endpoint,third.endpoint].sort());
    assert.equal(await f.db.collection('staff_push_deliveries').countDocuments({state:'accepted'}),2);
    await removeStaffSubscription(f.db,{endpoint:first.endpoint},String(actor),{});
    assert.equal((await f.db.collection('users').findOne({_id:actor}))!.subscription.endpoint,third.endpoint);
  }finally{await f.close();}
});
test('an expired primary device does not suppress the other device on a shared account', {skip:!uri}, async()=>{
  const f=await fixture(),actor=new ObjectId(), first=subscription('surviving'), expired=subscription('expired-primary');const sent:string[]=[];
  try{
    await f.db.collection('users').insertOne({_id:actor,role:'admin'});
    for(const value of [first,expired])await registerStaffSubscription(f.db,{subscription:value},String(actor),{});
    const worker=await staffPushOutbox(()=>f.db,{send:async value=>{sent.push(value.endpoint);if(value.endpoint===expired.endpoint)throw new PushFailure('expired');},onFailure:()=>{},intervalMs:60000});f.workers.push(worker);
    await seed(f.db,'confirmation:expired-primary');for(let i=0;i<6;i++)await worker.tick();
    assert.equal(sent.filter(endpoint=>endpoint===first.endpoint).length,1);
    const user=await f.db.collection('users').findOne({_id:actor});assert.equal(user!.subscription.endpoint,first.endpoint);assert.equal(user!.pushSubscriptions.length,1);
  }finally{await f.close();}
});
test('push derives only new committed jobs, scopes current staff, deduplicates competing workers and drains an active send', { skip: !uri }, async () => {
  const f = await fixture(); let calls = 0, release!: () => void, entered!: () => void;
  try {
    await f.db.collection<Document & { _id: string }>('order_outbox').insertOne({ _id: 'historical', createdAt: new Date(0), state: 'sent' });
    const blocked = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { entered = resolve; });
    const send = async () => { calls++; entered(); await blocked; };
    const a = await staffPushOutbox(() => f.db, { send, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(a);
    const b = await staffPushOutbox(() => f.db, { send, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(b);
    const activation = await f.db.collection('notification_controls').findOne(); assert.ok(activation!.enabledAt instanceof Date);
    await seed(f.db);
    await f.db.collection('users').insertMany([
      { role: 'admin', subscription: subscription('admin') }, { role: 'user', cities: ['City A'], subscription: subscription('city') },
      { role: 'user', cities: ['City B'], subscription: subscription('outside') }, { role: 'admin', disabled: true, subscription: subscription('disabled') },
      { role: 'owner', subscription: subscription('unrecognized-role') },
    ]);
    const tick = a.tick(); await started; await b.tick(); assert.equal(calls, 1);
    let drained = false; const stopping = a.stop().then(() => { drained = true; }); await Promise.resolve(); assert.equal(drained, false);
    release(); await tick; await stopping; for (let i = 0; i < 4; i++) await b.tick();
    assert.equal(calls, 2); assert.equal(await f.db.collection('staff_push_deliveries').countDocuments({ state: 'accepted' }), 2);
    const job = await f.db.collection('order_outbox').findOne({ orderId: { $exists: true } });
    assert.equal(job!.pushState, 'done'); assert.equal(job!.state, 'sent'); assert.equal(job!.attempts, 2);
    assert.equal(await f.db.collection('orders').countDocuments(), 1); assert.equal(await f.db.collection('notification_controls').countDocuments(), 1);
    assert.ok(!JSON.stringify(await f.db.collection('staff_push_deliveries').find().toArray()).includes('fcm.googleapis'));
    assert.ok(!(await f.db.collection('order_outbox').findOne({ createdAt: new Date(0) }))!.pushState);
  } finally { await f.close(); }
});
test('known push outage backs off eight bounded attempts, while unknown response is quarantined without resend', { skip: !uri }, async () => {
  const f = await fixture(); let calls = 0, unknown = false;
  try {
    const worker = await staffPushOutbox(() => f.db, { send: async () => { calls++; throw new PushFailure(unknown ? 'uncertain' : 'retryable'); }, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(worker);
    await f.db.collection('users').insertOne({ role: 'admin', subscription: subscription() }); await seed(f.db);
    await worker.tick(); const jobs = f.db.collection<Document & { _id: string }>('order_outbox');
    assert.ok((await jobs.findOne({ _id: 'confirmation:synthetic' }))!.pushNextAttemptAt > new Date());
    await worker.tick(); assert.equal(calls, 1);
    for (let i = 1; i < 8; i++) { await jobs.updateOne({ _id: 'confirmation:synthetic' }, { $set: { pushNextAttemptAt: new Date(0) } }); await worker.tick(); }
    await worker.tick(); await worker.tick(); assert.equal(calls, 8);
    assert.equal((await f.db.collection('staff_push_deliveries').findOne())!.state, 'failed');
    unknown = true; await seed(f.db, 'confirmation:unknown'); await worker.tick(); await worker.tick(); await worker.tick(); assert.equal(calls, 9);
    assert.equal(await f.db.collection('staff_push_deliveries').countDocuments({ state: 'uncertain' }), 1);
    assert.equal(await f.db.collection('orders').countDocuments(), 2);
    const snapshot = operationsSnapshotSchema.parse(await operationsSnapshot(f.db, createOperationalMetrics('retained-api')));
    assert.ok(snapshot.alerts.includes('PUSH_DELIVERY_REVIEW')); assert.equal(snapshot.database.pushJobsNeedingReview, 2);
    assert.ok(!JSON.stringify(snapshot).includes('synthetic-private')); assert.ok(!JSON.stringify(snapshot).includes('fcm.googleapis'));
  } finally { await f.close(); }
});
test('expired push conditionally removes only the exact old subscription, retaining a concurrent replacement', { skip: !uri }, async () => {
  const f = await fixture(); const old = subscription('old'), replacement = subscription('replacement'), userId = new ObjectId(); let replace = true;
  try {
    const worker = await staffPushOutbox(() => f.db, { send: async () => {
      if (replace) await f.db.collection('users').updateOne({ _id: userId }, { $set: { subscription: replacement } });
      throw new PushFailure('expired');
    }, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(worker);
    await f.db.collection('users').insertOne({ _id: userId, role: 'admin', subscription: old }); await seed(f.db);
    await worker.tick(); assert.deepEqual((await f.db.collection('users').findOne({ _id: userId }))!.subscription, replacement); await worker.tick();
    replace = false; await seed(f.db, 'confirmation:second'); await worker.tick();
    assert.equal((await f.db.collection('users').findOne({ _id: userId }))!.subscription, undefined);
  } finally { await f.close(); }
});
test('accepted push persists before cursor failure and resumes without provider replay; stalled sender drains to uncertain', { skip: !uri }, async () => {
  const f = await fixture(); let failCursor = true, calls = 0;
  const faulty = new Proxy(f.db, { get(target, property) {
    if (property === 'collection') return (name: string) => {
      const collection = target.collection(name);
      return new Proxy(collection, { get(c, op) {
        if (name === 'order_outbox' && op === 'updateOne') return async (...args: unknown[]) => {
          const update = args[1] as { $set?: { pushCursor?: unknown } };
          if (failCursor && update.$set?.pushCursor) { failCursor = false; throw new Error('Synthetic cursor persistence outage'); }
          return Reflect.apply(c.updateOne, c, args);
        };
        const value = Reflect.get(c, op, c); return typeof value === 'function' ? value.bind(c) : value;
      } });
    };
    const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
  } });
  try {
    const worker = await staffPushOutbox(() => faulty, { send: async () => { calls++; }, onFailure: () => {}, intervalMs: 60000 }); f.workers.push(worker);
    await f.db.collection('users').insertOne({ role: 'admin', subscription: subscription() }); await seed(f.db);
    await worker.tick(); assert.equal((await f.db.collection('staff_push_deliveries').findOne())!.state, 'accepted');
    await f.db.collection('order_outbox').updateMany({}, { $set: { pushNextAttemptAt: new Date(0) } }); await worker.tick(); await worker.tick(); assert.equal(calls, 1);
    let aborted = false;
    const stalled = await staffPushOutbox(() => f.db, { send: async (_sub, signal) => { signal.addEventListener('abort', () => { aborted = true; }); return new Promise(() => {}); }, onFailure: () => {}, intervalMs: 60000, sendTimeoutMs: 15 }); f.workers.push(stalled);
    await seed(f.db, 'confirmation:stall'); await stalled.tick(); await stalled.stop(); assert.equal(aborted, true);
    assert.equal(await f.db.collection('staff_push_deliveries').countDocuments({ state: 'uncertain' }), 1);
    await worker.tick(); await worker.tick(); assert.equal(calls, 1);
  } finally { await f.close(); }
});

import { prepareStaffAlertStorage,observeStock,notificationFeed,markNotifications,recordOrderAlert,testStaffNotification,saveAlertPreferences,saveAlertRules } from '../apps/api/src/modules/notifications/center';
test('stock alerts have quiet baseline, one push per episode, zero escalation and no commerce writes',{skip:!uri},async()=>{
 const f=await fixture(),actor=new ObjectId(),product=new ObjectId();
 try{
  await prepareStaffAlertStorage(f.db);await f.db.collection('users').insertOne({_id:actor,role:'admin'});
  await f.db.collection('products').insertOne({_id:product,product_id:'PD-TEST',stock:3,price:50});
  await observeStock(f.db,product);await observeStock(f.db,product);
  let feed=await notificationFeed(f.db,{},String(actor));assert.equal(feed.items.length,1);assert.equal(feed.items[0]!.announce,false);assert.equal(await f.db.collection('order_outbox').countDocuments(),0);
  await f.db.collection('products').updateOne({_id:product},{$set:{stock:10}});await observeStock(f.db,product);
  assert.equal((await notificationFeed(f.db,{},String(actor))).items[0]!.resolved,true);
  await f.db.collection('products').updateOne({_id:product},{$set:{stock:2}});await Promise.all([observeStock(f.db,product),observeStock(f.db,product)]);
  assert.equal(await f.db.collection('order_outbox').countDocuments(),1);
  await f.db.collection('products').updateOne({_id:product},{$set:{stock:0}});await observeStock(f.db,product);await observeStock(f.db,product);
  assert.equal(await f.db.collection('order_outbox').countDocuments(),2);
  feed=await notificationFeed(f.db,{},String(actor));assert.equal(feed.items[0]!.kind,'out-of-stock');assert.equal(feed.items[0]!.announce,true);assert.equal(feed.items.filter(item=>!item.resolved).length,1);
  await markNotifications(f.db,{ids:[feed.items[0]!.id]},String(actor));assert.equal((await notificationFeed(f.db,{},String(actor))).items[0]!.read,true);
  const source=await f.db.collection('products').findOne({_id:product});assert.equal(source!.price,50);assert.equal(source!.stock,0);assert.equal(await f.db.collection('orders').countDocuments(),0);
  await saveAlertRules(f.db,{lowStockThreshold:2,revision:0},String(actor));await observeStock(f.db,product);assert.equal(await f.db.collection('order_outbox').countDocuments(),2);
 }finally{await f.close();}
});
test('notification reads, legacy/branch orders and settings enforce current identity and personal scope',{skip:!uri},async()=>{
 const f=await fixture(),admin=new ObjectId(),a=new ObjectId(),b=new ObjectId(),orderA=new ObjectId(),orderB=new ObjectId();
 try{
  await prepareStaffAlertStorage(f.db);await f.db.collection('users').insertMany([{_id:admin,role:'admin'},{_id:a,role:'user',branchId:'branch-a',cities:['City A']},{_id:b,role:'user',branchId:'branch-b',cities:['City B']}]);
  const first={_id:orderA,status:'pending',createdAt:new Date(),orderId:'ODTEST-A',deliveryAssignment:{branchId:'branch-a'},customer:{city:'City A'}};
  const second={_id:orderB,status:'pending',createdAt:new Date(),orderId:'ODTEST-B',deliveryAssignment:{branchId:'branch-b'},customer:{city:'City B'}};
  await f.db.collection('orders').insertMany([first,second]);await recordOrderAlert(f.db,first);await recordOrderAlert(f.db,second);
  const feedA=await notificationFeed(f.db,{},String(a)),feedB=await notificationFeed(f.db,{},String(b));assert.equal(feedA.items.length,1);assert.match(feedA.items[0]!.description,/ODTEST-A/);assert.equal(feedB.items.length,1);
  await assert.rejects(markNotifications(f.db,{ids:[feedB.items[0]!.id]},String(a)),{status:404});
  await markNotifications(f.db,{ids:[feedA.items[0]!.id]},String(a));assert.equal((await notificationFeed(f.db,{},String(admin))).items.every(item=>!item.read),true);
  await assert.rejects(saveAlertRules(f.db,{lowStockThreshold:4,revision:0},String(a)),{status:403});
  await assert.rejects(saveAlertPreferences(f.db,{pushOrders:false,userId:String(b)},String(a)),{status:400});
  await f.db.collection('users').updateOne({_id:a},{$set:{disabled:true}});await assert.rejects(notificationFeed(f.db,{},String(a)),{status:403});
 }finally{await f.close();}
});
test('test pushes are idempotent, rate limited and cannot fan out to another account',{skip:!uri},async()=>{
 const f=await fixture(),actor=new ObjectId(),other=new ObjectId(),own=subscription('test-own'),foreign=subscription('test-foreign'),sent:string[]=[];
 try{
  await prepareStaffAlertStorage(f.db);await f.db.collection('users').insertMany([{_id:actor,role:'admin',subscription:own},{_id:other,role:'admin',subscription:foreign}]);
  const worker=await staffPushOutbox(()=>f.db,{intervalMs:60000,send:async(value)=>{sent.push(value.endpoint);},onFailure:()=>assert.fail('unexpected push failure')});f.workers.push(worker);
  const key=randomUUID();await testStaffNotification(f.db,{key},String(actor));await testStaffNotification(f.db,{key},String(actor));
  await assert.rejects(testStaffNotification(f.db,{key:randomUUID()},String(actor)),{status:429});
  for(let i=0;i<5;i++)await worker.tick();assert.deepEqual(sent,[own.endpoint]);assert.equal(await f.db.collection('order_outbox').countDocuments(),1);
  assert.equal((await notificationFeed(f.db,{},String(other))).items.length,0);
 }finally{await f.close();}
});
test('stock background preferences and resolved alerts suppress obsolete delivery',{skip:!uri},async()=>{
 const f=await fixture(),actor=new ObjectId(),device=subscription('stock-admin'),product=new ObjectId();let sends=0;
 try{
  await prepareStaffAlertStorage(f.db);await f.db.collection('users').insertOne({_id:actor,role:'admin',subscription:device});
  const worker=await staffPushOutbox(()=>f.db,{intervalMs:60000,send:async()=>{sends++;},onFailure:()=>assert.fail('unexpected push failure')});f.workers.push(worker);
  await saveAlertPreferences(f.db,{pushStock:false},String(actor));await f.db.collection('products').insertOne({_id:product,stock:10});await observeStock(f.db,product);
  await f.db.collection('products').updateOne({_id:product},{$set:{stock:2}});await observeStock(f.db,product);for(let i=0;i<4;i++)await worker.tick();assert.equal(sends,0);
  await saveAlertPreferences(f.db,{pushStock:true},String(actor));await f.db.collection('products').updateOne({_id:product},{$set:{stock:0}});await observeStock(f.db,product);
  await f.db.collection('products').updateOne({_id:product},{$set:{stock:10}});await observeStock(f.db,product);for(let i=0;i<4;i++)await worker.tick();assert.equal(sends,0);
  await notificationMaintenance(f.db);await notificationMaintenance(f.db);
 }finally{await f.close();}
});

import { notificationMaintenance } from '../apps/api/src/modules/notifications/alert-worker';

test('idle order ticks only check the queue and active ticks still deliver order alerts before reconciliation', { skip: !uri }, async () => {
  const f = await fixture(true), commands: string[] = [];
  const admin = new ObjectId(), order = new ObjectId(), product = new ObjectId();
  const outbox = f.db.collection<Document & { _id: string }>('order_outbox');
  try {
    await prepareStaffAlertStorage(f.db);
    await f.db.collection('users').insertOne({ _id: admin, role: 'admin' });
    await notificationMaintenance(f.db);
    f.client.on('commandStarted', event => {
      if (event.databaseName === f.db.databaseName) commands.push(`${event.commandName}:${event.command[event.commandName]}`);
    });
    await notificationMaintenance(f.db, false);
    assert.deepEqual(commands, ['find:notification_controls', 'find:order_outbox']);

    await f.db.collection('products').insertOne({ _id: product, stock: 2 });
    await f.db.collection('orders').insertOne({ _id: order, orderId: 'OD-QUICK', status: 'pending', createdAt: new Date() });
    await outbox.insertOne({ _id: 'confirmation:quick', orderId: order, state: 'sent', createdAt: new Date() });
    await notificationMaintenance(f.db, false);
    assert.equal((await outbox.findOne({ _id: 'confirmation:quick' }))!.inAppState, 'done');
    assert.equal(await f.db.collection('staff_alerts').countDocuments({ kind: 'order' }), 1);
    assert.equal(await f.db.collection('staff_stock_state').countDocuments(), 0);
    await notificationMaintenance(f.db);
    assert.equal(await f.db.collection('staff_stock_state').countDocuments(), 1);
    assert.equal(await f.db.collection('staff_alerts').countDocuments({ kind: 'order' }), 1);
  } finally { await f.close(); }
});

test('payment issues bootstrap quietly, notify new issues, resolve and stay administrator-only',{skip:!uri},async()=>{
 const f=await fixture(),admin=new ObjectId(),staff=new ObjectId(),oldOrder=new ObjectId(),newOrder=new ObjectId();
 try{
  await prepareStaffAlertStorage(f.db);await f.db.collection('users').insertMany([{_id:admin,role:'admin'},{_id:staff,role:'user',cities:[]}]);
  await f.db.collection('orders').insertOne({_id:oldOrder,orderId:'OD-OLD',payment:{provider:'stripe',refundIssue:'synthetic-old'}});
  await notificationMaintenance(f.db);let feed=await notificationFeed(f.db,{},String(admin));assert.equal(feed.items[0]!.kind,'payment');assert.equal(feed.items[0]!.announce,false);assert.equal(await f.db.collection('order_outbox').countDocuments(),0);
  await f.db.collection('orders').insertOne({_id:newOrder,orderId:'OD-NEW',payment:{provider:'stripe',refundIssue:'synthetic-new'}});await notificationMaintenance(f.db);await notificationMaintenance(f.db);
  feed=await notificationFeed(f.db,{},String(admin));assert.equal(feed.items.filter(item=>item.kind==='payment'&&item.announce).length,1);assert.equal(await f.db.collection('order_outbox').countDocuments(),1);assert.equal((await notificationFeed(f.db,{},String(staff))).items.length,0);
  await f.db.collection('orders').updateOne({_id:newOrder},{$unset:{'payment.refundIssue':''}});await notificationMaintenance(f.db);feed=await notificationFeed(f.db,{},String(admin));assert.equal(feed.items.find(item=>item.description.includes('OD-NEW'))!.resolved,true);
 }finally{await f.close();}
});
test('reassignment back to a previous branch creates a new order-alert episode',{skip:!uri},async()=>{
 const f=await fixture(),admin=new ObjectId(),order=new ObjectId();
 try{
  await prepareStaffAlertStorage(f.db);await f.db.collection('users').insertOne({_id:admin,role:'admin'});
  const source={_id:order,status:'pending',createdAt:new Date(),orderId:'OD-MOVING',deliveryAssignment:{branchId:'a'}};
  await f.db.collection('orders').insertOne(source);await recordOrderAlert(f.db,source);
  const moved={...source,deliveryAssignment:{branchId:'b'},assignmentHistory:[{at:new Date()}]};await f.db.collection('orders').replaceOne({_id:order},moved);await recordOrderAlert(f.db,moved);
  const back={...source,assignmentHistory:[...moved.assignmentHistory,{at:new Date()}]};await f.db.collection('orders').replaceOne({_id:order},back);await recordOrderAlert(f.db,back);
  const feed=await notificationFeed(f.db,{},String(admin));assert.equal(feed.items.length,3);assert.equal(feed.items.filter(item=>!item.resolved).length,1);assert.equal(feed.items[0]!.resolved,false);
 }finally{await f.close();}
});

test('payment alert reconciliation recovers an interrupted push enqueue without duplicating or waking baseline issues',{skip:!uri},async()=>{
 const f=await fixture(),actor=new ObjectId(),order=new ObjectId();
 try{
  await prepareStaffAlertStorage(f.db);await f.db.collection('users').insertOne({_id:actor,role:'admin'});await notificationMaintenance(f.db);
  await f.db.collection('orders').insertOne({_id:order,orderId:'OD-RETRY',payment:{provider:'stripe',refundIssue:'synthetic-enqueue-failure'}});
  const interrupted=Object.create(f.db) as Db;Object.defineProperty(interrupted,'collection',{value:(name:string)=>{const collection=f.db.collection(name);if(name!=='order_outbox')return collection;return new Proxy(collection,{get(target,key){if(key==='updateOne')return async()=>{throw new Error('Synthetic enqueue failure');};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});}});
  await assert.rejects(notificationMaintenance(interrupted));assert.equal(await f.db.collection('staff_alerts').countDocuments({kind:'payment'}),1);assert.equal(await f.db.collection('order_outbox').countDocuments(),0);
  await notificationMaintenance(f.db);await notificationMaintenance(f.db);assert.equal(await f.db.collection('staff_alerts').countDocuments({kind:'payment'}),1);assert.equal(await f.db.collection('order_outbox').countDocuments(),1);
 }finally{await f.close();}
});
