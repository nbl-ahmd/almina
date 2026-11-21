# Phase 1 prototype contract — Al Mina storefront

> Historical comparison evidence. The live proof routes and launch commands were retired in [P6-01](implementation-evidence/p6-01-retirement.md). Captures and the recorded screen decisions remain available.

P1-01, 17 November 2026; prepared from `8f3f2fd`. **Contract for local coded exploration, not final visual approval or an implemented prototype.** Status: [progress](implementation-progress.md). Inputs: [Phase 1 packet](phase-1-input-packet.md), [system review](system-review-2026-11-17.md), [direction plan](storefront-direction-plan-2026-11-17.md), [per-image analysis](reference-review-2026-11-17.md) and [baseline](implementation-evidence/phase-0-summary.md).

## PC01 — Job, audience and outcome

Help a known-item shopper find the exact product/pack quickly, compare truthful price/availability and reach a reliable purchase decision; keep discovery useful. Mobile must behave like an app; desktop must support comfortable retail scanning/comparison. Primary mode: **Operate**, with a bounded promotional area on home. No invented demographic or conversion claims.

Prove a visibly replacement composition and coherent colour/type/shape/state/density vocabulary across home, listing and PDP. Retain the actual identity, source product facts and functioning route/search/cart contracts. The incumbent is comparison evidence, not a design template. Final implementation remains staged P2–P6.

## PC02 — Confirmed versus proposed

**Confirmed:** actual Al Mina logo/business facts, exact primary #FF5A5F, search priority, compact factual cards/dirham, persistent mobile purchase access, deliberate desktop, EN/AR/RTL, accessibility and production safeguards. Server pricing/stock/tax/fees/totals/auth/order/provider authority, identifiers, URLs/query/SEO and integrations stay intact. No production data/provider access or deployment.

**Candidates to demonstrate, not final tokens:** restrained near-white shopping ground, neutral secondary/media surfaces, deliberate coral action/campaign emphasis, purposeful logo-aqua, separate status/selected/saved/offer roles; compact type and spacing, limited role-based shapes/elevation, bilingual Figtree/Alexandria initially. Compare one alternative licensed pair only if the same-content screen warrants it. Choose exact supporting values in the coded proof; do not write final DESIGN.md/sidecar/runtime token replacements now.

Use readable dark normal text on confirmed coral unless another compliant actual pairing is demonstrated. Test foreground/focus/hover/disabled/invalid states; no white-on-coral default assumption. Density comes from alignment, removing repetition and bounded chrome, not tiny product identity or reduced touch targets. 44px hit areas remain the floor.

## PC03 — Scope and fair comparisons

| Proof | Required composition | Comparison rule |
| --- | --- | --- |
| Home A | Shallow full-width desktop campaign, concise category lane, aligned actual merchandise, selective content and complete footer. | Same identity, products/order, campaign copy/art, labels, price/stock, type and content availability as B. |
| Home B | Compact desktop campaign beside useful discovery, followed by the same merchandise/content. | Change lead topology, not palette, content quality or extra products. No inherited dark/category-first candidate. |
| Phone home | Compact context/cart, wide search, bounded campaign, concise categories, early complete purchasable cards and labelled bottom navigation. | A/B converge deliberately to the same phone shopping sequence; do not present duplicate mobile renderings as two independent directions. |
| Listing/search | Compact count/filter/sort/selected state on phone; appropriate desktop filter rail and comparison grid; real query/empty/error/pagination handling. | Shared system for both home compositions. Long factual identities and actions stay readable. |
| PDP | Contextual phone toolbar/gallery/identity/price/stock/options/quantity/buying dock; desktop gallery beside compact buying column. Facts/help before detailed content and alternatives. | Shared system; complete/missing-content/unavailable cases, not an ideal-only mock. |
| Continuation | Cart/task-mode and unavailable-checkout/account/recovery contracts visibly inherit the same roles. | Enough working continuity for P1-04, not a new order/payment/auth implementation. |

Initial review views: home A and B plus shared listing and PDP, in **EN and AR at 390×844 and 1440×900**. This is 16 view slots; mobile A/B intentionally share structure. Tablet 900×1000 must adapt and support live resize. P1-03/P1-04 additionally exercise narrow 320/360, short landscape, zoom/large text, reduced motion, keyboard/focus and safe-area/dock clearance as applicable; native keyboard/device checks must be labelled separately from desktop viewport emulation.

## PC04 — Selected isolation and code ownership

