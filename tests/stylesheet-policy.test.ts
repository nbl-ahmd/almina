import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stylesheetPolicy } from '../apps/web/src/lib/security/stylesheet-policy';

test('only an explicitly local development runtime permits Next injected style elements', () => {
  assert.equal(stylesheetPolicy('request-nonce', 'development', 'development'), "style-src 'self' 'unsafe-inline'");
  for (const appEnvironment of ['development', 'staging', 'production']) {
    for (const nodeEnvironment of ['production', 'test', undefined, 'development']) {
      if (appEnvironment === 'development' && nodeEnvironment === 'development') continue;
      const policy = stylesheetPolicy('request-nonce', appEnvironment, nodeEnvironment);
      assert.ok(policy.includes("'nonce-request-nonce'"));
      assert.ok(!policy.includes("'unsafe-inline'"));
    }
  }
});

test('email designer alone can load GrapesJS runtime styles in a compiled build', () => {
  assert.equal(stylesheetPolicy('request-nonce', 'production', 'production', true), "style-src 'self' 'unsafe-inline'");
  assert.equal(stylesheetPolicy('request-nonce', 'production', 'production'), "style-src 'self' 'nonce-request-nonce'");
});
