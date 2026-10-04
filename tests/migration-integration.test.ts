import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { setStoreStatus, storeStatus } from '../apps/api/src/modules/store/service.js';
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database required');
test('maintained store domain preserves closed/open contract and fails closed on invalid input', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_migration_test_${randomUUID().replaceAll('-', '')}`);
  try {
    await assert.rejects(storeStatus(db), { status: 404 });
    for (const raw of [{ status: 'open' }, { status: true, role: 'admin' }, null]) await assert.rejects(setStoreStatus(db, raw), { status: 400 });
    await setStoreStatus(db, { status: false });
    assert.equal(await storeStatus(db), 'closed');
    await setStoreStatus(db, { status: true });
    assert.equal(await storeStatus(db), 'open');
    assert.equal(await db.collection('stores').countDocuments(), 1);
    await db.collection('stores').updateOne({}, { $set: { status: 'corrupt' } });
    await assert.rejects(storeStatus(db), { status: 503 });
  } finally { await db.dropDatabase(); await client.close(); }
});
