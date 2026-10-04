import { readSessionCookie } from './cookies.js';
export type RealtimeSocket = {
  handshake: { headers: { origin?: string | undefined; cookie?: string | undefined } };
  data: { session?: string | undefined };
  emit(event: string, payload: unknown): unknown;
  disconnect(close: boolean): unknown;
};
type RealtimeIo = {
  use(handler: (socket: RealtimeSocket, next: (error?: Error) => void) => Promise<void>): unknown;
  sockets: { sockets: ReadonlyMap<string, RealtimeSocket> };
};
type Delivery = (event: string, payload: unknown) => void;
export type RealtimeBus = { subscribe(listener: Delivery): () => void; publish(event: string, payload: unknown): unknown };
export function secureRealtime(io: RealtimeIo, auth: { authenticate(token: string | undefined): Promise<{ role: string }> },
  origins: readonly string[], development = false, eventBus?: RealtimeBus) {
  io.use(async (socket, next) => {
    try {
      const origin = socket.handshake.headers.origin;
      if (typeof origin !== 'string' || !origins.includes(origin)) throw new Error();
      // Existing compatibility events may contain private order/message data: only current administrators connect.
      const token = readSessionCookie(socket.handshake.headers, development);
      const user = await auth.authenticate(token);
      if (user.role !== 'admin') throw new Error();
      socket.data.session = token; next();
    } catch { next(new Error('Unauthorized')); }
  });
  const deliver: Delivery = (event, payload) => {
    void Promise.all([...io.sockets.sockets.values()].map(async socket => {
      try {
        const user = await auth.authenticate(socket.data.session);
        if (user.role !== 'admin') { socket.disconnect(true); return; }
        socket.emit(event, payload);
      } catch { socket.disconnect(true); }
    }));
  };
  const unsubscribe = eventBus?.subscribe(deliver);
  return { emit(event: string, payload: unknown) {
    if (eventBus) return eventBus.publish(event, payload);
    deliver(event, payload);
  }, close() { unsubscribe?.(); } };
}
