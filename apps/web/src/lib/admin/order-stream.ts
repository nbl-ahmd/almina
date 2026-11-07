import type { ReceivingSignal } from './receiving';
import { createHash } from 'node:crypto';

export type OrderSample =
  | { state: "ready"; signature: string; receiving?: ReceivingSignal }
  | { state: "revoked" }
  | { state: "unavailable" };

// No credentials or customer payloads are serialized by this transport.
export function orderEventStream({
  signal,
  sample,
  intervalMs = 5000,
  lifetimeMs = 20000,
  lastEventId,
}: {
  signal: AbortSignal;
  sample: (signal: AbortSignal) => Promise<OrderSample>;
  intervalMs?: number;
  lifetimeMs?: number;
  lastEventId?: string | undefined;
}) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let stopped = false;
      let signature = lastEventId && /^[a-f0-9]{64}$/.test(lastEventId) ? lastEventId : undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let active: AbortController | undefined;
      function stop() {
        if (stopped) return;
        stopped = true;
        clearTimeout(timer);
        clearTimeout(expiry);
        active?.abort();
        signal.removeEventListener("abort", stop);
        try {
          controller.close();
        } catch {
          /* Consumer already cancelled. */
        }
      }
      cleanup = stop;
      const expiry = setTimeout(stop, lifetimeMs);
      signal.addEventListener("abort", stop, { once: true });
      if (signal.aborted) {
        stop();
        return;
      }
      function emit(event: string, receiving?: ReceivingSignal) {
        controller.enqueue(encoder.encode(`${signature ? `id: ${signature}\n` : ''}event: ${event}\ndata: ${JSON.stringify(receiving ?? {})}\n\n`));
      }
      async function tick() {
        if (stopped || signal.aborted) return stop();
        active = new AbortController();
        try {
          const result = await sample(active.signal);
          if (stopped || signal.aborted) return stop();
          if (result.state === "revoked") {
            emit("revoked");
            stop();
            return;
          }
          if (result.state === "unavailable") emit("unavailable");
          else {
            const next = createHash('sha256').update(result.signature).digest('hex');
            const first = signature === undefined;
            const changed = signature !== next;
            signature = next;
            if (first) emit("reconcile");
            else if (changed) emit("orders");
            emit("connected", result.receiving);
          }
        } catch {
          if (!stopped) emit("unavailable");
        }
        if (!stopped) timer = setTimeout(tick, intervalMs);
      }
      void tick();
    },
    cancel() {
      cleanup();
    },
  });
}
