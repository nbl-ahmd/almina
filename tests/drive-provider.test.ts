import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Readable } from 'node:stream';
import { createDriveMedia, type DriveClient } from '../apps/api/src/modules/media/drive';
const bytes = Buffer.from('RIFF0000WEBPsynthetic-raster');
function client(overrides: Partial<DriveClient['files']> = {}): DriveClient {
  return { files: { create: async () => ({ data: { id: 'synthetic-file' } }), get: async () => ({ data: Readable.from([bytes]) }), ...overrides } };
}
test('retained Drive uploads bind folder/name/type/bytes and never automatically retry uncertain creation', async () => {
  let calls = 0;
  const media = createDriveMedia(client({ create: async (input, options) => {
    calls++; assert.deepEqual(input.requestBody, { name: 'synthetic.webp', parents: ['synthetic-folder'] });
    assert.equal(input.media.mimeType, 'image/webp'); assert.equal(input.fields, 'id'); assert.equal(options.retry, false);
    const chunks: Buffer[] = []; for await (const chunk of input.media.body) chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks), bytes); return { data: { id: 'synthetic-file' } };
  } }));
  assert.deepEqual(await media.upload(bytes, 'synthetic.webp', 'synthetic-folder'), { filename: 'synthetic.webp', fileId: 'synthetic-file' });
  assert.equal(calls, 1);
  for (const [name, folder] of [['../bad.webp', 'folder'], ['synthetic.webp', 'https://outside.invalid'], ['synthetic.jpeg', 'folder']]) {
    await assert.rejects(media.upload(bytes, name!, folder!), { code: 'INVALID_REQUEST' });
  }
  assert.equal(calls, 1);
  let failures = 0;
  const failing = createDriveMedia(client({ create: async () => { failures++; throw new Error('synthetic-sensitive-provider'); } }));
  await assert.rejects(failing.upload(bytes, 'synthetic.webp', 'synthetic-folder'), { status: 503, message: 'SERVICE_UNAVAILABLE' });
  assert.equal(failures, 1);
  await assert.rejects(createDriveMedia(client({ create: async () => ({ data: { id: '../unsafe' } }) })).upload(bytes, 'synthetic.webp', 'folder'), { status: 503 });
});
test('Drive reads bound complete bytes and reject invalid IDs, malformed content, excess size and stream errors', async () => {
  let calls = 0;
  const media = createDriveMedia(client({ get: async (_input, options) => { calls++; assert.equal(options.retry, false); return { data: Readable.from([bytes]) }; } }));
  assert.deepEqual(await media.read('synthetic-file'), { bytes, contentType: 'image/webp' });
  for (const value of ['../file', 'https://outside.invalid', 'file name', '$where']) await assert.rejects(media.read(value), { status: 400 });
  assert.equal(calls, 1);
  for (const stream of [Readable.from([Buffer.from('<svg>unsafe</svg>')]), Readable.from([bytes, bytes]), new Readable({ read() { this.destroy(new Error('synthetic-private-provider')); } })]) {
    await assert.rejects(createDriveMedia(client({ get: async () => ({ data: stream }) }), { maxBytes: bytes.length }).read('synthetic-file'), { status: 503, message: 'SERVICE_UNAVAILABLE' });
    assert.equal(stream.destroyed, true);
  }
});
test('Drive stream deadlines destroy owned streams and pre-aborted operations perform no provider work', async () => {
  const stalled = new Readable({ read() {} }); let calls = 0;
  const media = createDriveMedia(client({ get: async () => { calls++; return { data: stalled }; } }), { deadlineMs: 20 });
  await assert.rejects(media.read('synthetic-file', AbortSignal.abort()), { status: 503 }); assert.equal(calls, 0);
  await assert.rejects(media.read('synthetic-file'), { status: 503 }); assert.equal(stalled.destroyed, true); assert.equal(calls, 1);
});
test('Drive concurrency remains bounded even when a transport ignores cancellation, and late streams are destroyed', async () => {
  let resolveRead: ((value: { data: Readable }) => void) | undefined; let calls = 0;
  const media = createDriveMedia(client({ get: async () => { calls++; return new Promise(resolve => { resolveRead = resolve; }); } }), { deadlineMs: 10, maxConcurrent: 1 });
  await assert.rejects(media.read('synthetic-file'), { status: 503 });
  await assert.rejects(media.read('another-file'), { status: 503 }); assert.equal(calls, 1);
  const late = Readable.from([bytes]); resolveRead!({ data: late }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(late.destroyed, true);
});
