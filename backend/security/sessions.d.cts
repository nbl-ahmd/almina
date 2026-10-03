import type { GetDb } from '../../apps/api/src/database';
import type { Staff } from '@almina/contracts';
import type { Request } from 'express';
export function createSessionService(getDb: GetDb, error?: (status: number, code: string) => Error): {
  login(input: { username: string; password: string }): Promise<{ token: string; expiresAt: string; user: Staff }>;
  authenticate(token: string | undefined): Promise<Staff>;
  logout(token: string | undefined): Promise<void>;
  revokeUser(userId: { toHexString(): string }): Promise<void>;
  limitLogin(username: unknown, ip: string | undefined): Promise<void>;
};
export function cookieOptions(development?: boolean): { httpOnly: true; secure: boolean; sameSite: 'lax'; path: string; maxAge: number };
export function cookieName(development?: boolean): string;
export function readSessionCookie(headers: { cookie?: string | undefined }, development?: boolean): string | undefined;
export function verifyBrowserMutation(req: Request, origins: string[], error?: (status: number, code: string) => Error): void;
