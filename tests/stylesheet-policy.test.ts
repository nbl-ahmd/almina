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

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
test('staff alert stylesheet has an exact CSP hash without allowing arbitrary inline styles',()=>{
 const source=readFileSync('node_modules/sonner/dist/index.mjs','utf8');
 const raw=source.match(/__insertCSS\(("(?:[^"\\]|\\.)*")\)/)?.[1];assert.ok(raw);
 const digest=createHash('sha256').update(JSON.parse(raw)).digest('base64');
 const policy=stylesheetPolicy('test-nonce','production','production',false,true);
 assert.ok(policy.includes(`'sha256-${digest}'`));assert.ok(policy.includes(`'sha256-${createHash('sha256').update('').digest('base64')}'`));assert.ok(!policy.includes("'unsafe-inline'"));assert.ok(!stylesheetPolicy('test-nonce','production','production').includes(digest));
});