Use an **additive development-only route outside the storefront route group**, proposed namespace `/design-proof`, on a separate local Next process. This reuses the installed stack and real catalogue/cart helpers, rather than creating another app/framework or substituting a static fake commerce flow. Planned ownership:

- `apps/web/src/app/design-proof/`: gated layout, home comparison entry, listing and product pages; no production route replacement. Suggested paths: `/design-proof?lead=full|split`, `/design-proof/products?q=…`, `/design-proof/products/[slug]`. Keep proof links inside this namespace; existing public URLs/query semantics remain unchanged.
- `apps/web/src/components/design-proof/`: new owned page compositions and comparison controls; small client boundaries only for interaction.
- CSS Modules and explicitly local provisional `--proof-*` roles on the proof root. No `.storefront-shell` wrapper, incumbent storefront stylesheet import, global theme overwrite, broad override sheet, new UI library or shared component/API rewrite. Scope any mappings needed by reused primitives to that root and own every state explicitly. Inspect inherited root/native styles and persistent route CSS, rather than assuming modules remove all inheritance.
- Preserve reusable nonvisual catalogue/search/price/locale/cart validation helpers and actual server checks. Reuse existing functional controls where safe; new layout/markup must not merely recolour the incumbent shell. Do not duplicate commercial calculations or refactor domain logic to make a visual demonstration easier. Existing root/404 styles can still be present; verify specificity and component states in the proof.

The proof gate must reject requests unless **NODE_ENV=development, APP_ENV=development and ALMINA_DIRECTION_PROOF=1**; also require explicitly loopback API and legacy API origins. Gate before data reads in page/metadata paths, not only in a parent layout. Flag absent or any production/staging condition → 404, even if the flag is set. Metadata/header policy noindex/nofollow; no sitemap, navigation or feed links. Do not expose prototype controls/data via an ungated new action/API.

Planned web/fixture ports **4870/4871**, rediscovered/free before launch. Reuse `scripts/tooling/storefront-reference-fixture.mjs` with PORT=4871; web API_ORIGIN and LEGACY_API_ORIGIN both point there, DATABASE_MODE=disabled, checkout/Stripe/telemetry disabled. Use a clean environment and separate browser context. Existing distDir mechanism: AL_MINA_ISOLATED_BUILD=1 and tag `p1-proof`, with AL_MINA_ISOLATED_DEV/ALMINA_LOCAL_DEMO unset; planned output `.next-verification-p1-proof`. This source-supported setup is **not launched or verified by P1-01**. P1-02 must resolve installed Next docs, prove disabled/production gates and loopback isolation, and record launch/stop/cleanup before claiming it works. Keep existing 4860/4861 preview and its output untouched.

Proof origin isolates device localStorage from the incumbent origin. Read-only fixture data and existing checkAddition/loadCart/browser-cart helpers retain server validation; no trusted client prices or quantities beyond existing validated contracts. No actual checkout/provider activation. A read-only continuation/error panel must be clearly labelled, not represented as completed commerce. If P1-04 needs real quote behaviour, use the existing H4 disposable harness explicitly; do not add a new payment/quote engine.

## PC05 — Data, assets and difficult states

- Reuse the six exact-pack images/provenance in repository-root `docs/design/storefront/previews/assets/`, via the reference fixture; actual logo and provenance-backed decorative courier/category assets may be reused. Do not copy a reference screenshot into the product, generate a substitute saleable pack, claim the courier is staff or publish the private N01–N07 assets.
- Keep a visible bilingual “Design proof — sample prices and availability” notice, separate from factual product copy. Use the **same six records/order/prices/stock** in A/B; log fixture version. No fabricated offer/review/certification/delivery/medical claims or duplicate product shelves to lengthen the page.
- Prepare labelled synthetic stress cases for long/mixed-script names, one/multiple/missing image, unavailable stock, unknown price, actual/no pack options, empty/loading/error listing, sparse/missing campaign and complete/missing product information. Supplementary fixture data must never be described as a production catalogue fact or mutate real associations.
- Complete-content example may use verified supplied data or explicit nonmedical synthetic fixture text; never invent medicine instructions/ingredients/benefits. PD1186 is the current reference PDP; PD1237 is unavailable in that fixture. Do not guess product IDs. Poor PD0826 photo stays honestly imperfect until a verified alternative exists.
- Match missing account/ordering/services with actual gates or explicit demonstration limits. No prescription upload, scanner/voice/chat, public business enrollment, assumed identity, app-install gate, fake testimonial/healthcard/provider method or promise from the references.

## PC06 — Reference borrowing and unknowns

