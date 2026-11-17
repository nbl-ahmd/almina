# P0-04 — fresh visual baseline and content inventory

Captured 17 November 2026 from starting HEAD `85bebc7`, clean working tree. Runtime customer source remains unchanged from reviewed implementation `324a2ed`. Owner's “do next” resolves to P0-04. **Baseline evidence only: no redesigned screens, final tokens, functional fixes or visual acceptance.**

Sources: [phase plan](../implementation-phases.md), [route/state/harness map](p0-03-routes-states-tests.md), [consumer matrix](p0-02-style-ownership.md). [Capture manifest](p0-04-capture-manifest.json) records every case, viewport, locale, measurements, full/viewport image paths and hashes. [Progress](../implementation-progress.md) remains the status authority.

## Conditions and coverage

- Own fresh named agent-browser contexts, agent-browser 0.38.2, headless Chrome 157, device scale factor 1. These are desktop-engine responsive viewports, **not native iOS/Android, touch or software-keyboard emulation**.
- English and Arabic at **390×844 phone, 900×1000 tablet, 1440×900 desktop**. Staff preview has phone/desktop captures and changes the draft language, not a translated staff console.
- **94 final cases / 188 PNG files**: one full-page and one initial-viewport image per case. Nine representative PNGs are retained in the repository; large raw captures/logs are ignored under `.verification-results/storefront-replacement/phase-0/`. If raw evidence is absent in another checkout, recapture rather than assume old files exist.
- Fonts and route-specific content settled before capture; bounded scrolling loaded offscreen media where needed, then returned to the top. No CSS injection or concealment of development diagnostics. Main H1 run uses two units of the first reference product, with no signed-in customer; supplement intentionally empties cart. Recent-view state can be populated by earlier PDP views in the same owned context.
- No production data/provider access. Disposable commerce fixture seeded its own guarded local database; test staff login and quote requests were synthetic. No order submitted, payment started, campaign saved/published, GPS lookup or real authentication-provider interaction.

| Harness | Case families | Cases |
| --- | --- | ---: |
| H1 existing reference preview 4860/4861 | Home, products listing, PD1186 PDP, populated cart, disabled checkout, account-service unavailable, guest saved list, no-result search, root 404 × two locales × three widths | 54 |
| H1 supplement | Empty cart × six combinations; phone focused search, manual location dialog and unavailable PD1237 PDP × two locales | 12 |
| H3 isolated compiled fixture 4720/4730 | Signed-out customer account and invite-only wholesale × six combinations; unsaved staff campaign preview × EN/AR draft language × phone/desktop | 16 |
| H4 isolated compiled fixture 4740/4730 | Populated enabled-checkout details and reviewed quote × two locales × three widths | 12 |
| **Total** | | **94** |

H1 uses six provenance-backed exact-pack photos with synthetic prices/stock and blank descriptions. H3/H4 use synthetic catalogue/contact/business/provider fixtures, not the six real product images. The H1 development sample-data notice remains visible. H3/H4 evidence is explicitly labelled synthetic by this report/manifest; it is not published storefront content.

An isolated production build (`AL_MINA_ISOLATED_BUILD=1`, tag `p0-baseline`, clean development configuration, database disabled for build) completed successfully for the fixture harness. The pre-existing H1 development preview was neither restarted nor repointed. This build enables a fresh current-source fixture baseline; it does not certify production release.

## Initial-view measurements

Coordinates are CSS pixels from the top of the unscrolled viewport, after font settling. “Purchase row” is the first card's price/action row, not the price glyph itself. Product heights vary with text; fixed mobile navigation further reduces usable reading area. The sample notice is included on H1. These are baseline measurements, not approved spacing tokens or target positions.

