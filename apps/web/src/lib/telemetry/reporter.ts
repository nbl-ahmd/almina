import { commerceEvents, type CommerceEvent } from '@almina/contracts/commerce-events';
export type Choice = 'allowed' | 'declined' | 'unset';
export const consentKey = 'almina.optional-usage.v1';
export function createCommerceReporter(options: {
  allowed: () => boolean; send: (body: { event: CommerceEvent; consent: true }, signal: AbortSignal) => Promise<unknown>; now?: () => number;
}) {
  let enabled = false, minute = -1, sent = 0;
  const active = new Set<AbortController>();
  return {
    enable(value: boolean) {
      enabled = value;
      if (!value) { for (const request of active) request.abort(); active.clear(); }
    },
    record(event: CommerceEvent) {
      try {
        if (!enabled || !commerceEvents.includes(event) || !options.allowed() || active.size >= 2) return;
        const current = Math.floor((options.now ?? Date.now)() / 60000);
        if (current !== minute) { minute = current; sent = 0; }
        if (sent >= 20) return;
        sent++; const controller = new AbortController(); active.add(controller);
        const timer = setTimeout(() => controller.abort(), 2000);
        // Reporting never blocks a cart/order action, retries, or retains a payload queue.
        void Promise.resolve().then(() => {
          if (controller.signal.aborted || !enabled || !options.allowed()) return;
          return options.send({ event, consent: true }, controller.signal);
        })
          .catch(() => undefined).finally(() => { clearTimeout(timer); active.delete(controller); });
      } catch { /* Privacy/storage/transport failures cannot affect commerce. */ }
    },
  };
}
