import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Db } from 'mongodb';
import { retainedWhatsappConversation, retainedWhatsappList, retainedWhatsappPoster, whatsappReadPage } from '../apps/api/src/modules/notifications/whatsapp-reads';
test('retained WhatsApp readers have bounded defaults and reject arbitrary predicates before database work', async () => {
  assert.deepEqual(whatsappReadPage({}), { limit: 25, offset: 0 });
  for (const value of [{ limit: '0' }, { limit: '101' }, { offset: '-1' }, { offset: '10001' }, { filter: '{}' }, { limit: ['25'] }, { limit: 'Infinity' }]) assert.throws(() => whatsappReadPage(value), { status: 400 });
  const db = { collection() { throw new Error('Unexpected database work'); } } as unknown as Db;
  await assert.rejects(retainedWhatsappConversation(db, 'not-a-number', {}), { status: 400 });
  await assert.rejects(retainedWhatsappConversation(db, '971500000001', { filter: '{}' }), { status: 400 });
  await assert.rejects(retainedWhatsappList(db, 'recipients', { limit: '1000' }), { status: 400 });
  for (const file of ['../private.jpeg', 'image.svg', 'file.jpeg?secret=x']) await assert.rejects(retainedWhatsappPoster(db, file, {}), { status: 400 });
  await assert.rejects(retainedWhatsappPoster(db, 'image.jpeg', { limit: '1' }), { status: 400 });
});
