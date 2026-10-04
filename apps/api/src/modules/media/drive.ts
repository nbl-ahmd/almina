import { Readable } from 'node:stream';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
const id = z.string().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/);
const filename = z.string().max(180).regex(/^[A-Za-z0-9_-]+\.(webp|jpeg)$/);
type ProviderOptions = { timeout: number; retry: false; signal: AbortSignal };
export type DriveClient = { files: {
  create: (input: { requestBody: { name: string; parents: string[] }; media: { mimeType: string; body: Readable }; fields: 'id' }, options: ProviderOptions) => Promise<{ data: unknown }>;
  get: (input: { fileId: string; alt: 'media' }, options: ProviderOptions & { responseType: 'stream' }) => Promise<{ data: Readable }>;
} };
function unavailable(): never { throw new HttpError(503, 'SERVICE_UNAVAILABLE'); }
function rasterType(bytes: Buffer): 'image/webp' | 'image/jpeg' | 'image/png' | undefined {
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  return undefined;
}
// Retained provider compatibility only. No delete API and no automatic retry of uncertain creates.
export function createDriveMedia(client: DriveClient, options: { deadlineMs?: number; maxBytes?: number; maxConcurrent?: number } = {}) {
  const deadlineMs = options.deadlineMs ?? 15000, maxBytes = options.maxBytes ?? 5 * 1024 * 1024, maxConcurrent = options.maxConcurrent ?? 4;
  if (!Number.isInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 30000 || !Number.isInteger(maxBytes) || maxBytes < 12 || maxBytes > 5 * 1024 * 1024
    || !Number.isInteger(maxConcurrent) || maxConcurrent < 1 || maxConcurrent > 4) throw new Error('Invalid Drive bounds');
  let active = 0;
  async function bounded<T>(run: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (active >= maxConcurrent || signal?.aborted) return unavailable();
    active++;
    const controller = new AbortController();
    const abort = () => controller.abort(); signal?.addEventListener('abort', abort, { once: true });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(new Error('Drive operation interrupted')), { once: true });
      timer = setTimeout(abort, deadlineMs);
    });
    // A transport that ignores cancellation retains its slot until it settles.
    // Releasing on caller timeout would permit unbounded orphaned operations.
    const operation = Promise.resolve().then(() => run(controller.signal)).then(
      result => { active--; return result; }, error => { active--; throw error; });
    try { return await Promise.race([operation, deadline]); }
    catch { return unavailable(); }
    finally { if (timer) clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort(); }
  }
  return {
    async upload(bytes: Buffer, name: string, folder: string, signal?: AbortSignal) {
      if (!Buffer.isBuffer(bytes) || bytes.length > maxBytes || !filename.safeParse(name).success || !id.safeParse(folder).success
        || rasterType(bytes) !== (name.endsWith('.webp') ? 'image/webp' : 'image/jpeg')) throw new HttpError(400, 'INVALID_REQUEST');
      return bounded(async cancellation => {
        const body = Readable.from([bytes]);
        const stop = () => body.destroy(); cancellation.addEventListener('abort', stop, { once: true });
        try {
          if (cancellation.aborted) return unavailable();
          const response = await client.files.create({ requestBody: { name, parents: [folder] },
            media: { mimeType: rasterType(bytes)!, body }, fields: 'id' }, { timeout: deadlineMs, retry: false, signal: cancellation });
          if (cancellation.aborted) return unavailable();
          const parsed = z.object({ id }).passthrough().safeParse(response.data);
          if (!parsed.success) return unavailable();
          return { filename: name, fileId: parsed.data.id };
        } finally { cancellation.removeEventListener('abort', stop); body.destroy(); }
      }, signal);
    },
    async read(fileId: string, signal?: AbortSignal) {
      if (!id.safeParse(fileId).success) throw new HttpError(400, 'INVALID_REQUEST');
      return bounded(async cancellation => {
        const response = await client.files.get({ fileId, alt: 'media' }, { responseType: 'stream', timeout: deadlineMs, retry: false, signal: cancellation });
        if (!(response.data instanceof Readable)) return unavailable();
        const stream = response.data;
        if (cancellation.aborted) { stream.destroy(); return unavailable(); }
        const stop = () => stream.destroy(new Error('Drive operation interrupted'));
        cancellation.addEventListener('abort', stop, { once: true });
        const chunks: Buffer[] = []; let length = 0;
        try {
          for await (const raw of stream) {
            if (!Buffer.isBuffer(raw) && !(raw instanceof Uint8Array)) return unavailable();
            const chunk = Buffer.from(raw); length += chunk.length;
            if (length > maxBytes || cancellation.aborted) return unavailable();
            chunks.push(chunk);
          }
          const bytes = Buffer.concat(chunks); const contentType = rasterType(bytes);
          if (!contentType || cancellation.aborted) return unavailable();
          return { bytes, contentType };
        } finally { cancellation.removeEventListener('abort', stop); stream.destroy(); }
      }, signal);
    },
  };
}
