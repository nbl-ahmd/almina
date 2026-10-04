import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
test('retained route inventory covers every independently authorized contract', () => {
  const { routePolicies } = require('../backend/security/policy.cjs') as { routePolicies: { method: string; path: string }[] };
  const inventory = readFileSync('docs/migration/RETAINED_API_INVENTORY_2026-10-04.md', 'utf8');
  for (const route of routePolicies) assert.ok(inventory.includes(`| ${route.method} | ${route.path} |`), route.path);
  const files = { media: 'media.js', recovery: 'recovery.js', auth: 'Login.js', products: 'products.js', category: 'categories.js', banners: 'banners.js',
    orders: 'Orderrouter.js', batch: 'batchProductRouter.js', store: 'storeRouter.js', whatsapp: 'whatsapp.js' };
  for (const [mount, file] of Object.entries(files)) {
    const source = readFileSync(`backend/routes/${file}`, 'utf8').split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
    for (const match of source.matchAll(/\b\w+\.(get|post|put|delete)\(['"]([^'"]+)['"]/g)) {
      const path = `/api/${mount}${match[2] === '/' ? '' : match[2]}`;
      assert.ok(routePolicies.some(route => route.method === match[1]!.toUpperCase() && route.path === path), path);
    }
  }
});
