import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { connectOrderStream } from '../apps/web/src/lib/admin/order-stream-client';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const original = { fetch: globalThis.fetch, EventSource: (globalThis as { EventSource?: unknown }).EventSource };
afterEach(() => { globalThis.fetch = original.fetch; (globalThis as { EventSource?: unknown }).EventSource = original.EventSource; });

const ticketResponse = () => ({ ok: true, status: 200, json: async () => ({ ticket: 'T'.repeat(43), url: 'https://api.example.invalid/api/orders/events/stream' }) });
/** A stream that yields the given frames, then stays open until the request is aborted. */
function openStream(frames: string[], signal?: AbortSignal | null) {
  const encoder = new TextEncoder(); const queue = frames.map(frame => encoder.encode(frame));
  return { ok: true, status: 200, body: { getReader: () => ({ read: () => queue.length ? Promise.resolve({ done: false, value: queue.shift()! }) :
    new Promise<{ done: boolean; value?: Uint8Array }>(resolve => signal?.addEventListener('abort', () => resolve({ done: true }), { once: true })) }) } };
}
const handlers = () => { const seen = { ready: 0, orders: 0, down: 0, revoked: 0 };
  return { seen, handlers: { onReady: () => { seen.ready++; }, onOrders: () => { seen.orders++; }, onDown: () => { seen.down++; }, onRevoked: () => { seen.revoked++; } } }; };

test('closing while the ticket is still being fetched never opens a stream', async () => {
  const calls: string[] = []; let releaseTicket!: () => void;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); calls.push(url);
    if (url.includes('/ticket')) { await new Promise<void>(resolve => { releaseTicket = resolve; }); return ticketResponse(); }
    return openStream(['id: a.1\nevent: orders\ndata: {}\n\n'], init?.signal);
  }) as typeof fetch;
  const { handlers: h, seen } = handlers();
  const close = connectOrderStream(h);
  await wait(20); close(); releaseTicket(); await wait(100);
  assert.deepEqual(calls, ['/api/admin/events/ticket'], 'no stream was opened after the page left');
  assert.equal(seen.orders, 0);
});

test('a healthy stream delivers events, is aborted on close and never reconnects afterwards', async () => {
  const calls: string[] = []; const aborts: boolean[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input); calls.push(url);
    if (url.includes('/ticket')) return ticketResponse();
    init?.signal?.addEventListener('abort', () => aborts.push(true), { once: true });
    return openStream(['retry: 1000\nid: a.1\nevent: orders\ndata: {}\n\n', 'id: a.2\nevent: ready\ndata: {}\n\n'], init?.signal);
  }) as typeof fetch;
  const { handlers: h, seen } = handlers();
  const close = connectOrderStream(h);
  await wait(100); assert.equal(seen.orders, 1); assert.equal(seen.ready, 1);
  close(); await wait(100);
  assert.deepEqual(aborts, [true]); assert.equal(calls.filter(url => url.includes('/ticket')).length, 1, 'no reconnect after close');
});

test('streams that end within seconds are backed off and then handed to the relay instead of hammering the API', async () => {
  let tickets = 0; let relays = 0;
  (globalThis as { EventSource?: unknown }).EventSource = class { constructor() { relays++; } addEventListener() {} close() {} onerror = null; };
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('/ticket')) { tickets++; return ticketResponse(); }
    return { ok: true, status: 200, body: { getReader: () => { let sent = false; return { read: async () => sent ? { done: true } : (sent = true, { done: false, value: new TextEncoder().encode('id: a.1\nevent: orders\ndata: {}\n\n') }) }; } } };
  }) as typeof fetch;
  const { handlers: h, seen } = handlers();
  const originalRandom = Math.random; Math.random = () => 0; // shortest backoff, so the test is fast
  const close = connectOrderStream(h);
  try { await wait(6500); } finally { Math.random = originalRandom; close(); }
  assert.equal(tickets, 3, 'three short-lived streams, with growing waits between them');
  assert.equal(relays, 1, 'then the relay takes over');
  assert.ok(seen.down >= 3);
});

test('a signed-out session stops the loop and reports it', async () => {
  let tickets = 0;
  globalThis.fetch = (async () => { tickets++; return { ok: false, status: 401, json: async () => ({}) }; }) as unknown as typeof fetch;
  const { handlers: h, seen } = handlers();
  const close = connectOrderStream(h); await wait(100); close();
  assert.equal(seen.revoked, 1); assert.equal(tickets, 1);
});
