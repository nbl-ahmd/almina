import { test, expect } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  test(`${locale} tablet and desktop chrome keeps utilities, opened categories and footer reachable across resize`, async ({ page, context }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: 'http://127.0.0.1:4710' }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const header = page.locator('[data-storefront-chrome=header]');
    const search = header.getByRole('combobox');
    const account = header.locator('.header-account');
    const categories = header.locator('[data-department-trigger]');
    const footer = page.locator('[data-storefront-chrome=footer]');
    await expect(footer.locator('details[open]')).toHaveCount(4);
    for (const width of [1440, 1101, 1100, 1024, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(account).toBeVisible();
      await expect(header.locator('.header-cart')).toBeVisible();
      await expect(header.locator('.header-location')).toBeVisible();
      await expect(search).toBeVisible();
      const layout = await header.evaluate(node => {
        const selectors = ['.brand-logo', '.header-location', '.header-account', '.header-content > .header-cart', '.header-search'];
        const boxes = selectors.map(selector => node.querySelector(selector)!.getBoundingClientRect());
        return {
          overlaps: boxes.some((a, i) => boxes.slice(i + 1).some(b => Math.min(a.right, b.right) > Math.max(a.left, b.left) + 1 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top) + 1)),
          searchWidth: boxes[4]!.width,
          documentFits: document.documentElement.scrollWidth <= innerWidth,
        };
      });
      expect(layout).toMatchObject({ overlaps: false, documentFits: true });
      expect(layout.searchWidth).toBeGreaterThan(width <= 1100 ? width - 65 : 290);
      await expect(header.locator('.sf-search-submit')).toHaveCSS('border-radius', '8px');
    }

    await categories.focus();
    await page.keyboard.press('Enter');
    await expect(header.locator('.storefront-mega-panel')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(categories).toBeFocused();
    await header.locator('[data-department-links] > a[href="/offers"]').click();
    await expect(header.locator('[data-department-links] > a[href="/offers"]')).toHaveAttribute('aria-current', 'page');

    // All footer destinations stay in the same DOM when groups become disclosures.
    const destinations = await footer.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')));
    for (const path of ['/categories', '/offers', '/brands', '/health-guides', '/about', '/contact', '/saved', '/account', '/cart', '/map', '/ras-al-khaimah', '#top']) {
      expect(destinations).toContain(path);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(footer.locator('details[open]')).toHaveCount(0);
    const firstGroup = footer.locator('details').first();
    await firstGroup.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(firstGroup.locator('a[href="/categories"]')).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(footer.locator('details[open]')).toHaveCount(4);
    expect(await footer.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual(destinations);
  });
}
