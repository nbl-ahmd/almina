import { test, expect, productId, reset, checkoutOrigin, customer } from './fixtures';

for (const locale of ['en', 'ar'] as const) {
  test(`delivery progress uses ${locale} copy without changing stored area or cart`, async ({ page, context }) => {
    await context.addCookies([{ name: 'almina_lang', value: locale, url: 'http://127.0.0.1:4710' }]);
    await page.route('**/api/growth/delivery', route => route.fulfill({ json: { data: { remainingMinor: 2250, freeAboveMinor: 10000, emirate: 'Ras al-Khaimah' } } }));
    await page.addInitScript(id => {
      localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 1 }]));
      localStorage.setItem('almina.delivery-area.v1', JSON.stringify({ emirate: 'Ras al-Khaimah', city: 'Al Nakheel' }));
    }, productId);
    await page.goto('/cart');
    await expect(page.getByText(locale === 'en' ? 'Add AED 22.50 more for free delivery' : 'أضف منتجات بقيمة 22.50 درهم أخرى للحصول على توصيل مجاني', { exact: true })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: locale === 'en' ? 'Progress towards free delivery' : 'التقدم نحو التوصيل المجاني' })).toHaveAttribute('value', '78');
    expect(JSON.parse(await page.evaluate(() => localStorage.getItem('almina.delivery-area.v1')) || '{}').emirate).toBe('Ras al-Khaimah');
  });
}

test('Arabic header labels and delivery dialog persist canonical area values across reload', async ({ page, context }) => {
  await context.addCookies([{ name: 'almina_lang', value: 'ar', url: 'http://127.0.0.1:4710' }]);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/cart');
  await expect(page.getByRole('combobox', { name: 'ابحث عن المنتجات' })).toHaveAttribute('placeholder', 'ابحث عن منتجات أو علامات تجارية');
  await page.getByRole('button', { name: 'اختر منطقة التوصيل', exact: true }).click();
  await page.getByRole('combobox', { name: 'إمارة التوصيل' }).selectOption('Dubai');
  await page.getByRole('textbox', { name: 'مدينة / منطقة التوصيل' }).fill('البرشاء');
  await page.getByRole('button', { name: 'حفظ منطقة التوصيل', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('almina.delivery-area.v1')) || '{}')).toEqual({ emirate: 'Dubai', city: 'البرشاء' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'اختر منطقة التوصيل', exact: true })).toContainText('البرشاء');
  await expect(page.locator('.storefront-shell')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Arabic catalogue and PDP localize controls while retaining product identity and cart quantities', async ({ page, context }) => {
  await context.addCookies([{ name: 'almina_lang', value: 'ar', url: 'http://127.0.0.1:4710' }]);
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/products');
  await page.locator('#catalog-filters > summary').click();
  const filter = page.getByRole('search', { name: 'تصفية المنتجات' });
  await filter.getByRole('searchbox', { name: 'ابحث عن المنتجات' }).fill('Daily');
  await filter.getByRole('button', { name: 'تطبيق الفلاتر' }).click();
  await expect(page).toHaveURL(/q=Daily/);
  await expect(page.getByRole('heading', { name: 'Daily Care', exact: true })).toBeVisible();
  await page.goto('/products/daily-care--PD0001');
  await expect(page.getByRole('link', { name: 'استفسارات التوصيل', exact: true })).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: 'Skin Care', exact: true }).first()).toBeVisible();
  await expect(page.getByText('يتم تأكيد رسوم التوصيل والإجمالي النهائي عند الدفع قبل تقديم الطلب.', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'outputs/coral-redesign-2026-10-21/product-ar-390.png', fullPage: true });
  await page.getByRole('heading', { name: 'التوصيل في رأس الخيمة', exact: true }).evaluate(el => el.scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: 'outputs/coral-redesign-2026-10-21/product-ar-delivery-390.png' });
  await expect(page.getByRole('heading', { name: 'Daily Care', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'زيادة كمية الشراء', exact: true }).click();
  await expect(page.getByRole('spinbutton', { name: 'الكمية', exact: true })).toHaveValue('2');
  await page.getByRole('button', { name: 'أضف إلى السلة: Daily Care', exact: true }).click();
  await expect(page.getByText('تمت الإضافة إلى السلة.', { exact: true })).toBeVisible();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('almina.cart.v1')) || '[]')).toEqual([{ id: productId, quantity: 2 }]);
  await expect(page.getByRole('heading', { name: 'عن هذا المنتج' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Arabic homepage campaign controls keep navigation and product names intact', async ({ page, context }) => {
  await context.addCookies([{ name: 'almina_lang', value: 'ar', url: 'http://127.0.0.1:4710' }]);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'صيدلية الميناء — الصحة والجمال والعناية اليومية' })).toHaveCount(1);
  const campaign = page.getByRole('region', { name: 'عروض الصيدلية', exact: true });
  await campaign.getByRole('button', { name: 'عرض عرض 2', exact: true }).click();
  await expect(campaign.getByRole('group', { name: '2 من 2', exact: true })).toBeVisible();
});

test('Arabic server stock messages reject excessive additions without mutating the cart', async ({ page, context, request }) => {
  await context.addCookies([{ name: 'almina_lang', value: 'ar', url: 'http://127.0.0.1:4710' }]);
  await page.addInitScript(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 4 }])), productId);
  await page.goto('/products/daily-care--PD0001');
  await page.getByRole('button', { name: 'أضف إلى السلة: Daily Care', exact: true }).click();
  await expect(page.getByText('المخزون محدود. يرجى اختيار كمية أقل.', { exact: true })).toBeVisible();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('almina.cart.v1')) || '[]')).toEqual([{ id: productId, quantity: 4 }]);
  expect((await request.get('http://127.0.0.1:4711/__fixture/closed')).ok()).toBeTruthy();
  try {
    await page.getByRole('button', { name: 'أضف إلى السلة: Daily Care', exact: true }).click();
    await expect(page.getByText('المتجر مغلق حالياً.', { exact: true })).toBeVisible();
  } finally { expect((await request.get('http://127.0.0.1:4711/__fixture/closed')).ok()).toBeTruthy(); }
  await page.goto('/cart');
  await expect(page).toHaveTitle(/سلتك/);
});

test('Arabic checkout displays translated emirates while submitting canonical contract values', async ({ page, context, request }) => {
  await reset(request);
  await context.addCookies([{ name: 'almina_lang', value: 'ar', url: checkoutOrigin }]);
  await page.goto(checkoutOrigin + '/checkout');
  await page.evaluate(id => localStorage.setItem('almina.cart.v1', JSON.stringify([{ id, quantity: 2 }])), productId);
  await page.reload();
  for (const [name, value] of Object.entries(customer)) {
    const field = page.locator(`[name="${name}"]`);
    if (name === 'payment') { await page.getByRole('radio', { name: /نقداً عند الاستلام/ }).check(); continue; }
    if (name === 'emirate') await field.selectOption(value);
    else await field.fill(value);
  }
  await expect(page.locator('select[name="emirate"] option:checked')).toHaveText('رأس الخيمة');
  await expect(page.locator('select[name="emirate"]')).toHaveValue('Ras al-Khaimah');
  await page.getByRole('button', { name: 'مراجعة الطلب', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ملخص الطلب', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /تقديم الطلب —/ })).toBeVisible();
  await expect(page).toHaveTitle(/الدفع/);
});
