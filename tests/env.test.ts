import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigurationError, readApiEnvironment, readWebEnvironment } from '@almina/config/env';

test('development has isolated loopback defaults and no database', () => {
  const api = readApiEnvironment({});
  assert.equal(api.API_HOST, '127.0.0.1');
  assert.deepEqual(api.database, { mode: 'disabled' });
  assert.equal(readWebEnvironment({}).API_ORIGIN, 'http://127.0.0.1:4000');
});
test('checkout activation and Cloudinary account are explicit server configuration', () => {
  assert.equal(readWebEnvironment({}).CHECKOUT_ENABLED, false);
  assert.equal(readWebEnvironment({ CHECKOUT_ENABLED: 'true', CLOUDINARY_CLOUD_NAME: 'synthetic' }).CHECKOUT_ENABLED, true);
  assert.throws(() => readWebEnvironment({ CHECKOUT_ENABLED: 'yes' }), ConfigurationError);
  assert.throws(() => readWebEnvironment({ CLOUDINARY_CLOUD_NAME: '../other' }), ConfigurationError);
});

test('production mode requires an explicit deployment environment', () => {
  assert.throws(() => readWebEnvironment({ NODE_ENV: 'production' }), ConfigurationError);
  assert.throws(() => readApiEnvironment({ NODE_ENV: 'production' }), ConfigurationError);
});

test('production-mode development build does not imply production data', () => {
  assert.equal(readWebEnvironment({ APP_ENV: 'development', NODE_ENV: 'production' }).APP_ENV, 'development');
  assert.equal(readApiEnvironment({ APP_ENV: 'development', NODE_ENV: 'production' }).database.mode, 'disabled');
});

for (const APP_ENV of ['staging', 'production']) {
  test(`${APP_ENV} requires explicit HTTPS origins and production Node mode`, () => {
    const source = { APP_ENV, NODE_ENV: 'production', WEB_ORIGIN: 'https://web.example.invalid', API_ORIGIN: 'https://api.example.invalid' };
    assert.equal(readWebEnvironment(source).APP_ENV, APP_ENV);
    assert.throws(() => readWebEnvironment({ ...source, NODE_ENV: 'development' }), ConfigurationError);
    assert.throws(() => readWebEnvironment({ ...source, API_ORIGIN: 'http://localhost:4000' }), ConfigurationError);
    assert.throws(() => readApiEnvironment({ ...source, WEB_ORIGIN: 'http://localhost:3000' }), ConfigurationError);
    assert.throws(() => readWebEnvironment({ APP_ENV, NODE_ENV: 'production' }), ConfigurationError);
  });
}

test('database activation requires an explicit matching environment/name/URI', () => {
  const source = { APP_ENV: 'staging', NODE_ENV: 'production', WEB_ORIGIN: 'https://web.example.invalid',
    DATABASE_MODE: 'enabled', DATABASE_ENV: 'staging', MONGODB_DATABASE: 'almina_staging',
    MONGODB_URI: 'mongodb+srv://db.example.invalid' };
  assert.equal(readApiEnvironment(source).database.mode, 'enabled');
  for (const patch of [{ DATABASE_ENV: 'production' }, { MONGODB_DATABASE: '' }, { MONGODB_URI: '' },
    { MONGODB_URI: 'mongodb://localhost:27017' }, { DATABASE_MODE: 'disabled' }]) {
    assert.throws(() => readApiEnvironment({ ...source, ...patch }), ConfigurationError);
  }
  assert.throws(() => readApiEnvironment({ DATABASE_MODE: 'enabled' }), ConfigurationError);
});

test('unknown public settings and credential-bearing/invalid origins are rejected', () => {
  assert.throws(() => readWebEnvironment({ NEXT_PUBLIC_SECRET: 'fake-sensitive-marker' }), ConfigurationError);
  for (const API_ORIGIN of ['https://user:fake-sensitive-marker@example.invalid', 'https://api.example.invalid/path',
    'https://api.example.invalid/?token=fake-sensitive-marker', 'file:///tmp/a']) {
    assert.throws(() => readWebEnvironment({ API_ORIGIN }), ConfigurationError);
  }
});

test('configuration errors never contain supplied sensitive values', () => {
  try {
    readApiEnvironment({ DATABASE_MODE: 'enabled', MONGODB_URI: 'fake-sensitive-marker' });
    assert.fail('must reject');
  } catch (error) {
    assert.ok(error instanceof ConfigurationError);
    assert.ok(!JSON.stringify(error).includes('fake-sensitive-marker'));
    assert.ok(!error.message.includes('fake-sensitive-marker'));
  }
});

test('port/mode validation and legacy settings cannot activate database access', () => {
  for (const PORT of ['0', '65536', '1.5', 'invalid']) assert.throws(() => readApiEnvironment({ PORT }), ConfigurationError);
  assert.throws(() => readApiEnvironment({ DATABASE_MODE: 'true' }), ConfigurationError);
  assert.equal(readApiEnvironment({ MONGO_URI: 'fake-sensitive-marker', REACT_APP_API: 'https://legacy.example.invalid' }).database.mode, 'disabled');
});

test('proxy trust is disabled by default and accepts only explicit bounded IP lists', () => {
  assert.deepEqual(readApiEnvironment({}).API_TRUST_PROXY, []);
  assert.deepEqual(readApiEnvironment({ API_TRUST_PROXY: '127.0.0.1, ::1' }).API_TRUST_PROXY, ['127.0.0.1', '::1']);
  for (const API_TRUST_PROXY of ['true', '1', 'loopback', '0.0.0.0/0', 'host.invalid', Array(11).fill('127.0.0.1').join(',')]) {
    assert.throws(() => readApiEnvironment({ API_TRUST_PROXY }), ConfigurationError);
  }
});

test('maintained API uses the same Render-only proxy defaults as the retained runtime', () => {
  const base={APP_ENV:'production',NODE_ENV:'production',WEB_ORIGIN:'https://shop.example.invalid',RENDER:'true'};
  assert.ok(readApiEnvironment(base).API_TRUST_PROXY.includes('172.64.0.0/13'));
  assert.deepEqual(readApiEnvironment({...base,RENDER:'false'}).API_TRUST_PROXY,[]);
  assert.deepEqual(readApiEnvironment({...base,API_TRUST_PROXY:'127.0.0.1'}).API_TRUST_PROXY,['127.0.0.1']);
});
