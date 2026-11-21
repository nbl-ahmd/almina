import { createRequire } from 'node:module';
import { adminOrigin, commerceOrigin, expect, login, reset, test } from './fixtures';

const require = createRequire(`${process.cwd()}/package.json`);
const sharp = require('./backend/node_modules/sharp');

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('publishes separate banner artwork, keeps slide height, and swipes without opening the link', async ({ page, request, context }) => {
  await reset(request);
  const artwork = async (width: number, height: number, name: string) => ({
    name, mimeType: 'image/png',
    buffer: await sharp({ create: { width, height, channels: 3, background: '#dddddd' } }).png().toBuffer(),
  });
  const [desktop, mobile] = await Promise.all([artwork(2400, 600, 'desktop.png'), artwork(1200, 400, 'mobile.png')]);
  await page.route(url => url.pathname === '/_next/image' && Boolean(url.searchParams.get('url')?.includes('/almina/banners/')),
    route => {
      const source = new URL(route.request().url()).searchParams.get('url');
      return route.fulfill({ contentType: 'image/png', body: source?.endsWith('-mobile.webp') ? mobile.buffer : desktop.buffer });
    });
  const name = 'Synthetic banner with two artboards';
  await login(page);
  await page.goto(adminOrigin + '/admin/banners');
  await page.locator('summary').getByText('Add banner', { exact: true }).click();
  await expect(page.getByText(/2400 × 600 px/)).toBeVisible();
  await expect(page.getByText(/1200 × 400 px/)).toBeVisible();
  await page.getByLabel('Banner name', { exact: true }).fill(name);
  await page.getByLabel('Destination URL or storefront path').fill('/products');
  await page.getByLabel('Desktop artwork', { exact: true }).setInputFiles(desktop);
  await page.getByLabel('Mobile artwork (optional)', { exact: true }).setInputFiles({ ...mobile, buffer: Buffer.from('not a PNG') });
  await page.getByRole('button', { name: 'Publish banner' }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('Check the entered values');
  expect(await (await request.get(commerceOrigin + '/api/banners')).json()).toEqual([]);
  await page.getByLabel('Mobile artwork (optional)', { exact: true }).setInputFiles(mobile);
  await page.getByRole('button', { name: 'Publish banner' }).click();
  await expect(page.getByRole('table', { name: 'Published banners' })).toContainText(name);

  const published = await (await request.get(commerceOrigin + '/api/banners')).json();
  try {
    expect(published[0].cloudinaryImages).toEqual([expect.stringMatching(/-desktop\.webp$/), expect.stringMatching(/-mobile\.webp$/)]);
    const retained = await request.get(commerceOrigin + '/api/banners/images/' + published[0].image, { maxRedirects: 0 });
    expect(retained.headers().location).toBe(published[0].cloudinaryImages[0]);

    await page.goto(adminOrigin + '/');
    const carousel = page.getByRole('region', { name: 'Pharmacy promotions' });
    const frame = carousel.locator('.home-hero-viewport');
    const image = carousel.getByRole('img', { name, exact: true });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.currentSrc)).toContain('-mobile.webp');
    const mobileBox = (await frame.boundingBox())!;
    expect(mobileBox.width / mobileBox.height).toBeCloseTo(3, 2);
    const touch = await context.newCDPSession(page);
    const y = Math.round(mobileBox.y + mobileBox.height / 2);
    const x = Math.round(mobileBox.x + mobileBox.width * 0.75);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (const offset of [30, 65, 110, 145]) {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - offset, y }] });
    }
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(carousel.getByRole('group', { name: '2 of 3' })).toBeVisible();
    await expect(page).toHaveURL(adminOrigin + '/');
    expect((await frame.boundingBox())!.height).toBe(mobileBox.height);

    await page.setViewportSize({ width: 1440, height: 900 });
    await carousel.getByRole('button', { name: 'Previous slide' }).click();
    const desktopBox = (await frame.boundingBox())!;
    expect(desktopBox.width / desktopBox.height).toBeCloseTo(4, 2);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.currentSrc)).toContain('-desktop.webp');
    await carousel.getByRole('button', { name: 'Next slide' }).click();
    expect((await frame.boundingBox())!.height).toBe(desktopBox.height);
  } finally {
    // Archive through the gateway so its cached public list cannot leak into later tests.
    const archived = await page.request.delete(adminOrigin + '/api/admin/banners/' + published[0]._id, {
      headers: { origin: adminOrigin, 'x-csrf-protection': '1' },
    });
    expect(archived.ok()).toBe(true);
  }
  await page.goto(adminOrigin + '/');
  await expect(page.getByRole('region', { name: 'Pharmacy promotions' }).getByRole('group', { name: '1 of 2' })).toBeVisible();
});
