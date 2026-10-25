# SEO, policy pages and Merchant Center readiness — 25 October 2026

Local implementation only. Nothing in this change was deployed, and no
production data, order, price, stock, provider setting or channel account was
modified.

## Problem

Google Search Console and Merchant Center need public policy pages, crawlable
product media and explicit return/shipping terms. The storefront previously had
only a short account privacy notice, product JSON-LD could omit `image`,
`availability`, `hasMerchantReturnPolicy` and `shippingDetails`, and the static
sitemap did not contain policy URLs. Without those signals, product rich results
and Merchant listings are ineligible regardless of catalog quality.

## Policy pages

New server-rendered pages:

| Route | Purpose |
| --- | --- |
| `/returns` | Return, exchange and refund policy |
| `/shipping` | Delivery areas, live fees, handling and delivery estimates |
| `/terms` | Terms of service |
| `/privacy` | Full privacy policy (replaces the account-only notice) |

All four are linked from a new footer policy row and from the product page
delivery panel. They are included in `isPublicPath`, the static sitemap shard and
the SEO smoke test. Arabic footer labels were added; the policy bodies are
English-only for now.

`apps/web/src/lib/policies.ts` is the single source of truth for paths, business
contact details, the return policy, delivery estimates and the schema.org
builders. The same numbers are rendered on the pages and emitted in structured
data, so the markup cannot promise a window or fee that the page does not show.

The shipping page reads the same `commerce_policies` record used by checkout via
a new public, read-only endpoint:

- `GET /api/v1/growth/shipping` in `apps/api/src/http/routes.ts`
- `getShippingPolicy()` in `apps/web/src/lib/server/growth.ts`

The endpoint returns only the validated `commercePolicySchema` (currency, VAT
mode/rate, minimum order, cancellation behaviour and per-emirate delivery fees).
It exposes no customer, order or credential data. If the policy is missing or
invalid the page states that the live table is unavailable and product JSON-LD
omits `shippingDetails`; no fee is invented.

## Structured data changes

`apps/web/src/lib/seo.ts` now emits, for each Product/Offer:

- absolute HTTPS `image` URLs, using the storefront's own visible
  `/product-placeholder.svg` only when the catalog has no approved photo;
- `availability` derived from the same catalog stock value shown beside the
  price (`InStock` / `OutOfStock`);
- `hasMerchantReturnPolicy` with a 7-day finite window, UAE applicability,
  in-store return method, customer-responsibility return fees and a link to
  `/returns` for reviewed general-sale products. Medicines, prescriptions and
  unclassified products are marked `MerchantReturnNotPermitted` instead of
  inheriting the general window;
- `shippingDetails` with the lowest live delivery fee, UAE destination, 0–1 day
  handling and 0–5 day transit when the live policy is available;
- `aggregateRating` and up to ten `Review` entries only when approved reviews
  already exist. No rating, review or review count is generated.

The page metadata for every public route also sets `googleBot`
`max-image-preview: large`, `max-snippet: -1` and `max-video-preview: -1`, which
Google requires before it will show large product images in Search. Indexing
still follows the existing production and duplicate-query rules.

Organization/WebSite data now includes the public phone number, email,
locality, service country, contact point and logo image, and the WebSite node
references the Organization as publisher.

`/shipping` states the same 0–1 day handling and 0–5 day transit window that the
JSON-LD and feed publish. These are intentionally conservative store estimates,
not carrier guarantees.

## Sitemaps and search indexing

The static sitemap shard now includes `/returns`, `/shipping`, `/terms` and
`/privacy`, adds `/health-guides` only when at least one published guide exists,
and deduplicates editorial/collection URLs. Product and category shards are
unchanged. Translated growth pages now include an `x-default` hreflang pointing
at the English page.

No URL was removed or redirected. Existing product, category and editorial URLs
keep their canonical form.

Search Console website verification is optional and configuration-driven:

```bash
GOOGLE_SITE_VERIFICATION=<token-from-search-console>
```

When set, the root layout emits the Google verification meta tag. The value is
validated as a bounded token and never logged. Leave it unset to verify by DNS
instead.

## Google Merchant feed

`/feeds/google.xml` now appends a `<g:shipping>` block to every item using the
lowest live delivery fee and the same handling/transit estimates as the product
markup:

```xml
<g:shipping>
  <g:country>AE</g:country>
  <g:service>Standard delivery</g:service>
  <g:price>10.00 AED</g:price>
  ...
</g:shipping>
```

The feed remains dark by default. It returns 404 unless all existing gates pass:
`APP_ENV=production`, `CATALOG_FEEDS_ENABLED=true`, `CHECKOUT_ENABLED=true`, an
open store, a valid policy, and per-product Google approval, condition,
identifier review and an approved HTTPS photo. Products without a real photo
are still excluded from the feed even though their public page now has a valid
placeholder image for rich-result parsing.

Submitting this feed does not enroll the store in Merchant Center and does not
guarantee listings. The Merchant Center account must also be verified, the
website claimed, and business/shipping/return settings completed.

## Owner confirmation required before submission

The following are store-policy defaults written from the current checkout
behaviour and public contact details. The pharmacy/legal owner must confirm them
before Merchant Center submission:

