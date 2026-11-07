import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeAccountRouteAllowed } from '@almina/contracts';
import { canAccessAdminRoute, canVisit, type Identity } from '../apps/web/src/lib/admin/policy';
import { receivingSignalSchema, waitingMinutes } from '../apps/web/src/lib/admin/receiving';
import { staffNotificationSettings } from '../apps/api/src/modules/notifications/settings';

test('store accounts have the same fulfilment boundary at the gateway and persistent API',()=>{
  const store:Identity={id:'a'.repeat(24),username:'synthetic',name:'Store',role:'user',accountType:'branch',cities:[]};
  for(const [method,path] of [['GET','orders'],['GET','orders/receiving'],['GET','orders/notification-settings'],['POST','orders/'+ 'a'.repeat(24)+'/confirm'],['POST','auth/logout'],['DELETE','orders/subscribe']]){
    assert.equal(storeAccountRouteAllowed(method!, '/api/'+path),true);assert.equal(canAccessAdminRoute(store,method!,path!),true);
  }
  for(const [method,path] of [['GET','image-review'],['POST','image-review/decide'],['GET','marketing/status'],['POST','media/marketing'],['GET','auth/branches'],['PUT','store/status'],['POST','auth/signup']]){
    assert.equal(storeAccountRouteAllowed(method!,path!),false);assert.equal(canAccessAdminRoute(store,method!,path!),false);
  }
  for(const section of ['dashboard','users','marketing','products','branches','settings','image-review'])assert.equal(canVisit('user',section,'branch'),false);
  assert.equal(canVisit('user','orders','branch'),true);assert.equal(canVisit('user','notifications','branch'),true);
  assert.equal(canVisit('admin','branches'),true);
});
test('receiving alerts accept bounded signals and calculate overdue time without customer data',()=>{
  assert.equal(receivingSignalSchema.safeParse({pendingCount:4,latestIds:['a'.repeat(24)],reviewCount:2,oldestPendingAt:'2026-11-07T08:00:00.000Z'}).success,true);
  for(const pendingCount of [-1,Infinity,1.5])assert.equal(receivingSignalSchema.safeParse({pendingCount,latestIds:[]}).success,false);
  assert.equal(waitingMinutes('2026-11-07T08:00:00Z',Date.parse('2026-11-07T08:07:30Z')),7);
  assert.equal(waitingMinutes('bad',Date.now()),0);assert.equal(waitingMinutes('2026-11-08T00:00:00Z',0),0);
});
test('notification setup returns only a public key and is off until worker configuration is present',()=>{
  assert.deepEqual(staffNotificationSettings({}),{enabled:false,publicKey:null});
  const env={ADMIN_PUSH_ENABLED:'true',ADMIN_PUSH_PRIVATE_KEY:'synthetic-private',ADMIN_PUSH_SUBJECT:'mailto:synthetic@example.invalid',ADMIN_PUSH_PUBLIC_KEY:'a'.repeat(87)};
  assert.deepEqual(staffNotificationSettings(env),{enabled:true,publicKey:env.ADMIN_PUSH_PUBLIC_KEY});
  assert.ok(!JSON.stringify(staffNotificationSettings(env)).includes('synthetic-private'));
  assert.equal(staffNotificationSettings({...env,ADMIN_PUSH_ENABLED:'false'}).enabled,false);
});
