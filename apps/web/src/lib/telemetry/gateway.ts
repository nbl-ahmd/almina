import { commerceEventSchema } from '@almina/contracts';
const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const failure = (status: number) => new Response(null, { status, headers });
export async function commerceEventRequest(request: Request, options: {
  enabled: boolean; webOrigin: string; apiOrigin: string; fetch?: typeof fetch; deadlineMs?: number;
}) {
  if (!options.enabled) return failure(404);
  if (request.headers.get('origin') !== options.webOrigin || request.headers.get('x-csrf-protection') !== '1'
    || request.headers.get('sec-fetch-site') === 'cross-site' || request.headers.get('sec-gpc') === '1' || request.headers.get('dnt') === '1') return failure(403);
  if (new URL(request.url).search || request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
    || request.headers.get('content-encoding')) return failure(400);
  const reader = request.body?.getReader(); if (!reader) return failure(400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => { void reader.cancel().catch(() => undefined); reject(new Error('Bounded telemetry deadline')); }, options.deadlineMs ?? 2000); });
  try {
    const input = (async () => {
      const chunks: Uint8Array[] = []; let bytes = 0;
      while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.length;
        if (bytes > 192) { await reader.cancel(); return undefined; } chunks.push(part.value); }
      try { return commerceEventSchema.safeParse(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); }
      catch { return undefined; }
    })();
    const value = await Promise.race([input, timeout]);
    if (!value?.success) return failure(400);
    if (timer) clearTimeout(timer);
    const response = await (options.fetch ?? fetch)(new URL('/api/v1/commerce-events', options.apiOrigin), {
      method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', Origin: options.webOrigin },
      body: JSON.stringify(value.data), signal: AbortSignal.timeout(2000),
    });
    void response.body?.cancel().catch(() => undefined);
    return failure(response.status === 204 ? 204 : 503);
  } catch { return failure(503); }
  finally { if (timer) clearTimeout(timer); }
}
