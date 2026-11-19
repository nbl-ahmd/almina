# P6-02 — Final local verification matrix

19 November 2026. Runtime source `8f73784` on `codex/storefront-pharmacy-app-reference`. Next.js 16.4.2 Turbopack build tagged `p6-matrix`. Changes in this task are limited to verification and evidence.

## Results

| Check | Result | Scope |
| --- | --- | --- |
| Isolated production build, root/workspace typecheck and lint | Passed | The filter hydration test now uses a promise compatible with the repository’s TypeScript target. Its delayed-script behavior is preserved. |
| Unit and design authority | Passed | 274 unit cases and five focused checks for the accepted design authority and token source. Two database-gated SEO cases skipped without an opt-in URI. |
| Raw HTML and SEO | Passed | Production-mode loopback TLS with a synthetic canonical origin. Raw metadata, visible product facts, JSON-LD, CSP nonces, indexing, redirects, 404s, robots, sitemap and outage behavior. The heading assertion now reads the text inside bilingual `bdi` markup. |
| Chromium interaction | 215 passed | Retail and shared routes, both locales, navigation and search, groups and stock, cart, checkout and payment, customer auth, wholesale, staff boundaries and feature-gated telemetry. |
| WebKit interaction | 27 passed | Listing and early filter hydration, product return, responsive controls, modal/focus behavior, bilingual route recovery and checkout presentation. |
| Firefox interaction | 27 passed | Same suite as WebKit. The listing test asserts the 44px CSS minimum and accounts for subpixel bounding-box precision. |
| Compiled route and viewport sweep | 864 passed | 16 route states at nine sizes in two locales and three engines. Expected 404 for the missing route. No horizontal page overflow, wrong shell direction or uncaught page exceptions. The guest address, saved-account and identity requests return the expected 401. |
| Firefox enlarged rendering | 18 passed | Effective 200% platform scaling, 683×300 CSS viewport. The nine primary surfaces in each locale rendered without horizontal overflow. The separate normal-scale sweep covers the 320px reflow boundary. |
| Automated accessibility | 16 clean, 2 flagged | axe WCAG A/AA scans at 390×844 on nine primary surfaces in both locales. Both flags are the same account privacy-link issue, recorded as NEW-007. |
| Development preview and Next diagnostics | Passed with a development-only observation | Reviewed-photo reference catalogue on the existing loopback preview. |

The width sweep used 320×740, 360×800, 390×844, 667×375, 768×900, 900×960, 1280×900, 1440×900 and 1920×1080, with live resize on each route. It covered home, search, catalogue, category, offers, product detail, a populated cart, both checkout modes, signed-out account, saved products, category directory, support, privacy, wholesale and root recovery. [Machine-readable matrix](p6-02-matrix/summary.json).

The matrix used a local read-only catalogue with synthetic product, prices and stock. Signed-out account and reminder responses were explicitly simulated in the fixture. The interaction suites used the existing isolated catalogue, customer, staff and commerce fixtures. Those suites cover populated and sparse content, long and mixed-script names, image and catalogue failure, empty/loading states, live resize, keyboard and focus return, saved and cart reload, exact SKU selection, server quote conflicts, order retry, payment recovery and feature gating. The checkout keyboard test simulates the reduced visual viewport.

## Consent and recovery

The five baseline checkout telemetry failures came from queries for controls in the intentionally hidden checkout footer. The tests now use the existing cart-footer preferences, and exercise consent before placing a synthetic order, withdrawal and browser privacy override. The search suite separately verifies independent opt-in for query reporting. They verify that unconsented review emits no reports, withdrawal persists across reload, and reporting neither changes authoritative commerce state nor carries order details. The price-change test uses alert semantics so the markup can change without losing coverage. All eight telemetry cases are included in the passing Chromium run.

The reference preview exercised 16 repeated browse and Back cycles with one session per engine/locale combination. The earlier Arabic home loading stall (NEW-006) did not recur in this bounded run. Rapid WebKit navigation reported 14 canceled optional API requests per locale on the development preview. The same 16-cycle sweep reported no page exceptions when pending API requests were allowed to settle. The compiled viewport sweep also reported no page exceptions. Next diagnostics reported no compilation, configuration or session errors at the time of the check.

## Finish-review finding

**NEW-007** — On the signed-out email sign-in view, the inline privacy notice link is distinguished from adjacent text by color alone. Chromium axe reports `link-in-text-block` in English and Arabic. The link is in `apps/web/src/components/customer-sign-in.tsx`. Carry it into P6-03 for a persistent visible link cue and a fresh bilingual focus, contrast and axe check.

## Reviewed-photo captures

The final review recaptured the storefront after the catalogue and photos had loaded. Use the [settled P6-03 captures](phase-6.md#review-the-storefront) for appearance. This report preserves the P6-02 route and interaction results.

## Commands and limits

- Build from the root with `APP_ENV=development DATABASE_MODE=disabled NEXT_TELEMETRY_DISABLED=1 AL_MINA_ISOLATED_BUILD=1 AL_MINA_VERIFICATION_TAG=p6-matrix npm run build --workspace @almina/web` in a clean environment.
- Run `npm run typecheck`, `npm run lint`, `npm run test:unit`, and `npx --no-install tsx --test tests/{storefront-authority,storefront-system,seo-database}.test.ts`.
- Run `AL_MINA_ISOLATED_BUILD=1 AL_MINA_VERIFICATION_TAG=p6-matrix npm run smoke:seo`.
- Run Playwright with the same build flags, `--reporter=list`, and the existing one-worker fixture policy. The Chromium run used `tests/e2e/{arabic,campaigns,cart-presentation,catalog-discovery,catalog-filters,catalog-listing,checkout-design-review,checkout-presentation,checkout-style-contract,commerce,customer-account,customer-information,mobile-storefront-shell,navigation-menu,navigation,next-checkout,product-cards,product-detail-layout,product-families,product-information,product-return,public-routes,recovery,responsive-layout,search,shared-controls,storefront-chrome,storefront-home,storefront-phase-3,storefront-retirement,storefront-ui-repairs,storefront,stripe-checkout,telemetry,wholesale}.spec.ts`. The WebKit and Firefox runs used `responsive-layout storefront-phase-3 checkout-presentation product-return catalog-listing` with the corresponding `--browser`.
- Full local traces, raw measurements and captures are in `.verification-results/p6-02-*`. The tracked matrix and selected captures keep the checkpoint usable without those local files.

Physical iOS and Android, native Safari, assistive-technology sessions, physical safe-area and keyboard behavior, production catalogue matching and production provider connectivity were outside this local run. Headless WebKit is a separate result from Safari on hardware. No production performance or conversion claim was measured. Independent finish review and final owner acceptance remain separate stages. No production access or deployment.
