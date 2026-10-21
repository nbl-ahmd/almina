// Temporary compatibility origin; retire only after verified asset migration.
const origin = 'https://cloudinary-proxy.nabeelkerala2000.workers.dev';
const maxBytes = 5 * 1024 * 1024;
const imageTypes = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/gif', 'image/avif']);

export function legacyMediaTarget(pathname: string): URL | null {
  if (!/^\/cdn\/(products|categories|banners)\/[A-Za-z0-9][A-Za-z0-9_-]{0,179}\.(webp|png|jpe?g|gif|avif)$/i.test(pathname)) return null;
  return new URL(pathname, origin);
}

export async function legacyMediaResponse(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  const url = new URL(request.url);
  const target = legacyMediaTarget(url.pathname);
  const error = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!target || url.search) return error(404);
  if (!['GET', 'HEAD'].includes(request.method)) return error(405);
  try {
    // Forward no caller headers, credentials, query strings or redirect targets.
    const upstream = await fetcher(target, {
      method: request.method, redirect: 'error', credentials: 'omit', cache: 'no-store',
      signal: AbortSignal.timeout(8000), headers: { Accept: 'image/*' },
    });
    const mime = upstream.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (!upstream.ok || !mime || !imageTypes.has(mime)) {
      await upstream.body?.cancel();
      return error(upstream.status === 404 ? 404 : 502);
    }
    const length = Number(upstream.headers.get('content-length') ?? 0);
    if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
      await upstream.body?.cancel(); return error(502);
    }
    const headers = {
      'Content-Type': mime, 'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      // Raster images are public, independently crawlable assets.
      'X-Robots-Tag': 'index, follow',
    };
    if (request.method === 'HEAD') { await upstream.body?.cancel(); return new Response(null, { headers }); }
    if (!upstream.body) return error(502);
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return error(502); }
      chunks.push(value);
    }
    if (!size) return error(502);
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    return new Response(body, { headers });
  } catch { return error(502); }
}
