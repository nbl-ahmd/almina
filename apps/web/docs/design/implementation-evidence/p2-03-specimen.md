# P2-03 — component/state specimen and retained checkout map

17 November 2026. Starting `33f8f65`, branch `codex/storefront-pharmacy-app-reference`. Verified for this bounded component/consolidation task. Accepted A/full-width campaign/five-column desktop, N03 mobile PDP and supporting system remain the direction. No public theme switch or deployment. P2-04 refinements and P2-05 guide reconciliation remain separate.

## Working review surface

Open the local [component specimen](http://127.0.0.1:4870/design-proof/components). It is inside the existing development-only, noindex proof gate, outside the customer route group. The gate executes before catalog reads. Proof-disabled production harness checks include this new route. It is linked only from the proof footer, never the public sitemap.

The specimen uses actual catalog helpers, controls and device cart, with the isolated catalog fixture. It does not seed or clear an existing device cart. Fixtures are not production inventory/prices. Six supplied product photographs remain factual images; the separate synthetic pack family and missing-photo/unknown-price card are explicitly labelled demonstrations. No invented reviews, offers, medical claims or payment success.

Campaign, category lane and family options were extracted from working pages. Heading-level props let the same components retain one page h1 with subordinate specimen h3 headings. Real home/PDP retain their prior heading defaults. Cart gets the same presentational heading option. The embedded real purchase dock is explicitly static and does not measure global fixed-bar clearance; real PDP retains its fixed dock/clearance behavior. All order, pricing, stock and quote calculations remain unchanged.

## Component and state coverage

Rest, hover, focus and pressed treatment use the P2-02 owner and native controls; they are exercised through interaction, not separate fake screenshots for every CSS pseudo-class. States apply only where meaningful. Pending and unavailable remain distinct; added means the actual cart count/stepper rather than a fake purchase success.

| Family | Working implementation / review location | State coverage and boundary |
| --- | --- | --- |
| Header, search, location, navigation | Actual proof layout around specimen; results and real product/cart task routes | Search focus/suggestions/clear, expanded location and responsive navigation reuse existing flows. Compact N03 overlay and checkout task mode remain on actual routes. No invented voice/scanning controls. |
| Buttons and fields | Shared Button variants, actual Input, `ControlStateExamples` | Seven variants; enabled, focus/hover/pressed, labelled pending/added/disabled samples, normal/invalid labelled fields. Sample toggles are local demonstrations. No destructive action runs. |
| Campaign and categories | Extracted actual `Campaign` / `CategoryLane` | Same art/copy/links/sprite and native links. Specimen campaign is not priority-loaded. Real sparse campaign mode and category/query navigation remain on home/results; no invented carousel or async ad lifecycle. |
| Product cards and money | Six actual cards, one labelled nonpurchasable placeholder, actual CurrencyAmount | Actual server-checked add, quantity/in-cart, saved, unavailable; missing image/unknown price demonstration; zero/large formatting samples labelled as non-offers. Dirham icon and LTR numeric run retained in RTL. Long-content/missing/large stress cases remain on `/design-proof/stress`. |
| Quantity, pack, gallery | Actual Purchase, ProofGallery and extracted ProductOptions | Increment/decrement/minimum, real pending/stock failure from existing flow tests, one-image and labelled two-image family, selected thumbnail, selected/current pack and unavailable Large route. No fabricated variant inventory. |
| Filter/disclosure | Actual ResponsiveFilters and category query links | Native summary Enter/open/close, responsive behavior; labels and link destinations retained. |
| Sheets/popovers | Actual desktop and mobile StorefrontMenu | Real Radix portals, EN/AR direction, open/Escape/focus return. Existing style-boundary tests cover scope and field semantics in the portal. |
| Feedback | Reusable ProofNotice plus FeedbackSamples | Loading `aria-busy`/status, error alert, empty, explicit demonstration-success status. Copy says no request/order. Actual proof error boundary reuses notice and native Next retry. Not a simulated network/release assertion. |
| Cart and purchase docks | Actual CartContinuation and embedded PurchaseDock | Actual empty/cart/add/count/remove; embedded static dock avoids taking over the viewport. Actual cart/PDP/checkout routes retain screen-fixed task-mode tests, short-height/reduced-motion/safe-inset emulation. No order placed. |

Option, thumbnail, selected-state samples and notice meaning colours now belong to `storefront-system/boundary.module.css`, using existing accepted roles. Removed duplicated selected colours from the route module. Added native pressed feedback without overriding pending/unavailable meaning states. Route/specimen CSS owns composition only. No second palette or token source.

## Checkout consolidation and consumer map

`src/app/(storefront)/storefront-checkout.css` remains **legacy runtime implementation**, not replacement design authority. It styles the retained checkout/details/review/completion/payment-result surface inside `.storefront-shell`. Public checkout behavior is still controlled by existing TypeScript/server contracts; no checkout component, request, API or domain calculation changed.

Removed **21 earlier normal declarations** only when selector, property and at-rule ancestry exactly matched a later declaration. Winners remain in their original positions. Custom properties, important declarations, keyframes, different selectors, shorthand/longhand interactions and media contexts were not flattened. [Deletion audit](p2-03-specimen/checkout-consolidation.json) preserves old values and source positions. This retires proven dead definitions, not the actively consumed style families below.

| Retained consumers / selectors | Responsibility and migration destination |
| --- | --- |
| `.checkout-flow`, topbar, progress/list/step number, stage regions | Task layout, stage visibility, completed/current indicators. Map geometry to accepted layout/space/type and selected roles during P5; preserve `data-stage`, `aria-current`, `data-complete`. |
| Form headings/sections, `[data-slot=field]`, labels, Input/select, optional disclosure | Floating labels, gaps, keyboard/focus/invalid and native selection. Map field/control/text/error roles; preserve names, autocomplete, labels, validation and summary semantics. |
| Payment choice/icon/native radio/mark, selected/disabled/focus states | Real available payment selection. Map selected/control/focus/disabled roles; preserve actual provider availability and input behavior. No new payment method. |
| Basket preview, order panel, totals/links | Real server quote and review layout. Map surface/border/text/money roles; do not derive final totals from client samples. |
| Mobile action and `data-keyboard`, wide-screen review visibility | Screen-fixed action, keyboard clearance, safe area and desktop review. Map accepted dock roles during P5; preserve quote→review→submit and idempotency boundaries. |
| Loader and stage/confirmation animation, reduced-motion rules | Busy communication and movement. P2-04 audits accepted motion roles; P5 migrates these consumers preserving native reduced motion and disabled/busy behavior. |
| Completion, success mark/panel and payment-result regions | Existing post-order/payment status, retained explicit blue/legacy values and sizes. Remain legacy until real status views are migrated/tested in P5. Never present sample success as a completed order. |

Shared `storefront-tokens.css` and incumbent control styling still serve customer/wholesale/root-404 consumers. Admin remains independent. Do not delete shared values or translate these retained rules to accepted tokens before their consumers migrate. Later stages retain existing auth, URLs, SEO, localization and commerce contracts. The earlier NEW-001–NEW-006 limitations remain tracked; this task does not globally resolve them.

## Verification and retained evidence

- **26 proof browser tests pass** on fresh owned 4896/4897 runtime, including four EN/AR specimen cases. Same loaded page resizes 320→390→768→1440→390 without document overflow, verifies static dock clearance, one h1, all nine groups, feedback semantics, gallery/pack selection, real add/remove and sheet keyboard/focus.
- **14 compiled-harness checks pass**: checkout details/review parity plus retained checkout/admin/wholesale/root-404/feedback and responsive regressions. Four EN/AR ×390/1280 cases capture both details and server-quoted review, yielding **eight measured states with exact computed-style equality** across nine selected families. [Measured contract](p2-03-specimen/checkout-comparison.json). Coverage is those selectors/properties/states, not proof that every checkout pixel or provider result was tested. Each test verifies unchanged fixture state, zero orders and zero receipts. Baseline comparison is explicit opt-in; default test mode performs functional checks without depending on ignored local baseline files.
- **16 selected unit tests**, root lint, web typecheck and isolated production build pass (Next 16.4.2; matched bundled framework documentation consulted). Build uses clean local configuration with database disabled and no provider credentials. Final build output `.next-verification-p2-specimen` is separate from live previews.
- Twelve EN desktop/AR mobile specimen captures plus two matched home views retained in [manifest](p2-03-specimen/capture-manifest.json). Fonts/visible images settled, fresh loopback-only contexts; development diagnostics hidden only for capture. No document overflow or page errors in captures. Home comparison against prior P2-01 accepted views measures zero changed pixels at EN1440×900 and AR390×844 after extraction corrections; this is bounded to these two views.
- Live 4870 Next config/session errors are empty after the controlled restart described below; browser page/errors checked. Native devices, screen readers, provider integration, release checks and independent final visual review remain later work. Emulated safe-area/keyboard/reduced-motion checks do not establish native-device acceptance.

### Findings during verification

The long-running owned proof preview initially returned HTTP500: an undefined `ControlStateExamples` client export, while fresh-server tests and isolated build resolved the export correctly. Source export exists. Restarted **only the owned 4870/4871 launcher**, preserving output/cache and leaving incumbent 4860/4861 untouched. The route then returned 200 with no browser/Next errors. Dev export/HMR staleness is an inference, not a permanent HMR fix or production failure diagnosis. This does not close NEW-006's separate long-session loading observation. [Observed error](p2-03-specimen/runtime-observation.txt).

Initial specimen tests selected both desktop and mobile dialog triggers; scoped the selector to the named mobile trigger and reran. Initial screenshot helper waited for offscreen lazy-image decode; bounded it to visible images rather than changing application loading. A matched-home check caught category headings enlarged during extraction; restored the effective original category and card typography cascade before final verification. Raw failed/intermediate logs remain locally under `.verification-results/storefront-replacement/p2-03/`; they are not counted as passes.

## Resume

P2-03 is complete for its acceptance scope. P2-04 audits/refines contrast, type, shape, icons and motion using this reusable specimen and actual routes. P2-05 reconciles final DESIGN.md, sidecar and styling instructions. P3–P5 migrate public consumers; P6 retires legacy runtime only after migration. No deployment authorised.
