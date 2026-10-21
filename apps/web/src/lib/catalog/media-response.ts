import { mediaRequestHeaders, mediaTarget } from './image-delivery';

const maxBytes = 5 * 1024 * 1024;
const fail = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

/** Runs on a cache miss only. Cloudinary transforms; the Vercel CDN caches validated public bytes. */
export async function mediaResponse(request: Request, cloudName: string | undefined, transport: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  const target = mediaTarget(url.pathname, cloudName);
  if (!target || url.search) return fail(404);
  if (!['GET', 'HEAD'].includes(request.method)) return fail(405);
  try {
    const upstream = await transport(target, {
      method: request.method, headers: mediaRequestHeaders(), redirect: 'error', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    const length = Number(upstream.headers.get('content-length') ?? 0);
    if (upstream.status !== 200 || upstream.headers.get('content-type')?.split(';')[0]?.trim() !== 'image/webp'
      || !Number.isFinite(length) || length < 0 || length > maxBytes) {
      await upstream.body?.cancel(); return fail(upstream.status === 404 ? 404 : 502);
    }
    const headers = new Headers({
      'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'index, follow',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'public, s-maxage=31536000',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=31536000',
    });
    if (request.method === 'HEAD') { await upstream.body?.cancel(); return new Response(null, { headers }); }
    if (!upstream.body) return fail(502);
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return fail(502); }
      chunks.push(value);
    }
    if (!size) return fail(502);
    const body = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    headers.set('Content-Length', String(size));
    return new Response(body, { headers });
  } catch { return fail(502); }
}
