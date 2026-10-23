import { readWebEnvironment } from '@almina/config/env';
import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { legacyAdminDestination } from './lib/admin/redirects';
import { hasDuplicateQuery, indexingQuery, isPublicPath } from './lib/seo';
import { stylesheetPolicy } from './lib/security/stylesheet-policy';
import { legacyMediaTarget } from './lib/catalog/legacy-media';
import { mediaOrigin, mediaTarget } from './lib/catalog/image-delivery';
export function proxy(request: NextRequest) {
  const isMediaHost = request.nextUrl.hostname === new URL(mediaOrigin).hostname;
  if (request.nextUrl.pathname.startsWith('/media/') || isMediaHost) {
    const reject = (status: number) => new NextResponse(null, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    if (!['GET', 'HEAD'].includes(request.method)) return reject(405);
    if (isMediaHost && request.nextUrl.pathname === '/robots.txt') {
      return new NextResponse('User-agent: *\nAllow: /media/\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=3600' } });
    }
    if (legacyMediaTarget(request.nextUrl.pathname)) return NextResponse.next();
    if (request.nextUrl.search) return reject(404);
    const target = mediaTarget(request.nextUrl.pathname, readWebEnvironment(process.env).CLOUDINARY_CLOUD_NAME);
    if (!target) return reject(404);
    // The raster handler sets cache headers only after validating a successful response.
    return NextResponse.next();
  }
  if (legacyMediaTarget(request.nextUrl.pathname)) return NextResponse.next();
  const destination = legacyAdminDestination(request.nextUrl.pathname);
  if (destination) {
    const target = new URL(destination, request.url);
    for (const [key, value] of request.nextUrl.searchParams) if (!target.searchParams.has(key)) target.searchParams.set(key, value);
    const response = NextResponse.redirect(target, 307);
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  const environment = readWebEnvironment(process.env);
  const apiMediaOrigin = new URL(environment.LEGACY_API_ORIGIN).origin;
  const nonce = randomBytes(16).toString('base64');
  const development = process.env.NODE_ENV === 'development';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    stylesheetPolicy(nonce, environment.APP_ENV, process.env.NODE_ENV, request.nextUrl.pathname === '/admin/marketing')+(['/account','/wholesale'].includes(request.nextUrl.pathname)?' https://accounts.google.com/gsi/style':''),
    "style-src-attr 'unsafe-inline'", // next/image uses generated style attributes; scripts retain strict nonces.
    `img-src 'self' data: blob: https://cdn.alminapharmacy.com ${apiMediaOrigin}${environment.CLOUDINARY_CLOUD_NAME ? ` https://res.cloudinary.com/${environment.CLOUDINARY_CLOUD_NAME}/image/upload/` : ''}`,
    "font-src 'self'", ...(request.nextUrl.pathname.startsWith("/admin") ? ["worker-src 'self'"] : []), ...(['/account','/wholesale'].includes(request.nextUrl.pathname) ? ["frame-src https://accounts.google.com"] : []), `connect-src 'self'${['/account','/wholesale'].includes(request.nextUrl.pathname)?' https://accounts.google.com':''}${development ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
    "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    ...(process.env.APP_ENV === 'production' || process.env.APP_ENV === 'staging' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const headers = new Headers(request.headers);
  // Always overwrite untrusted incoming nonce/CSP headers.
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  if(['/account','/wholesale'].includes(request.nextUrl.pathname))response.headers.set('Cross-Origin-Opener-Policy','same-origin-allow-popups');
  response.headers.set('Cache-Control', 'private, no-store');
  const indexable = environment.APP_ENV === 'production' && isPublicPath(request.nextUrl.pathname)
    && !hasDuplicateQuery(indexingQuery(request.nextUrl.pathname,Object.fromEntries(request.nextUrl.searchParams)));
  if (!indexable) response.headers.set('X-Robots-Tag', environment.APP_ENV === 'production' && !request.nextUrl.pathname.startsWith('/admin') ? 'noindex, follow' : 'noindex, nofollow');
  if(request.nextUrl.pathname.startsWith('/wholesale'))response.headers.set('X-Robots-Tag','noindex, nofollow');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
