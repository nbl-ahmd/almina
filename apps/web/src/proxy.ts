import { readWebEnvironment } from '@almina/config/env';
import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { hasDuplicateQuery, isPublicPath } from './lib/seo';
export function proxy(request: NextRequest) {
  const environment = readWebEnvironment(process.env);
  const mediaOrigin = new URL(environment.LEGACY_API_ORIGIN).origin;
  const nonce = randomBytes(16).toString('base64');
  const development = process.env.NODE_ENV === 'development';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'", // next/image uses generated style attributes; scripts retain strict nonces.
    `img-src 'self' data: blob: https://cdn.alminapharmacy.com ${mediaOrigin}`,
    "font-src 'self'", `connect-src 'self'${development ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ...(process.env.APP_ENV === 'production' || process.env.APP_ENV === 'staging' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const headers = new Headers(request.headers);
  // Always overwrite untrusted incoming nonce/CSP headers.
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  response.headers.set('Cache-Control', 'private, no-store');
  const indexable = environment.APP_ENV === 'production' && isPublicPath(request.nextUrl.pathname)
    && !hasDuplicateQuery(Object.fromEntries(request.nextUrl.searchParams));
  if (!indexable) response.headers.set('X-Robots-Tag', environment.APP_ENV === 'production' ? 'noindex, follow' : 'noindex, nofollow');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
