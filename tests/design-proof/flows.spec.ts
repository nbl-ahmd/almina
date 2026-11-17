import { test, expect, type Page } from "@playwright/test";
const origin = "http://127.0.0.1:4896",
  fixture = "http://127.0.0.1:4897";
const firstName = "CeraVe Blemish Control Cleanser 236 ml";
async function ready(page: Page) {
  await expect(page.locator("[data-proof-root]")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
test.beforeEach(async ({ page, request }) => {
  expect(
    await (await request.get(fixture + "/__fixture/reference-health")).text(),
  ).toBe("almina-reference-preview-synthetic");
  await request.get(fixture + "/__fixture/proof-failure?enabled=false");
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(url.hostname)
      ? route.continue()
      : route.abort("blockedbyclient");
  });
});
test.afterEach(async ({ request }) => {
  await request.get(fixture + "/__fixture/proof-failure?enabled=false");
});
for (const lang of ["en", "ar"] as const) {
  test(`${lang} focused search, query/scroll return and native browser history`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "almina_lang", value: lang, url: origin },
    ]);
    await page.goto("/design-proof");
    await ready(page);
    const input = page.getByRole("combobox", {
      name: lang === "en" ? "Search products" : "ابحث عن المنتجات",
      exact: true,
    });
    await input.focus();
    await expect(page.locator("main")).toHaveCSS("visibility", "hidden");
    await input.fill("CeraVe");
    await expect(page.getByRole("listbox")).toContainText(firstName);
    await input.press("Escape");
    await expect(page.locator("main")).toHaveCSS("visibility", "visible");
    await input.press("Enter");
    await expect(page).toHaveURL(/\/design-proof\/products\?q=CeraVe/);
    await ready(page);
    await page.goto("/design-proof/products?sort=price-desc");
    await page.locator("article").last().scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => scrollY);
    const link = page.locator("article a[class*=productName]").last();
    const label = await link.getAttribute("aria-label");
    await link.click();
    await expect(
      page.getByRole("heading", { name: label!, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", {
        name: lang === "en" ? "Back to results" : "العودة إلى النتائج",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(y - 40);
    await expect(page.locator("a:focus")).toHaveAttribute("aria-label", label!);
    await page.locator("article a[class*=productName]").last().click();
    await expect(
      page.getByRole("heading", { name: label!, exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/sort=price-desc/);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(y - 40);
  });
  test(`${lang} server-checked quantity, save/reload, cart and unavailable checkout`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "almina_lang", value: lang, url: origin },
    ]);
    await page.goto("/design-proof/products");
    await ready(page);
    const card = page.locator("article").first();
    await card
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .first()
      .click();
    await expect(card.locator("button[aria-pressed]")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await card
      .getByRole("button", {
        name:
          lang === "en"
            ? `Add ${firstName} to cart`
            : `إضافة ${firstName} إلى السلة`,
        exact: true,
      })
      .click();
    await expect(card.locator("output")).toHaveText("1");
    await page.reload();
    await expect(card.locator("output")).toHaveText("1");
    await expect(card.locator("button[aria-pressed]")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.goto("/design-proof/cart");
    await expect(
      page.getByRole("heading", {
        name: lang === "en" ? "Your cart" : "سلتك",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator("main [class*=cartLine]")).toContainText(
      firstName,
    );
    await expect(page.getByRole("search")).toHaveCount(0);
    await page
      .getByRole("button", {
        name: lang === "en" ? `Increase ${firstName}` : `زيادة ${firstName}`,
        exact: true,
      })
      .click();
    await expect(page.locator("main output")).toHaveText("2");
    await page
      .getByRole("link", {
        name: lang === "en" ? "Checkout availability" : "توفر إتمام الطلب",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name:
          lang === "en"
            ? "Checkout is unavailable in this preview"
            : "إتمام الطلب غير متاح في هذه المعاينة",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("search")).toHaveCount(0);
    await expect(page.locator("nav[class*=bottomNav]")).toHaveCount(0);
    await expect(page.locator("input[name*=payment]")).toHaveCount(0);
    await page
      .locator("main")
      .getByRole("link", {
        name: lang === "en" ? "Return to cart" : "العودة إلى السلة",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: lang === "en" ? "Remove" : "إزالة",
        exact: true,
      })
      .click();
    await expect(
      page.getByText(lang === "en" ? "Your cart is empty." : "سلتك فارغة.", {
        exact: true,
      }),
    ).toBeVisible();
  });
  test(`${lang} location cancel, keyboard escape, validation and persistence`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "almina_lang", value: lang, url: origin },
    ]);
    await page.goto("/design-proof");
    const button = page.locator("button[class*=location]");
    await button.click();
    const dialog = page.locator("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("input[name=city]").fill("Draft only");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(button).toBeFocused();
    await button.click();
    await expect(dialog.locator("input[name=city]")).toHaveValue("");
    await dialog.locator("input[name=city]").fill("   ");
    await dialog
      .getByRole("button", {
        name: lang === "en" ? "Save area" : "حفظ المنطقة",
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      lang === "en" ? "Enter your city" : "أدخل المدينة",
    );
    await dialog.locator("input[name=city]").fill("Synthetic area");
    await dialog
      .getByRole("button", {
        name: lang === "en" ? "Save area" : "حفظ المنطقة",
        exact: true,
      })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.reload();
    await expect(button).toContainText("Synthetic area");
  });
  test(`${lang} selected SKU, gallery and reset quantity follow real fixture associations`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "almina_lang", value: lang, url: origin },
    ]);
    await page.goto("/design-proof/products/sample--PD9901");
    await ready(page);
    await expect(page.locator("div[class*=options]")).toContainText("Small");
    await page
      .getByRole("button", {
        name: lang === "en" ? "View product photo 2" : "عرض صورة المنتج 2",
        exact: true,
      })
      .click();
    await expect(page.locator("div[class*=galleryImage] img")).toHaveAttribute(
      "src",
      /proof-image-b/,
    );
    await page
      .getByRole("button", {
        name: lang === "en" ? "Increase quantity" : "زيادة الكمية",
        exact: true,
      })
      .click();
    await page
      .locator("div[class*=options] a")
      .filter({ hasText: "Large" })
      .click();
    await expect(page).toHaveURL(/PD9902/);
    await expect(
      page.locator("div[class*=options] a[aria-current=page]"),
    ).toContainText("Large");
    await expect(
      page.locator("div[class*=dock] button[class*=add]"),
    ).toBeDisabled();
    await page
      .locator("div[class*=options] a")
      .filter({ hasText: "Small" })
      .click();
    await expect(page.locator("div[class*=dock] output")).toHaveText("1");
  });
  test(`${lang} catalogue errors recover, empty results and account limits are explicit`, async ({
    page,
    context,
    request,
  }) => {
    await context.addCookies([
      { name: "almina_lang", value: lang, url: origin },
    ]);
    await page.goto("/design-proof/products?q=zzzz-no-match");
    await expect(
      page.getByRole("heading", {
        name: lang === "en" ? "No products found" : "لا توجد منتجات",
        exact: true,
      }),
    ).toBeVisible();
    await request.get(fixture + "/__fixture/proof-failure?enabled=true");
    await page.goto("/design-proof/products");
    await expect(
      page.getByRole("heading", {
        name:
          lang === "en" ? "Unable to load this preview" : "تعذر تحميل المعاينة",
        exact: true,
      }),
    ).toBeVisible();
    await request.get(fixture + "/__fixture/proof-failure?enabled=false");
    await page
      .getByRole("button", {
        name: lang === "en" ? "Try again" : "حاول مرة أخرى",
        exact: true,
      })
      .click();
    await expect(page.locator("article")).toHaveCount(6);
    await page.goto("/design-proof/account");
    await expect(page.locator("main")).toContainText(
      lang === "en"
        ? "No customer session is simulated"
        : "لا تتم محاكاة جلسة عميل",
    );
    await expect(page.locator("input[type=password]")).toHaveCount(0);
    await expect(page.locator('main a[href="/account"]')).toBeVisible();
  });
}
test("suggestion kinds, unsafe links, loading/failure fallback and recent history", async ({
  page,
}) => {
  let fail = false;
  await page.route("**/api/search/suggest?**", async (route) => {
    if (fail) {
      await route.fulfill({ status: 503, body: "Unavailable" });
      return;
    }
    await route.fulfill({
      json: {
        products: [
          { name: "Safe product", href: "/products/safe--PD1186" },
          { name: "Unsafe", href: "javascript:alert(1)" },
        ],
        categories: [
          {
            name: "Skin Care",
            href: "/categories/skin-care--aaaaaaaaaaaaaaaaaaaaaaaa",
          },
        ],
        brands: [{ name: "CeraVe", href: "/search?q=CeraVe" }],
        collections: [
          { name: "Existing skin collection", href: "/collections/skin-care" },
        ],
        popular: [{ name: "Popular search", href: "/search?q=care" }],
        related: [{ name: "Related search", href: "/search?q=cleanser" }],
      },
    });
  });
  await page.goto("/design-proof");
  const input = page.getByRole("combobox", {
    name: "Search products",
    exact: true,
  });
  await input.fill("care");
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(6);
  await expect(page.getByText("Unsafe", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Existing skin collection/ }),
  ).toContainText("existing site");
  await expect(
    page
      .getByRole("link", { name: "Skin Care", exact: true })
      .filter({ has: page.locator("span") }),
  ).toHaveAttribute(
    "href",
    "/design-proof/products?category=aaaaaaaaaaaaaaaaaaaaaaaa",
  );
  await input.press("ArrowDown");
  await expect(input).toHaveAttribute("aria-activedescendant", /.+-0$/);
  await input.press("Escape");
  fail = true;
  await input.fill("Bioderma");
  await expect(
    page.getByText("Suggestions unavailable. Press Search to try results.", {
      exact: true,
    }),
  ).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(/q=Bioderma/);
  await input.focus();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.getByRole("listbox")).toContainText("Bioderma");
  await page
    .getByRole("button", { name: "Clear recent searches", exact: true })
    .click();
  await expect(page.getByRole("listbox").getByRole("option")).toHaveCount(0);
});
test("quantity cap, blocked storage, cart retry and no order endpoint", async ({
  page,
}) => {
  const orders: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/checkout(?:$|\?)/.test(r.url())) orders.push(r.url());
  });
  await page.goto("/design-proof/products/sample--PD9901");
  await page.evaluate(() =>
    localStorage.setItem(
      "almina.cart.v1",
      JSON.stringify([{ id: "dddddddddddddddddddddd01", quantity: 3 }]),
    ),
  );
  await page.reload();
  const add = page.getByRole("button", {
    name: "Add one Synthetic option family — not for sale",
    exact: true,
  });
  await add.click();
  await expect(page.locator("div[class*=dock] output")).toHaveText("4");
  await expect(add).toBeDisabled();
  await page.goto("/design-proof/cart");
  await expect(page.locator("main output")).toHaveText("4");
  await page.route("**/design-proof/cart", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({ status: 503, body: "Synthetic action failure" })
      : route.continue(),
  );
  await page.reload();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "Unable to read",
  );
  await page.unroute("**/design-proof/cart");
  await page.getByRole("button", { name: "Retry cart", exact: true }).click();
  await expect(page.locator("main output")).toHaveText("4");
  await page.goto("/design-proof/products");
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value() {
        throw new DOMException("Synthetic blocked storage", "SecurityError");
      },
    });
  });
  await page
    .locator("article")
    .first()
    .getByRole("button", { name: /^Save product/ })
    .click();
  await expect(
    page.locator("article").first().getByRole("alert"),
  ).toContainText("Unable to save");
  expect(orders).toEqual([]);
});

