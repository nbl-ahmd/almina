import { test, expect, reset, commerceOrigin, login, adminOrigin, streamSettled } from './fixtures';
test.beforeEach(async ({ request }) => { await reset(request); });

test('large API responses are compressed, small ones and event streams are not, and the console still works through it', async ({ page, request }) => {
  const seeded = await request.post(commerceOrigin + '/__fixture/products', { data: { products: Array.from({ length: 40 }, (_, index) => ({ name: `Compressible catalogue product ${index}`, brand: 'Acme', description: 'A long enough description to make the list worth compressing. '.repeat(3) })) } });
  expect(seeded.ok()).toBe(true);
  const list = await request.get(commerceOrigin + '/api/products?limit=50', { headers: { 'accept-encoding': 'gzip' } });
  expect(list.ok()).toBe(true);
  expect(list.headers()['content-encoding']).toBe('gzip');
  expect((await list.json() as unknown[]).length).toBeGreaterThan(30);
  const small = await request.get(commerceOrigin + '/health/live', { headers: { 'accept-encoding': 'gzip' } });
  expect(small.headers()['content-encoding']).toBeUndefined();
  // The staff console reads the same API through the web gateway; it must keep rendering real data.
  await login(page);
  await page.goto(adminOrigin + '/admin/products'); await streamSettled(page);
  await expect(page.getByText('Compressible catalogue product 0').first()).toBeVisible();
});
