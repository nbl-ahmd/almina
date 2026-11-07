import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { cache } from "react";
import { getWebEnvironment } from "../env";
import {
  canAccessAdminRoute,
  identitySchema,
  accessPolicy,
  projectAdminResponse,
  upstreamQuery,
  type Identity,
} from "../../admin/policy";
export class AdminError extends Error {
  constructor(readonly status: number) {
    super(
      status === 401
        ? "Please sign in again."
        : status === 403
          ? "You do not have permission."
          : status === 429
            ? "Too many requests. Please wait before trying again."
            : "The request failed. Please retry.",
    );
  }
}
export function sessionName() {
  return getWebEnvironment().APP_ENV === "development"
    ? "almina_session"
    : "__Host-almina_session";
}
export async function sessionHeader() {
  const values = (await cookies()).getAll(sessionName());
  return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0]!.value)
    ? `${sessionName()}=${values[0]!.value}`
    : "";
}
export async function upstream(path: string, init: RequestInit = {}) {
  const env = getWebEnvironment();
  try {
    return await fetch(path==='search'||path.startsWith('search/')?`${env.API_ORIGIN}/api/v1/admin/${path}`:`${env.LEGACY_API_ORIGIN}/api/${path}`, {
      ...init,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      headers: {
        cookie: await sessionHeader(),
        origin: env.WEB_ORIGIN,
        "x-csrf-protection": "1",
        ...init.headers,
      },
    });
  } catch {
    throw new AdminError(503);
  }
}
export const currentIdentity = cache(async (): Promise<Identity | null> => {
  if (!(await sessionHeader())) return null;
  const response = await upstream("auth/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new AdminError(response.status);
  const parsed = identitySchema.safeParse(await response.json());
  if (!parsed.success) throw new AdminError(503);
  return parsed.data;
});
export async function requireIdentity(admin = false) {
  const user = await currentIdentity();
  if (!user) redirect("/admin/login");
  if (admin && user.role !== "admin") throw new AdminError(403);
  return user;
}
export async function adminRead(path: string, query = new URLSearchParams()) {
  const policy = accessPolicy("GET", path);
  if (!policy) throw new AdminError(404);
  const user = await requireIdentity(policy === "admin");
  if (!canAccessAdminRoute(user, "GET", path)) throw new AdminError(403);
  const qs = upstreamQuery(path, query);
  const result = await upstream(path + (qs ? `?${qs}` : ""));
  if (result.status === 404) notFound();
  if (!result.ok) throw new AdminError(result.status);
  try { return projectAdminResponse(path, await result.json()); }
  catch { throw new AdminError(503); }
}

export function adminPushPublicKey() {
  const key = process.env.ADMIN_PUSH_PUBLIC_KEY;
  return key && /^[A-Za-z0-9_-]{87}$/.test(key) ? key : undefined;
}
