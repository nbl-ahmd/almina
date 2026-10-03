export type OrderSample =
  | { state: "ready"; signature: string }
  | { state: "revoked" }
  | { state: "unavailable" };

// No credentials or customer payloads are serialized by this transport.
export function orderEventStream({
  signal,
  sample,
  intervalMs = 5000,
  lifetimeMs = 20000,
}: {
  signal: AbortSignal;
  sample: (signal: AbortSignal) => Promise<OrderSample>;
  intervalMs?: number;
  lifetimeMs?: number;
}) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let stopped = false;
      let signature: string | undefined;
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
      function emit(event: string) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: {}\n\n`));
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
            if (signature === undefined) emit("reconcile");
            else if (result.signature !== signature) emit("orders");
            signature = result.signature;
            emit("connected");
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
