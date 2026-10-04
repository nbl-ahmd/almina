import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { retainedRuntimeConfiguration, loadRetainedEnvironment } from '../apps/api/src/modules/operations/runtime';
const valid = { APP_ENV: 'production', NODE_ENV: 'production', AUTH_ALLOWED_ORIGINS: 'https://shop.example.invalid', MONGODB_URI: 'mongodb://127.0.0.1:27017/synthetic' };
test('retained startup bounds ports, exact origins, explicit proxy trust and disables implicit index/collection creation', () => {
  const config = retainedRuntimeConfiguration(valid);
  assert.equal(config.port, 4000); assert.equal(config.development, false); assert.deepEqual(config.trustProxy, []);
  assert.equal(config.mongoOptions.autoIndex, false); assert.equal(config.mongoOptions.autoCreate, false);
  assert.deepEqual(retainedRuntimeConfiguration({ ...valid, AUTH_TRUST_PROXY: '127.0.0.1,::1' }).trustProxy, ['127.0.0.1', '::1']);
  assert.equal(retainedRuntimeConfiguration({ ...valid, APP_ENV: 'development', NODE_ENV: 'development', AUTH_ALLOWED_ORIGINS: 'http://127.0.0.1:3000' }).development, true);
  for (const patch of [{ APP_ENV: undefined }, { APP_ENV: 'staging', NODE_ENV: 'development' }, { PORT: '0' }, { PORT: '65536' }, { PORT: '3.5' },
    { AUTH_ALLOWED_ORIGINS: 'http://shop.example.invalid' }, { AUTH_ALLOWED_ORIGINS: 'https://user:synthetic@shop.example.invalid' },
    { AUTH_ALLOWED_ORIGINS: 'https://shop.example.invalid/path' }, { AUTH_ALLOWED_ORIGINS: 'https://shop.example.invalid,https://shop.example.invalid' },
    { AUTH_TRUST_PROXY: '*' }, { AUTH_TRUST_PROXY: '127.0.0.1,127.0.0.1' }, { MONGODB_URI: 'https://synthetic:password@db.invalid' }]) {
    assert.throws(() => retainedRuntimeConfiguration({ ...valid, ...patch }), { message: 'Retained runtime configuration invalid' });
  }
});
test('native optional environment loading preserves injected values and never reflects file diagnostics', async () => {
  assert.equal(loadRetainedEnvironment('synthetic', () => { throw Object.assign(new Error('synthetic sensitive path'), { code: 'ENOENT' }); }), false);
  assert.throws(() => loadRetainedEnvironment('synthetic', () => { throw new Error('synthetic sensitive content'); }), { message: 'Retained runtime configuration invalid' });
  const directory = await mkdtemp(join(tmpdir(), 'almina-native-env-'));
  try {
    const file = join(directory, 'synthetic.env');
    await writeFile(file, 'SYNTHETIC_ENV_EXISTING=file-value\nSYNTHETIC_ENV_QUOTED="two words" # comment\nSYNTHETIC_ENV_MULTILINE="first\nsecond"\n');
    const output = execFileSync(process.execPath, ['--input-type=module', '-e',
      'process.loadEnvFile(process.argv[1]); console.log(JSON.stringify([process.env.SYNTHETIC_ENV_EXISTING,process.env.SYNTHETIC_ENV_QUOTED,process.env.SYNTHETIC_ENV_MULTILINE]));', file],
    { env: { NODE_ENV: 'test', SYNTHETIC_ENV_EXISTING: 'injected-value' }, encoding: 'utf8' });
    assert.deepEqual(JSON.parse(output), ['injected-value', 'two words', 'first\nsecond']);
  } finally { await rm(directory, { recursive: true }); }
});