1. 7-day return window from delivery for unopened, non-medicine products.
2. Medicines, prescription items and opened health, cosmetic or
   temperature-controlled products are excluded.
3. Returns are handled in store, with customer-responsibility return costs and
   no delivery-fee refund for change of mind.
4. Damaged, wrong or expired items must be reported within 48 hours.
5. Handling within 1 business day and delivery within 5 business days, with most
   Ras Al Khaimah orders arriving the same or next day.
6. Approved refunds are usually processed within 5–10 business days after
   inspection.
7. `+971 50 482 5007` and `info@alminapharmacy.com` are the monitored public
   contact channels.
8. The legal entity name, registered address, governing law and privacy
   retention periods are accurate for the UAE operating entity.

If any value changes, update `apps/web/src/lib/policies.ts` and the matching
page copy together; tests assert the shared values.

## Merchant Center blockers outside this change

- **Real product photography.** Placeholder images are valid URLs for structured
  data but are not acceptable product media for Merchant listings. Products
  without an approved photo remain out of the feed and may still be rejected.
- **Review coverage.** Aggregate rating markup appears only where real approved
  reviews exist. There is no synthetic rating strategy, and none should be
  added.
- **Merchant Center account settings.** Shipping and return settings in the
  account must match `/shipping` and `/returns`; Google compares feed, markup and
  account configuration.
- **Arabic policy versions.** Footer labels are translated but the policy pages
  themselves remain English-only.
- **Country-level shipping rate.** The structured data and feed publish the
  lowest live UAE delivery fee, while `/shipping` shows each emirate's fee.
  If Merchant Center requires per-emirate accuracy, configure regional shipping
  in the account or split the offer by region rather than changing checkout
  behaviour to fit the feed.
- **Legal review.** The policy text is an accurate operational draft, not a
  substitute for UAE legal review.

## Search Console steps after deployment

1. Verify the production property by DNS or by setting
   `GOOGLE_SITE_VERIFICATION` and redeploying.
2. Submit `https://www.alminapharmacy.com/sitemap.xml`.
3. Inspect `/returns`, `/shipping`, `/terms` and `/privacy`; request indexing if
   they are not discovered automatically.
4. Inspect a product with a real photo and a product without one, and confirm
   the Product report distinguishes valid markup from missing merchant media.
5. Confirm `robots.txt` and the sitemap index still return the production host.
6. Only after the owner confirms the policy values, enable the feed and submit
   `https://www.alminapharmacy.com/feeds/google.xml` in Merchant Center.

## Rollback

The change is additive and has no data migration:

- unset `GOOGLE_SITE_VERIFICATION` to remove the verification tag;
- leave `CATALOG_FEEDS_ENABLED=false` to keep the feed dark;
- reverting the commit restores the previous metadata, sitemap and feed output;
- the new `/api/v1/growth/shipping` route is read-only and can remain deployed
  without affecting checkout;
- no catalog, order or policy document is rewritten by this change.

## Verification evidence

Run from the repository root on 25 October 2026:

```bash
npm run typecheck
npm run lint
npm run test:unit
APP_ENV=production NODE_ENV=production \
  WEB_ORIGIN=https://shop.example.invalid \
  API_ORIGIN=https://api.example.invalid \
  LEGACY_API_ORIGIN=https://legacy.example.invalid \
  AL_MINA_ISOLATED_BUILD=1 npm run build --workspace @almina/web
AL_MINA_ISOLATED_BUILD=1 npm run smoke:seo
```

Results:

- root and workspace typecheck passed;
- full ESLint passed;
- 204 unit tests passed, including new return/shipping/feed/review assertions;
- isolated Next.js 16.4.2 production build compiled all policy routes;
- SEO smoke passed raw production HTML, metadata, no-JS product content,
  nonce-safe JSON-LD, indexing exclusions, 404/redirect behaviour, robots,
  dynamic sitemaps and upstream-outage handling.

The smoke fixture confirmed a live shipping policy produces
`shippingDetails.shippingRate.value = "10.00"`, `merchantReturnDays = 7`, and
`OutOfStock` / `InStock` matching the rendered stock state.

## Files

- `apps/web/src/lib/policies.ts`
- `apps/web/src/lib/seo.ts`
- `apps/web/src/app/(storefront)/returns/page.tsx`
- `apps/web/src/app/(storefront)/shipping/page.tsx`
- `apps/web/src/app/(storefront)/terms/page.tsx`
- `apps/web/src/app/(storefront)/privacy/page.tsx`
- `apps/web/src/app/(storefront)/products/[slug]/page.tsx`
- `apps/web/src/app/sitemaps/[kind]/[page]/route.ts`
- `apps/web/src/components/navigation.tsx`
- `apps/web/src/lib/server/growth.ts`
- `apps/api/src/http/routes.ts`
- `apps/web/src/lib/catalog/feed.ts`
- `apps/web/src/lib/catalog/feed-response.ts`
- `apps/web/src/app/feeds/[channel]/route.ts`
- `apps/web/src/lib/i18n.ts`
- `apps/web/src/lib/i18n-storefront.ts`
- `packages/config/src/env.ts`
- `scripts/tooling/smoke-seo.mjs`
- `scripts/tooling/storefront-fixture.mjs`
- `tests/seo.test.ts`
- `tests/catalog-preparation.test.ts`
