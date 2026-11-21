# Growth programme completion — working notes and handoff (19 October 2026)

Continuation/handoff document for finishing `GROWTH_FOUNDATION_2026-10-19.md` and
`COMMERCE_PLAN_IMPLEMENTATION_2026-10-19.md`.

Read this file first, then the two documents above. It is written so a new session
with no chat context can resume safely.

No production database migration, deployment, paid campaign, or outbound customer
message was performed. Everything here is additive code plus tests, and every new
behaviour is off by default.

## Reading order

A new session should read, in this order:

1. `docs/migration/GROWTH_COMPLETION_2026-10-19.md` (this file) — current state,
   Phase 4 checklist and the next slice.
2. `docs/migration/GROWTH_FOUNDATION_2026-10-19.md` — implemented growth/account/
   points surface, activation requirements and broader outstanding work.
3. `docs/migration/COMMERCE_PLAN_IMPLEMENTATION_2026-10-19.md` — homepage/discovery
   implementation against the commerce direction, plus its “Still needed” table.
4. `docs/migration/MIGRATION_STATUS.md` — the running status log. Read the newest dated
   entries at the top and the final “Growth programme completion pass” section.
## Final state of this pass

| # | Item (from the foundation document) | State |
| - | ----------------------------------- | ----- |
| 1 | Consented abandoned-cart recovery | **Done** (implemented in `81215ce`, hardened + integration-tested here) |
| 2 | Restock / price-drop / replenishment alerts + delivery worker | **Done** (same commit, verified here) |
| 3 | Genuinely complementary curated bundles | **Done** |
| 4 | Verified operational branch / serviceability management | **Done** |
| 5 | Full Arabic shopping/checkout translations | **Interface code slices complete** — cart-adjacent panels, delivery/search/cart chrome, catalogue/PDP/homepage controls and server-returned cart messages/emirate labels now join the previously localized cart/checkout. Native/pharmacy review, Arabic plural review and staff-authored catalogue/editorial translations remain. See the 20 October continuation below. |

Operational work that cannot be completed from code stays pharmacy-owned: Google
Business Profile, Search Console / Merchant Center / Meta verification, advertising
budgets and creatives, clinical/photo/stock verification, offer approval, and
pharmacy-approved delivery promises.

## Files changed in this pass

New:

- `packages/contracts/src/serviceability.ts` — branch directory, serviceability policy, `isServiceable`.
- `apps/api/src/modules/growth/branches.ts` — branch/serviceability storage + `assertServiceable`.
- `apps/web/src/components/bundle-add.tsx` — add-all client control for a curated bundle.
- `apps/web/src/components/admin/branches-editor.tsx` — admin branch + serviceability editor.
- `apps/web/src/lib/i18n.ts` — locale cookie, dictionary, `t()`.
- `apps/web/src/lib/server/i18n.ts` — `getLocale()`.
- `apps/web/src/components/language-switcher.tsx` — cookie + refresh switcher.
- `tests/retention-integration.test.ts` — disposable-replica retention suite.
- `docs/migration/GROWTH_COMPLETION_2026-10-19.md` — this file.

Modified:

- `packages/contracts/src/growth.ts` — optional `bundle` / `bundleReason` on growth pages.
- `packages/contracts/src/index.ts` — `ADDRESS_NOT_SERVICEABLE` error code, serviceability export.
- `apps/api/src/errors.ts` — message for the new error code.
- `apps/api/src/modules/growth/repository.ts` — server-side bundle validation.
- `apps/api/src/modules/growth/delivery.ts` — serviceability on the delivery preview.
- `apps/api/src/modules/orders/commerce.ts` — `assertServiceable` in the single quote/checkout funnel.
- `apps/api/src/http/routes.ts` — `/growth/branches`, `/admin/growth/branches`, `/admin/growth/serviceability`.
- `apps/web/src/components/growth-landing.tsx` — bundle panel + literal fields for the brand fallback.
- `apps/web/src/components/admin/growth-manager.tsx` — bundle fields + `BranchesEditor` mount.
- `apps/web/src/lib/server/growth.ts` — `getBranchDirectory()`.
- `apps/web/src/app/(storefront)/ras-al-khaimah/page.tsx` — verified directory with the previous four branches as fallback.
- `apps/web/src/components/navigation.tsx` — locale-aware shell + footer, switcher.
- `apps/web/src/components/navigation-links.tsx` — locale-aware labels.
- `apps/web/src/app/(storefront)/layout.tsx` — reads locale, sets `lang`/`dir` on the shell.
- `tests/growth.test.ts` — bundle + serviceability unit tests.
- `tests/growth-integration.test.ts` — branch/serviceability integration case.
- `scripts/tooling/test-commerce-integration.mjs` — registers the retention integration file.

