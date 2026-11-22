import { NextResponse, type NextRequest } from "next/server";
import { currentIdentity, sessionHeader } from "../../../../lib/server/admin/gateway";
import { getWebEnvironment } from "../../../../lib/server/env";

export const runtime = "nodejs";
export const maxDuration = 30;
// The persistent API owns the live feed (one MongoDB change stream for every connected staff browser). This route only
// authenticates the browser and relays that stream. It ends the relay at 25 s, inside the hosting limit; the browser
// reconnects within a second and sends Last-Event-ID, so a connection that missed nothing costs no database work.
const RELAY_MS = 25000;
const encoder = new TextEncoder();
const headers = { "Cache-Control": "private, no-store, no-transform", "X-Robots-Tag": "noindex, nofollow" };
const frame = (event: string) => new Response(encoder.encode(`retry: 3000\nevent: ${event}\ndata: {}\n\n`), { headers: { ...headers, "Content-Type": "text/event-stream", "X-Accel-Buffering": "no" } });

export async function GET(request: NextRequest) {
  try {
    if (!(await currentIdentity())) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers });
    if (request.nextUrl.search) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
    const env = getWebEnvironment();
    const lastEventId = request.headers.get("last-event-id");
    const upstream = await fetch(`${env.LEGACY_API_ORIGIN}/api/orders/events`, {
      headers: { cookie: await sessionHeader(), origin: env.WEB_ORIGIN, ...(lastEventId && /^[a-f0-9]{8}\.\d{1,12}$/.test(lastEventId) ? { "last-event-id": lastEventId } : {}) },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(RELAY_MS)]),
    });
    if (upstream.status === 401 || upstream.status === 403) return frame("revoked");
    if (!upstream.ok || !upstream.body) return frame("unavailable");
    // The relay ends by timeout or by the browser leaving; end the stream cleanly instead of surfacing the abort.
    const reader = upstream.body.getReader();
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) { try { const chunk = await reader.read(); if (chunk.done) controller.close(); else controller.enqueue(chunk.value); } catch { try { controller.close(); } catch { /* Already closed. */ } } },
      cancel() { void reader.cancel().catch(() => undefined); },
    });
    return new Response(body, { headers: { ...headers, "Content-Type": "text/event-stream", "X-Accel-Buffering": "no" } });
  } catch {
    return frame("unavailable");
  }
}
