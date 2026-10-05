import type { Request } from 'express';
import type { ErrorCode } from '@almina/contracts';
import { HttpError } from '../../errors.js';
export const sessionLifetimeMs = 8 * 60 * 60 * 1000;
export function cookieOptions(development = false) {
  return { httpOnly: true as const, secure: !development, sameSite: 'lax' as const, path: '/', maxAge: sessionLifetimeMs };
}
export function cookieName(development = false) { return development ? 'almina_session' : '__Host-almina_session'; }
export function readSessionCookie(headers: { cookie?: string | undefined }, development = false): string | undefined {
  const name = cookieName(development);
  const cookies = String(headers.cookie ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (cookies.length !== 1) return undefined;
  const token = cookies[0]!.slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
export function verifyBrowserMutation(req: Pick<Request, 'headers'>, origins: readonly string[],
  error: (status: number, code: ErrorCode) => Error = (status, code) => new HttpError(status, code)) {
  if (typeof req.headers.origin !== 'string' || !origins.includes(req.headers.origin) || req.headers['x-csrf-protection'] !== '1'
    || req.headers['sec-fetch-site'] === 'cross-site') throw error(403, 'FORBIDDEN');
}