| Width/height | Screen | EN first card / purchase-row Y | AR first card / purchase-row Y |
| --- | --- | --- | --- |
| 390×844 | Home | 631 / 841 | 634 / 844 |
| 390×844 | Listing | 485 / 694 | 496 / 706 |
| 900×1000 | Home | 789 / 1017 | 794 / 1022 |
| 900×1000 | Listing | 591 / 819 | 604 / 833 |
| 1440×900 | Home | 589 / 817 | 594 / 822 |
| 1440×900 | Listing | 470 / 698 | 484 / 713 |

The home purchase row is below/at the phone fold and below the tablet fold. This supports the existing vertical-priority finding; it is not proof that content is permanently obscured. Desktop initial view contains a complete first shelf. A redesign should reduce setup/repetition before shrinking facts or touch targets.

Reading-width samples:

- PDP fallback description: **354px** at phone width in both locales; approximately **666px EN / 735px AR** at tablet/desktop. The fallback is one sentence of pharmacy-contact guidance, not reviewed product advice. Phone description begins around Y1371 EN / Y1369 AR after related content.
- Empty-cart explanation: **314px** phone, **772px** tablet, **1152px** desktop. The desktop width reinforces the proposed bounded-reading-width improvement.
- Card internals in H1: 10px padding, 18px corners; first home card approximately 163px wide on phone, 240px tablet, 289px desktop. These record the incumbent, not new component specifications.

Raw exact values, fonts, boxes and reading blocks are in the manifest. Do not compare old approximate review positions as a pixel regression without matching viewport/fixture/font/notice conditions.

## Content and media observations

| Item | Fresh evidence | Required disposition |
| --- | --- | --- |
| Exact product photos | All six referenced files exist. Main H1 captures had no broken/unloaded main-content image at measurement. PD0826 is a handheld photograph; other packshots vary in internal whitespace/background/scale. | Carry C32/O01 into P4. Use verified exact-pack replacements if supplied; no generic generated package, false association or aggressive crop that loses identity. Successful image load is not quality approval. |
| Descriptions and product confidence | H1 fixture deliberately supplies blank descriptions; captured PDP uses honest contact fallback and related products before product facts. | Carry C35/O02. Preserve real supplied summary/description when present; improve hierarchy later. This fixture cannot prove production catalogue incompleteness. |
| Campaign/category artwork | Current courier/category atlas render as decorative owned assets with source prompt/provenance under docs/design/storefront/campaigns. | Carry provenance and factual-versus-decorative distinction. No staff identity, discount, delivery speed or medical claim inferred from imagery. No new ad created in P0-04. |
| Promotions/reviews/brands | H1 has a small synthetic range, no actual sale shelf and unavailable review-list content. | Don't manufacture shelves, ratings, popularity or promotions to fill the reference layout. Production CMS cadence/completeness is unverified. |
| Staff campaign preview | H3 shows unsaved synthetic draft, blank artwork fallback and retained blue preview treatment in neutral staff console; phone and desktop plus AR draft direction recorded. | NEW-003 shared component/font dependency remains. No campaign saved/published. Placeholder is a draft state, not evidence of broken live campaigns. |
| Account | H1 records honest unavailable-service state; H3 records usable signed-out entry and localized headings. | Fixture difference is intentional. Neither proves live provider readiness or signed-in account/history correctness. Those remain later representative/regression work. |
| Saved/404 Arabic | In fresh Arabic shell, guest saved page still displays English headings/body; root 404 also displays English content. | Extend NEW-005 to observed saved/root-not-found copy; include P5 customer localisation and P3 error boundaries. Preserve actual product names in their source language. |
| Business | H3 wholesale signed-out invitation state mirrors in Arabic. | NEW-001 styling dependency still exists; no business catalogue/order eligibility claim or incidental retheme. |
| Checkout | H4 details/review states render in both locales; two units quote 40.00 in the synthetic fixture. Final fixture state: stock 4, zero orders and zero receipts. | Existing server quote task remains unchanged. No order/payment/retry/auth correctness certification from these screenshots. |
| Native device behaviour | Manual location dialog and focused search captured on phone-sized desktop viewport, without permission prompts or native keyboard. | Actual keyboard/safe-area/OS behaviour remains required later. Do not label these native app/device tests. |

