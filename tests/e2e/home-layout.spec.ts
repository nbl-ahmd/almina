import { test, expect } from './fixtures';

const fixture = 'http://127.0.0.1:4711/__fixture/home-layout';
// A published homepage layout (Website & growth → Homepage) orders built-in and custom sections; scheduled and hidden ones stay out.
for (const width of [390, 1280]) test(`published homepage layout renders custom sections in order at ${width}px`, async ({ page, request }) => {
  await page.route('**/_next/image?**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="764" height="176"><rect width="764" height="176" fill="#e9edff"/></svg>' }));
  expect((await request.get(fixture + '?enabled=1')).ok()).toBeTruthy();
  try {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const picks = page.getByRole('region', { name: 'Fixture picks', exact: true });
    await expect(picks.getByRole('heading', { name: 'Fixture picks', exact: true })).toBeVisible();
    await expect(picks.locator('.product-card')).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Synthetic strip offer', exact: true })).toHaveAttribute('href', '/offers');
    // Custom sections sit where staff placed them: after categories, before the essentials shelf.
    const order = await page.evaluate(() => [...document.querySelectorAll('.home-page h2')].map(h => h.textContent?.trim()));
    expect(order.indexOf('Fixture picks')).toBeGreaterThan(-1);
    expect(order.indexOf('Fixture picks')).toBeLessThan(order.indexOf('Your everyday essentials'));
    // Staff moved the main carousel below the categories; the page keeps its single heading.
    expect(await page.evaluate(() => Boolean(document.querySelector('.home-categories')!.compareDocumentPosition(document.querySelector('.home-hero')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(page.locator('.home-hero')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Fixture later', exact: true })).toHaveCount(0);
    await expect(page.locator('.qc-brand-rail')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Chosen-product rows get their own "View all" page.
    await picks.getByRole('link', { name: 'View all', exact: true }).click();
    await expect(page).toHaveURL(/\/sections\/fixture-picks$/);
    await expect(page.getByRole('heading', { name: 'Fixture picks', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Daily Care', exact: true })).toBeVisible();
  } finally {
    expect((await request.get(fixture + '?enabled=0')).ok()).toBeTruthy();
  }
});

test('without a published layout the built-in homepage and section pages behave as before', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your everyday essentials', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fixture picks', exact: true })).toHaveCount(0);
  expect((await page.goto('/sections/fixture-picks'))?.status()).toBe(404);
});