| References | Borrow/adapt | Avoid; behaviour still to establish |
| --- | --- | --- |
| N01 | Grouped location/search, clear promotional/category/product separation; gallery/options/buying continuity. | Pet/seller/360/video/decorative floating nav. Test sticky/keyboard/selected states; no pictured rating copied. |
| N02 | Short search → campaign → categories → products path, compact purchase information. | Tiny labels, copied discount/delivery claims and unsupported utilities. Collage is not a measurement spec. |
| N03 | Image-led PDP, nearby quantity/action and early merchandise. | Onboarding gate, assumed customer identity/medical claims; sticky/back/desktop/RTL are not established by the image. |
| N04 | Desktop header grouping, repeatable shelves/category/brand/campaign rhythm. | Giant Pharmacy wordmark, lime rebrand, unsupported prescription/consultation/concern taxonomy. Actual desktop hierarchy must work at browser scale. |
| N05 | Broad search, context/cart and labelled discovery. | Oversized gaps, voice/scan/prescription/discount/placeholder packs. Model keyboard/area/cart behaviour using real contracts. |
| N06 | Bounded modules, selective campaign breaks and complete page ending. | Copying full page length, Trustpilot/testimonials/app/healthcard/unsupported FAQ claims. No basket/checkout behaviour inferred. |
| N07 | Disciplined pack/name/amount/action anatomy and distinct category/brand navigation. | Tiny controls/ratings/discounts/concern tabs without data. Hover/focus/variants/stock and responsive density need coded proof. |

All seven are one evidence set with four families, not competing generators. Code-led Impeccable guidance; no separate visual generator. Revisit the originals and full per-image analysis when building. Screenshot watermarks/device chrome/creator marks/brands are not UI assets.

## PC07 — Interaction and state proof

Preserve GET search, Enter/arrows/Escape, suggestions/clear/recents/failure fallback; manual location save/cancel/reload; labelled navigation/active state; actual variant identity, quick-add pending/added/rejected/disabled, quantity/count/save/reload. Provide one dominant purchase/next action appropriate to each mode; PDP dock replaces competing phone bottom navigation. No decorative motion delaying tasks.

Declare and test original search/filter/query/scroll return separately from a category-back link (NEW-004). Respect browser URLs/back and zoom. All previews need translated interface/empty/error copy while actual brand/product identities remain factual (NEW-005). Scope menus/dialogs/portals to proof theme/direction. If any interaction is only demonstrated or unavailable, label it; do not fake success.

NEW-001 wholesale, NEW-002 root 404 and NEW-003 admin preview remain preserved consumers: no prototype change to their theme/font/data. P2 owns isolation before accepted production token switch. Source added-state cascade/foreground risks remain; prove the demo's computed states without claiming the incumbent is repaired. NEW-006 loading-shell observation remains unassigned: use fresh owned contexts and explicit settled-content checks, retain failures and investigate a bounded reproduction if it affects the proof. No silent reload-as-pass claim.

## PC08 — Review criteria and exit

P1-02 must deliver working isolated home A/B, listing and PDP with the same data, phone/desktop/Arabic views, comparison controls, provenance/limitations and a reproducible runbook. P1-03 decides on candidate density/type/colour/shape using hard cases; P1-04 verifies screen modes/continuity and defines continuation contracts. Baseline first-home purchase rows Y841/844 phone and Y1017/1022 tablet are comparison evidence: improve access through hierarchy, not smaller facts. Record actual positions, image occupancy and reading widths at matching conditions; do not promise a universal fold target.

Review at 100% scale: coherent roles/states, recognisable Al Mina, compact useful information, complete desktop, app-like mobile task flow, accurate product/pack/price, 44px targets, readable contrast, no page overflow, no clipped last content, deliberate Arabic/RTL and all variant/state limits. Verify same-page resize, keyboard/focus, root/shared transitions and runtime/console/network plus appropriate existing checks. Compare screenshots/reference annotations; clean build/detector alone is not design acceptance. No performance/conversion claim without measurement.

P1-05 presents concrete comparisons and records the owner's selected/refined supporting palette/fonts/density/shape/lead composition. Only then may P2 establish final tokens and replace active design authority. Direction approval and final product release remain separate. Never infer acceptance from this contract's existence or a next-task instruction.

Prototype ownership/removal: keep a list of every added route/component/module/flag/fixture binding and generated artifact. After acceptance, migrate accepted consumers in stages and remove/supersede the proof during P6 without deleting shared resources. Rejected experiments leave no active restoring authority. No deployment. **This document completes P1-01 as planning; P1-02 is the next execution task.**