test("pending add rejects stale displayed stock without changing the device cart", async ({
  page,
  request,
}) => {
  await request.get(fixture + "/__fixture/proof-stock?value=4");
  await page.goto("/design-proof/products/sample--PD9901");
  const add = page.getByRole("button", {
    name: "Add Synthetic option family — not for sale to cart",
    exact: true,
  });
  await expect(add).toBeEnabled();
  await request.get(fixture + "/__fixture/proof-stock?value=0");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/design-proof/products/sample--PD9901", async (route) => {
    if (route.request().method() === "POST") await held;
    await route.continue();
  });
  try {
    await add.click();
    await expect(add).toBeDisabled();
    release();
    await expect(page.locator("[class*=purchaseError]")).not.toBeEmpty();
    expect(
      await page.evaluate(() => localStorage.getItem("almina.cart.v1")),
    ).toBeNull();
  } finally {
    release();
    await request.get(fixture + "/__fixture/proof-stock?value=4");
  }
});

for (const lang of ["en", "ar"] as const) {
  test(`${lang} mode resize, short viewport, safe insets and reduced-motion evidence`, async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "almina_lang", value: lang, url: origin },
    ]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/design-proof");
    await ready(page);
    for (const width of [360, 390, 768, 1440, 390]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBeTruthy();
    }
    const search = page.getByRole("combobox");
    await search.focus();
    await search.fill("CeraVe");
    await expect(
      page.getByRole("listbox").getByRole("option").first(),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 420 });
    await expect(search).toBeVisible();
    expect(
      await page
        .getByRole("listbox")
        .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
    ).toBeTruthy();
    await page.screenshot({
      caret: "initial",
      path: `.verification-results/storefront-replacement/p1-04/${lang}-search-short.png`,
    });
    await search.press("Escape");
    await page.setViewportSize({ width: 1440, height: 900 });
    await search.press("Tab");
    await search.focus();
    await expect(page.getByRole("listbox").getByRole("option").first()).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
    await page.screenshot({
      caret: "initial",
      path: `.verification-results/storefront-replacement/p1-04/${lang}-search-desktop.png`,
    });
    await search.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/design-proof/products/sample--PD9901");
    await ready(page);
    await page.locator("[data-proof-root]").evaluate((el) => {
      (el as HTMLElement).style.cssText =
        "--proof-safe-top:24px;--proof-safe-left:24px;--proof-safe-right:24px;--proof-safe-bottom:34px";
    });
    const dock = page.locator("div[class*=dock]");
    expect(
      await dock.evaluate((el) =>
        parseFloat(getComputedStyle(el).paddingBottom),
      ),
    ).toBe(34);
    expect(
      await dock.evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft)),
    ).toBe(24);
    await page.screenshot({
      caret: "initial",
      path: `.verification-results/storefront-replacement/p1-04/${lang}-pdp-insets.png`,
    });
    await page.goto("/design-proof/cart");
    await expect(page.getByText(lang === "en" ? "Your cart is empty." : "سلتك فارغة.", {exact:true})).toBeVisible();
    await expect(page.getByRole("search")).toHaveCount(0);
    await page.screenshot({
      caret: "initial",
      path: `.verification-results/storefront-replacement/p1-04/${lang}-cart-empty.png`,
    });
    await page.goto("/design-proof/checkout");
    await page.screenshot({
      caret: "initial",
      path: `.verification-results/storefront-replacement/p1-04/${lang}-checkout-unavailable.png`,
    });
    await page.goto("/design-proof/account");
    await page.screenshot({
      caret: "initial",
      path: `.verification-results/storefront-replacement/p1-04/${lang}-account.png`,
    });
  });
}
