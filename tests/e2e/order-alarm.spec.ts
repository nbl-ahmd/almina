import { randomUUID } from 'node:crypto';
import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect, reset, login, streamSettled, adminOrigin, commerceOrigin, customer, productId } from './fixtures';
test.beforeEach(async ({ request }) => { await reset(request); });

/** Counts the oscillators the alarm schedules and cancels, without making a sound. */
async function mockAudio(page: Page) {
  await page.addInitScript(() => {
    const state = { started: 0, stopped: 0 }; Object.assign(window, { __audio: state });
    class AudioMock { state = 'running'; currentTime = 0; destination = {}; resume() { return Promise.resolve(); } close() { return Promise.resolve(); }
      createOscillator() { return { type: '', frequency: { value: 0 }, connect() {}, disconnect() {}, start() { state.started++; }, stop() { state.stopped++; }, onended: null }; }
      createGain() { return { connect() {}, disconnect() {}, gain: { setValueAtTime() {}, linearRampToValueAtTime() {} } }; } }
    Object.assign(window, { AudioContext: AudioMock });
  });
}
const audio = (page: Page) => page.evaluate(() => (window as unknown as { __audio: { started: number; stopped: number } }).__audio);
const placeOrder = async (request: APIRequestContext) => {
  const created = await request.post(commerceOrigin + '/api/orders', { headers: { origin: commerceOrigin, 'x-csrf-protection': '1' }, data: { customer, items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID() } });
  expect(created.status()).toBe(201);
  return (await created.json() as { id: string }).id;
};

test('with the alarm armed a new order rings until Silence, and the ring stops by itself once the order is confirmed', async ({ page, request }) => {
  await mockAudio(page); await login(page); await streamSettled(page);
  await page.getByRole('button', { name: 'Turn order alarm on', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Turn order alarm off', exact: true })).toBeVisible();
  const afterArming = (await audio(page)).started; expect(afterArming).toBe(2); // the short confirmation chime only
  await expect(page.getByRole('link', { name: /0 orders awaiting confirmation/ })).toBeVisible();
  await page.waitForTimeout(1500); expect((await audio(page)).started).toBe(afterArming); // idle: no sound, no loop, nothing scheduled

  const first = await placeOrder(request);
  const silence = page.getByRole('button', { name: /Silence alarm/ });
  await expect(silence).toBeVisible({ timeout: 10000 });
  await expect.poll(async () => (await audio(page)).started, 'about twelve seconds of rings are scheduled ahead').toBeGreaterThan(afterArming + 25);
  await silence.click();
  await expect(silence).toHaveCount(0);
  const silenced = await audio(page); expect(silenced.stopped).toBeGreaterThanOrEqual(25); // scheduled rings were cancelled
  await page.waitForTimeout(800); expect((await audio(page)).started).toBe(silenced.started); // nothing rings after silence

  // A second order rings again; confirming every waiting order (here or on another device) silences it without a tap.
  const second = await placeOrder(request);
  await expect(silence).toBeVisible({ timeout: 10000 });
  for (const id of [first, second]) expect((await page.request.post(adminOrigin + `/api/admin/orders/${id}/confirm`, { headers: { origin: adminOrigin, 'x-csrf-protection': '1' } })).ok()).toBe(true);
  await expect(silence).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByRole('link', { name: /0 orders awaiting confirmation/ })).toBeVisible();
});

test('without the alarm armed a new order makes no sound on the page and leaves the notification to do the work', async ({ page, request }) => {
  await mockAudio(page); await login(page); await streamSettled(page);
  await placeOrder(request);
  await expect(page.getByRole('link', { name: /1 order awaiting confirmation/ })).toBeVisible({ timeout: 10000 });
  expect((await audio(page)).started).toBe(0);
  await expect(page.getByRole('button', { name: /Silence alarm/ })).toHaveCount(0);
});

test('the alarm remembers being on, asks for one tap after a reload, and rings once that tap has unlocked sound', async ({ page, request }) => {
  await mockAudio(page); await login(page); await streamSettled(page);
  await page.getByRole('button', { name: 'Turn order alarm on', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Turn order alarm off', exact: true })).toBeVisible();
  // A new page load starts with sound locked: the real browser needs a tap before any audio. Simulate the locked state.
  await page.addInitScript(() => { const Original = (window as unknown as { AudioContext: new () => { state: string; resume(): Promise<void> } }).AudioContext;
    (window as unknown as { AudioContext: unknown }).AudioContext = class extends Original { constructor() { super(); this.state = 'suspended'; } resume() { this.state = 'running'; return Promise.resolve(); } }; });
  await page.reload(); await streamSettled(page);
  await expect(page.getByRole('button', { name: 'Tap to arm the order alarm' })).toBeVisible();
  await page.getByRole('main').click({ position: { x: 10, y: 10 } }); // any tap on the page unlocks it
  await expect(page.getByRole('button', { name: 'Turn order alarm off', exact: true })).toBeVisible();
  await placeOrder(request);
  await expect(page.getByRole('button', { name: /Silence alarm/ })).toBeVisible({ timeout: 10000 });
});
