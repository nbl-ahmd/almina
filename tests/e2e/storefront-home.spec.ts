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
      const lead = home.locator('.pharmacy-ad a');
      await expect(lead).toHaveAttribute('href', '/products');
      await expect(lead).toHaveAccessibleName(locale === 'en' ? 'Everyday care. One easy stop. Shop essentials' : 'عنايتك اليومية في مكان واحد. تسوق الأساسيات');
      const artwork = lead.locator('img');
      await expect.poll(() => artwork.evaluate((image: HTMLImageElement, filename) =>
        image.naturalWidth > 0 && image.currentSrc.includes(filename),
        `everyday-care-${locale}-wide.webp`,
      )).toBe(true);
      const collections = home.locator('.home-collection-section');
      await expect(collections).toHaveCount(2);
      await expect(collections.nth(0).locator('a.home-editorial-banner')).toHaveAttribute('href', '/collections/skin-essentials');
      await expect(collections.nth(1).locator('a.home-editorial-banner')).toHaveAttribute('href', '/collections/baby-care');
      await expect(home.locator('[data-slot=carousel-indicator]')).toHaveCount(3);
      await expect(home.locator('.home-category-lane a').first()).toBeVisible();
      for (const [width, columns] of [[1440, 5], [1100, 4], [768, 3], [390, 2], [320, 2]] as const) {
        await page.setViewportSize({ width, height: 844 });
        expect(await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const collectionArt = await collections.locator('img').first().evaluate(image => image.getBoundingClientRect().toJSON());
        expect(collectionArt.width / collectionArt.height).toBeCloseTo(width >= 768 ? 4 : 3, 1);
      }
      await expect.poll(() => artwork.evaluate((image: HTMLImageElement, filename) =>
        image.naturalWidth > 0 && image.currentSrc.includes(filename),
        `everyday-care-${locale}-phone.webp`,
      )).toBe(true);
      const carousel = home.locator('[aria-roledescription]').first();
      await carousel.getByRole('button', { name: locale === 'ar' ? 'الشريحة التالية' : 'Next slide' }).click();
      await expect(carousel.locator('.campaign-frame:visible a')).toHaveAttribute('href', '/collections/daily-care');
      await carousel.getByRole('button', { name: locale === 'ar' ? 'الشريحة التالية' : 'Next slide' }).click();
      await expect(carousel.locator('.campaign-frame:visible a')).toHaveAttribute('href', '/brands');
      await expect(carousel.locator('.campaign-frame:visible img')).toHaveJSProperty('complete', true);
      expect(await carousel.locator('.campaign-frame:visible img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
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
    await expect(page.locator('[data-slot=carousel-indicator]')).toHaveCount(3);
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
    await expect(carousel.locator('.campaign-frame:visible')).not.toHaveAttribute('data-pointer-entry');
    await expect(carousel.locator('h2:visible')).toHaveClass('sr-only');
    await expect(carousel.getByRole('link', { name: 'See campaign' })).toHaveAttribute('href', '/offers/fixture-hero');
    await expect(page.locator('.home-managed-campaigns').getByRole('heading', { name: 'Fixture secondary campaign' })).toBeVisible();

    const first = carousel.getByRole('button', { name: 'Show promotion 1', exact: true });
    await first.click();
    await expect(carousel.locator('.campaign-frame:visible')).toHaveAttribute('data-pointer-entry', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await second.click();
    await expect(carousel.locator('.campaign-frame:visible')).toHaveCSS('transition-duration', '0s');

    await page.setViewportSize({ width: 390, height: 844 });
    const slide = carousel.locator('.campaign-frame:visible');
    await slide.evaluate(target => {
      const start = new Touch({ identifier: 1, target, clientX: 100, clientY: 100 });
      const end = new Touch({ identifier: 1, target, clientX: 220, clientY: 107 });
      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [start] }));
      target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [end] }));
    });
    await expect(first).toHaveAttribute('aria-pressed', 'true');
  } finally {
    expect((await request.get(fixture + '/home-campaigns?enabled=0')).ok()).toBe(true);
  }
});
