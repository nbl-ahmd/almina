import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { createHmac, randomBytes, createECDH } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { hash } from 'bcryptjs';
import express from 'express';
import { createLogger } from '@almina/config/logger';
import { createAuthService } from '../apps/api/src/modules/auth/service.js';
import { createApp } from '../apps/api/src/app.js';
import { readSessionCookie, cookieName, cookieOptions } from '../backend/security/sessions.cjs';
import { securityDb, id } from './helpers/security-fixture.js';
const require = createRequire(import.meta.url);
// Tests construct the real legacy routers without importing server.js or connecting MongoDB/providers.
const { createLegacyApp } = require('../backend/app.js');
const { routePolicies, lookupPolicy } = require('../backend/security/policy.cjs') as {
  routePolicies: { method: string; path: string; policy: string }[]; lookupPolicy: (method: string, path: string) => unknown;
};
const { secureRealtime } = require('../backend/security/realtime.cjs');
const browserHeaders = { Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' };
const user = { _id: id, username: 'synthetic', name: 'Synthetic', role: 'admin', cities: ['City A'] };
async function serve(app: ReturnType<typeof express>, run: (origin: string) => Promise<void>) {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
function versionedApp(authDb: ReturnType<typeof securityDb>) {
  return createApp({ database: { mode: 'disabled', checkReadiness: async () => true }, getDb: async () => authDb.db,
    webOrigin: browserHeaders.Origin, development: true,
    logger: createLogger({ service: 'api', environment: 'development', write: () => undefined }) });
}

test('retained uptime ping bypasses authentication and database work', async () => {
  const app = createLegacyApp({ origins: [], development: true, routers: {},
    getCommerceDb: async () => assert.fail('ping must not access DB'),
    auth: { authenticate: async () => assert.fail('ping must not authenticate') } });
  app.locals.draining = true;
  await serve(app, async origin => {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(origin + '/api/ping', { method });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match(response.headers.get('content-type') ?? '', /^text\/plain/);
      assert.equal(await response.text(), method === 'GET' ? 'pong' : '');
    }
  });
});

test('every legacy privileged route rejects anonymous HTTP requests, including multipart, before any database/provider work', async t => {
  let reached = 0;
  const auth = createAuthService(async () => { reached++; assert.fail('anonymous auth must not access DB'); });
  const app = createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth });
  await serve(app, async origin => {
    for (const route of routePolicies.filter(route => ['admin', 'staff', 'orders'].includes(route.policy))) {
      await t.test(`${route.method} ${route.path}`, async () => {
        const path = route.path.replace(/:[A-Za-z]+/g, id.toHexString());
        const response = await fetch(origin + path, { method: route.method, headers: browserHeaders,
          ...(!['GET', 'HEAD'].includes(route.method) ? { body: '{}' } : {}) });
        assert.equal(response.status, 401); assert.equal(reached, 0);
      });
    }
    const form = new FormData(); form.set('image', new Blob(['synthetic']), 'synthetic.png');
    assert.equal((await fetch(`${origin}/api/products`, { method: 'POST', headers: { Origin: browserHeaders.Origin, 'X-CSRF-Protection': '1' }, body: form })).status, 401);
    assert.equal((await fetch(`${origin}/api/products`, { method: 'POST', headers: { ...browserHeaders, Authorization: 'Bearer synthetic-legacy-jwt' }, body: '{}' })).status, 401);
  });
});

test('all admin legacy endpoints reject authenticated staff even with forged roles/cities in bodies', async () => {
  const auth = { authenticate: async () => ({ id: id.toHexString(), role: 'user', cities: ['City A'] }) };
  await serve(createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth }), async origin => {
    for (const route of routePolicies.filter(route => route.policy === 'admin')) {
      const response = await fetch(origin + route.path.replace(/:[A-Za-z]+/g, id.toHexString()), { method: route.method, headers: browserHeaders,
        ...(route.method !== 'GET' ? { body: JSON.stringify({ role: 'admin', cities: ['City B'] }) } : {}) });
      assert.equal(response.status, 403, `${route.method} ${route.path}`);
    }
  });
});

