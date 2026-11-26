import { staffDtoSchema, successSchema } from '@almina/contracts';
import { z } from 'zod';
import { catalogContentTags } from './cache-policy';

const inputSchema = z.object({ kind: z.enum(['categories', 'banners', 'products', 'growth']) }).strict();
export class RevalidationRejected extends Error {
  constructor(readonly status: number) { super('Catalog revalidation rejected'); }
}
export async function authorizeCatalogRevalidation(request: Request, environment: { WEB_ORIGIN: string; API_ORIGIN: string }, fetcher: typeof fetch = fetch) {
  if (request.headers.get('origin') !== environment.WEB_ORIGIN || request.headers.get('x-csrf-protection') !== '1') throw new RevalidationRejected(403);
  const cookie = request.headers.get('cookie');
  if (!cookie) throw new RevalidationRejected(401);
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new RevalidationRejected(415);
  // Stream-limit even chunked requests; a declared length is insufficient.
  const reader = request.body?.getReader();
  if (!reader) throw new RevalidationRejected(400);
  const parts: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 1024) { await reader.cancel(); throw new RevalidationRejected(413); }
    parts.push(value);
  }
  let input: z.infer<typeof inputSchema>;
  try { input = inputSchema.parse(JSON.parse(Buffer.concat(parts).toString('utf8'))); }
  catch { throw new RevalidationRejected(400); }
  let response: Response;
  try {
    response = await fetcher(new URL('/api/v1/auth/me', environment.API_ORIGIN), {
      headers: { Cookie: cookie, Accept: 'application/json' }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    });
  } catch { throw new RevalidationRejected(503); }
  if (!response.ok) throw new RevalidationRejected(response.status === 401 ? 401 : 503);
  try {
    const identity = successSchema(staffDtoSchema).parse(await response.json());
    if (identity.data.role !== 'admin') throw new RevalidationRejected(403);
  } catch (error) {
    if (error instanceof RevalidationRejected) throw error;
    throw new RevalidationRejected(503);
  }
  return catalogContentTags[input.kind];
}
