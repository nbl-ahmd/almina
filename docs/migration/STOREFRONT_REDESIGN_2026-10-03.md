> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Storefront redesign — 2026-10-03

Implemented locally on `codex/storefront-design-system` in the additive Next.js storefront. The legacy production application, admin, APIs, database, media references, pricing rules and order submission behavior remain intact. No deployment or route cutover occurred.

## UI system

[The storefront design system](archive/storefront-design-2026-11-15/foundation-guide.md) was established before implementation using ui-ux-pro-max and the repository's production constraints. Executable semantic color/spacing/type/geometry/state tokens and shared component styles live in `apps/web/src/app/globals.css`. Retain the self-hosted PT Sans font and use one project-owned stroke SVG family. No additional styling framework, icon package or runtime dependency was installed; legacy Bootstrap/MUI are isolated in the legacy application.

## Result

| Area | Implemented behavior |
| --- | --- |
| Header/navigation | Official logo, prominent native search, cart link, current route indication, desktop navigation and five mobile destinations with reserved safe-area space. |
| Homepage | Editorial pharmacy introduction, clear catalog/offer actions, responsive category discovery, actual managed banners without autoplay, featured products and deals. |
| Cards/grid | Responsive 2/3/4/5-column layouts, wrapping product names, clear AED prices, subordinate original prices, sale/featured badges, explicit stock text and disabled unavailable actions. Larger text can reflow mobile cards into one column. |
| Search/filters | Existing GET search/category parameters, native labelled fields, explicit Apply and Clear filters. The keyed form resets its selected category after query clearing. |
| Details | Gallery and named thumbnail buttons, category/name/price/stock hierarchy, quantity/add action, description and related products with appropriate heading levels. |
| Cart | Server-read unit prices, native output for quantity, grouped controls, visible removal, checkout review panel, saved-cart error recovery and contextual loading/empty states. |
| Checkout | Existing gated review with editable cart and a call link using the phone already published in the legacy footer. No customer/payment form or order submission was activated. |
| Footer | Pharmacy identity, location, existing published phone/email and real shopping destinations. |
| Accessibility/states | Skip link, landmarks, labelled controls, 44–48px core touch targets, complete focus rings, distinct selected/focused gallery states, text announcements, reduced motion and static skeletons. |

Catalog prices, legacy sale-price presentation, stock checks, cart identifiers/storage import, closed-store handling and retry semantics stay on the existing paths. No authoritative subtotal, tax, delivery fee, discount or checkout calculation was added to the browser.

## Loading and HTTP status decision

Use shared catalog skeletons inside the homepage and listing-page Suspense boundaries. An ancestor `loading.tsx` was rejected after the compiled smoke demonstrated HTTP 200 for missing product URLs. Identity-sensitive product/category pages resolve 404/redirect decisions before streaming, preserving the existing real status-code contract. The final compiled smoke verifies missing products/categories, legacy redirects with retained queries and upstream failures.

## Verification

All checks passed on the final implementation:

- Full workspace typecheck and lint.
- 17 focused storefront, commerce, SEO and performance regressions. Commerce coverage includes authoritative integer-money calculations and rejection of tampered client totals/fees/stock.
- `build:foundation`: modular API bundle and Next.js 16.3.8 Turbopack production build, with isolated preview configuration and no database connection.
- Compiled storefront smoke: nine routes, useful server HTML, literal search, real 404s, preserved 308s/query parameters, outage handling, no upstream API writes and absent production MCP.
- Existing browser regression: direct navigation/reload, forged legacy cart values replaced by server prices, stock limits, quantity/removal/persistence, closed-store rejection, mobile navigation and error retry. React inspection retains server pages/navigation and small interactive islands.
- Final compiled browser visual matrix: homepage, products, categories, category detail, offers, search, product detail, populated cart and checkout at **360, 390, 768, 1024 and 1440px**. All **45** views have no page overflow, no broken product images, **zero axe violations and zero incomplete audit items**.
- Enter-to-search, apply/clear filters, gallery selection, unavailable controls, skip link, fixed-nav focus clearance, quantity/gallery focus rings, 200% mobile text scaling, reduced motion, visible catalog/cart loading, empty results/cart, 404s, catalog outage and saved-cart retry.
- No console errors on successful settled routes and no browser runtime errors. Deliberate outage tests log the expected boundary error; rapid navigation also produced cancelled-stream diagnostics. These were inspected separately from successful rendering.
- Next development MCP: no compilation issues or configuration/session errors on settled routes. Added-content credential-pattern scan: zero matches. Final diff excludes generated Next declarations and unrelated skill directories.

Screenshots and machine-readable results are local artifacts in `/tmp/almina-storefront-design/`. `verification.json` records every route/width/audit result. The `*-contact.png` files show the five widths together; individual full screenshots include loading, empty/error, unavailable and keyboard-focus states.

## Reproduce locally

The visual fixture is fictional, loopback-only, read-only with respect to commerce and database-free. Never use it as production catalog data.

Run in separate terminals from the repository root:

```sh
PORT=4120 node scripts/tooling/storefront-design-fixture.mjs

APP_ENV=development WEB_ORIGIN=http://127.0.0.1:3120 API_ORIGIN=http://127.0.0.1:4120 AL_MINA_ISOLATED_BUILD=1 npm run dev --workspace @almina/web -- --port 3120

node scripts/tooling/verify-storefront-design.mjs
```

For the compiled preview, stop that isolated development process before building:

```sh
APP_ENV=development WEB_ORIGIN=http://127.0.0.1:3121 API_ORIGIN=http://127.0.0.1:4120 AL_MINA_ISOLATED_BUILD=1 npm run build:foundation
AL_MINA_ISOLATED_BUILD=1 npm run smoke:storefront
APP_ENV=development WEB_ORIGIN=http://127.0.0.1:3121 API_ORIGIN=http://127.0.0.1:4120 AL_MINA_ISOLATED_BUILD=1 npm run start:web -- --port 3121
STOREFRONT_URL=http://127.0.0.1:3121 node scripts/tooling/verify-storefront-design.mjs
```

`AL_MINA_ISOLATED_BUILD=1` selects the fixed `.next-verification` directory; the normal `.next` and legacy build/start contracts remain the defaults. Git/ESLint ignore isolated generated output. The smoke runner honors the same output selection without inheriting provider/database configuration. Full-page captures temporarily enlarge the browser viewport to load native lazy images; they do not mutate React-owned image attributes before hydration.

## Activation and rollback

This completes the local storefront presentation work. Checkout activation still requires its separately verified commerce migration and owner/staging acceptance. Validate real catalog names/images/banners, actual CDN delivery, published contact details, browser/device behavior and real performance on sanitized staging before a progressive route cutover. These synthetic runs do not measure production Core Web Vitals or prove all WCAG requirements.

Rollback the storefront UI commit/files together, including the shared components and stylesheet. No database or media rollback is needed. Preserve the existing catalog/actions/SEO contracts and the checkout gate during rollback. The legacy application remains available throughout.
