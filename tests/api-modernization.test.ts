import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { hash } from 'bcryptjs';
import { ObjectId, type Db, type Document } from 'mongodb';
import { createLogger } from '@almina/config/logger';
import { catalogQuerySchema, adminProductQuerySchema, orderQuerySchema, loginBodySchema, apiErrorSchema, type Staff } from '@almina/contracts';
import { createApp } from '../apps/api/src/app.js';
import { HttpError } from '../apps/api/src/errors.js';
import { cursorScope, encodeCursor, decodeCursor } from '../apps/api/src/http/cursor.js';
import { productFilter, createCatalogRepository } from '../apps/api/src/modules/catalog/repository.js';
import { orderFilter, createOrderRepository } from '../apps/api/src/modules/orders/repository.js';
import { createAuthService } from '../apps/api/src/modules/auth/service.js';
import { productDto } from '../apps/api/src/modules/catalog/dto.js';
import { orderDetailDto, orderSummaryDto } from '../apps/api/src/modules/orders/dto.js';
import { applyIndexes, indexPlan } from '../apps/api/src/database/indexes.js';

const uid = new ObjectId('0123456789abcdef01234567');
const categoryId = new ObjectId('0123456789abcdef01234568');
const staff: Staff = { id: uid.toHexString(), username: 'fixture', name: 'Fixture', role: 'user', cities: ['City A'] };
const admin: Staff = { ...staff, role: 'admin' };
const product = { _id: uid, product_id: 'PD1', category: categoryId, name: 'Fixture', images: ['image.webp'],
  price: 12.5, stock: 3, password: 'fake-sensitive-marker' };
const order = { _id: uid, orderId: 'ORD1', createdAt: new Date('2026-01-01T00:00:00Z'),
  customer: { city: 'City A', email: 'fake-sensitive-marker', totalAmount: 12.5 }, cartItems: [{ _id: uid, quantity: 2 }] };
