import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient, type Document } from 'mongodb';
import { createReverseLocationService } from '../apps/api/src/modules/location/reverse';
import { applyIndexes } from '../apps/api/src/database/indexes';
const uri = process.env.COMMERCE_TEST_URI;
test('real MongoDB serializes providers across instances, caches results, expires cache and enforces budgets', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_location_test_${randomUUID().replaceAll('-', '')}`);
  let now = Date.now(), calls = 0;
  const getDb = async () => db;
  const options = { endpoint: 'https://geocoder.example.invalid/reverse', enabled: true, dailyLimit: 2, userAgent: 'AlMinaTest/1', now: () => now,
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      calls++;
      assert.equal(new URL(String(url)).searchParams.get('accept-language'), 'en');
      assert.equal((init!.headers as Record<string, string>)['User-Agent'], 'AlMinaTest/1');
      return Response.json({ display_name: 'Synthetic road, Synthetic area, Dubai, UAE', address: { country_code: 'ae', state: 'Dubai', suburb: 'Synthetic area' } });
    }) as typeof fetch };
  try {
    await applyIndexes(db);
    const a = createReverseLocationService(getDb, options), b = createReverseLocationService(getDb, options);
    const results = await Promise.allSettled([a.lookup({ latitude: 25.123, longitude: 55.123 }), b.lookup({ latitude: 25.124, longitude: 55.124 })]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected' && String(result.reason).includes('RATE_LIMITED')).length, 1);
    assert.equal(calls, 1);
    const success = results.findIndex(result => result.status === 'fulfilled');
    const coordinate = success === 0 ? { latitude: 25.123, longitude: 55.123 } : { latitude: 25.124, longitude: 55.124 };
    assert.equal((await b.lookup(coordinate)).city, 'Synthetic area'); assert.equal(calls, 1);
    const stored = await db.collection('geocoding_cache').findOne({});
    assert.deepEqual(Object.keys(stored!).sort(), ['_id', 'address', 'expiresAt']);
    now += 2000;
    await a.lookup({ latitude: 25.125, longitude: 55.125 }); assert.equal(calls, 2);
    now += 2000;
    await assert.rejects(b.lookup({ latitude: 25.126, longitude: 55.126 }), /RATE_LIMITED/); assert.equal(calls, 2);
    now += 86400000;
    await a.lookup(coordinate); assert.equal(calls, 3);
    assert.equal((await db.collection('geocoding_cache').indexes()).find(index => index.name === 'geocoding_cache_expiry')?.expireAfterSeconds, 0);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('provider failure releases lease, returns safe errors, and never caches partial/outside addresses', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_location_test_${randomUUID().replaceAll('-', '')}`);
  let now = Date.now(), body: unknown = { error: 'No address' };
  let throws = false;
  const options = { endpoint: 'https://geocoder.example.invalid/reverse', enabled: true, dailyLimit: 20, userAgent: 'AlMinaTest/1', now: () => now,
    fetch: (async () => { if (throws) throw new Error('Do not leak provider URL or coordinates'); return Response.json(body); }) as typeof fetch };
  const service = createReverseLocationService(async () => db, options);
  try {
    await assert.rejects(service.lookup({ latitude: 25, longitude: 55 }), /LOCATION_NOT_FOUND/);
    now += 2000; body = { display_name: 'Outside', address: { country_code: 'om', state: 'Muscat', city: 'Muscat' } };
    await assert.rejects(service.lookup({ latitude: 25, longitude: 55 }), /LOCATION_OUTSIDE_UAE/);
    now += 2000; throws = true;
    await assert.rejects(service.lookup({ latitude: 25, longitude: 55 }), error => error instanceof Error && error.message === 'SERVICE_UNAVAILABLE');
    assert.equal(await db.collection('geocoding_cache').countDocuments(), 0);
    assert.equal((await db.collection<Document & { _id: string }>('geocoding_limits').findOne({ _id: 'provider' }))?.owner, undefined);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('provider rate rejection applies shared cooldown before another upstream attempt', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect();
  const db = client.db(`almina_location_test_${randomUUID().replaceAll('-', '')}`);
  let now = Date.now(), calls = 0;
  const options = { endpoint: 'https://geocoder.example.invalid/reverse', enabled: true, dailyLimit: 20, userAgent: 'AlMinaTest/1', now: () => now,
    fetch: (async () => { calls++; return calls === 1 ? new Response('', { status: 429 }) : Response.json({ display_name: 'Synthetic street, Dubai, UAE', address: { country_code: 'ae', state: 'Dubai', city: 'Dubai' } }); }) as typeof fetch };
  const a = createReverseLocationService(async () => db, options), b = createReverseLocationService(async () => db, options);
  try {
    await assert.rejects(a.lookup({ latitude: 25, longitude: 55 }), /RATE_LIMITED/);
    now += 2000;
    await assert.rejects(b.lookup({ latitude: 25, longitude: 55 }), /RATE_LIMITED/);
    assert.equal(calls, 1);
    now += 60000;
    assert.equal((await b.lookup({ latitude: 25, longitude: 55 })).emirate, 'Dubai');
    assert.equal(calls, 2);
  } finally { await db.dropDatabase(); await client.close(); }
});