test('route authorization allowlist covers every real legacy handler and denies unlisted methods/path encodings', () => {
  const app = createLegacyApp({ origins: [browserHeaders.Origin], development: true });
  const mounts = app.router.stack.filter((layer: { name: string }) => layer.name === 'router');
  const names = ['catalog-import', 'operations', 'media', 'recovery', 'category', 'banners', 'products', 'orders', 'batch', 'store', 'whatsapp', 'auth'];
  let count = 0;
  mounts.forEach((mount: { handle: { stack: { route?: { path: string; methods: Record<string, boolean> } }[] } }, index: number) => {
    for (const layer of mount.handle.stack) if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        const path = `/api/${names[index]}${layer.route.path === '/' ? '' : layer.route.path}`;
        assert.ok(routePolicies.some(route => route.method === method.toUpperCase() && route.path === path), path); count++;
      }
    }
  });
  for (const layer of app.router.stack) if (layer.route?.path.startsWith('/api/catalog-export/')) {
    for (const method of Object.keys(layer.route.methods)) {
      assert.ok(routePolicies.some(route => route.method === method.toUpperCase() && route.path === layer.route.path), layer.route.path);
      count++;
    }
  }
  assert.equal(count, routePolicies.length);
  for (const path of ['/api/products//abc', '/api/%70roducts/abc', '/api/products\\abc']) assert.equal(lookupPolicy('PUT', path), undefined);
  assert.equal(lookupPolicy('PATCH', '/api/products/abc'), undefined);
});

test('Express 5 catches returned promise failures without private-stack wrapping or exposing diagnostics', async () => {
  const express = require('../backend/node_modules/express');
  const router = express.Router();
  router.get('/status', () => Promise.reject(new Error('Synthetic private provider diagnostic')));
  const app = createLegacyApp({ origins: [browserHeaders.Origin], development: true, routers: { store: router } });
  await serve(app, async origin => {
    const response = await fetch(origin + '/api/store/status');
    assert.equal(response.status, 500); assert.deepEqual(await response.json(), { error: 'Request failed' });
    assert.equal((await fetch(origin + '/health/live')).status, 200);
  });
});

test('cookie attributes, duplicate-cookie rejection and raw bearer rejection fail closed', () => {
  assert.deepEqual(cookieOptions(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 28800000 });
  assert.equal(cookieName(), '__Host-almina_session');
  const token = randomBytes(32).toString('base64url');
  assert.equal(readSessionCookie({ cookie: `__Host-almina_session=${token}` }), token);
  assert.equal(readSessionCookie({ cookie: `__Host-almina_session=${token}; __Host-almina_session=${token}` }), undefined);
  assert.equal(readSessionCookie({ cookie: `almina_session=${token}` }), undefined);
});

test('v1 login sets a cookie without exposing a token, rotates it, rejects CSRF and revokes all sessions', async () => {
  const fixture = securityDb({ users: [{ ...user, password: await hash('synthetic-password', 4) }] });
  const app = versionedApp(fixture);
  await serve(app, async origin => {
    const login = () => fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: browserHeaders, body: JSON.stringify({ username: user.username, password: 'synthetic-password' }) });
    const result = await login(); assert.equal(result.status, 200);
    const cookie = result.headers.get('set-cookie')!.split(';')[0]!;
    assert.match(result.headers.get('set-cookie')!, /HttpOnly/); assert.match(result.headers.get('set-cookie')!, /SameSite=Lax/);
    const body = await result.json(); assert.equal('token' in body.data, false);
    assert.equal((await fetch(`${origin}/api/v1/auth/me`, { headers: { Cookie: cookie } })).status, 200);
    for (const headers of [{ Cookie: cookie }, { ...browserHeaders, Cookie: cookie, Origin: 'https://evil.example.invalid' },
      { ...browserHeaders, Cookie: cookie, 'X-CSRF-Protection': '' }, { ...browserHeaders, Cookie: cookie, 'Sec-Fetch-Site': 'cross-site' }]) {
      assert.equal((await fetch(`${origin}/api/v1/auth/logout`, { method: 'POST', headers })).status, 403);
    }
    const rotated = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: { ...browserHeaders, Cookie: cookie }, body: JSON.stringify({ username: user.username, password: 'synthetic-password' }) });
    assert.equal(rotated.status, 200);
    const second = rotated.headers.get('set-cookie')!.split(';')[0]!; assert.notEqual(cookie, second);
    assert.equal((await fetch(`${origin}/api/v1/auth/me`, { headers: { Cookie: cookie } })).status, 401);
    await login();
    assert.equal((await fetch(`${origin}/api/v1/auth/logout-all`, { method: 'POST', headers: { ...browserHeaders, Cookie: second } })).status, 204);
    assert.equal(fixture.data.api_sessions!.length, 0);
    assert.equal((await fetch(`${origin}/api/v1/auth/me`, { headers: { Cookie: second } })).status, 401);
  });
});

