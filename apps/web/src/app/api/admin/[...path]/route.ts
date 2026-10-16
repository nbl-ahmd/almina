import { NextResponse, type NextRequest } from "next/server";
import { revalidateTag } from 'next/cache';
import { catalogMutationTags, isProductFamilyConflict, readAdminBody, GatewayBodyTooLarge } from '../../../../lib/admin/gateway-policy';
export const runtime = 'nodejs';
export const maxDuration = 30;
import { getWebEnvironment } from "../../../../lib/server/env";
import {
  accessPolicy,
  projectAdminResponse,
  upstreamQuery,
} from "../../../../lib/admin/policy";
import {
  AdminError,
  currentIdentity,
  sessionName,
  upstream,
} from "../../../../lib/server/admin/gateway";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await context.params).path.join("/");
    const policy = accessPolicy(request.method, path);
    if (!policy) throw new AdminError(404);
    const mutation = request.method !== "GET";
    if (
      mutation &&
      (request.headers.get("origin") !== getWebEnvironment().WEB_ORIGIN ||
        request.headers.get("x-csrf-protection") !== "1" ||
        request.headers.get("sec-fetch-site") === "cross-site")
    )
      throw new AdminError(403);
    if (policy !== "login") {
      const user = await currentIdentity();
      if (!user) throw new AdminError(401);
      if (policy === "admin" && user.role !== "admin")
        throw new AdminError(403);
    }
    let query: string;
    try {
      query = upstreamQuery(path, request.nextUrl.searchParams);
    } catch {
      throw new AdminError(400);
    }
    const type = request.headers.get("content-type") ?? "";
    const retryKey = request.headers.get('idempotency-key');
    if (retryKey !== null && (!['whatsapp/s', 'whatsapp/text'].includes(path) || !/^[A-Za-z0-9_-]{16,128}$/.test(retryKey))) throw new AdminError(400);
    const body = mutation ? await readAdminBody(request) : undefined;
    if (
      body?.length &&
      !type.startsWith("application/json") &&
      !type.startsWith("multipart/form-data; boundary=")
    )
      throw new AdminError(415);
    if (type.startsWith("application/json") && body && body.length > (["recovery/preview","catalog-import/preview"].includes(path) ? 4 * 1024 * 1024 : 128 * 1024))
      throw new AdminError(413);
    const result = await upstream(path + (query ? `?${query}` : ""), {
      method: request.method,
      ...(body?.length ? { body } : {}),
      headers: { ...(type ? { "content-type": type } : {}), ...(retryKey ? { 'idempotency-key': retryKey } : {}) },
    });
    // Legacy WhatsApp text sends a same-origin redirect after provider acceptance. Never follow it.
    const acceptedRedirect = path === "whatsapp/text" && result.status === 302;
    if (!result.ok && !acceptedRedirect) {
      const failure: unknown = result.status === 409 ? await result.json().catch(() => null) : null;
      if (result.status === 409 && failure && typeof failure === 'object' && 'code' in failure && failure.code === 'CATALOG_REVIEW_REQUIRED' && /^products(?:\/(?:publish\/)?[a-f0-9]{24})?$/i.test(path)) return NextResponse.json({error:'CATALOG_REVIEW_REQUIRED'},{status:409,headers});
      if (result.status === 409 && isProductFamilyConflict(path, request.method, result.status, failure)) {
        return NextResponse.json({ error: 'PRODUCT_FAMILY_CONFLICT' }, { status: 409, headers });
      }
      throw new AdminError(result.status >= 400 ? result.status : 502);
    }
    if (["recovery/template","catalog-import/template"].includes(path)) return new NextResponse(await result.text(), {
      headers: { ...headers, "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="recovery-products.csv"' },
    });
    const response =
      result.status === 204
        ? new NextResponse(null, { status: 204, headers })
        : NextResponse.json(
            acceptedRedirect ? { success: true } : projectAdminResponse(path, await result.json()),
            { status: result.status === 302 ? 200 : result.status, headers },
          );
    // Only the expected session cookie, with locally controlled attributes, can be issued to this host.
    if (["auth/login", "auth/logout", "auth/logout-all"].includes(path)) {
      const cookie = result.headers
        .getSetCookie()
        .find((value) => value.startsWith(sessionName() + "="));
      const token = cookie?.split(";")[0]?.slice(sessionName().length + 1);
      if (
        path === "auth/login" &&
        (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      )
        throw new AdminError(502);
      response.cookies.set(sessionName(), token ?? "", {
        httpOnly: true,
        secure: getWebEnvironment().APP_ENV !== "development",
        sameSite: "lax",
        path: "/",
        maxAge: path === "auth/login" ? 8 * 3600 : 0,
      });
    }
    // Only invalidate after an authorized upstream mutation has succeeded.
    // A cache failure must never turn a committed write into a retryable failure.
    for (const tag of catalogMutationTags(request.method, path)) {
      try { revalidateTag(tag, { expire: 0 }); }
      catch { console.error('Catalog cache refresh failed'); response.headers.set('X-Catalog-Refresh', 'pending'); }
    }
    return response;
  } catch (error) {
    const failure = error instanceof GatewayBodyTooLarge ? new AdminError(413) : error instanceof AdminError ? error : new AdminError(503);
    return NextResponse.json(
      { error: failure.message },
      { status: failure.status, headers },
    );
  }
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
