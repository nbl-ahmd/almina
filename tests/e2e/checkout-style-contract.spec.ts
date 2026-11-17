import {
  test,
  expect,
  reset,
  state,
  checkoutOrigin,
  customer,
  productId,
} from "./fixtures";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const folder = ".verification-results/storefront-replacement/p2-03";
mkdirSync(folder, { recursive: true });
const pass = process.env.ALMINA_CHECKOUT_STYLE_PASS ?? "verify";
if (!["before", "after", "verify"].includes(pass))
  throw new Error("Unknown checkout style capture pass");
for (const lang of ["en", "ar"] as const)
  for (const width of [390, 1280]) {
    test(`${lang} ${width} retained checkout details/review visual contract without placing an order`, async ({
      page,
      context,
      request,
    }) => {
      await reset(request);
      const initial = await state(request);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await context.addCookies([
        { name: "almina_lang", value: lang, url: checkoutOrigin },
      ]);
      await page.goto(checkoutOrigin + "/checkout");
      await page.evaluate(
        (id) =>
          localStorage.setItem(
            "almina.cart.v1",
            JSON.stringify([{ id, quantity: 2 }]),
          ),
        productId,
      );
      await page.reload();
      await expect(page.locator("[name=name]")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      async function capture() {
        return page.evaluate(() => {
          const selectors = [
            ".checkout-flow",
            ".checkout-progress",
            ".checkout-step-number",
            ".checkout-form-heading",
            ".checkout-form-section",
            ".checkout-form [name=name]",
            ".checkout-payment-choice",
            ".checkout-order-panel",
            ".checkout-mobile-action",
          ];
          return Object.fromEntries(
            selectors.map((selector) => {
              const el = document.querySelector(selector);
              if (!el) return [selector, null];
              const c = getComputedStyle(el);
              return [
                selector,
                Object.fromEntries(
                  [
                    "display",
                    "position",
                    "padding-top",
                    "padding-right",
                    "padding-bottom",
                    "padding-left",
                    "margin-bottom",
                    "border-color",
                    "border-width",
                    "border-radius",
                    "background-color",
                    "color",
                    "font-size",
                    "line-height",
                    "box-shadow",
                  ].map((p) => [p, c.getPropertyValue(p)]),
                ),
              ];
            }),
          );
        });
      }
      const details = await capture();
      for (const [name, value] of Object.entries(customer)) {
        if (name === "payment") continue;
        const field = page.locator(`[name="${name}"]`);
        if (name === "emirate") await field.selectOption(value);
        else await field.fill(value);
      }
      await page
        .locator('button[form="checkout-details"][type=submit]:visible')
        .first()
        .click();
      await expect(
        page
          .locator('button[form="checkout-details"][type=button]:visible')
          .first(),
      ).toBeVisible();
      await expect(page.locator(".checkout-flow")).toHaveAttribute(
        "data-stage",
        "payment",
      );
      const result = { details, review: await capture() };
      const name = `checkout-${lang}-${width}.json`;
      writeFileSync(
        `${folder}/${pass}-${name}`,
        JSON.stringify(result, null, 2) + "\n",
      );
      if (pass === "after")
        expect(result).toEqual(
          JSON.parse(readFileSync(`${folder}/before-${name}`, "utf8")),
        );
      expect(await state(request)).toEqual(initial);
      expect(initial.orders).toHaveLength(0);
      expect(initial.receipts).toBe(0);
    });
  }
