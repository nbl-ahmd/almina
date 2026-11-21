# Storefront route migration — 2026-10-02

> SEO follow-up (2026-10-03): production indexing and permanent redirect defaults below are superseded by [the storefront SEO implementation](STOREFRONT_SEO_2026-10-03.md). Non-production previews remain noindex; no production cutover has occurred.

## Scope and route ownership

This is an additive, isolated Next.js preview. The legacy storefront/backend remain the deployed application; no production routing, MongoDB records, media or order logic were changed. Security and commerce blockers in the production audit remain open. Do not cut over the preview or enable ordering while those blockers remain.

| Route | Next implementation | Compatibility |
| --- | --- | --- |
| `/` | Server-rendered banners, categories, featured products, deals | Existing root path retained |
| `/products` | Server catalog, category/search filters, bounded page links | Existing path retained |
| `/products/[slug]` | Server product description, price/category, related products; client gallery and add control | Identity is the existing `product_id` |
| `/categories` | Server category list | Existing path retained |
| `/categories/[slug]` | Server category catalog | Existing MongoDB category ID embedded in slug |
| `/offers` | Server sale filter | Existing path retained |
| `/search?q=...` | Server literal search | Existing query preserved; regex metacharacters escaped |
| `/cart` | Server page with browser storage island; catalog validated through server actions | Imports existing `cartItems` IDs/quantities on the same origin |
| `/checkout` | Saved-cart review, ordering unavailable in preview | No order submission, PII form, payment or API writes |
| `/productdetails/[id]` | Validated compatibility route handler | Resolves legacy custom product ID; retains query parameters |

Product slugs are `name--PD0001`; category slugs are `name--<MongoDB ID>`. Names are readable prefixes, never lookup keys. Duplicate names remain distinct. Previously generated name prefixes continue to resolve after renaming; metadata points to the current canonical path. No schema migration or slug backfill is necessary. Existing stable IDs must remain unique; verify their uniqueness and presence against a read-only production inventory before cutover.

Old `/categories/<MongoDB ID>` URLs render the matching catalog with the redirect gate off. Old product-detail URLs temporarily redirect (307) to the verified identity route with the gate off. `STOREFRONT_REDIRECTS_VERIFIED=true` switches both legacy URL forms to 308. The gate defaults to false in every environment. Local synthetic targets were verified before testing the permanent redirect mode; this does not approve permanent redirects for production data. Unknown, disabled or orphaned products/categories are not redirected. Product compatibility upstream failures return 503 without a redirect.

There is no root loading boundary: resolving category aliases before streaming preserves real 308/404 statuses. Product list loading uses Suspense; offers/search use route loading boundaries. The root error/not-found/global-error conventions remain active. Unmigrated public and admin routes must continue to be owned by the legacy host/router; switching the whole host to Next would break them. Edge route ownership and deployment commands are a separate cutover gate.

## API and browser boundaries

`src/lib/server/catalog.ts` is the guarded read-only legacy adapter. `LEGACY_API_ORIGIN` defaults to the foundation `API_ORIGIN`, but should explicitly point at a sanitized legacy-compatible staging API for catalog verification. The foundation API deliberately does not provide catalog endpoints. Settings are server-only, origin/credential validated, and HTTPS is required outside development. No legacy env file/startup is imported.

Catalog requests are uncached, have an eight-second timeout and reject upstream redirects. Filters are generated from allowed server options, not user-supplied MongoDB objects. Pagination is bounded to 30 upstream records per page and 1,000 pages. Legacy category filtering happens after pagination in the backend; a page can contain fewer than 30 visible products and still offer a next page. Missing optional disabled flags are tolerated by normalization, while missing populated categories, invalid prices/stock or identifiers fail closed. Legacy list query semantics remain unchanged; records lacking fields used by its existing filter can still be excluded upstream.

Returned product/category data is narrowed to display fields; barcode, Drive metadata and other raw fields do not reach client components. Legacy `image` CDN paths and `images[]` API paths are retained, including the gallery. `next/image` delivers existing media directly using `unoptimized`, avoiding a new application media proxy or unsafe localhost optimizer configuration. No media was moved/deleted. Full production visual/media parity, including banner selection and original zoom/animation interactions, remains a staging acceptance gate.

There is no global cart/client provider. Client code reads storage only after hydration or in event handlers. The new `almina.cart.v1` representation contains only IDs and bounded integer quantities, imports valid legacy snapshots without their prices/stock/roles/PII, and leaves the original storage key intact. Invalid/duplicate/oversized carts fail closed. Changes observe storage events and reject concurrent changes while stock checks are pending. Server actions re-read current product prices, visibility, stock and store status. These checks improve cart feedback; they do not reserve inventory or secure the legacy order endpoint. The cart shows current unit prices, without inventing an authoritative tax/delivery/final-total policy.

Rollback retains the legacy `cartItems` snapshot; new cart changes are not dual-written as trusted legacy price snapshots. A cart reconciliation/rollback policy is required before a same-origin production cutover. Separate preview origins cannot access production browser storage.

## Checkout gate and outstanding work

The legacy checkout sends client-computed totals and full product snapshots to an unsafe stock/order handler. This implementation intentionally exposes no order submission route or submit control. The preview tells the shopper ordering is unavailable and preserves the cart. Live checkout migration is **not complete**. Required next work: approved VAT/delivery/payment policy, server quote/calculation, immutable snapshots, idempotency, concurrency-safe/atomic inventory/order creation, regression tests and verified integration behavior. Do not describe the preview review page as a working purchasing flow.

Before production cutover, verify actual production URL/media inventory, legacy identifiers, deployed API response shapes, real mobile flows, cache behavior, authentication/security remediation, checkout integrity and original visual parity. Keep noindex until reviewed cutover. Enable permanent redirects only after actual target data and routing have passed these checks; cached 308s make rollback more involved than changing an environment flag.

## Reproducible isolated verification

Use `node scripts/tooling/storefront-fixture.mjs` on loopback port 4100, then `LEGACY_API_ORIGIN=http://127.0.0.1:4100 npm run dev -- --port 3100`. The fixture has synthetic product/category data and no database/provider/customer dependencies. Its control paths are tooling-only and never mounted by the web/API application.

Run `npm run verify:storefront:browser` with agent-browser >=0.31.1. It is restricted to loopback and verifies the fixture marker before touching isolated browser storage. It exercises direct navigation/reload, dynamic details, 404s, legacy URL navigation, imported forged prices, quantities/low-stock, removal, store closure, persistence, mobile links/layout, React boundaries and upstream error recovery. Next.js `/_next/mcp` provides route/compilation/error checks in dev only.

Run `npm run build:foundation` with `APP_ENV=development` after stopping the development server, then `npm run smoke:storefront` and `npm run smoke:foundation`. Storefront smoke starts its own fixture and compiled Next process with a minimal credential-free environment; it verifies rendered HTML, nine expected routes, literal search, true 404s, 308s/query retention, upstream failure and absent production diagnostics/order endpoints. It performs no upstream writes. Root build/start remain the legacy deployment contract.

Verification result: typecheck/lint, all 34 tests, production Turbopack build, both compiled smoke suites and the browser workflow passed. Permanent mode returns actual 308 responses for both legacy URL forms with repeated query parameters retained. Normal runtime MCP reported no compilation/config/session errors after recovery from the intentional fixture outage. The outage exercise also triggered a React development performance-measure warning; it disappeared on fresh navigation and was absent from normal routes. Production data and purchasing workflows were not exercised.
