import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, randomBytes } from 'node:crypto';
import type { Db } from 'mongodb';
import { registerStaffSubscription, removeStaffSubscription } from '../apps/api/src/modules/notifications/subscriptions';

const actor = 'aaaaaaaaaaaaaaaaaaaaaaaa';
function subscription() {
  const curve = createECDH('prime256v1'); curve.generateKeys();
  return { endpoint: 'https://fcm.googleapis.com/synthetic', keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
}
test('invalid subscription/removal inputs never reach database writes or choose a caller identity', async () => {
  let effects = 0;
  const db = { collection: () => { effects++; throw new Error('Unexpected database effect'); } } as unknown as Db;
  const valid = { subscription: subscription() };
  for (const raw of [null, [], { ...valid, role: 'admin' }, { ...valid, userId: {} }, { subscription: { endpoint: 'http://localhost/private' } }]) {
    await assert.rejects(registerStaffSubscription(db, raw, actor, {}), { status: 400 });
  }
  await assert.rejects(registerStaffSubscription(db, valid, actor, { filter: '{}' }), { status: 400 });
  await assert.rejects(registerStaffSubscription(db, valid, 'caller-selected', {}), { status: 401 });
  await assert.rejects(removeStaffSubscription(db, { subscription: valid.subscription }, actor, {}), { status: 400 });
  await assert.rejects(removeStaffSubscription(db, {}, actor, { userId: actor }), { status: 400 });
  assert.equal(effects, 0);
});
test('an unmatched current staff update cannot silently report subscription success or create an account', async () => {
  const writes: { filter: object; update: object; options: object }[] = [];
  const db = { collection: () => ({ updateOne: async (filter: object, update: object, options: object) => {
    writes.push({ filter, update, options }); return { matchedCount: 0 };
  } }) } as unknown as Db;
  await assert.rejects(registerStaffSubscription(db, { subscription: subscription(), userId: 'different-user' }, actor, {}), { status: 401 });
  await assert.rejects(removeStaffSubscription(db, undefined, actor, {}), { status: 401 });
  assert.equal(writes.length, 2);
  assert.equal(JSON.stringify(writes).includes('different-user'), false);
  for (const write of writes) {
    assert.deepEqual(write.filter, { _id: (await import('mongodb')).ObjectId.createFromHexString(actor), role: { $in: ['admin', 'user'] }, disabled: { $ne: true } });
    assert.deepEqual(write.options, { maxTimeMS: 3000, timeoutMS: 4000, writeConcern: { w: 'majority' } });
  }
});

import { newStaffAlerts } from '../apps/web/src/lib/admin/alert-events';
import type { StaffAlert } from '@almina/contracts';
test('foreground alerts ignore backlog, resolved work, already read items and duplicate polls',()=>{
 const item:StaffAlert={id:'event',kind:'order',title:'Order received',description:'Review order',href:'/admin/orders',createdAt:'2026-11-08T10:01:00.000Z',resolved:false,read:false,announce:true};
 const cutoff='2026-11-08T10:00:00.000Z';
 assert.deepEqual(newStaffAlerts([item],cutoff,new Set()),[item]);
 for(const excluded of [{...item,createdAt:cutoff},{...item,resolved:true},{...item,read:true},{...item,announce:false}])assert.deepEqual(newStaffAlerts([excluded],cutoff,new Set()),[]);
 assert.deepEqual(newStaffAlerts([item],cutoff,new Set(['event'])),[]);
});
