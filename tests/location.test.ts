import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeLocation, readLocationOptions } from '../apps/api/src/modules/location/reverse';
import { reverseLocationInputSchema } from '@almina/contracts';
const raw = (address: Record<string, string>) => ({ display_name: 'A street, UAE', address: { country_code: 'ae', city: 'A city', ...address } });
for (const [state, canonical] of [['Ras Al Khaimah Emirate', 'Ras al-Khaimah'], ['Abu Dhabi', 'Abu Dhabi'], ['Dubai', 'Dubai'], ['Sharjah Emirate', 'Sharjah'], ['Ajman', 'Ajman'], ['Umm Al Qaiwain', 'Umm al-Quwain'], ['Al Fujairah', 'Fujairah']]) {
  test(`location canonicalizes ${state}`, () => assert.equal(normalizeLocation(raw({ state: state! })).emirate, canonical));
}
test('OSM ISO subdivision takes priority and suburb/industrial area is retained', () => {
  assert.deepEqual(normalizeLocation(raw({ 'ISO3166-2-lvl4': 'AE-RK', state: 'Unrecognized local spelling', industrial: 'Industrial area' })),
    { address: 'A street, UAE', city: 'Industrial area', emirate: 'Ras al-Khaimah' });
});
test('location rejects outside-UAE, incomplete and malformed responses instead of guessing', () => {
  assert.throws(() => normalizeLocation(raw({ country_code: 'om', state: 'Dubai' })), /LOCATION_OUTSIDE_UAE/);
  assert.throws(() => normalizeLocation(raw({ state: 'Unknown' })), /LOCATION_NOT_FOUND/);
  assert.throws(() => normalizeLocation(raw({ state: 'Dubai', city: '' })), /LOCATION_NOT_FOUND/);
  assert.throws(() => normalizeLocation({ error: 'No place found' }), /LOCATION_NOT_FOUND/);
});
test('location accepts only finite numeric coordinates with no extra fields', () => {
  for (const value of [{ latitude: 91, longitude: 0 }, { latitude: 0, longitude: Infinity }, { latitude: '25', longitude: 55 }, { latitude: 25, longitude: 55, endpoint: 'http://other' }]) assert.equal(reverseLocationInputSchema.safeParse(value).success, false);
});
test('provider endpoint can switch without code changes and rejects credentials, query, insecure URLs', () => {
  assert.equal(readLocationOptions({}).endpoint, 'https://nominatim.openstreetmap.org/reverse');
  assert.equal(readLocationOptions({ GEOCODING_ENABLED: 'false' }).enabled, false);
  assert.equal(readLocationOptions({ GEOCODING_REVERSE_URL: 'https://managed.example.invalid/reverse' }).endpoint, 'https://managed.example.invalid/reverse');
  for (const endpoint of ['http://example.invalid/reverse', 'https://user:pass@example.invalid/reverse', 'https://example.invalid/reverse?key=x']) assert.throws(() => readLocationOptions({ GEOCODING_REVERSE_URL: endpoint }));
  assert.throws(() => readLocationOptions({ GEOCODING_DAILY_LIMIT: '0' }));
});
