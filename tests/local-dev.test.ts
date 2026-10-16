import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { localDevPlan, localApiEnvironment } from '../scripts/tooling/dev-plan.mjs';
import { CatalogUnavailable, catalogArray, readCatalogResponse } from '../apps/web/src/lib/server/catalog-response';

test('dev port/origin selection is explicit and stays on loopback', () => {
  assert.equal(localDevPlan({}, []).webOrigin, 'http://127.0.0.1:3000');
  assert.equal(localDevPlan({}, ['--port', '4760']).webOrigin, 'http://127.0.0.1:4760');
  assert.equal(localDevPlan({}, ['-p', '4761', '-H', 'localhost']).webOrigin, 'http://localhost:4761');
  for (const args of [['--hostname', '0.0.0.0'], ['-H', 'public.invalid']]) assert.throws(() => localDevPlan({}, args));
  for (const args of [['--port', '0'], ['--port=65536'], ['-p', 'NaN']]) assert.throws(() => localDevPlan({}, args));
  assert.throws(() => localDevPlan({ APP_ENV: 'production' }, []));
});

test('development preserves its selected database and rejects production-labelled runtime configuration', () => {
  const source = { APP_ENV: 'development', NODE_ENV: 'development', MONGODB_URI: 'mongodb+srv://synthetic.invalid/development_database',
    AUTH_ALLOWED_ORIGINS: 'https://shop.example.invalid', PORT: '4000' };
  const dev = localApiEnvironment(source, 'http://127.0.0.1:3000');
  assert.equal(dev.MONGODB_URI, source.MONGODB_URI);
  assert.equal(dev.APP_ENV, 'development'); assert.equal(dev.NODE_ENV, 'development');
  assert.equal(source.APP_ENV, 'development'); assert.equal(source.AUTH_ALLOWED_ORIGINS, 'https://shop.example.invalid');
  assert.equal(dev.AUTH_ALLOWED_ORIGINS, 'https://shop.example.invalid,http://127.0.0.1:3000');
  assert.equal(localApiEnvironment(dev, 'http://127.0.0.1:3000').AUTH_ALLOWED_ORIGINS, dev.AUTH_ALLOWED_ORIGINS);
  assert.throws(() => localApiEnvironment({ ...source, APP_ENV: 'production' }, 'http://127.0.0.1:3000'), /development environment/);
});

test('catalog distinguishes missing compatibility routes from genuinely missing product IDs', async () => {
  await assert.rejects(readCatalogResponse(new Response('{}', { status: 404 }), false, true), /foundation API serves \/api\/v1 only/);
  assert.equal(await readCatalogResponse(new Response('{}', { status: 404 }), true, true), null);
  await assert.rejects(readCatalogResponse(new Response('private response', { status: 503 }), false, true), /database/);
  await assert.rejects(readCatalogResponse(new Response('private invalid JSON'), false, true), /unexpected response format/);
  assert.throws(() => catalogArray({ error: 'private value' }, true), /unexpected response format/);
  assert.deepEqual(catalogArray(await readCatalogResponse(Response.json([]), false, true), true), []);
  for (const reason of ['connection', 'missing-route', 'http', 'format'] as const) {
    assert.equal(new CatalogUnavailable(reason, false).message, 'Catalog service unavailable');
    assert.ok(!new CatalogUnavailable(reason, true).message.includes('private'));
  }
});

test('dev startup rejects the wrong API contract before launching Next or opening a database', async () => {
  for (const [status, body, expected] of [
    [404, '{"error":{"code":"NOT_FOUND"}}', /Catalog routes missing/],
    [200, '{"data":[],"private":"sensitive-marker"}', /Catalog API response invalid/],
    [503, 'sensitive-marker', /Catalog API unavailable/],
  ] as const) {
    const server = createServer((_req, res) => { res.writeHead(status); res.end(body); });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    try {
      const child = spawn(process.execPath, ['scripts/tooling/dev.mjs'], {
        env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development', APP_ENV: 'development',
          API_ORIGIN: `http://127.0.0.1:${address.port}`, LEGACY_API_ORIGIN: `http://127.0.0.1:${address.port}` },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', chunk => { output += String(chunk); });
      child.stderr.on('data', chunk => { output += String(chunk); });
      const code = await new Promise<number | null>((resolve, reject) => { child.once('exit', resolve); child.once('error', reject); });
      assert.equal(code, 1); assert.match(output, expected);
      assert.ok(!output.includes('sensitive-marker') && !output.includes('Next.js') && !output.includes('Express API listening'));
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  }
});
