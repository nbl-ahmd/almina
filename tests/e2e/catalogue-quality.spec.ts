import { test, expect, reset, login, streamSettled, adminOrigin, commerceOrigin } from './fixtures';
test.beforeEach(async ({ request }) => { await reset(request); });

const hex = (index: number) => (0xc00 + index).toString(16).padStart(24, '0');

test('catalogue quality: completeness, ranked work list, confirmed barcode GTINs and a reviewed enrichment file', async ({ page, request }) => {
  test.setTimeout(120000);
  const seeded = await request.post(commerceOrigin + '/__fixture/products', { data: { products: [
    // Live and in stock, complete except a GTIN; its barcode is a real trade GTIN.
    { _id: { $oid: hex(1) }, product_id: 'PDQ1', name: 'Quality cream with barcode', brand: 'Acme', manufacturer: 'Acme Labs', packLabel: '50 ml', saleUnit: '1 tube',
      description: 'A synthetic cream.', barcode: '6291000000020', cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/item.webp'] },
    // Live, little filled in.
    { _id: { $oid: hex(2) }, product_id: 'PDQ2', name: 'Quality bare item', stock: 2 },
    // Hidden with an in-store code: never offered as a GTIN.
    { _id: { $oid: hex(3) }, product_id: 'PDQ3', name: 'Quality weighed item', barcode: '2000000000015', disabled: true, published: false, stock: 0 },
  ] } });
  expect(seeded.ok(), await seeded.text()).toBe(true);
  await login(page);

  // Dashboard: live completeness from the Products counts, linking into the filtered list.
  await streamSettled(page);
  const card = page.getByRole('region', { name: 'Live catalogue completeness' }).or(page.locator('section', { hasText: 'Live catalogue completeness' })).first();
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: /missing/ }).first()).toBeVisible();

  await page.goto(adminOrigin + '/admin/catalogue-quality'); await streamSettled(page);
  await expect(page.getByRole('heading', { name: 'Catalogue quality', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Completeness' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Google Merchant readiness' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Barcodes and identifiers' })).toBeVisible();
  const table = page.getByRole('table', { name: 'Products to enrich, highest priority first' });
  await expect(table.getByRole('link', { name: 'Quality cream with barcode' })).toBeVisible();
  await expect(table.getByText('Barcode can be GTIN')).toHaveCount(1);
  await page.screenshot({ path: '.verification-results/catalogue-quality.png', fullPage: true });

  // Confirm the barcode as the GTIN through the dialog; the in-store code is not offered.
  await page.getByRole('link', { name: 'GTIN / barcode', exact: true }).click(); await streamSettled(page);
  await expect(page).toHaveURL(/gap=gtin/);
  const row = page.getByRole('row', { name: /Quality cream with barcode/ });
  await row.getByRole('checkbox', { name: 'Select row' }).check();
  await page.getByRole('button', { name: 'Use barcode as GTIN (1)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Use barcode as GTIN' });
  const save = dialog.getByRole('button', { name: 'Save 1 GTIN' });
  await expect(save).toBeDisabled();
  await dialog.getByRole('checkbox', { name: /I checked that each ticked barcode/ }).check();
  const answer = page.waitForResponse(response => response.url().endsWith('/api/admin/products/gtin-from-barcode'));
  await save.click();
  const response = await answer;
  expect(response.status(), await response.text()).toBe(200);
  await expect(page.getByText('1 GTIN recorded from barcodes.')).toBeVisible();
  const saved = await (await page.request.get(`${adminOrigin}/api/admin/products/${hex(1)}`)).json() as { gtin?: string; disabled?: boolean };
  expect(saved.gtin).toBe('6291000000020');
  expect(saved.disabled).toBe(false);

  // Enrichment file: preview first, nothing written until the administrator confirms.
  const csv = 'product_id,brand,description\r\nPDQ2,Bioderma,"\'- Gentle formula"\r\nPDQ404,Nobody,\r\n';
  await page.locator('input[type=file][accept=".csv,text/csv"]').setInputFiles({ name: 'enrichment.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Preview changes' }).click();
  await expect(page.getByText(/2 changes on 1 product\. 1 row was not matched\./)).toBeVisible();
  await expect(page.getByRole('cell', { name: '- Gentle formula' })).toBeVisible();
  expect(((await (await page.request.get(`${adminOrigin}/api/admin/products/${hex(2)}`)).json()) as { brand?: string }).brand ?? '').toBe('');
  const apply = page.getByRole('button', { name: 'Save 2 changes' });
  await expect(apply).toBeDisabled();
  await page.getByRole('checkbox', { name: /I checked these values/ }).check();
  await apply.click();
  await expect(page.getByText('2 details saved on 1 product.')).toBeVisible();
  const enriched = await (await page.request.get(`${adminOrigin}/api/admin/products/${hex(2)}`)).json() as { brand?: string; description?: string; disabled?: boolean; contentReviewed?: boolean };
  expect(enriched).toMatchObject({ brand: 'Bioderma', description: '- Gentle formula', disabled: false });
  expect(enriched.contentReviewed).not.toBe(true);

  // A near-limit file (about 900 KB) passes the gateway and API body limits; unknown rows are reported, nothing is written.
  const large = ['product_id,description', ...Array.from({ length: 3900 }, (_, index) => `PDZ${index},"${'Gentle daily care. '.repeat(11)}"`)].join('\r\n');
  expect(Buffer.byteLength(large)).toBeGreaterThan(850_000);
  const big = await page.request.post(`${adminOrigin}/api/admin/products/enrichment/preview`, { headers: { origin: adminOrigin, 'x-csrf-protection': '1' }, data: { content: large } });
  expect(big.status(), await big.text()).toBe(200);
  expect((await big.json() as { errorCount: number }).errorCount).toBe(3900);

  // The sourcing sheet downloads through the gateway.
  const download = await page.request.get(`${adminOrigin}/api/admin/products/enrichment/export?scope=all&gap=photo`);
  expect(download.headers()['content-type']).toContain('text/csv');
  expect(await download.text()).toContain('"PDQ2"');

  // Phone width: the page and the work list stay usable, and the dashboard card renders.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(adminOrigin + '/admin/catalogue-quality'); await streamSettled(page);
  await expect(page.getByRole('heading', { name: 'What to enrich next' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '.verification-results/catalogue-quality-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(adminOrigin + '/admin'); await streamSettled(page);
  await page.getByText('Live catalogue completeness').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.verification-results/catalogue-quality-dashboard.png' });
});
