import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { retainedWhatsappConversation, retainedWhatsappList, retainedWhatsappPoster } from '../apps/api/src/modules/notifications/whatsapp-reads';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database is required');
test('bounded retained WhatsApp readers preserve all chronological history, page lists and exclude internal receipts', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_whatsapp_reads_' + randomUUID().replaceAll('-', ''));
  try {
    const messages = Array.from({ length: 61 }, (_, i) => ({ content: `Synthetic message ${i}`, sender: 'user', timestamp: new Date(i * 1000), providerId: 'private-provider', outboundReceiptId: 'private-receipt' }));
    await db.collection('conversations').insertOne({ from: '971500000001', name: 'Synthetic', promotionStatus: 'Stop promotions', messages, arbitrarySecret: 'private' });
    await db.collection('conversations').insertMany(Array.from({ length: 30 }, (_, i) => ({ from: String(i + 1), name: 'Synthetic', subscription: { token: 'private' } })));
    assert.equal((await retainedWhatsappList(db, 'recipients', {})).length, 25);
    assert.equal((await retainedWhatsappList(db, 'recipients', { offset: '25' })).length, 6);
    assert.ok(!JSON.stringify(await retainedWhatsappList(db, 'recipients', {})).includes('private'));
    const all: string[][] = [];
    for (const offset of [0, 25, 50, 75]) {
      const result = await retainedWhatsappConversation(db, '971500000001', { offset: String(offset) });
      assert.equal(result.messageCount, 61); assert.equal(result.messageOffset, offset); assert.equal(result.hasOlderMessages, offset < 50);
      all.push(result.messages.map((m: { content: string }) => m.content)); assert.ok(!JSON.stringify(result).includes('private'));
    }
    assert.deepEqual(all.slice(0, 3).reverse().flat(), messages.map(m => m.content)); assert.deepEqual(all[3], []);
    const largeOffset = await retainedWhatsappConversation(db, '971500000001', { offset: '10001' }); assert.deepEqual(largeOffset.messages, []);
    await assert.rejects(retainedWhatsappConversation(db, '9999999', {}), { status: 404 });
    await db.collection('whatsappposters').insertMany([{ image: 'active.jpeg', gdriveFileId: 'synthetic-active' }, { image: 'archived.jpeg', gdriveFileId: 'synthetic-archived', archivedAt: new Date() }]);
    assert.equal((await retainedWhatsappList(db, 'posters', {})).length, 1);
    assert.equal(await retainedWhatsappPoster(db, 'archived.jpeg', {}), 'synthetic-archived');
    await db.collection('whatsappbulkreports').insertOne({ broadcast: Array.from({ length: 120 }, (_, i) => ({ recipient: String(i), messageStatus: 'failed' })) });
    const reports = await retainedWhatsappList(db, 'reports', {}); assert.equal(reports[0]!.broadcast.length, 100); assert.equal(reports[0]!.broadcast[0].recipient, '20');
    assert.equal((await db.collection('conversations').findOne({ from: '971500000001' }))!.messages.length, 61);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('actual retained WhatsApp adapters preserve authenticated contracts and public archived image URLs with bounded validation', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_whatsapp_http_' + randomUUID().replaceAll('-', ''));
  const require = createRequire(new URL('../backend/package.json', import.meta.url));
  const { createLegacyApp } = require('./app.js'); let effects = 0, role = 'admin';
  const app = createLegacyApp({ development: true, origins: ['http://localhost:3000'], getCommerceDb: () => db,
    auth: { authenticate: async () => ({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', role, cities: [] }) },
    driveMedia: { read: async (id: string) => { effects++; assert.equal(id, 'synthetic-archived'); return { contentType: 'image/jpeg', bytes: Buffer.from('synthetic-test-image') }; } } });
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string'); const origin = `http://127.0.0.1:${address.port}`;
  try {
    await db.collection('conversations').insertOne({ from: '971500000001', name: 'Synthetic', messages: [{ content: 'Synthetic', sender: 'user' }] });
    await db.collection('whatsappposters').insertOne({ image: 'archived.jpeg', gdriveFileId: 'synthetic-archived', archivedAt: new Date() });
    assert.equal((await fetch(origin + '/api/whatsapp/recipients?limit=1')).status, 200);
    const conversation = await fetch(origin + '/api/whatsapp/messages/971500000001'); assert.equal(conversation.status, 200); assert.equal((await conversation.json()).messageCount, 1);
    assert.equal((await fetch(origin + '/api/whatsapp/messages/not-a-number')).status, 400);
    for (const path of ['recipients?filter={}', 'reports?limit=0', 'image?offset=10001', 'messages/971500000001?limit=101']) assert.equal((await fetch(origin + '/api/whatsapp/' + path)).status, 400);
    role = 'user'; assert.equal((await fetch(origin + '/api/whatsapp/recipients')).status, 403);
    assert.equal((await fetch(origin + '/api/whatsapp/image/archived.jpeg')).status, 200); assert.equal(effects, 1);
    assert.equal((await fetch(origin + '/api/whatsapp/image/archived.jpeg?limit=1')).status, 400); assert.equal(effects, 1);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await db.dropDatabase(); await client.close(); }
});
