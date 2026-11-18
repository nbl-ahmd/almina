import { test, expect } from './fixtures';

const fixture = 'http://127.0.0.1:4711/__fixture';

for (const locale of ['en', 'ar'] as const) {
  test(`${locale} home compares five real fixture products on desktop and two per row on phone`, async ({ page, context, request }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: 'http://127.0.0.1:4710' }]);
    expect((await request.get(fixture + '/home-stock?mode=wide')).ok()).toBe(true);
    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/');
      const home = page.locator('[data-storefront-home]');
      const grid = home.locator('.home-product-grid').first();
      await expect(grid.locator('article')).toHaveCount(5);
      const ids = await grid.locator('article').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-product-id')));
      expect(new Set(ids).size).toBe(5);
      await expect(home.locator('.pharmacy-ad a')).toHaveAttribute('href', '/products');
      await expect(home.locator('.home-category-lane a').first()).toBeVisible();
      for (const [width, columns] of [[1440, 5], [1100, 4], [768, 3], [390, 2], [320, 2]] as const) {
        await page.setViewportSize({ width, height: 844 });
        expect(await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    } finally {
      expect((await request.get(fixture + '/home-stock?mode=normal')).ok()).toBe(true);
    }
  });
}

test('home distinguishes empty stock from a failed catalogue and keeps the lead usable', async ({ page, request }) => {
  expect((await request.get(fixture + '/home-stock?mode=empty')).ok()).toBe(true);
  try {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'No in-stock products to show right now' })).toBeVisible();
    await expect(page.locator('.home-empty a')).toHaveAttribute('href', '/products');
    await expect(page.locator('.home-product-grid, .home-brands, .home-managed-campaigns')).toHaveCount(0);
    await expect(page.locator('[data-slot=carousel-indicator]')).toHaveCount(0);
  } finally {
    expect((await request.get(fixture + '/home-stock?mode=normal')).ok()).toBe(true);
  }
  expect((await request.get(fixture + '/failure')).ok()).toBe(true);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { name: 'The catalogue is taking a moment.' })).toBeVisible();
    await expect(page.locator('.home-empty a')).toHaveAttribute('href', '/');
    await expect(page.locator('.pharmacy-ad a')).toHaveAttribute('href', '/products');
  } finally {
    expect((await request.get(fixture + '/failure')).ok()).toBe(true);
  }
  await page.locator('.home-empty a').click();
  await expect(page.locator('.home-product-grid article').first()).toBeVisible();
});

test('published home campaigns preserve hero controls and a separate supporting placement', async ({ page, request }) => {
  expect((await request.get(fixture + '/home-campaigns?enabled=1')).ok()).toBe(true);
  try {
    // Supply a local image response for the synthetic CDN URL. The optimizer never calls the CDN.
    await page.route(url => url.pathname === '/_next/image' && Boolean(url.searchParams.get('url')?.includes('synthetic-test-campaign')), route =>
      route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="250"><rect width="600" height="250" fill="#ffe5e5"/></svg>' }),
    );
    await page.goto('/');
    const carousel = page.getByRole('region', { name: 'Pharmacy promotions', exact: true });
    const second = carousel.getByRole('button', { name: 'Show promotion 2', exact: true });
    await second.focus();
    await page.keyboard.press('Enter');
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    await expect(carousel.getByRole('heading', { name: 'Fixture campaign' })).toBeVisible();
    await expect(carousel.getByRole('link', { name: 'See campaign' })).toHaveAttribute('href', '/offers/fixture-hero');
    await expect(page.locator('.home-managed-campaigns').getByRole('heading', { name: 'Fixture secondary campaign' })).toBeVisible();
  } finally {
    expect((await request.get(fixture + '/home-campaigns?enabled=0')).ok()).toBe(true);
  }
});
