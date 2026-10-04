import { NextResponse, type NextRequest } from "next/server";
import { getWebEnvironment } from "../../../../lib/server/env";
import {
  accessPolicy,
  project,
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
// Bound even chunked input before parsing/forwarding; upstream upload limits still independently apply.
async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    length += item.value.length;
    if (length > 27 * 1024 * 1024) {
      await reader.cancel();
      throw new AdminError(413);
    }
    chunks.push(item.value);
  }
  return Buffer.concat(chunks);
}
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
    const body = mutation ? await boundedBody(request) : undefined;
    if (
      body?.length &&
      !type.startsWith("application/json") &&
      !type.startsWith("multipart/form-data; boundary=")
    )
      throw new AdminError(415);
    if (type.startsWith("application/json") && body && body.length > (path === "recovery/preview" ? 4 * 1024 * 1024 : 128 * 1024))
      throw new AdminError(413);
    const result = await upstream(path + (query ? `?${query}` : ""), {
      method: request.method,
      ...(body?.length ? { body } : {}),
      headers: type ? { "content-type": type } : {},
    });
    // Legacy WhatsApp text sends a same-origin redirect after provider acceptance. Never follow it.
    const acceptedRedirect = path === "whatsapp/text" && result.status === 302;
    if (!result.ok && !acceptedRedirect)
      throw new AdminError(result.status >= 400 ? result.status : 502);
    if (path === "recovery/template") return new NextResponse(await result.text(), {
      headers: { ...headers, "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="recovery-products.csv"' },
    });
    const response =
      result.status === 204
        ? new NextResponse(null, { status: 204, headers })
        : NextResponse.json(
            acceptedRedirect ? { success: true } : project(await result.json()),
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
    return response;
  } catch (error) {
    const failure = error instanceof AdminError ? error : new AdminError(503);
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