test('existing password changes, disabled/deleted users, unknown roles, expiration and legacy bearer sessions invalidate access', async () => {
  const fixture = securityDb({ users: [{ ...user, password: await hash('synthetic-password', 4) }] });
  const auth = createAuthService(async () => fixture.db);
  const login = await auth.login({ username: user.username, password: 'synthetic-password' });
  await assert.rejects(auth.authenticate(`Bearer ${login.token}`), { status: 401 });
  const doc = fixture.data.users![0]!;
  doc.password = await hash('replacement-password', 4);
  await assert.rejects(auth.authenticate(login.token), { status: 401 });
  const second = await auth.login({ username: user.username, password: 'replacement-password' });
  doc.role = 'superadmin'; await assert.rejects(auth.authenticate(second.token), { status: 401 });
  doc.role = 'admin'; fixture.data.api_sessions![1]!.scheme = 'bearer-v1';
  await assert.rejects(auth.authenticate(second.token), { status: 401 });
});

test('unknown and known accounts have identical HTTP login failures and reject privilege fields', async () => {
  const fixture = securityDb({ users: [{ ...user, password: await hash('synthetic-password', 4) }] });
  await serve(versionedApp(fixture), async origin => {
    for (const username of [user.username, 'no-such-synthetic-account']) {
      const response = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: browserHeaders, body: JSON.stringify({ username, password: 'wrong' }) });
      assert.equal(response.status, 401); assert.equal((await response.json()).error.code, 'UNAUTHORIZED');
    }
    const before = fixture.calls.length;
    const response = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: browserHeaders, body: JSON.stringify({ username: user.username, password: 'synthetic-password', role: 'admin' }) });
    assert.equal(response.status, 400); assert.equal(fixture.calls.length, before);
    for (const headers of [{}, { ...browserHeaders, Origin: 'null' }, { ...browserHeaders, 'X-CSRF-Protection': '' }]) {
      assert.equal((await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' })).status, 403);
    }
  });
});

test('distributed quotas persist across service instances and combine per-account/per-IP limits', async () => {
  const fixture = securityDb(); const first = createAuthService(async () => fixture.db); const second = createAuthService(async () => fixture.db);
  for (let i = 0; i < 20; i++) await (i % 2 ? first : second).limitLogin('synthetic', `192.0.2.${i}`);
  await assert.rejects(second.limitLogin('synthetic', '198.51.100.1'), { status: 429 });
  for (let i = 0; i < 50; i++) await first.limitLogin(`synthetic-${i}`, '203.0.113.1');
  await assert.rejects(second.limitLogin('another', '203.0.113.1'), { status: 429 });
  assert.ok(!JSON.stringify(fixture.data).includes('203.0.113.1'));
});

