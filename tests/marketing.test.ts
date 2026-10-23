import test from "node:test";
import assert from "node:assert/strict";
import {
  renderMarketingEmail,
  emailFooter,
} from "../apps/api/src/modules/marketing/render";
import {
  marketingTemplateSchema,
  marketingSendSchema,
} from "@almina/contracts";
import { marketingConnections } from "../apps/api/src/modules/marketing/delivery";
const source =
  '<mjml><mj-body><mj-section><mj-column><mj-text>Hello Al Mina</mj-text><mj-button href="https://alminapharmacy.com/products">Shop</mj-button></mj-column></mj-section></mj-body></mjml>';
test("marketing compiler produces email HTML while rejecting executable markup and filesystem includes", async () => {
  const result = await renderMarketingEmail(source);
  assert.match(result.html, /Hello Al Mina/);
  assert.match(result.html, /https:\/\/alminapharmacy.com\/products/);
  assert.match(result.html, /<table/);
  for (const injection of [
    '<mj-include path="/etc/passwd"/>',
    "<mj-raw><script>alert(1)</script></mj-raw>",
    '<mj-style>@import "https://evil.invalid";</mj-style>',
    '<mj-text onclick="alert(1)">Click</mj-text>',
  ])
    await assert.rejects(
      renderMarketingEmail(source.replace("Hello Al Mina", injection)),
      { code: "INVALID_REQUEST" },
    );
  const safe = await renderMarketingEmail(
    source.replace(
      "https://alminapharmacy.com/products",
      "javascript:alert(1)",
    ),
  );
  assert.doesNotMatch(safe.html, /javascript:/i);
});
test("marketing contracts require explicit approval, bounded templates and current revision", () => {
  assert.equal(marketingSendSchema.safeParse({}).success, false);
  assert.equal(
    marketingTemplateSchema.safeParse({
      id: crypto.randomUUID(),
      revision: 0,
      name: "Newsletter",
      subject: "News",
      previewText: "",
      mjml: source,
    }).success,
    true,
  );
  assert.equal(
    marketingTemplateSchema.safeParse({
      id: crypto.randomUUID(),
      revision: 0,
      name: "Newsletter",
      subject: "News",
      mjml: "x".repeat(120001),
    }).success,
    false,
  );
});
test("mandatory footer retains unsubscribe and escapes administrator supplied text", () => {
  const html = emailFooter(
    "https://api.example.invalid/u/token",
    "Town <script>alert(1)</script>",
  );
  assert.match(html, /Unsubscribe from marketing emails/);
  assert.doesNotMatch(html, /<script/);
});
test("campaign Resend connection does not switch transactional email away from SMTP", () => {
  const keys = [
    "MARKETING_EMAIL_ENABLED",
    "EMAIL_PUBLIC_API_ORIGIN",
    "MARKETING_POSTAL_ADDRESS",
    "EMAIL_MARKETING_DOMAIN",
    "RESEND_MARKETING_API_KEY",
    "EMAIL_REPLY_TO",
    "EMAIL_PROVIDER",
  ] as const;
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  try {
    Object.assign(process.env, {
      MARKETING_EMAIL_ENABLED: "true",
      EMAIL_PUBLIC_API_ORIGIN: "https://api.example.invalid",
      MARKETING_POSTAL_ADDRESS: "Synthetic address",
      EMAIL_MARKETING_DOMAIN: "news.example.invalid",
      RESEND_MARKETING_API_KEY: "re_synthetic_only",
      EMAIL_REPLY_TO: "team@example.invalid",
      EMAIL_PROVIDER: "smtp",
    });
    assert.equal(marketingConnections().providers[0]?.configured, true);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