## What was implemented (detail)

### Curated complementary bundles

- Growth pages gained optional `bundle` and `bundleReason`. The schema requires a
  collection kind, at least two product IDs, and a rationale of at least 20 characters.
- `saveGrowthPage` additionally loads the chosen live products and rejects the save
  unless every ID is visible (not disabled/published:false/archived) and the set spans
  at least two categories. Duplicate IDs are rejected. No discount, cash value or
  forced checkout is created.
- The storefront renders a “Curated together” panel with the staff rationale and an
  add-all control that reuses the existing browser cart and server revalidation.
- Admin: “Website & growth → Collection” shows a **Curated complementary bundle**
  checkbox and the rationale field.

### Verified branches and server-authoritative serviceability

- `growth_settings _id: 'branches'` holds a bounded directory (max 20 branches, each
  with a `verified` flag and optional areas/hours/map URL). The public read returns an
  empty directory until the directory itself is verified; the admin read returns the
  draft. Saving a publicly-verified directory requires every branch to be verified and
  to have a name and phone.
- `growth_settings _id: 'serviceability'` holds an inactive-by-default rule
  (`active`, served `emirates`, `blockedCities`, `notes`). An active rule must have at
  least one emirate and a note of at least 20 characters.
- `assertServiceable` is called inside `quoteFrom`, the single funnel used by both
  quote and checkout, and by the delivery preview. It throws `ADDRESS_NOT_SERVICEABLE`
  (HTTP 422). When the rule is absent or inactive, behaviour is byte-identical to before.
- `/ras-al-khaimah` shows the verified directory when present and otherwise keeps the
  existing four branch cards, including the Al Jazeera Al Hamra note and map link.
- **Corrected boundary (20 October):** both legacy `/api/orders` quote/create and
  v1 checkout already use `createCommerceService` from
  `apps/api/src/modules/orders/commerce.ts`, so both enforce this rule. The legacy
  HTTP error serializer omitted its specific code; that omission is corrected and
  tested against all four endpoints. The checkout interface now displays the localized
  delivery-area error. No second implementation of the policy was introduced.

### Arabic shopping/checkout (started)

- `apps/web/src/lib/i18n.ts` holds the cookie name (`almina_lang`), an `en`/`ar`
  dictionary for the navigation/footer chrome, and `t()`.
- `apps/web/src/lib/server/i18n.ts` reads the cookie; invalid/absent values fall back
  to English.
- The storefront layout sets `dir="rtl"` and `lang="ar"` on the shell, and the
  navigation/footer plus the mobile/desktop nav labels render in Arabic. A language
  switcher appears in the desktop top bar and the mobile footer.
- English is the default, so every existing string and test is unchanged.
- Cart and checkout follow-up slices (19–20 October 2026) extended the same dictionary
  to the cart surface and checkout form; see the Phase 4 checklist below.

## Phase 4 continuation — Arabic shopping/checkout

Goal: finish the Arabic shopping/checkout interface. Product/category/health content
stays staff-translated through the CMS (`locale: 'ar'`), never machine-invented.

### Checklist

- [x] Locale cookie, RTL shell, `t()`/`tf()` dictionary, header/footer language switcher.
- [x] Cart page: headings, breadcrumb, empty/error/loading states, item count
      (`Intl.PluralRules`), item rows, quantity/remove aria labels, summary, help panels,
      CTAs.
- [x] Checkout page shell and the checkout-unavailable notice.
- [x] Checkout form: API error map, contact/delivery/payment sections, every label and
      placeholder, saved-address control, GPS status/error strings, review/place/retry
      buttons, confirmation screen and summary rows. Currency uses
      `Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', …)`.
- [x] Cart-adjacent panels: `delivery-progress.tsx` free-delivery copy and
      `customer-reminders.tsx` signup copy.
