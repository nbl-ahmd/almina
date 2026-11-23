/** Browser side of the live order signal.
 *
 *  Preferred path: ask the web gateway for a one-time ticket, then hold one stream open straight to the persistent API. It
 *  carries tiny "orders changed" messages only, stays open for minutes (the API ends it after a fixed lifetime so access is
 *  re-checked with a fresh ticket) and costs no function time. Fallback: if the API cannot be reached directly (network
 *  policy, ad blockers, an unexpected origin) after a few tries, use the relay route, which the hosting limit restarts about
 *  every 25 seconds. Either way the page only refetches when told something changed. */
export type OrderStreamHandlers = {
  /** Connected and nothing changed since the last message. */
  onReady: () => void;
  /** Something changed, or this is the first connection. */
  onOrders: () => void;
  /** The session is no longer valid. */
  onRevoked: () => void;
  /** The connection dropped or could not be made; the owner decides when to tell the user. */
  onDown: () => void;
};

const MAX_DIRECT_FAILURES = 3;
const MAX_BACKOFF_MS = 30000;

type Frame = { event: string; id: string | null };
/** Incremental parser for the small subset of server-sent events the API emits. */
export function createFrameParser(onFrame: (frame: Frame) => void) {
  let buffer = '', event = 'message', id: string | null = null, hasData = false;
  return (chunk: string) => {
    buffer += chunk;
    let index: number;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).replace(/\r$/, ''); buffer = buffer.slice(index + 1);
      if (line === '') { if (hasData || event !== 'message' || id !== null) onFrame({ event, id }); event = 'message'; id = null; hasData = false; continue; }
      if (line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon < 0 ? line : line.slice(0, colon), value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') event = value; else if (field === 'id') id = value; else if (field === 'data') hasData = true;
    }
  };
}

export function connectOrderStream(handlers: OrderStreamHandlers): () => void {
  let stopped = false;
  let abort: AbortController | null = null;
  let relay: EventSource | null = null;
  let lastId: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function fallBackToRelay() {
    if (stopped || relay) return;
    const source = new EventSource('/api/admin/events');
    relay = source;
    source.addEventListener('ready', handlers.onReady);
    source.addEventListener('orders', handlers.onOrders);
    source.addEventListener('revoked', () => { source.close(); handlers.onRevoked(); });
    source.addEventListener('unavailable', handlers.onDown);
    source.onerror = handlers.onDown;
  }

  async function direct() {
    let failures = 0;
    while (!stopped) {
      let received = false;
      try {
        const grant = await fetch('/api/admin/events/ticket', { method: 'POST', cache: 'no-store' });
        if (grant.status === 401 || grant.status === 403) { handlers.onRevoked(); return; }
        if (!grant.ok) throw new Error('ticket');
        const { ticket, url } = await grant.json() as { ticket: string; url: string };
        abort = new AbortController();
        const response = await fetch(url, { cache: 'no-store', signal: abort.signal, credentials: 'omit',
          headers: { 'x-stream-ticket': ticket, ...(lastId ? { 'last-event-id': lastId } : {}) } });
        if (!response.ok || !response.body) throw new Error('stream');
        const reader = response.body.getReader(), decoder = new TextDecoder();
        const parse = createFrameParser(frame => {
          if (frame.id) lastId = frame.id;
          received = true; failures = 0;
          if (frame.event === 'ready') handlers.onReady(); else if (frame.event === 'orders') handlers.onOrders();
        });
        for (;;) { const chunk = await reader.read(); if (chunk.done) break; parse(decoder.decode(chunk.value, { stream: true })); }
        // The API ended the stream on purpose (fixed lifetime): reconnect straight away with a fresh ticket.
        if (received) { await new Promise<void>(resolve => { timer = setTimeout(resolve, 500); }); continue; }
        throw new Error('empty');
      } catch {
        if (stopped) return;
        handlers.onDown();
        failures += 1;
        if (failures >= MAX_DIRECT_FAILURES) { fallBackToRelay(); return; }
        await new Promise<void>(resolve => { timer = setTimeout(resolve, Math.min(MAX_BACKOFF_MS, 1000 * 2 ** failures) * (0.75 + Math.random() * 0.5)); });
      }
    }
  }

  void direct();
  return () => { stopped = true; abort?.abort(); relay?.close(); relay = null; clearTimeout(timer); };
}