type Call = { collection: string; operation: string; filter?: Document; options?: Document; pipeline?: Document[]; value?: Document };
function matches(doc: Document, filter: Document): boolean {
  return Object.entries(filter).every(([key, value]) => {
    const actual = key.split('.').reduce<unknown>((result, field) => (result as Document | undefined)?.[field], doc);
    if (value instanceof ObjectId) return actual instanceof ObjectId && value.equals(actual);
    if (value && typeof value === 'object') {
      if ('$gt' in value) return actual instanceof Date && actual > value.$gt;
      if ('$lt' in value) return actual instanceof ObjectId && actual.toHexString() < value.$lt.toHexString();
      if ('$ne' in value) return actual !== value.$ne;
      if ('$in' in value) return value.$in.includes(actual);
    }
    return actual === value;
  });
}
// Query doubles never instantiate MongoClient or contact any database.
function databaseFixture(initial: Record<string, Document[]> = {}) {
  const calls: Call[] = [];
  const collections = { ...initial };
  const db = { collection(collection: string) {
    const documents = collections[collection] ??= [];
    return {
      async findOne(filter: Document, options: Document) {
        calls.push({ collection, operation: 'findOne', filter, options });
        return documents.find(doc => matches(doc, filter)) ?? null;
      },
      find(filter: Document, options: Document) {
        const call: Call = { collection, operation: 'find', filter, options: { ...options } };
        calls.push(call);
        let limit = 100;
        const cursor = {
          sort(value: Document) { call.options!.sort = value; return cursor; },
          limit(value: number) { limit = value; call.options!.limit = value; return cursor; },
          async toArray() { return documents.filter(doc => matches(doc, filter)).slice(0, limit); },
        };
        return cursor;
      },
      aggregate(pipeline: Document[], options: Document) {
        calls.push({ collection, operation: 'aggregate', pipeline, options });
        return { toArray: async () => documents };
      },
      async insertOne(value: Document, options: Document) {
        calls.push({ collection, operation: 'insertOne', value, options }); documents.push(value);
      },
      async deleteOne(filter: Document) {
        calls.push({ collection, operation: 'deleteOne', filter });
        const index = documents.findIndex(doc => matches(doc, filter));
        if (index >= 0) documents.splice(index, 1);
      },
      async findOneAndUpdate(filter: Document, update: Document) {
        let doc = documents.find(doc => matches(doc, filter));
        if (!doc) { doc = { ...filter, ...update.$setOnInsert, count: 0 }; documents.push(doc!); }
        doc!.count += update.$inc.count;
        return doc;
      },
      async createIndexes(value: Document[], options: Document) {
        calls.push({ collection, operation: 'createIndexes', value: { indexes: value }, options });
      },
    };
  } } as unknown as Db;
  return { db, calls, collections };
}
async function httpFixture(run: (origin: string, logs: string[]) => Promise<void>, options: Partial<Parameters<typeof createApp>[0]> = {}) {
  const logs: string[] = [];
  const server = createServer(createApp({ database: { mode: 'disabled', checkReadiness: async () => true },
    logger: createLogger({ service: 'api', environment: 'development', write: line => logs.push(line) }),
    webOrigin: 'http://localhost:3000', ...options }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`, logs); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('all collection schemas reject raw filters, operators, offsets, duplicate keys and oversized inputs', () => {
  for (const schema of [catalogQuerySchema, adminProductQuerySchema, orderQuerySchema]) {
    assert.equal(schema.parse({}).limit, 20);
    for (const input of [{ filter: '{"$where":"x"}' }, { '$where': 'x' }, { offset: '10' }, { limit: ['1', '2'] },
      { limit: '101' }, { limit: '1e2' }, { cursor: 'a'.repeat(513) }, { q: '(a+)+$' }]) {
      assert.equal(schema.safeParse(input).success, false);
    }
  }
  assert.equal(catalogQuerySchema.safeParse({ disabled: 'true' }).success, false);
  assert.equal(catalogQuerySchema.safeParse({ sale: 'TRUE' }).success, false);
  assert.equal(loginBodySchema.safeParse({ username: 'a', password: 'a', role: 'admin' }).success, false);
  assert.equal(loginBodySchema.safeParse({ username: 'a', password: 'é'.repeat(37) }).success, false);
});

test('cursor validates format, version and filter/identity scope; pagination never authorizes access', () => {
  const scope = cursorScope('products', { sale: true });
  const cursor = encodeCursor(uid, scope);
  assert.ok(decodeCursor(cursor, scope)?.equals(uid));
  for (const [value, suppliedScope] of [[cursor, cursorScope('products', { sale: false })], ['garbage', scope],
    [Buffer.from('{"v":2}').toString('base64url'), scope]]) {
    assert.throws(() => decodeCursor(value, suppliedScope!), HttpError);
  }
});

test('public catalog enforces visibility and uses indexed text predicates; no request-derived Mongo filters', () => {
  assert.deepEqual(productFilter(catalogQuerySchema.parse({ q: 'vitamin c', sale: 'true', categoryId: categoryId.toHexString() }), false),
    { archivedAt: { $exists: false }, disabled: { $ne: true }, published: { $ne: false }, active: { $ne: false }, category: categoryId, sale: true, $text: { $search: 'vitamin c', $language: 'none' } });
  assert.deepEqual(productFilter(adminProductQuerySchema.parse({ disabled: 'true' }), true), { archivedAt: { $exists: false }, disabled: true });
});

test('catalog join excludes hidden/missing categories before limit, projects fields and bounds execution', async () => {
  const fixture = databaseFixture({ products: [product, { ...product, _id: categoryId }] });
  const repo = createCatalogRepository(async () => fixture.db);
  const page = await repo.products(catalogQuerySchema.parse({ limit: '1' }));
  assert.equal(page.items.length, 1); assert.ok(page.nextCursor);
  assert.ok(!JSON.stringify(page).includes('fake-sensitive-marker'));
  const pipeline = fixture.calls[0]!.pipeline!;
  assert.ok(pipeline.findIndex(stage => '$lookup' in stage) < pipeline.findIndex(stage => '$limit' in stage));
  assert.deepEqual(pipeline[3], { $match: { 'visibleCategory.0': { $exists: true } } });
  assert.deepEqual(pipeline[4], { $limit: 2 });
  assert.equal(fixture.calls[0]!.options!.maxTimeMS, 3000);
  await repo.products(catalogQuerySchema.parse({ limit: '1', cursor: page.nextCursor }));
  assert.ok(fixture.calls[1]!.pipeline![0]!.$match._id.$lt.equals(uid));
});

test('backward-compatible DTO defaults preserve prices and omit internal fields; corrupt money fails closed', () => {
  const dto = productDto(product);
  assert.equal(dto.disabled, false); assert.equal(dto.salePrice, null); assert.equal(dto.price, 12.5);
  assert.equal('password' in dto, false);
  assert.throws(() => productDto({ ...product, price: -1 }));
  assert.throws(() => productDto({ ...product, stock: -1 }));
});

test('order scope is enforced for staff, unassigned staff and explicit city queries', () => {
  assert.deepEqual(orderFilter({ limit: 20 }, staff), { 'customer.city': { $in: ['City A'] } });
  assert.deepEqual(orderFilter({ limit: 20 }, { ...staff, cities: [] }), { 'customer.city': { $in: [] } });
  assert.throws(() => orderFilter({ limit: 20, city: 'City B' }, staff), HttpError);
  assert.deepEqual(orderFilter({ limit: 20, city: 'City B' }, admin), { 'customer.city': 'City B' });
  assert.deepEqual(orderFilter({ limit: 20, dispatched: false, canceled: false }, admin), { dispatched: { $ne: true }, canceled: { $ne: true } });
});

test('order reads conceal other-city records and list summaries omit customer PII', async () => {
  const fixture = databaseFixture({ orders: [order, { ...order, _id: categoryId, customer: { city: 'City B' } }] });
  const repo = createOrderRepository(async () => fixture.db);
  assert.equal((await repo.list({ limit: 20 }, staff)).items.length, 1);
  assert.equal((await repo.list({ limit: 20 }, { ...staff, cities: [] })).items.length, 0);
  await assert.rejects(repo.detail(categoryId.toHexString(), staff), { status: 404 });
  assert.ok(!JSON.stringify(orderSummaryDto(order)).includes('fake-sensitive-marker'));
  const detail = orderDetailDto(order);
  assert.equal(detail.snapshotAvailable, false); assert.equal(detail.items[0]!.quantity, 2);
  assert.equal(detail.totalAmount, 12.5); assert.equal(detail.customer.email, 'fake-sensitive-marker');
  assert.ok(fixture.calls.every(call => call.options!.maxTimeMS === 3000));
});

test('bcrypt login uses hashed expiring sessions; logout, expiry and role changes take effect', async () => {
  const fixture = databaseFixture({ users: [{ _id: uid, ...staff, password: await hash('fixture-password', 4) }] });
  const auth = createAuthService(async () => fixture.db);
  await assert.rejects(auth.login({ username: 'fixture', password: 'wrong' }), { status: 401 });
  await assert.rejects(auth.login({ username: 'missing-account', password: 'wrong' }), { status: 401 });
  const login = await auth.login({ username: 'fixture', password: 'fixture-password' });
  const bearer = login.token;
  assert.equal((await auth.authenticate(bearer)).role, 'user');
  assert.ok(!JSON.stringify(fixture.collections.api_sessions).includes(login.token));
  assert.equal(fixture.collections.api_sessions![0]!.tokenHash.length, 64);
  fixture.collections.users![0]!.role = 'unknown';
  await assert.rejects(auth.authenticate(bearer), { status: 401 });
  fixture.collections.users![0]!.role = 'admin';
  assert.equal((await auth.authenticate(bearer)).role, 'admin');
  fixture.collections.api_sessions![0]!.expiresAt = new Date(0);
  await assert.rejects(auth.authenticate(bearer), { status: 401 });
  fixture.collections.api_sessions![0]!.expiresAt = new Date(Date.now() + 60000);
  await auth.logout(bearer);
  await assert.rejects(auth.authenticate(bearer), { status: 401 });
  for (const token of [undefined, 'Bearer fake', 'legacy-token']) await assert.rejects(auth.authenticate(token), { status: 401 });
});

test('deleted/disabled users cannot continue using an existing session', async () => {
  const fixture = databaseFixture({ users: [{ _id: uid, ...staff, password: await hash('fixture-password', 4) }] });
  const auth = createAuthService(async () => fixture.db);
  const login = await auth.login({ username: 'fixture', password: 'fixture-password' });
  fixture.collections.users![0]!.disabled = true;
  await assert.rejects(auth.authenticate(login.token), { status: 401 });
  await assert.rejects(auth.login({ username: 'fixture', password: 'fixture-password' }), { status: 401 });
  fixture.collections.users!.splice(0);
  await assert.rejects(auth.authenticate(login.token), { status: 401 });
});

test('HTTP negative tests reject unauthorized admin routes before database access or PII disclosure', async () => {
  await httpFixture(async origin => {
    for (const route of ['/admin/operations', '/admin/orders', `/admin/orders/${uid}`, '/admin/users', '/admin/products', '/auth/me', '/auth/logout']) {
      const response = await fetch(`${origin}/api/v1${route}`, route === '/auth/logout' ? { method: 'POST' } : {});
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('www-authenticate'), null); apiErrorSchema.parse(await response.json());
    }
    assert.equal((await fetch(`${origin}/api/v1/orders`)).status, 404);
    for (const route of ['products?filter=%7B%7D', 'products?limit=1&limit=2', 'products?disabled=true', 'products/not-an-id']) {
      assert.equal((await fetch(`${origin}/api/v1/catalog/${route}`)).status, 400);
    }
  }, { getDb: async () => assert.fail('must reject before DB') });
});

test('HTTP staff cannot read admin users/products; order lists are scoped and schema validation precedes persistence', async () => {
  const fixture = databaseFixture({ users: [{ _id: uid, ...staff, password: await hash('fixture-password', 4) }], orders: [order] });
  await httpFixture(async (origin, logs) => {
    const loginResponse = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1' },
      body: JSON.stringify({ username: 'fixture', password: 'fixture-password' }) });
    assert.equal(loginResponse.status, 200);
    const { data: login } = await loginResponse.json();
    const headers = { Cookie: loginResponse.headers.get('set-cookie')!.split(';')[0]! };
    for (const route of ['/admin/operations', '/admin/products', '/admin/users']) assert.equal((await fetch(`${origin}/api/v1${route}`, { headers })).status, 403);
    const response = await fetch(`${origin}/api/v1/admin/orders`, { headers });
    assert.equal(response.status, 200); const body = await response.json();
    assert.equal(body.data.items.length, 1); assert.ok(!JSON.stringify(body).includes('fake-sensitive-marker'));
    assert.equal((await fetch(`${origin}/api/v1/admin/orders?city=City%20B`, { headers })).status, 403);
    assert.ok(!logs.join('').includes('fixture-password')); assert.equal('token' in login, false); assert.ok(!logs.join('').includes(headers.Cookie));
    const before = fixture.calls.length;
    const invalid = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1' },
      body: JSON.stringify({ username: 'fixture', password: 'fixture-password', role: 'admin' }) });
    assert.equal(invalid.status, 400); assert.equal(fixture.calls.length, before);
  }, { getDb: async () => fixture.db });
});

test('HTTP exact-origin CORS and preflight allow only intended methods/headers', async () => {
  await httpFixture(async origin => {
    assert.equal((await fetch(`${origin}/api/v1/catalog/products`, { headers: { Origin: 'https://evil.example.invalid' } })).status, 403);
    const response = await fetch(`${origin}/api/v1/catalog/products`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'X-CSRF-Protection, Content-Type' } });
    assert.equal(response.status, 204); assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    for (const method of ['DELETE', 'PUT']) assert.equal((await fetch(`${origin}/api/v1/catalog/products`, { method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': method } })).status, 403);
    const disallowed = await fetch(`${origin}/api/v1/catalog/products`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:3000',
      'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'X-Role' } });
    assert.equal(disallowed.status, 403);
  });
});

test('HTTP limits, secure headers, parser errors and media types have consistent redacted statuses', async () => {
  await httpFixture(async origin => {
    const secure = await fetch(`${origin}/health/live`);
    for (const header of ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'strict-transport-security']) assert.ok(secure.headers.has(header));
    for (const [headers, body, status] of [
      [{ 'content-type': 'application/json' }, '{', 400],
      [{ 'content-type': 'application/json' }, JSON.stringify({ x: 'x'.repeat(17000) }), 413],
      [{ 'content-type': 'text/plain' }, 'text', 415],
      [{ 'content-type': 'application/json', 'content-encoding': 'gzip' }, '{}', 415],
    ] as const) {
      const response = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers, body });
      assert.equal(response.status, status); apiErrorSchema.parse(await response.json());
    }
    assert.equal((await fetch(`${origin}/api/v1/catalog/products`, { method: 'PUT' })).status, 405);
  });
});

test('global rate limit cannot be bypassed with spoofed forwarding headers; health remains available', async () => {
  await httpFixture(async origin => {
    const route = `${origin}/api/v1/unknown`;
    assert.equal((await fetch(route)).status, 404);
    const response = await fetch(route, { headers: { 'X-Forwarded-For': '192.0.2.5' } });
    assert.equal(response.status, 429); assert.ok(response.headers.has('retry-after'));
    assert.equal(apiErrorSchema.parse(await response.json()).error.code, 'RATE_LIMITED');
    assert.equal((await fetch(`${origin}/health/live`)).status, 200);
  }, { rateLimit: 1 });
});

test('login has a tighter quota including invalid bodies', async () => {
  await httpFixture(async origin => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1' }, body: '{}' });
      assert.equal(response.status, 400);
    }
    const limited = await fetch(`${origin}/api/v1/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1' }, body: '{}' });
    assert.equal(limited.status, 429); assert.ok(limited.headers.has('retry-after'));
  }, { getDb: async () => assert.fail('invalid login must never query the DB') });
});

