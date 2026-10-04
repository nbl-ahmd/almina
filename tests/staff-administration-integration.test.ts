import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { MongoClient, ObjectId } from 'mongodb';
import { hash, compare } from 'bcryptjs';
import { provisionStaff, deactivateStaff, retainedStaffList } from '../apps/api/src/modules/auth/administration';
import { createAuthService } from '../apps/api/src/modules/auth/service';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
const require = createRequire(new URL('../backend/package.json', import.meta.url));
test('staff creation and deactivation retain IDs/history, serialize privileges, revoke sessions and roll back failed audits', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_staff_test_' + randomUUID().replaceAll('-', ''));
  const first = new ObjectId(), second = new ObjectId(), staff = new ObjectId(), password = await hash('synthetic-long-password', 4);
  const input = { username: 'synthetic-provisioned', name: 'Synthetic account', password: 'synthetic-new-password', role: 'user', cities: ['City A'] };
  try {
    await db.collection('users').insertMany([{ _id: first, username: 'synthetic-first', name: 'First', password, role: 'admin', cities: [] },
      { _id: second, username: 'synthetic-second', name: 'Second', password, role: 'admin', cities: [] },
      { _id: staff, username: 'synthetic-staff', name: 'Staff', password, role: 'user', cities: ['City A'] }]);
    await assert.rejects(provisionStaff(db, input, String(staff)), { code: 'FORBIDDEN' });
    const results = await Promise.all([provisionStaff(db, input, String(first)), provisionStaff(db, input, String(second))]);
    assert.deepEqual(results[0], results[1]); assert.equal(await db.collection('users').countDocuments({ username: input.username }), 1);
    const created = (await db.collection('users').findOne({ username: input.username }))!;
    assert.match(created.password, /^\$2b\$12\$/); assert.ok(await compare(input.password, created.password));
    await provisionStaff(db, { ...input, role: 'admin', password: 'synthetic-conflicting-password', cities: [] }, String(first));
    assert.equal((await db.collection('users').findOne({ _id: created._id }))!.role, 'user');
    assert.equal(await db.collection('auth_administration_audit').countDocuments({ action: 'provision' }), 1);
    const auth = createAuthService(async () => db), session = await auth.login({ username: input.username, password: input.password });
    await db.collection('inventory_adjustments').insertOne({ actor: String(created._id), reason: 'Synthetic retained reference', delta: 0 });
    const unavailableAudit = new Proxy(db, { get(target, key) {
      if (key === 'collection') return (name: string) => name === 'auth_administration_audit' ? { insertOne: async () => { throw new Error('Synthetic audit outage'); } } : target.collection(name);
      const value = Reflect.get(target, key, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
    await assert.rejects(deactivateStaff(unavailableAudit, String(created._id), String(first)), /Synthetic audit outage/);
    assert.equal((await db.collection('users').findOne({ _id: created._id }))!.disabled, undefined);
    assert.equal((await auth.authenticate(session.token)).id, String(created._id));
    await assert.rejects(provisionStaff(unavailableAudit, { ...input, username: 'synthetic-rollback' }, String(first)), /Synthetic audit outage/);
    assert.equal(await db.collection('users').countDocuments({ username: 'synthetic-rollback' }), 0);
    await deactivateStaff(db, String(created._id), String(first)); await deactivateStaff(db, String(created._id), String(first));
    const disabled = (await db.collection('users').findOne({ _id: created._id }))!;
    assert.equal(disabled.disabled, true); assert.equal(disabled.password, created.password); assert.equal(String(disabled.deactivatedBy), String(first));
    assert.equal(await db.collection('auth_administration_audit').countDocuments({ action: 'deactivate' }), 1);
    assert.equal(await db.collection('api_sessions').countDocuments({ userId: created._id }), 0);
    await assert.rejects(auth.authenticate(session.token), { code: 'UNAUTHORIZED' });
    await assert.rejects(auth.login({ username: input.username, password: input.password }), { code: 'UNAUTHORIZED' });
    await provisionStaff(db, input, String(first)); assert.equal((await db.collection('users').findOne({ _id: created._id }))!.disabled, true);
    const list = await retainedStaffList(db, {}, String(first)); assert.ok(!list.some(value => String(value._id) === String(created._id)));
    assert.ok(!JSON.stringify(list).includes('password')); assert.ok(!JSON.stringify(await db.collection('auth_administration_audit').find().toArray()).includes('$2b$'));
    assert.equal(await db.collection('inventory_adjustments').countDocuments({ actor: String(created._id) }), 1);
    await assert.rejects(deactivateStaff(db, String(first), String(first)), { code: 'FORBIDDEN' });
    const race = await Promise.allSettled([deactivateStaff(db, String(first), String(second)), deactivateStaff(db, String(second), String(first))]);
    assert.equal(race.filter(value => value.status === 'fulfilled').length, 1);
    assert.equal(await db.collection('users').countDocuments({ role: 'admin', disabled: { $ne: true } }), 1);
    assert.equal(await db.collection('users').countDocuments({ role: 'admin' }), 2);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('retained Mongoose HTTP staff adapter preserves provisioning response and deactivates without deleting accounts', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), dbName = 'almina_staff_http_' + randomUUID().replaceAll('-', ''), db = client.db(dbName);
  const mongoose = require('mongoose'); await mongoose.connect(uri, { dbName });
  const { createLegacyApp } = require('./app.js');
  const server = createServer(createLegacyApp({ origins: ['http://localhost:3000'], development: true }));
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const origin = `http://127.0.0.1:${address.port}`;
  const browser = { Origin: 'http://localhost:3000', 'X-CSRF-Protection': '1', 'Content-Type': 'application/json' };
  try {
    await db.collection('users').insertOne({ username: 'synthetic-admin', name: 'Admin', role: 'admin', cities: [], password: await hash('synthetic-long-password', 4) });
    const login = await fetch(origin + '/api/auth/login', { method: 'POST', headers: browser, body: JSON.stringify({ username: 'synthetic-admin', password: 'synthetic-long-password' }) });
    assert.equal(login.status, 200); const headers = { ...browser, Cookie: login.headers.get('set-cookie')!.split(';')[0]! };
    const input = { username: 'synthetic-staff', name: 'Staff', role: 'user', cities: [], password: 'synthetic-long-password' };
    for (let i = 0; i < 2; i++) assert.equal((await fetch(origin + '/api/auth/signup', { method: 'POST', headers, body: JSON.stringify(input) })).status, 202);
    const users = await (await fetch(origin + '/api/auth/users', { headers })).json(); const staff = users.find((value: { username: string }) => value.username === input.username);
    assert.ok(staff); assert.ok(!JSON.stringify(users).includes('password'));
    for (let i = 0; i < 2; i++) assert.equal((await fetch(origin + '/api/auth/users/' + staff._id, { method: 'DELETE', headers })).status, 200);
    assert.equal((await db.collection('users').findOne({ _id: new ObjectId(staff._id) }))!.disabled, true);
    assert.equal(await db.collection('users').countDocuments(), 2); assert.equal(await db.collection('auth_administration_audit').countDocuments(), 2);
    assert.equal((await fetch(origin + '/api/auth/login', { method: 'POST', headers: browser, body: JSON.stringify({ username: input.username, password: input.password }) })).status, 401);
  } finally {
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await mongoose.disconnect(); await db.dropDatabase(); await client.close();
  }
});
