import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { createDriveMedia, type DriveClient } from '../apps/api/src/modules/media/drive';
// Import before opening any listener: this suite runs only in the backend-installed API job.
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { google } = require('googleapis');
const bytes = Buffer.from('RIFF0000WEBPsynthetic-raster');
test('real Google client sends bounded compatible multipart metadata and cancels stalled media sockets without retry', async () => {
  let mode: 'normal' | 'stalled' = 'normal', reads = 0, uploads = 0, stalledClosed = false;
  const server = createServer((req, res) => {
    assert.equal(req.headers.authorization, 'Bearer synthetic-access-token');
    if (req.method === 'POST') {
      uploads++; let body = ''; req.setEncoding('utf8'); req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        assert.ok(body.includes('synthetic.webp') && body.includes('synthetic-folder') && body.includes('image/webp'));
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ id: 'synthetic-file' }));
      }); return;
    }
    reads++; res.setHeader('Content-Type', 'image/webp');
    if (mode === 'stalled') { res.on('close', () => { stalledClosed = true; }); res.write(bytes); }
    else res.end(bytes);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const rootUrl = `http://127.0.0.1:${address.port}/`;
  const auth = new google.auth.OAuth2(); auth.setCredentials({ access_token: 'synthetic-access-token', expiry_date: Date.now() + 3600000 });
  const api = google.drive({ version: 'v3', auth });
  // Fixed loopback root per call, including upload media URL construction. No credential discovery.
  const client: DriveClient = { files: {
    create: (input, options) => api.files.create(input, { ...options, rootUrl }),
    get: (input, options) => api.files.get(input, { ...options, rootUrl }),
  } };
  try {
    const media = createDriveMedia(client, { deadlineMs: 5000 });
    assert.deepEqual(await media.upload(bytes, 'synthetic.webp', 'synthetic-folder'), { filename: 'synthetic.webp', fileId: 'synthetic-file' });
    assert.deepEqual(await media.read('synthetic-file'), { bytes, contentType: 'image/webp' });
    mode = 'stalled'; const bounded = createDriveMedia(client, { deadlineMs: 100 });
    await assert.rejects(bounded.read('synthetic-file'), { status: 503, message: 'SERVICE_UNAVAILABLE' });
    for (let attempt = 0; attempt < 50 && !stalledClosed; attempt++) await delay(10);
    assert.equal(stalledClosed, true); assert.equal(reads, 2); assert.equal(uploads, 1);
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
