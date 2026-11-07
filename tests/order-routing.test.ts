import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { orderRoutingSchema, resolveDeliveryArea, routingDecision, rakDeliveryAreas } from '@almina/contracts';
import { lookupPolicy } from '../apps/api/src/modules/auth/retained-policy';
import { accessPolicy, upstreamQuery } from '../apps/web/src/lib/admin/policy';
test('routing requires one owner per area, a real fallback, unique stable branches and exact safe aliases', () => {
  assert.ok(rakDeliveryAreas.length > 10);
  for (const area of rakDeliveryAreas) assert.equal(resolveDeliveryArea({ city: area.name, emirate: 'RAK' }), area.id);
  const first = rakDeliveryAreas[0]!, branchId = randomUUID(), fallbackBranchId = randomUUID();
  const raw = { active: true, branches: [{ id: branchId, name: 'Local branch', areaIds: [first.id] }, { id: fallbackBranchId, name: 'Fallback branch', areaIds: [] }], fallbackBranchId };
  const policy = orderRoutingSchema.parse(raw);
  assert.equal(resolveDeliveryArea({ city: first.name.toUpperCase().replaceAll(' ', '-'), emirate: 'RAK' }), first.id);
  assert.equal(resolveDeliveryArea({ city: first.name, emirate: 'Dubai' }), null);
  assert.equal(resolveDeliveryArea({ city: 'unknown spelling mistake', emirate: 'RAK' }), null);
  assert.equal(routingDecision(first.id, policy).branchId, branchId);
  assert.equal(routingDecision(null, policy).branchId, fallbackBranchId);
  assert.equal(routingDecision(null, policy).needsReview, true);
  assert.equal(routingDecision(rakDeliveryAreas[1]!.id, policy).branchId, fallbackBranchId);
  assert.equal(orderRoutingSchema.safeParse({ ...raw, fallbackBranchId: null }).success, false);
  assert.equal(orderRoutingSchema.safeParse({ ...raw, branches: raw.branches.map(branch => ({ ...branch, areaIds: [first.id] })) }).success, false);
  assert.equal(orderRoutingSchema.safeParse({ ...raw, branches: [{ ...raw.branches[0], areaIds: ['invented'] }] }).success, false);
});
test('new routing and staff assignment endpoints have matching server and gateway permissions', () => {
  for (const [method, path, role] of [['GET', 'auth/order-routing', 'admin'], ['PUT', 'auth/order-routing', 'admin'], ['PUT', 'auth/users/aaaaaaaaaaaaaaaaaaaaaaaa/assignment', 'admin'], ['PUT', 'orders/aaaaaaaaaaaaaaaaaaaaaaaa/routing', 'admin'], ['GET', 'orders/receiving', 'staff']] as const) {
    assert.equal(accessPolicy(method, path), role);
    assert.equal(lookupPolicy(method, '/api/' + path)?.policy, role === 'staff' ? 'orders' : role);
  }
  assert.match(upstreamQuery('orders', new URLSearchParams({ review: '1' })), /review=1/);
  assert.throws(() => upstreamQuery('orders', new URLSearchParams({ review: 'all' })));
});
test('receiving signals share the existing stream without serializing its private snapshot', async () => {
  const { orderEventStream } = await import('../apps/web/src/lib/admin/order-stream');
  let step = 0;
  const stream = orderEventStream({ signal: new AbortController().signal, intervalMs: 1, sample: async () => step++ === 0
    ? { state: 'ready', signature: 'private internal snapshot', receiving: { pendingCount: 2, latestIds: ['aaaaaaaaaaaaaaaaaaaaaaaa'] } }
    : { state: 'revoked' } });
  let output = ''; for await (const chunk of stream) output += new TextDecoder().decode(chunk);
  assert.ok(output.includes('"pendingCount":2')); assert.ok(output.includes('"latestIds":["aaaaaaaaaaaaaaaaaaaaaaaa"]'));
  assert.ok(!output.includes('private internal snapshot')); assert.match(output, /event: revoked/);
});

test('paused named-area branches stop receiving new routing decisions and fall back without duplicate assignment',()=>{
 const area=rakDeliveryAreas[0]!, first=randomUUID(), second=randomUUID();
 const policy=orderRoutingSchema.parse({active:true,fallbackBranchId:second,branches:[{id:first,name:'Paused',enabled:false,areaIds:[area.id]},{id:second,name:'Receiving',enabled:true,areaIds:[]}]});
 assert.equal(routingDecision(area.id,policy).branchId,second);
 assert.equal(routingDecision(area.id,{...policy,branches:policy.branches.map(branch=>({...branch,enabled:false}))}).branchId,null);
});
