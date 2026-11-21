# Storefront validation — 2026-11-21

The implementation is on `feat/market-green-coral-storefront`, based on the open design-reset integration branch. All browser commerce data, accounts and provider responses used here are synthetic. No production mutation or real payment was performed.

## Checks

| Check | Evidence |
|---|---|
| Production build | `npm run build:foundation` completed with Next.js 16.4.6 / Turbopack. |
| Types | Root `npm run typecheck` passed across workspaces. |
| Lint | Root `npm run lint` passed without warnings. |
| Unit regressions | `npm run test:unit`: 281 passed. |
| Browser regressions | 112 unique selected scenarios verified across the final broad and focused runs: broad run 111/112; its gallery failure was corrected and the rebuilt 12-case gallery/responsive suite passed 12/12. |
| Framework runtime | Next DevTools `get_compilation_issues` returned an empty issue list; `get_errors` returned empty configuration/session errors. |
| Browser runtime | Settled demo captures recorded no uncaught page errors; React introspection identified the gallery, purchase dock and existing AddToCart state boundary. |
| Static payload inventory | `npm run analyze:web` measured compiled artifacts. This is not a field Core Web Vitals or initial-route transfer measurement. |
| Visual finish | Five material findings resolved; reviewer confirmed the correction batch. See [design review](MARKET_GREEN_STOREFRONT_DESIGN_REVIEW_2026-11-21.md). |

The selected browser suite covers search and suggestions; category URLs/pagination; draft filters, native GET serialization, preserved refinements and price validation; product families and selected-SKU persistence; gallery keyboard/swipe/zoom; quantity and stock limits; cart updates; account email/Google flows and logout; authoritative quotes, forged totals, pending-order retry and address/GPS failures; synthetic card/cash cancellation and recovery; public routes and compatibility assets. Axe checks run on navigation, public-information, checkout and confirmation surfaces, including mobile widths. They are automated checks, not a full accessibility certification.

Catalogue geometry is asserted at 320, 390, 768, 899, 900, 1024, 1199, 1200 and 1440px. Other functional suites include 360 and 1280px. English and Arabic routes, reduced motion, keyboard focus and dialog dismissal are exercised. New docking regression covers large scroll jumps while preserving quantity. The gallery regression exposed native image dragging and missing zoom focus restoration; disabling image dragging and explicitly restoring trigger focus resolved both. Gallery CSS permits vertical scrolling and native pinch zoom. The final correction also removes a surviving button-hover opacity utility that reduced coral CTA contrast below AA.

Several retained tests assumed obsolete presentation: inline phone filters, old 768/1024px navigation boundaries, a second fallback campaign, globally unique language controls, select-based payment, always-visible admin variant fields and stock-adjustment reasons, and the former worker notification destination. Tests now use the actual supported UI; price, inventory, immutable order, authentication and request-validation assertions remain intact. The earlier overlapping-build test run was discarded; the release suite uses one fixed compiled build.

## Rendered evidence

These local-demo screenshots use genuine missing-image fallbacks. The account screenshot intentionally shows the provider-unconfigured guest path; configured email/Google behavior is covered by isolated browser fixtures.

| Surface | Screenshot |
|---|---|
| Reset baseline before redesign, desktop | [1440px](screenshots/market-green/before-1440.png) |
| Reset baseline before redesign, phone | [390px](screenshots/market-green/before-390.png) |
| Redesigned homepage | [Desktop full page](screenshots/market-green/home-1440.png), [phone viewport](screenshots/market-green/home-390-viewport.png) |
| Product listing | [Desktop viewport](screenshots/market-green/listing-1440-viewport.png) |
| Product detail | [Phone viewport](screenshots/market-green/product-390-viewport.png) |
| Cart | [Phone viewport](screenshots/market-green/cart-390-viewport.png) |
| Checkout | [Phone viewport](screenshots/market-green/checkout-390-viewport.png) |
| Account guest fallback | [Desktop viewport](screenshots/market-green/account-1440-viewport.png) |
| Arabic homepage | [Phone viewport](screenshots/market-green/home-ar-390-viewport.png) |

## Release checks still outstanding

- Physical iOS/Android installed-PWA, landscape safe-area and software-keyboard testing; the current evidence is desktop Chromium emulation.
- Manual screen-reader, text-enlargement and text-spacing acceptance checks across the real catalogue.
- Real authorized pack photography, long production catalogue content and campaign approval. Synthetic image fallbacks establish behavior, not media readiness.
- Production field performance and browser-support verification. Large administration/editor chunks in the build inventory are outside this storefront visual scope; artifact totals must not be reported as initial storefront payload.
- Deployment/integration review after PR #102. Neither PR is automatically merged.
