import { NextResponse, type NextRequest } from "next/server";
import { boundedBody } from "../../../../lib/server/bounded-body";
import {
  currentIdentity,
  sessionHeader,
} from "../../../../lib/server/admin/gateway";
import { getWebEnvironment } from "../../../../lib/server/env";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  const { path } = await params;
  if (
    ![
      "products",
      "status",
      "templates",
      "template",
      "contacts",
      "campaigns",
      "test",
    ].includes(path) ||
    (!["products", "template"].includes(path) && request.nextUrl.search) ||
    (path === "template" &&
      (request.method !== "GET" ||
        !/^\?id=[a-f0-9-]{36}$/i.test(request.nextUrl.search)))
  )
    return NextResponse.json({ error: "Not found" }, { status: 404, headers });
  try {
    const user = await currentIdentity();
    if (!user)
      return NextResponse.json(
        { error: "Sign in required" },
        { status: 401, headers },
      );
    if (
      (path === "contacts" ||
        (path === "campaigns" && request.method === "POST")) &&
      user.role !== "admin"
    )
      return NextResponse.json(
        { error: "Administrator approval required" },
        { status: 403, headers },
      );
    const env = getWebEnvironment();
    if (
      request.method === "POST" &&
      (request.headers.get("origin") !== env.WEB_ORIGIN ||
        request.headers.get("x-csrf-protection") !== "1" ||
        request.headers.get("sec-fetch-site") === "cross-site" ||
        request.headers.get("content-type")?.split(";")[0] !==
          "application/json")
    )
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403, headers },
      );
    const body =
      request.method === "POST"
        ? await boundedBody(request, 500000)
        : undefined;
    const response = await fetch(
      new URL(
        "/api/v1/admin/marketing/" + path + request.nextUrl.search,
        env.API_ORIGIN,
      ),
      {
        method: request.method,
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
        headers: {
          cookie: await sessionHeader(),
          origin: env.WEB_ORIGIN,
          "X-CSRF-Protection": "1",
          "Content-Type": "application/json",
        },
        ...(body ? { body } : {}),
      },
    );
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Email service unavailable" },
      { status: 503, headers },
    );
  }
}
export const GET = handle;
export const POST = handle;
