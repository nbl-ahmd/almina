import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLogger } from '@almina/config/logger';

test('logger omits PII, secrets, arbitrary fields and query-bearing routes', () => {
  const lines: string[] = [];
  const logger = createLogger({ service: 'api', environment: 'development', write: (line) => lines.push(line) });
  const unsafe = { method: 'GET', status: 200, route: '/?email=fake-sensitive-marker',
    requestId: 'fake-sensitive-marker', authorization: 'fake-sensitive-marker',
    body: { password: 'fake-sensitive-marker' }, error: new Error('fake-sensitive-marker') };
  logger.log('info', 'http_request', unsafe);
  assert.ok(!lines.join('').includes('fake-sensitive-marker'));
  assert.deepEqual(Object.keys(JSON.parse(lines[0]!)).sort(), ['environment', 'event', 'level', 'method', 'service', 'status', 'time']);
});

test('logger obeys severity threshold and retains generated correlation IDs', () => {
  const lines: string[] = [];
  const logger = createLogger({ service: 'api', environment: 'staging', level: 'warn', write: (line) => lines.push(line) });
  logger.log('info', 'api_started');
  logger.log('error', 'request_failed', { requestId: '0d614be8-7697-4c01-87e6-32b153bc1ee8', status: 500 });
  assert.equal(lines.length, 1);
  assert.equal(JSON.parse(lines[0]!).requestId, '0d614be8-7697-4c01-87e6-32b153bc1ee8');
});
