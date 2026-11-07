import { z } from 'zod';
import { receivingSignalSchema } from '../../../../lib/admin/receiving';
import { NextResponse, type NextRequest } from "next/server";
import {
  currentIdentity,
  sessionHeader,
} from "../../../../lib/server/admin/gateway";
import { getWebEnvironment } from "../../../../lib/server/env";
import { orderEventStream } from "../../../../lib/admin/order-stream";
export const runtime = 'nodejs';
export const maxDuration = 30;
// Every sample is independently authorized by the persistent API; SSE contains invalidations only.
export async function GET(request: NextRequest) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Robots-Tag": "noindex, nofollow",
  };
  try {
    if (!(await currentIdentity()))
      return NextResponse.json(
        { error: "Sign in required" },
        { status: 401, headers },
      );
    if (request.nextUrl.search)
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400, headers },
      );
    const env = getWebEnvironment();
    const cookie = await sessionHeader();
    const stream = orderEventStream({
      signal: request.signal,
      lastEventId: request.headers.get("last-event-id") ?? undefined,
      async sample(signal) {
        const result = await fetch(
          `${env.LEGACY_API_ORIGIN}/api/orders/receiving`,
          {
            headers: { cookie, origin: env.WEB_ORIGIN },
            cache: "no-store",
            redirect: "manual",
            signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
          },
        );
        if (result.status === 401 || result.status === 403)
          return { state: "revoked" };
        if (!result.ok) return { state: "unavailable" };
        const value = receivingSignalSchema.extend({signature:z.string().regex(/^[a-f0-9]{64}$/)}).parse(await result.json());
        return { state: 'ready', signature: value.signature, receiving: { pendingCount: value.pendingCount, latestIds: value.latestIds, reviewCount:value.reviewCount, oldestPendingAt:value.oldestPendingAt } };
      },
    });
    return new Response(stream, {
      headers: {
        ...headers,
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Order updates unavailable" },
      { status: 503, headers },
    );
  }
}