test('admin provisioning rejects malformed privileges and credentials before database or password work', async () => {
  const fixture = securityDb();
  const auth = { authenticate: async () => ({ id: id.toHexString(), role: 'admin', cities: [] }) };
  const loginRouter = require('../backend/routes/Login')(auth, true, () => fixture.db);
  const app = createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth, routers: { auth: loginRouter } });
  await serve(app, async origin => {
    const body = { username: user.username, password: 'synthetic-long-password', name: 'Synthetic', role: 'user', cities: [] };
    for (const patch of [{ role: 'superadmin' }, { role: { $ne: null } }, { password: 'short' }, { password: '🔒'.repeat(19) },
      { name: '   ' }, { cities: ['City A', 'City A'] }, { cities: [{ $where: 'x' }] }, { username: '$where' }, { disabled: false }]) {
      assert.equal((await fetch(`${origin}/api/auth/signup`, { method: 'POST', headers: browserHeaders, body: JSON.stringify({ ...body, ...patch }) })).status, 400);
    }
    assert.equal(fixture.calls.length, 0);
  });
});

test('webhook rejects invalid signatures and retains pending events through failure before suppressing processed duplicates', async () => {
  const fixture = securityDb(); const secret = randomBytes(32).toString('hex'); let effects = 0, attempts = 0;
  const router = express.Router(); router.post('/webhook', (_req, res) => {
    if (attempts++ === 0) return res.sendStatus(500);
    effects++; fixture.data.webhook_receipts![0]!.state = 'processed'; res.sendStatus(200);
  });
  const app = createLegacyApp({ origins: [browserHeaders.Origin], webhookSecret: secret, getWebhookDb: async () => fixture.db, routers: { whatsapp: router } });
  await serve(app, async origin => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { messages: [{ id: 'synthetic-message', from: '971501234567', text: { body: 'Synthetic text' } }] } }] }] });
    const signature = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    for (const signed of [undefined, 'sha256=invalid', 'sha256=' + '0'.repeat(64)]) assert.equal((await fetch(`${origin}/api/whatsapp/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(signed ? { 'X-Hub-Signature-256': signed } : {}) }, body })).status, 403);
    const headers = { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature };
    assert.equal((await fetch(`${origin}/api/whatsapp/webhook`, { method: 'POST', headers, body: body + ' ' })).status, 403);
    assert.equal((await fetch(`${origin}/api/whatsapp/webhook`, { method: 'POST', headers, body })).status, 500);
    assert.equal(fixture.data.webhook_receipts![0]!.state, 'pending');
    for (let i = 0; i < 2; i++) assert.equal((await fetch(`${origin}/api/whatsapp/webhook`, { method: 'POST', headers, body })).status, 200);
    assert.equal(effects, 1); assert.equal(attempts, 2);
  });
});

test('WhatsApp verification challenge requires the configured token and bounded scalar parameters', async () => {
  const previous = process.env.VERIFY_TOKEN;
  process.env.VERIFY_TOKEN = 'synthetic-verification-token';
  try {
    await serve(createLegacyApp({ origins: [browserHeaders.Origin], development: true }), async origin => {
      const valid = 'hub.mode=subscribe&hub.verify_token=synthetic-verification-token&hub.challenge=123456';
      const response = await fetch(origin + '/api/whatsapp/webhook?' + valid);
      assert.equal(response.status, 200); assert.equal(await response.text(), '123456');
      assert.match(response.headers.get('content-type')!, /^text\/plain/);
      const opaque = await fetch(origin + '/api/whatsapp/webhook?' + valid.replace('123456', '%3Cscript%3E'));
      assert.equal(opaque.status, 200); assert.equal(await opaque.text(), '<script>');
      assert.match(opaque.headers.get('content-type')!, /^text\/plain/);
      assert.equal((await fetch(origin + '/api/whatsapp/webhook?' + valid.replace('synthetic-verification-token', 'wrong-token'))).status, 403);
      for (const query of [valid + '&hub.verify_token=duplicate', valid + '&$where=unsafe',
        valid.replace('123456', '1'.repeat(257)), 'hub.mode=subscribe']) {
        assert.equal((await fetch(origin + '/api/whatsapp/webhook?' + query)).status, 400);
      }
      delete process.env.VERIFY_TOKEN;
      assert.equal((await fetch(origin + '/api/whatsapp/webhook?' + valid)).status, 403);
    });
  } finally { if (previous === undefined) delete process.env.VERIFY_TOKEN; else process.env.VERIFY_TOKEN = previous; }
});

test('realtime rejects anonymous/staff/cross-origin connections and rechecks admin role before every broadcast', async () => {
  let middleware: (socket: unknown, next: (error?: Error) => void) => Promise<void> = async () => undefined;
  let role = 'admin'; let sent = 0; let disconnected = 0;
  const socket = { handshake: { headers: { origin: browserHeaders.Origin } }, data: {} as Record<string, unknown>, emit: () => sent++, disconnect: () => disconnected++ };
  const io = { use(fn: typeof middleware) { middleware = fn; }, sockets: { sockets: new Map([['synthetic', socket]]) } };
  const auth = { authenticate: async () => { if (role === 'anonymous') throw new Error(); return { role }; } };
  const facade = secureRealtime(io, auth, [browserHeaders.Origin], true);
  for (const value of ['anonymous', 'user']) { role = value; await middleware(socket, error => assert.ok(error)); }
  role = 'admin'; await middleware(socket, error => assert.equal(error, undefined));
  socket.handshake.headers.origin = 'https://evil.example.invalid'; await middleware(socket, error => assert.ok(error));
  socket.handshake.headers.origin = browserHeaders.Origin;
  facade.emit('newOrder', {}); await new Promise(resolve => setImmediate(resolve)); assert.equal(sent, 1);
  role = 'user'; facade.emit('newOrder', {}); await new Promise(resolve => setImmediate(resolve)); assert.equal(sent, 1); assert.equal(disconnected, 1);
});

test('source auth contracts do not persist tokens or embed provider/signing credentials', () => {
  const source = readFileSync('apps/web/src/components/admin/controls.tsx', 'utf8');
  assert.ok(!/setItem\(['"]token/.test(source)); assert.ok(!/getItem\(['"]token/.test(source));
  for (const file of ['backend/integrations/whatsapp.cjs', 'apps/api/src/modules/notifications/whatsapp-outbound.ts', ...readdirSync('backend/routes').filter(file => file.endsWith('.js')).map(file => 'backend/routes/' + file)]) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!/Bearer [A-Za-z0-9._-]{20,}|(?:secretKey|privateKey|pass)\s*[:=]\s*['"][^'"]+['"]/.test(text), file);
  }
});

test('legacy order reads and transactional commands enforce city scope and reject forged fields', async () => {
  let cities = ['City A']; let saved = 0;
  const found = { _id: id, customer: { city: 'City B', totalAmount: 12 }, status: 'pending' };
  const filters: Record<string, unknown>[] = [];
  function find(filter: Record<string, unknown>) {
    filters.push(filter);
    return (filter['customer.city'] as { $in: string[] }).$in.includes(found.customer.city) ? found : null;
  }
  const db = { client: { startSession: () => ({ withTransaction: async (run: () => Promise<void>) => run(), endSession: async () => undefined }) },
    collection: () => ({ findOne: async (filter: Record<string, unknown>) => find(filter),
      updateOne: async (_filter: unknown, update: { $set: Record<string, unknown> }) => { Object.assign(found, update.$set); saved++; return { modifiedCount: 1 }; } }) };
  const auth = { authenticate: async () => ({ id: id.toHexString(), role: 'user', cities }) };
  await serve(createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth, getCommerceDb: async () => db }), async origin => {
    for (const assignment of [['City A'], []]) {
      cities = assignment;
      for (const [method, path, body] of [['GET', `/api/orders/${id}`, undefined],
        ['PUT', `/api/orders/${id}`, { billno: '12345', billamount: 12 }],
        ['PUT', `/api/orders/cancel/${id}`, {}]] as const) {
        const response = await fetch(origin + path, { method, headers: browserHeaders,
          ...(body ? { body: JSON.stringify(body) } : {}) });
        assert.equal(response.status, 404); assert.equal(saved, 0);
        assert.deepEqual(filters.at(-1)!['customer.city'], { $in: assignment });
      }
    }
    cities = ['City B'];
    const path = `${origin}/api/orders/${id}`;
    assert.equal((await fetch(path, { method: 'PUT', headers: browserHeaders, body: '{"billno":"12345","billamount":12,"cities":["City B"]}' })).status, 400);
    assert.equal((await fetch(path, { method: 'PUT', headers: browserHeaders, body: '{"billno":"12345","billamount":12}' })).status, 200);
    assert.equal(saved, 1);
    assert.equal((await fetch(`${origin}/api/orders/cancel/${id}`, { method: 'PUT', headers: browserHeaders, body: '{}' })).status, 409);
    assert.equal(saved, 1);
  });
});

test('guest checkout cannot set administrative order flags and raw catalog operators never reach MongoDB', async () => {
  await serve(createLegacyApp({ origins: [browserHeaders.Origin], development: true }), async origin => {
    for (const key of ['dispatched', 'canceled', 'billamount', 'orderId', '$set']) {
      const response = await fetch(`${origin}/api/orders`, { method: 'POST', headers: browserHeaders, body: JSON.stringify({ customer: {}, cartItems: [], [key]: true }) });
      assert.equal(response.status, 400);
    }
    for (const route of ['/api/products', '/api/products/search?q=a', '/api/category']) {
      const separator = route.includes('?') ? '&' : '?';
      const response = await fetch(`${origin}${route}${separator}filter=${encodeURIComponent('{"$where":"throw Error()"}')}`);
      assert.equal(response.status, 400);
    }
  });
});

test('push subscription writes are owned by the current staff identity and reject arbitrary callback destinations', async () => {
  let owner: unknown;
  const db = { collection: () => ({ updateOne: async (filter: { _id: { toHexString(): string } }) => { owner = filter._id.toHexString(); return { matchedCount: 1 }; } }) };
  const auth = { authenticate: async () => ({ id: id.toHexString(), role: 'user', cities: [] }) };
  const curve = createECDH('prime256v1'); curve.generateKeys();
  await serve(createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth, getCommerceDb: () => db }), async origin => {
    for (const endpoint of ['http://127.0.0.1/private', 'https://evil.example.invalid', 'https://fcm.googleapis.com.evil.example.invalid']) {
      assert.equal((await fetch(`${origin}/api/orders/subscribe`, { method: 'POST', headers: browserHeaders, body: JSON.stringify({ subscription: { endpoint } }) })).status, 400);
    }
    const response = await fetch(`${origin}/api/orders/subscribe`, { method: 'POST', headers: browserHeaders,
      body: JSON.stringify({ userId: 'caller-selected-user', subscription: { endpoint: 'https://fcm.googleapis.com/synthetic', keys: { p256dh: curve.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } } }) });
    assert.equal(response.status, 204); assert.equal(owner, id.toHexString());
  });
});

test('legacy cookie mutations require exact Origin and a custom CSRF header, including multipart uploads', async () => {
  const router = express.Router(); let effects = 0;
  router.post('/', (_req, res) => { effects++; res.status(204).end(); });
  const auth = { authenticate: async () => ({ id: id.toHexString(), role: 'admin', cities: [] }) };
  const app = createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth, routers: { products: router } });
  await serve(app, async origin => {
    for (const headers of [{}, { Origin: browserHeaders.Origin }, { ...browserHeaders, Origin: 'https://evil.example.invalid' }, { ...browserHeaders, 'Sec-Fetch-Site': 'cross-site' }]) {
      const form = new FormData(); form.set('image', new Blob(['synthetic']), 'synthetic.png');
      assert.equal((await fetch(`${origin}/api/products`, { method: 'POST', headers, body: form })).status, 403);
    }
    assert.equal(effects, 0);
    assert.equal((await fetch(`${origin}/api/products`, { method: 'POST', headers: browserHeaders, body: '{}' })).status, 204);
    assert.equal(effects, 1);
    const preflight = await fetch(`${origin}/api/products`, { method: 'OPTIONS', headers: { Origin: browserHeaders.Origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'X-CSRF-Protection, Content-Type' } });
    assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  });
});

test('server-owned order confirmation chooses its recipient from the persisted order and contains no caller HTML', () => {
  const { confirmationMessage } = require('../backend/integrations/order-email.cjs');
  const message = confirmationMessage({ orderId: 'OD5001', customer: { email: 'synthetic@example.invalid', name: '<script>synthetic</script>' }, html: '<script>synthetic</script>', recipient: 'caller@example.invalid' });
  assert.equal(message.to, 'synthetic@example.invalid'); assert.equal('html' in message, false);
  assert.ok(message.text.includes('OD5001')); assert.ok(!message.text.includes('<script>'));
  assert.throws(() => confirmationMessage({ orderId: 'OD5001', customer: { email: 'synthetic@example.invalid\r\nBcc: caller@example.invalid' } }));
});

test('retained administrator email rejects recipient/header/content abuse before provider work', async () => {
  const auth = { authenticate: async () => ({ id: id.toHexString(), role: 'admin', cities: [] }) };
  await serve(createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth }), async origin => {
    for (const body of [{ recipient: 'a@example.invalid,b@example.invalid', htmlContent: 'Reviewed' },
      { recipient: 'synthetic@example.invalid', htmlContent: 'x'.repeat(65537) },
      { recipient: 'synthetic@example.invalid', htmlContent: 'Reviewed', attachments: ['/private'] }]) {
      assert.equal((await fetch(origin + '/api/orders/email', { method: 'POST', headers: browserHeaders, body: JSON.stringify(body) })).status, 400);
    }
  });
});

test('push unsubscribe deletes only the current staff subscription', async () => {
  let owner: unknown; let update: unknown;
  const db = { collection: () => ({ updateOne: async (filter: { _id: { toHexString(): string } }, value: unknown) => { owner = filter._id.toHexString(); update = value; return { matchedCount: 1 }; } }) };
  const auth = { authenticate: async () => ({ id: id.toHexString(), role: 'user', cities: [] }) };
  await serve(createLegacyApp({ origins: [browserHeaders.Origin], development: true, auth, getCommerceDb: () => db }), async origin => {
    assert.equal((await fetch(`${origin}/api/orders/subscribe`, { method: 'DELETE', headers: browserHeaders })).status, 204);
    assert.equal(owner, id.toHexString()); assert.deepEqual(update, { $unset: { subscription: '' } });
  });
});

test('both maintained push worker URLs ignore incoming PII and execute no remote scripts', async () => {
  const { runInNewContext } = await import('node:vm');
  for (const file of ['apps/web/public/service-worker.js', 'apps/web/public/admin/worker.js']) {
    const source = readFileSync(file, 'utf8');
    const handlers: Record<string, (event: unknown) => void> = {};
    const notifications: { title: string; options: { body: string } }[] = [];
    const opened: string[] = [];
    runInNewContext(source, { self: { addEventListener: (type: string, handler: (event: unknown) => void) => { handlers[type] = handler; },
      registration: { showNotification: (title: string, options: { body: string }) => { notifications.push({ title, options }); return Promise.resolve(); } },
      clients: { openWindow: (path: string) => { opened.push(path); return Promise.resolve(); } } } });
    for (const payload of [{ title: 'Synthetic PII', body: 'Sensitive detail' }, { notification: { title: 'Synthetic PII', body: 'Sensitive detail' } }]) {
      handlers.push!({ data: { json: () => payload }, waitUntil: () => undefined });
      assert.deepEqual(JSON.parse(JSON.stringify(notifications.at(-1))), { title: 'Al Mina Pharmacy', options: { body: 'Order updates are available. Sign in to review them.' } });
    }
    handlers.notificationclick!({ notification: { close: () => undefined }, waitUntil: () => undefined });
    assert.deepEqual(opened, ['/admin/orders']); assert.ok(!source.includes('importScripts'));
  }
});

test('published poster media remains public for Meta while poster listings stay private', async () => {
  const router = express.Router();
  router.get('/image/:filename', (_req, res) => res.type('image/webp').send('synthetic image'));
  router.get('/image', (_req, res) => res.json([]));
  await serve(createLegacyApp({ origins: [browserHeaders.Origin], development: true, routers: { whatsapp: router } }), async origin => {
    const response = await fetch(`${origin}/api/whatsapp/image/synthetic.webp`);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
    assert.equal((await fetch(`${origin}/api/whatsapp/image`)).status, 401);
  });
});
