import { randomUUID } from 'node:crypto';
import { test, expect, reset, login, streamSettled, adminOrigin, commerceOrigin, customer, productId } from './fixtures';
test.beforeEach(async ({ request }) => { await reset(request); });

test('the console follows orders on a direct ticketed stream, not the relay, and updates without a reload', async ({ page, request }) => {
  const relayCalls: string[] = [];
  page.on('request', req => { if (req.url().startsWith(adminOrigin + '/api/admin/events') && !req.url().includes('/ticket')) relayCalls.push(req.url()); });
  const direct = page.waitForRequest(req => req.url() === commerceOrigin + '/api/orders/events/stream');
  await login(page);
  const streamRequest = await direct;
  // The page presents a one-time ticket in a header; the staff cookie is not sent to the API origin.
  expect(streamRequest.headers()['x-stream-ticket']).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(streamRequest.headers()['cookie'] ?? '').toBe('');
  await streamSettled(page);
  await expect(page.getByRole('status').filter({ hasText: 'Live' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /0 orders awaiting confirmation/ })).toBeVisible();
  const created = await request.post(commerceOrigin + '/api/orders', { headers: { origin: commerceOrigin, 'x-csrf-protection': '1' },
    data: { customer, items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID() } });
  expect(created.status()).toBe(201);
  await expect(page.getByRole('link', { name: /1 order awaiting confirmation/ })).toBeVisible({ timeout: 10000 });
  expect(relayCalls).toEqual([]);
});

test('the direct stream refuses missing, reused and forged tickets', async ({ page, request }) => {
  await login(page);
  const ticket = async () => (await (await page.request.post(adminOrigin + '/api/admin/events/ticket', { headers: { origin: adminOrigin } })).json() as { ticket: string }).ticket;
  const cross = { origin: adminOrigin };
  expect((await request.get(commerceOrigin + '/api/orders/events/stream', { headers: cross })).status()).toBe(401);
  expect((await request.get(commerceOrigin + '/api/orders/events/stream', { headers: { ...cross, 'x-stream-ticket': 'A'.repeat(43) } })).status()).toBe(401);
  const used = await ticket();
  const first = await page.request.fetch(commerceOrigin + '/api/orders/events/stream', { headers: { ...cross, 'x-stream-ticket': used }, timeout: 3000 }).catch(() => null);
  void first; // A valid stream stays open; the point is that the same ticket cannot be replayed.
  expect((await request.get(commerceOrigin + '/api/orders/events/stream', { headers: { ...cross, 'x-stream-ticket': used } })).status()).toBe(401);
  expect((await request.post(adminOrigin + '/api/admin/events/ticket', { headers: { origin: adminOrigin } })).status()).toBe(401);
  expect((await page.request.post(adminOrigin + '/api/admin/events/ticket', { headers: { origin: 'https://evil.example' } })).status()).toBe(403);
});

test('the direct stream stays open past the 15 second idle-socket limit and keeps receiving keep-alives', async ({ page }) => {
  test.setTimeout(90000);
  await login(page); await streamSettled(page);
  const result = await page.evaluate(async (origin: string) => {
    const grant = await (await fetch('/api/admin/events/ticket', { method: 'POST', cache: 'no-store' })).json() as { ticket: string };
    const controller = new AbortController(); const started = Date.now();
    const response = await fetch(origin + '/api/orders/events/stream', { headers: { 'x-stream-ticket': grant.ticket }, cache: 'no-store', credentials: 'omit', signal: controller.signal });
    const reader = response.body!.getReader(); let chunks = 0, ended = false;
    const pump = (async () => { for (;;) { const chunk = await reader.read(); if (chunk.done) { ended = true; return; } chunks++; } })().catch(() => { ended = true; });
    await new Promise(resolve => setTimeout(resolve, 22000));
    const state = { stillOpen: !ended, chunks, seconds: Math.round((Date.now() - started) / 1000) };
    controller.abort(); await pump; return state;
  }, commerceOrigin);
  expect(result.stillOpen).toBe(true);
  expect(result.chunks).toBeGreaterThanOrEqual(3); // the opening message and at least two keep-alives
});
