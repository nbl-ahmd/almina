import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { currentIdentity, upstream } from "../../../../../lib/server/admin/gateway";
import { getWebEnvironment } from "../../../../../lib/server/env";

export const runtime = "nodejs";
export const maxDuration = 10;
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const ticketSchema = z.object({ ticket: z.string().regex(/^[A-Za-z0-9_-]{43}$/), expiresInSeconds: z.number().int().min(1).max(120) });

/** Hands a signed-in staff browser a one-time ticket for the live order stream on the persistent API.
 *  The session cookie never leaves this origin; the ticket is random, expires in seconds and works once. */
export async function POST(request: NextRequest) {
  const env = getWebEnvironment();
  if (request.headers.get("origin") !== env.WEB_ORIGIN) return NextResponse.json({ error: "Invalid request" }, { status: 403, headers });
  try {
    if (!(await currentIdentity())) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers });
    const response = await upstream("orders/events/ticket", { method: "POST" });
    if (response.status === 401 || response.status === 403) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers });
    if (!response.ok) return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
    const parsed = ticketSchema.safeParse(await response.json());
    if (!parsed.success) return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
    return NextResponse.json({ ...parsed.data, url: `${env.LEGACY_API_ORIGIN}/api/orders/events/stream` }, { headers });
  } catch {
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
  }
}
