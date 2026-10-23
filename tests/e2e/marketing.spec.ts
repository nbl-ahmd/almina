import {
  test,
  expect,
  login,
  reset,
  adminOrigin,
  commerceOrigin,
} from "./fixtures";
test.beforeEach(async ({ request }) => {
  await reset(request);
});
for (const width of [390, 1280])
  test(`marketing designer saves editable templates at ${width}px`, async ({
    page,
    request,
  }) => {
    expect(
      (
        await request.post(commerceOrigin + "/__fixture/marketing-product")
      ).ok(),
    ).toBeTruthy();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await login(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(adminOrigin + "/admin/marketing");
    await expect(
      page.getByRole("heading", { name: "Email marketing", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Designing is available · sending needs setup", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator(".gjs-editor")).toBeVisible();
    if (width === 390) {
      await page.getByRole("button", { name: "Blocks and styles" }).click();
      await expect(page.locator(".gjs-pn-views-container")).toBeVisible();
      await page.getByRole("button", { name: "Canvas", exact: true }).click();
      await expect(page.locator(".gjs-cv-canvas")).toBeVisible();
      const stage = await page.locator(".gjs-cv-canvas").boundingBox();
      const frame = await page.locator(".gjs-frame-wrapper").boundingBox();
      expect(
        stage && frame && frame.x + frame.width <= stage.x + stage.width + 2,
      ).toBeTruthy();
    }
    await expect(
      page
        .frameLocator(".gjs-frame")
        .getByText("Al Mina Pharmacy", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Find a product").fill("Synthetic");
    await page.getByRole("button", { name: "Search catalogue" }).click();
    await expect(
      page.getByRole("button", { name: "Synthetic care product" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Synthetic care product" }).click();
    await expect(
      page
        .frameLocator(".gjs-frame")
        .getByText("Synthetic care product", { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Template name", { exact: true })
      .fill("Synthetic campaign " + width);
    await page
      .getByLabel("Email subject", { exact: true })
      .fill("Synthetic first aid campaign");
    await page
      .getByLabel("Preview text", { exact: true })
      .fill("Synthetic preview");
    await page
      .getByRole("button", { name: "Save template", exact: true })
      .click();
    await expect(
      page.getByText(
        "Template saved. Send a test before approving a campaign.",
      ),
    ).toBeVisible();
    await page.getByText("Preview saved email", { exact: true }).click();
    await expect(
      page
        .frameLocator('iframe[title="Saved email preview"]')
        .getByText("Al Mina Pharmacy", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .frameLocator('iframe[title="Saved email preview"]')
        .getByText("Synthetic care product", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Template name", { exact: true })).toHaveValue(
      "Synthetic campaign " + width,
    );
    await expect(page.locator(".gjs-editor")).toBeVisible();
    await page.getByText("Preview saved email", { exact: true }).click();
    await expect(
      page
        .frameLocator('iframe[title="Saved email preview"]')
        .getByText("Al Mina Pharmacy", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Queue campaign", exact: true }),
    ).toBeDisabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
test("marketing staff can design but cannot import recipients or approve campaigns", async ({
  page,
}) => {
  await login(page, "synthetic-staff");
  await page.goto(adminOrigin + "/admin/marketing");
  await expect(
    page.getByRole("heading", { name: "Email marketing", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Contacts", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Queue campaign", exact: true }),
  ).toHaveCount(0);
  for (const path of ["contacts", "campaigns"]) {
    const response = await page.request.post(
      adminOrigin + "/api/marketing/" + path,
      { headers: { origin: adminOrigin, "X-CSRF-Protection": "1" }, data: {} },
    );
    expect(response.status()).toBe(403);
  }
  const csrf = await page.request.post(
    adminOrigin + "/api/marketing/templates",
    { data: {} },
  );
  expect(csrf.status()).toBe(403);
});