## Runtime, failed attempts and limits

- Final 94 recorded cases show **no horizontal document overflow and no collected browser page errors**. Console records for the 82 main/flow/staff cases contain zero console errors; supplementary cases recorded page errors, not a complete per-case console matrix. This is not an accessibility, interaction, performance, security or release pass.
- H1 Next diagnostics at finish: no compilation issues, no configuration/session errors. Diagnostics do not settle the observation below.
- **NEW-006 — unresolved dev-browser loading-shell observation:** two longer supplemental H1 sequences returned to Arabic home after multiple navigations and remained in Suspense loading UI beyond the 25-second content wait; one reload in the existing context also did not settle. Direct loopback HTTP returned complete product content, and fresh initial browser contexts loaded correctly. Captured the failed shell separately and retained console/network diagnostics. Cause is unassigned: browser tooling, development streaming or application continuity needs controlled reproduction. Do not call it fixed, a confirmed production defect, or successful navigation. Complete remaining extras were captured in a separate context.
- A CLI locator-argument ordering error, one incorrect supplemental product URL and an over-broad wait on offscreen lazy images were **capture mistakes**. They were corrected, excluded from final-case counts and did not prompt source changes. The verified unavailable product is PD1237.
- Browser/native touch, software keyboard, exhaustive 320/360/768/wide/landscape/zoom/reduced-motion/state matrix, complete keyboard journeys, logged-in customer/history, submitted orders/receipts, real providers and full S01–S14 regressions were not executed. This task records a representative baseline, not those later acceptance gates.

NEW-006 belongs to P3-04/P4-05/P6-02 with a bounded reproduction on isolated fixtures, preserving existing search/back/scroll semantics. The existing NEW-004 continuity coverage gap remains relevant; do not assume they have the same cause.

## Retained representative captures

Full raw captures and all hashes are indexed in the manifest. These smaller viewport captures remain tracked for future sessions:

- [Home EN phone](baseline-2026-11-17/h1-home-en-390.png) and [desktop](baseline-2026-11-17/h1-home-en-1440.png).
- [Listing AR phone](baseline-2026-11-17/h1-listing-ar-390.png), [PDP AR phone](baseline-2026-11-17/h1-pdp-ar-390.png), [populated cart EN phone](baseline-2026-11-17/h1-cart-populated-en-390.png).
- [Reviewed checkout AR phone](baseline-2026-11-17/h4-checkout-reviewed-ar-390.png) and [signed-out account EN phone](baseline-2026-11-17/h3-account-signedout-en-390.png).
- [Admin preview phone initial viewport](baseline-2026-11-17/h3-admin-preview-en-390.png) and [full draft/editor](baseline-2026-11-17/h3-admin-preview-en-390-full.png). The actual preview is lower in the full editor.

## Cleanup, coverage and next step

All five task-owned browser sessions closed. Owned H2/H3/H4 harness received SIGTERM and exited cleanly; ports 4709/4710/4711/4720/4730/4740 no longer listened. Disposable fixture was cleaned up by its lifecycle. Original H1 listeners 34387/34390 on 4861/4860 remain as found. Build-generated next-env.d.ts change was restored to its clean starting version. No runtime/package/tooling code, production data or integration changed; no deployment.

Coverage contributions: C06, C19, C23–C27, C31–C35, C37–C40, C49–C59, C62–C63 and NEW-001–006. These are **baseline observations**, not closure of future implementation requirements. Raw scripts/manifests/build/log/diagnostic evidence remains intentionally ignored; durable summary/manifest/representative images remain tracked. Documentation/artifact-only rollback; no runtime migration.

**P0-04 verified as baseline capture/content-inventory work, with the above explicit limits and unresolved observation. Phase 0 remains in progress. Next P0-05:** consolidate baseline/ownership/state/content evidence, reconcile every requirement/new finding and prepare the Phase 1 input packet. Do not start new screens or final tokens in that synthesis task.