- [x] Storefront chrome gaps: first-visit delivery-area prompt
      (`delivery-location.tsx`), header search placeholder/labels, cart-link label.
- [x] Catalogue/PDP: `catalog-list.tsx`, `product-card.tsx`, `storefront.tsx`,
      `homepage.tsx` — including cart recommendations, availability, purchase and variant
      controls, product-information panel labels and carousel controls.
- [x] Server-returned copy: the `checkAddition` cart validation message and emirate
      option names now have locale-aware display labels; contract values remain unchanged.
- [ ] Native Arabic speaker / pharmacy review of every string before publication.
- [ ] Arabic plural forms currently use a two-form `one`/`other` fallback
      (dual/few/many are not distinguished yet).

### Next slice order

1. Cart-adjacent panels (`delivery-progress.tsx`, `customer-reminders.tsx`) — smallest
   shared surface, low regression risk.
2. Storefront chrome gaps (`delivery-location.tsx`, header search/cart labels).
3. Catalogue/PDP (`catalog-list.tsx`, `product-card.tsx`, `storefront.tsx`,
   `homepage.tsx`).
4. Server-returned copy (`checkAddition` message, emirate display names).
5. Native Arabic/pharmacy review, then Arabic plural forms if the reviewed copy needs
   dual/few/many.

### What changed

`apps/web/src/lib/i18n.ts` now carries the cart and checkout dictionaries plus `tf()`
for `{name}`/`{count}` placeholders. `CartView` and `CheckoutForm` take
`locale?: Locale` (default `'en'`); the cart and checkout pages read the locale cookie
server-side and pass it down. Internal checkout errors were changed from matching
English message text (`startsWith('Your cart')`) to typed `InputError` codes
(`CART_EMPTY`/`CART_CHANGED`) so tests and behaviour do not depend on copy. The
one-shot pending-order recovery effect intentionally keeps `[]` deps (documented
inline) so a language switch cannot reset typed delivery details.

English values are byte-identical; `tests/i18n.test.ts` pins the exact strings the
browser suite asserts (`Review order`, `Order received`, `Place order — AED 40.00`,
cart headings) and the placeholder contract.

### Verification (19–20 October 2026)

- `npm run typecheck`, `npm run lint`, `npm run test:unit` — 162 tests pass.
- Isolated foundation build and `AL_MINA_ISOLATED_BUILD=1 npm run test:e2e:smoke` —
  91 passed after both the cart and checkout-form slices, so English output is unchanged.
- Live fixture-server check with `almina_lang=ar`:
  - `/cart`: `lang="ar"`, `dir="rtl"`, Arabic copy and Arabic aria labels, count
    resolves `1 منتج في سلتك`, zero console errors.
  - `/checkout` (checkout-enabled instance): Arabic form labels, GPS button, payment
    section and saved-address control; review → `ملخص الطلب` with
    `‏40.00 د.إ.‏`, `ضريبة القيمة المضافة (شاملة)` and
    `تقديم الطلب — ‏40.00 د.إ.‏`; placing the synthetic order shows
    `تم استلام الطلب` and the Arabic confirmation, zero page errors. The only console
    entry is the pre-existing guest `401` from `/api/customer/addresses`, which the form
    ignores.
- Still English on those pages: recommendation product cards, the delivery-progress
  sentence, the reminder signup panel, the first-visit delivery-area prompt, the header
  search placeholder/labels, emirate option names and `cart`/`checkout` metadata titles.

## Verification run in this pass

All green on this machine:

- `npm run typecheck`
- `npm run lint`
- `npm run test:unit` — 157 tests
- `npm run test:integration` — 87 disposable-replica tests (includes the new retention suite and existing checkout/reward suites, proving serviceability off = no change)
- `npm run test:release` — 7 tests
- `npm run audit:security` — 0 high / 0 critical
- `APP_ENV=development DATABASE_MODE=disabled WEB_ORIGIN=http://127.0.0.1:3000 NEXT_TELEMETRY_DISABLED=1 AL_MINA_ISOLATED_BUILD=1 npm run build:foundation`
- `AL_MINA_ISOLATED_BUILD=1 npm run smoke:foundation` / `smoke:storefront` / `smoke:seo`
- `AL_MINA_ISOLATED_BUILD=1 npm run test:e2e:smoke` — 91 passed