test('request deadline ends slow requests; draining makes readiness fail while liveness passes', async () => {
  await httpFixture(async origin => {
    const response = await fetch(`${origin}/api/v1/catalog/products`);
    assert.equal(response.status, 504); apiErrorSchema.parse(await response.json());
  }, { requestDeadlineMs: 20, getDb: () => new Promise(() => undefined) });
  await httpFixture(async origin => {
    assert.equal((await fetch(`${origin}/health/live`)).status, 200);
    assert.equal((await fetch(`${origin}/health/ready`)).status, 503);
    assert.equal((await fetch(`${origin}/api/v1/catalog/products`)).status, 503);
  }, { draining: () => true });
});

test('additive index plan is idempotent by stable names and never resets/drops legacy collections', async () => {
  const fixture = databaseFixture();
  await applyIndexes(fixture.db); await applyIndexes(fixture.db);
  assert.equal(fixture.calls.length, Object.keys(indexPlan).length * 2);
  assert.ok(fixture.calls.every(call => call.operation === 'createIndexes'));
  assert.equal(indexPlan.api_sessions!.find(index => index.name === 'v1_session_expiry')!.expireAfterSeconds, 0);
  assert.equal(indexPlan.products!.find(index => index.name === 'v1_product_search')!.default_language, 'none');
  assert.ok(!indexPlan.products!.some(index => index.unique));
});
