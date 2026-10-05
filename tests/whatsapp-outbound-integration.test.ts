import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { sendWhatsapp } from '../apps/api/src/modules/notifications/whatsapp-outbound';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
const require = createRequire(new URL('../backend/package.json', import.meta.url));
test('outbound acceptance and conversation commit retry independently without duplicate sends or fabricated delivery', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db(`almina_outbound_test_${randomUUID().replaceAll('-', '')}`);
  const actor = String(new ObjectId()), key = randomUUID(), input = { recipient: '+971500000001', name: 'Synthetic', text: 'Synthetic reply' };
  let sends = 0, failCommit = true;
  const send = async () => { sends++; return { providerId: 'synthetic-provider-id' }; };
  const faultDb = new Proxy(db, { get(target, property) {
    if (property === 'collection') return (name: string) => {
      const collection = target.collection(name);
      return new Proxy(collection, { get(value, operation) {
        if (name === 'conversations' && operation === 'insertOne' && failCommit) return async () => { failCommit = false; throw new Error('Synthetic persistence outage'); };
        const member = Reflect.get(value, operation); return typeof member === 'function' ? member.bind(value) : member;
      } });
    };
    const member = Reflect.get(target, property); return typeof member === 'function' ? member.bind(target) : member;
  } }) as Db;
  try {
    await assert.rejects(sendWhatsapp(faultDb, input, 'text', actor, key, send));
    assert.equal(sends, 1); assert.equal(await db.collection('conversations').countDocuments(), 0);
    assert.equal((await db.collection('whatsapp_outbound').findOne())!.state, 'accepted');
    await Promise.all([sendWhatsapp(db, input, 'text', actor, key, send), sendWhatsapp(db, input, 'text', actor, key, send)]);
    assert.equal(sends, 1); const conversation = await db.collection('conversations').findOne(); assert.ok(conversation);
    assert.equal(conversation.messages.length, 1); assert.equal(conversation.from, '971500000001'); assert.equal(conversation.promotionStatus, 'false');
    assert.equal(conversation.messages[0].providerEventId, 'synthetic-provider-id');
    assert.equal((await db.collection('whatsapp_outbound').findOne())!.state, 'completed');
    assert.equal((await sendWhatsapp(db, input, 'text', actor, key, send)).replay, true);
    await assert.rejects(sendWhatsapp(db, { ...input, text: 'Changed' }, 'text', actor, key, send), { status: 409 });
    assert.equal(sends, 1);
    const uncertainKey = randomUUID();
    await assert.rejects(sendWhatsapp(db, input, 'text', actor, uncertainKey, async () => { sends++; throw new Error('Unknown provider acceptance'); }), { status: 503 });
    await assert.rejects(sendWhatsapp(db, input, 'text', actor, uncertainKey, send), { status: 409, code: 'DELIVERY_UNCERTAIN' });
    assert.equal(sends, 2); assert.equal((await db.collection('conversations').findOne())!.messages.length, 1);
    const template = { recipient: input.recipient, template: 'approved', link: 'https://example.com/synthetic.jpeg' };
    await assert.rejects(sendWhatsapp(db, template, 'template', actor, randomUUID(), send), { status: 403 });
    assert.equal(sends, 2);
    await db.collection('conversations').updateOne({ _id: conversation._id }, { $set: { promotionStatus: 'true' } });
    await sendWhatsapp(db, template, 'template', actor, randomUUID(), send); assert.equal(sends, 3);
    assert.equal((await db.collection('conversations').findOne())!.messages.length, 1); // Template is not invented text/history/delivery.
  } finally { await db.dropDatabase(); await client.close(); }
});
test('retained outbound HTTP preserves responses, authorization and retired demo URLs with no provider side effects', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db(`almina_outbound_http_${randomUUID().replaceAll('-', '')}`);
  const { createLegacyApp } = require('./app.js'); let sends = 0, role = 'admin'; const actor = String(new ObjectId());
  const app = createLegacyApp({ origins: ['http://localhost:3000'], development: true, getCommerceDb: () => db,
    auth: { authenticate: async () => ({ id: actor, role, cities: [] }) }, whatsappSender: async () => { sends++; return { providerId: 'synthetic-id' }; } });
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const origin = `http://127.0.0.1:${address.port}`;
  const headers = { origin: 'http://localhost:3000', 'x-csrf-protection': '1', 'content-type': 'application/json', 'idempotency-key': randomUUID() };
  const body = JSON.stringify({ recipient: '971500000002', name: 'Synthetic', text: 'Synthetic reply' });
  const request = () => fetch(origin + '/api/whatsapp/text', { method: 'POST', headers, body, redirect: 'manual' });
  try {
    role = 'user'; assert.equal((await request()).status, 403); assert.equal(sends, 0); role = 'admin';
    assert.equal((await fetch(origin + '/api/whatsapp/text', { method: 'POST', headers, body: '{}', redirect: 'manual' })).status, 400); assert.equal(sends, 0);
    for (const path of ['/api/whatsapp', '/api/whatsapp/sr']) assert.equal((await fetch(origin + path, { method: 'POST', headers, body: '{}' })).status, 410);
    assert.equal(sends, 0);
    for (let i = 0; i < 2; i++) { const response = await request(); assert.equal(response.status, 302); assert.equal(response.headers.get('location'), '/catalog'); }
    assert.equal(sends, 1); assert.equal((await db.collection('conversations').findOne())!.messages.length, 1);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await db.dropDatabase(); await client.close(); }
});