Note for the next session: isolation env. `AL_MINA_ISOLATED_BUILD=1` builds to
`apps/web/.next-verification`; the E2E/smoke servers must be launched with the same
variable or they look for `.next` and fail with “Could not find a production build”.

## Storage, rollback and compatibility

- No new collection was required. Branch and serviceability data live in the existing
  `growth_settings` document store; bundle fields are additive optional fields on
  existing `growth_pages` documents. Legacy documents parse with defaults, so old rows
  keep the previous behaviour.
- No production data, index, price, stock or order was changed. Serviceability and the
  branch directory default to inactive/unpublished.
- Rollback is a code rollback; the additive fields and settings documents are inert.

## Decisions and assumptions log

- All new behaviour is dormant until staff explicitly enable/verify it.
- No bundled discount, no cash value, no automatic customer messaging.
- Do not change existing product/order identifiers, URLs or stored totals.
- The Arabic chrome copy is a first pass and requires native/pharmacy review.


## Phase 4 continuation — 20 October 2026

Implemented the four code slices in the documented next-slice order. See
[Arabic continuation audit](ARABIC_PHASE_FOUR_2026-10-20.md) for exact verification
and remaining review boundaries. Earlier “still English” observations above record
the previous checkpoint and are superseded for the named interface surfaces.

- Cart-adjacent: free-delivery progress and consented reminder signup, choice labels,
  interpolation, statuses and sign-in link. No reminder policy or email sending activated.
- Chrome: first-visit area prompt, delivery dialog/manual/GPS messages, header search
  and suggestion/history labels, and cart accessible names.
- Catalogue/PDP/home: filters, pagination/empty states, card availability/options/prices,
  add-to-cart/quantity/status controls, gallery/variant labels, information-panel labels,
  saved/review controls, homepage built-in marketing text and carousel controls. Product,
  category, pack, ingredient, warning, review and CMS text remains unchanged; staff owns
  the content translations. Shared components remain server components; locale is passed
  only to existing interactive components. English prices retain exact `AED 0.00` formatting.
- Server copy: cart-load/stock/closed-store messages read the locale cookie. Emirate
  display labels are Arabic while select values, stored area and API contract values stay
  canonical English. Cart and checkout titles are localized with their robots policies intact.
- RTL: keep fixed campaign artwork in its original visual position and give Arabic copy
  its own clear text region; directional arrows mirror. Arabic uses an explicit system
  sans-serif fallback; English retains the same Outfit font.

Native Arabic/pharmacy approval remains required. The existing one/other unit fallback
has not been presented as a complete Arabic dual/few/many grammar implementation. The
account dashboard, admin and staff-authored editorial/clinical content are not certified
as fully translated by this scoped shopping/checkout pass. No production data, prices,
stock, order, provider configuration, publication state or deployment was changed.


## Campaign merchandising continuation — 20 October 2026

Implemented the next independently developable CMS slice while native Arabic/pharmacy
review remains pending. Staff can select desktop/mobile artwork, choose a hero or
supporting homepage placement and priority, reorder pinned products, preview unsaved
artwork/copy, and run advisory readiness checks. Only published, current, matching-locale
campaigns with available selected products appear; old content defaults to no placement.
Existing image-banner and generated-product hero fallbacks remain available. Campaign
presentation never creates a discount or changes stock/prices.

See [campaign implementation and verification](CAMPAIGN_MERCHANDISING_2026-10-20.md)
for compatibility, API-first release order, test evidence and remaining work. This is a
local development checkpoint; no production content, database/index or deployment changed.


## Customer sign-in completion — 20 October 2026

The account screen now provides one first-visit/returning flow with the official Google
button (when configured), passwordless email codes, resend/change-email, loading/error
states and guest checkout. Existing account features remain available after sign-in.
Google identity binding and disabled-account session creation are hardened; logout also
clears expired sessions. See [customer account checkpoint](CUSTOMER_ACCOUNT_2026-10-20.md)
for verification, additive index and exact provider setup. The owner confirmed Google
OAuth has not been configured. Real Google consent and email receipt are pending; no
production configuration, customer data, reward policy or deployment was changed.
