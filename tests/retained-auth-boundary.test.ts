import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lookupPolicy, retainedRoutePolicies } from '../apps/api/src/modules/auth/retained-policy';
import { secureRealtime, type RealtimeSocket } from '../apps/api/src/modules/auth/realtime';
test('maintained retained allowlist preserves exact route/method/HEAD contracts and rejects ambiguous paths', () => {
  for (const route of retainedRoutePolicies) {
    const path = route.path.replace(/:[A-Za-z]+/g, 'synthetic');
    assert.equal(lookupPolicy(route.method, path)?.policy, route.policy);
    if (route.method === 'GET') assert.equal(lookupPolicy('HEAD', path)?.policy, route.policy);
  }
  for (const path of ['/api//products', '/api/products%2Fsecret', '/api/products\\secret', '/api/unknown']) assert.equal(lookupPolicy('GET', path), undefined);
  assert.equal(lookupPolicy('DELETE', '/api/orders'), undefined);
});
test('realtime authenticates exact-origin cookies and rechecks current admin authority immediately before delivery', async () => {
  let middleware!: Parameters<Parameters<typeof secureRealtime>[0]['use']>[0];
  let checks = 0, role = 'admin'; const delivered: unknown[] = [], disconnected: boolean[] = [];
  const socket: RealtimeSocket = { handshake: { headers: { origin: 'https://shop.example.invalid', cookie: '__Host-almina_session=' + 'a'.repeat(43) } },
    data: {}, emit: (event, payload) => delivered.push({ event, payload }), disconnect: value => disconnected.push(value) };
  const facade = secureRealtime({ use(handler) { middleware = handler; }, sockets: { sockets: new Map([['synthetic', socket]]) } },
    { async authenticate(token) { checks++; assert.equal(token, 'a'.repeat(43)); return { role }; } }, ['https://shop.example.invalid']);
  socket.handshake.headers.origin = 'https://shop.example.invalid.evil.invalid';
  await middleware(socket, error => assert.equal(error?.message, 'Unauthorized')); assert.equal(checks, 0);
  socket.handshake.headers.origin = 'https://shop.example.invalid'; role = 'user';
  await middleware(socket, error => assert.equal(error?.message, 'Unauthorized'));
  role = 'admin'; await middleware(socket, error => assert.equal(error, undefined));
  facade.emit('newOrder', { _id: 'synthetic' }); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(delivered, [{ event: 'newOrder', payload: { _id: 'synthetic' } }]);
  role = 'user'; facade.emit('newOrder', { _id: 'second' }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(delivered.length, 1); assert.deepEqual(disconnected, [true]); facade.close();
});
