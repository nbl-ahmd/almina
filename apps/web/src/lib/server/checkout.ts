import { cookies } from 'next/headers';
import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { checkoutInputSchema, quoteInputSchema, quoteDtoSchema, checkoutDtoSchema, apiErrorSchema } from '@almina/contracts';
import { reverseLocationInputSchema, reverseLocationDtoSchema } from '@almina/contracts';
import { getWebEnvironment } from './env';

const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' };
const checkout = checkoutInputSchema.extend({ acceptedQuoteHash: z.string().regex(/^[a-f0-9]{64}$/) });
function failure(status: number, code: string) { return Response.json({ error: { code } }, { status, headers }); }
export async function checkoutRequest(request: Request, quoteOnly: boolean | 'location' = false) {
  const locationOnly = quoteOnly === 'location';
  const env = getWebEnvironment();
  if (!env.CHECKOUT_ENABLED) return failure(503, 'COMMERCE_UNAVAILABLE');
  if (request.headers.get('origin') !== env.WEB_ORIGIN || request.headers.get('x-csrf-protection') !== '1'
    || request.headers.get('sec-fetch-site') === 'cross-site') return failure(403, 'FORBIDDEN');
  if (new URL(request.url).search || !request.headers.get('content-type')?.startsWith('application/json')
    || request.headers.get('content-encoding')) return failure(400, 'INVALID_REQUEST');
  try {
    const reader = request.body?.getReader();
    if (!reader) return failure(400, 'INVALID_REQUEST');
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.length;
      if (length > 16384) { await reader.cancel(); return failure(413, 'PAYLOAD_TOO_LARGE'); }
      chunks.push(part.value);
    }
    let raw: unknown;
    try { raw = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return failure(400, 'INVALID_REQUEST'); }
    const parsed = (locationOnly ? reverseLocationInputSchema : quoteOnly ? quoteInputSchema : checkout).safeParse(raw);
    if (!parsed.success) return failure(400, 'INVALID_REQUEST');
    if(!quoteOnly&&'searchAttribution' in parsed.data&&(request.headers.get('x-search-consent')!=='1'||request.headers.get('sec-gpc')==='1'||request.headers.get('dnt')==='1'))delete parsed.data.searchAttribution;
    const customerName=env.APP_ENV==='development'?'almina_customer':'__Host-almina_customer';
    const customerCookies=(await cookies()).getAll(customerName);
    const customerToken=customerCookies.length===1&&/^[A-Za-z0-9_-]{43}$/.test(customerCookies[0]!.value)?customerCookies[0]!.value:null;
    const result = await fetch(new URL(locationOnly ? '/api/v1/checkout/location' : quoteOnly ? '/api/v1/checkout/quote' : '/api/v1/checkout', env.API_ORIGIN), {
      method: 'POST', cache: 'no-store', redirect: 'error', credentials: 'omit',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Origin: env.WEB_ORIGIN, 'X-CSRF-Protection': '1', ...(customerToken?{Cookie:customerName+'='+customerToken}:{}) },
      body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(15000),
    });
    const body: unknown = await result.json();
    if (!result.ok) {
      const error = apiErrorSchema.safeParse(body);
      return failure(result.status, error.success ? error.data.error.code : 'SERVICE_UNAVAILABLE');
    }
    const envelope = z.object({ data: locationOnly ? reverseLocationDtoSchema : quoteOnly ? quoteDtoSchema : checkoutDtoSchema, requestId: z.uuid() }).strict().safeParse(body);
    if (!envelope.success) return failure(502, 'SERVICE_UNAVAILABLE');
    const data = envelope.data.data;
    return Response.json(!locationOnly && quoteOnly ? { quote: data, quoteHash: createHash('sha256').update(JSON.stringify(data)).digest('hex') } : data,
      { status: result.status, headers });
  } catch { return failure(502, 'SERVICE_UNAVAILABLE'); }
}
