import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import type { Express, Request, Response, NextFunction } from 'express';

const require = createRequire(new URL('../backend/package.json', import.meta.url));
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { imageUploadOptions, validateImageUploads } = require('./security/uploads.cjs');
const { createLegacyApp } = require('./app.js');
const origin = 'http://localhost:3000';
async function serve(app: Express, run: (url: string) => Promise<void>) {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
}
function form(bytes: Uint8Array | string, mime: string, field = 'images', count = 1) {
  const body = new FormData();
  for (let i = 0; i < count; i++) body.append(field, new Blob([typeof bytes === 'string' ? bytes : Uint8Array.from(bytes)], { type: mime }), 'untrusted.png');
  return body;
}
test('image decoder accepts matching raster types but rejects spoofed MIME, SVG, corrupt content and excessive pixels', async () => {
  let accepted = 0;
  const app = express() as Express;
  const upload = multer(imageUploadOptions(multer.memoryStorage()));
  app.post('/', upload.array('images', 5), validateImageUploads, (_req, res) => { accepted++; res.sendStatus(204); });
  app.use((error: { statusCode?: number; code?: string }, _req: Request, res: Response, next: NextFunction) => {
    void next; res.sendStatus(error.code?.startsWith('LIMIT_') ? 413 : error.statusCode ?? 500);
  });
  const png: Buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const oversized: Buffer = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: '#ffffff' } }).png().toBuffer();
  await serve(app, async url => {
    for (const [format, mime] of [['png', 'image/png'], ['jpeg', 'image/jpeg'], ['webp', 'image/webp'], ['gif', 'image/gif'], ['avif', 'image/avif']]) {
      const bytes: Buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).toFormat(format).toBuffer();
      assert.equal((await fetch(url, { method: 'POST', body: form(bytes, mime!) })).status, 204, mime);
    }
    for (const body of [form(png, 'image/jpeg'), form('corrupt', 'image/png'),
      form('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>', 'image/png'), form(oversized, 'image/png'), form('untrusted', 'text/html')]) {
      assert.equal((await fetch(url, { method: 'POST', body })).status, 400);
    }
    assert.equal(accepted, 5);
    assert.equal((await fetch(url, { method: 'POST', body: form(new Uint8Array(5 * 1024 * 1024 + 1), 'image/png') })).status, 413);
    assert.equal((await fetch(url, { method: 'POST', body: form(png, 'image/png', 'images', 6) })).status, 413);
  });
});
test('all real legacy image mutation routes reject forged content before database or provider effects', async () => {
  const app = createLegacyApp({ origins: [origin], development: true,
    auth: { authenticate: async () => ({ id: 'a'.repeat(24), role: 'admin', cities: [] }) } }) as Express;
  await serve(app, async url => {
    for (const [path, field, method] of [['/api/products', 'images', 'POST'], ['/api/products/' + 'b'.repeat(24), 'images', 'PUT'],
      ['/api/category', 'image', 'POST'], ['/api/category/' + 'a'.repeat(24), 'image', 'PUT'],
      ['/api/category/disable/' + 'a'.repeat(24), 'image', 'PUT'],
      ['/api/banners', 'image', 'POST'], ['/api/whatsapp/image', 'image', 'POST']] as const) {
      const result = await fetch(url + path, { method, headers: { origin, 'x-csrf-protection': '1' },
        body: form('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>', 'image/png', field), signal: AbortSignal.timeout(3000) });
      assert.equal(result.status, 400, path);
    }
  });
});
