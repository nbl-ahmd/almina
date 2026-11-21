# Storefront replacement — implementation phases

Created 17 November 2026 from the three owner-named source documents. Execution plan only; no new visual approval or runtime change is implied.

## Start here on every continuation

1. Read [implementation progress](implementation-progress.md): current task, last checkpoint, decisions, blockers and next action.
2. Read root/web AGENTS.md and PRODUCT.md for production/product constraints. Read the current phase below and its rows in the [coverage register](implementation-coverage.md).
3. Read the relevant source sections in [system review](system-review-2026-11-17.md), [direction plan](storefront-direction-plan-2026-11-17.md) and [reference analysis](reference-review-2026-11-17.md). Read DESIGN.md/brief as incumbent evidence until accepted replacements exist. Inspect actual referenced images for visual work; the prose does not replace them.
4. Check branch, working tree, current source and outstanding edits before changing anything. Reconcile later owner instructions and source-plan drift in the decision log; do not silently drop scope or overwrite someone else's work.
5. Take the first eligible unfinished task. Finish a coherent task, verify it, update progress/coverage evidence and commit a focused change before starting unrelated work.

The phase definitions below own scope and acceptance. **Only implementation-progress.md owns mutable task/phase status.** Coverage rows own traceability; do not duplicate completion checkboxes across files.

## Authority, dependencies and working rules

- Confirmed: exact #FF5A5F, actual logo/business facts, search priority, compact factual cards/dirham symbol, app-like mobile, deliberate desktop, English/Arabic/RTL, accessibility and existing commerce/route/SEO contracts.
- Proposed: supporting neutral palette, fonts, measurements, shape/density treatment and desktop lead composition. Do not lock them as final tokens merely because they appear in the plan or a prototype.
- Keep one reference-led direction. No competing visual generators, seven-style collage, inherited rejected identity, giant template hero or broad override-sheet strategy.
- Preserve all root/web production guardrails. No production database access, deployment, integration/provider replacement or speculative capabilities. No invented reviews, claims, services, discounts, payment methods, medical copy, delivery promises or product packs.
- Shared/admin/wholesale dependencies remain until consumers migrate and are verified. Prototype styles must be isolated and removable; accepted production customer styling must converge to one system.
- Phases 0 → 1 → **screen review gate** → 2 → 3 → 4 → 5 → 6. Supporting work may overlap only with explicit dependencies/ownership recorded. Do not finalise the visual system before the direction proof is reviewed.
- Preserve the original plan's phase numbering (0–6). Phase 5 has small task slices, not an unbounded combined rewrite. No approval ritual at every phase: record actual owner decisions; ask only for unresolved material choices or required visual acceptance. Prior authorisation remains valid.
- A phase is verified only when its tasks, relevant coverage rows and exit evidence are complete. Skipped/failed checks remain explicit. External content debt is not code completion and must not disappear from the ledger.

## Phase 0 — Baseline and ownership

**Entry:** tracker exists; inspect current repository before implementation. **Goal:** freeze functional truth and locate every styling consumer without choosing final aesthetics.

| Task | Work / deliverable | Acceptance |
| --- | --- | --- |
| P0-01 | Reconcile scope, branch/HEAD, source-plan versions, owner approvals and existing uncommitted work; record verified local preview setup and stop/restart procedure without secrets. | Baseline record distinguishes old evidence, current checks, proposals and confirmed decisions. No assumption that a historical port/server still works. |
| P0-02 | Inventory customer tokens, global/Tailwind aliases, fonts, CSS/layers/selectors, shared UI, portals, assets and token generation/automation; classify storefront/shared/admin/wholesale consumers. | Ownership matrix links definitions → consumers → migration destination → safe-removal condition. Include added-state precedence, inline primary-foreground mapping and accumulated checkout rules. |
| P0-03 | Inventory actual routes, functional states, SEO/query/legacy links, search/back/scroll behaviour, enabled/disabled commerce gates and existing tests. | Route/state checklist and appropriate test selection; no assumed customer capabilities or changed commerce logic. |
| P0-04 | Capture current home/listing/PDP/cart/checkout/customer baseline EN/AR and phone/tablet/desktop using isolated fixtures; inventory catalogue/campaign/media limitations. | Dated captures, runtime/errors and fixture provenance; source content gaps distinguished from production claims. Record first merchandise/amount positions and current reading widths. |
| P0-05 | Publish baseline/ownership/state findings and map all discovered items into coverage or explicit new backlog IDs. | No uncovered review instruction; Phase 1 input packet ready. |

**Evidence:** `implementation-evidence/phase-0.md`, ownership and route/state tables linked there; large/raw captures may live in ignored `.verification-results/storefront-replacement/phase-0/`. Record source commit and capture conditions.

**Exit:** baseline and consumer map verified; local preview is isolated; no shared deletion or unapproved visual decisions.

## Phase 1 — Comparable coded direction proof

**Entry:** P0 verified; implementation/prototype work authorised. **Goal:** test one coherent direction with realistic content before finalising the system.

| Task | Work / deliverable | Acceptance |
| --- | --- | --- |
| P1-01 | Write a concise prototype contract from confirmed facts and N01–N07 Borrow/Avoid/Adapt/Unknown; declare all candidates and scope boundaries. | One direction, separate mobile/desktop compositions, no unsupported controls/services. Keep code-led review preference; no new generator. |
| P1-02 | Create isolated working home/listing/PDP previews on identical representative fixtures and controls; compare shallow full-width versus split desktop lead within that direction. | Phone and desktop coverage plus an Arabic core screen; previews don't replace live commerce or introduce indexable prototype routes. Prototype style/asset removal path recorded. |
| P1-03 | Exercise density/type/colour/shape together: candidate gutters/gaps, 4 vs 5 desktop columns, first-view hierarchy, long names/options/prices and unavailable/missing-content PDP. | Readable facts/44px targets, complete price/action rows, no collisions/overflow. Figtree/Alexandria tested deliberately; at most one alternative pair if warranted. No candidate range becomes a mandate without screen evidence. |
| P1-04 | Demonstrate browse/focused-search/PDP/checkout screen modes and define cart/account/empty/error contracts; inspect keyboard, safe areas, RTL and return navigation. | Interactive proof uses existing behaviour; reference unknowns resolved by actual observation or left explicitly open, not invented. |
| P1-05 | Present comparable reference/coded captures and record owner selection/corrections, including palette/type/density/shape and desktop lead decisions. | Concrete screen decision recorded in decisions.md and progress. Revisions include changed evidence. Owner acceptance of direction is separate from release. |

**Evidence:** `implementation-evidence/phase-1.md`, preview location/start procedure, fixture/asset provenance, comparison captures and owner decision reference.

**Exit gate:** accepted/refined screen direction. Do not proceed to final guide/tokens while that decision is pending. Continue independent baseline/content work where useful; do not treat silence as approval.

## Phase 2 — Accepted system and styling ownership

**Entry:** P1 screen decisions recorded. **Goal:** create one complete customer system and migrate its foundational consumers safely.

| Task | Work / deliverable | Acceptance |
| --- | --- | --- |
| P2-01 | Establish primitive → semantic → component roles with one customer runtime value source; map Tailwind aliases and retained shared consumers. | Colour, width, spacing, shape, elevation, icons, motion and bilingual type roles actually govern consumers. Remove unused customer values only after checks; no parallel palette/library. |
| P2-02 | Resolve cascade and scope: base/variant/state ownership, compiled foreground aliases, customer selectors, portals, route/theme navigation. | Computed-style checks prove pending/added/saved/disabled/invalid/focus states; normal unlayered rules cannot silently defeat intended states. Admin/wholesale contracts remain independent. |
| P2-03 | Build component/state specimen for headers/search/location/nav/categories/cards/price/quantity/options/campaign/filter/gallery/disclosure/sheets/cart/docks; consolidate retained checkout visual definitions. | Resting/hover/focus/pressed/pending/success/disabled/unavailable/error/empty/loading represented where applicable; state meaning and native semantics preserved. |
| P2-04 | Verify colour pairings, typography in both scripts, density, shapes, borders/elevation, icon stroke and reduced motion. | Dark readable coral foreground or another proven compliant pairing; selected/success/sale/error/saved distinct. Decide 10px badge role, stock inset and guarded hover zoom explicitly. |
| P2-05 | Replace DESIGN.md/sidecar from accepted screens; update brief, screen directions, active styling instructions and product context without altering verified facts. Retire superseded active authority/generators. | Guide, runtime and sidecar agree; proposals/intentional exceptions explicit; historical records marked superseded and cannot regenerate old tokens. |

**Evidence:** `implementation-evidence/phase-2.md`, specimen, consumer migration table, state/contrast/compiled-CSS evidence and updated authoritative documents.

**Exit:** one token/variant/state contract and truthful documentation; foundational shared/admin regression checks pass. No theme replacement solely by renaming tokens.

## Phase 3 — Shell and home

**Entry:** P2 verified. **Goal:** implement the accepted phone/desktop shell and merchandising composition.

| Task | Work / deliverable | Acceptance |
| --- | --- | --- |
| P3-01 | Mobile location/cart context, wide search, focused-search mode, labelled bottom destinations and contextual screen modes. | GET/Enter/Escape/suggestion fallback intact; keyboard/back/safe-area/large-text behavior works; no scanner/voice/chat/install fiction. |
| P3-02 | Desktop/tablet search/location/account/cart/header/navigation and complete compact footer; phone secondary groups. | Useful widths/alignment, no header collisions on live resize, active labels clear, every existing destination preserved. |
| P3-03 | Implement accepted home campaign/category/product/brand/managed-content modules and sparse-data composition. | Products enter view early; deliberate hierarchy, bounded hero, no repetitive blank tiles/duplicate padding shelves/unsupported claims. Live bilingual copy and real content rules. |
| P3-04 | Verify home and shell EN/AR across devices, direct routes/back/reload, focus/search/location and route transitions; remove displaced customer bindings. | Evidence matches approved screen direction at 100% scale; no overflow, hidden last content, portal/theme leakage or admin regression. |

**Evidence:** `implementation-evidence/phase-3.md`, composition captures, continuity/state checks and consumer cleanup.

**Exit:** shell/home verified on phone/tablet/desktop/RTL, including sparse/error/loading content. Source ownership stays coherent.

## Phase 4 — Catalogue and product detail

**Entry:** P3 verified. **Goal:** efficient comparison and confident product purchase.

| Task | Work / deliverable | Acceptance |
| --- | --- | --- |
| P4-01 | Listing/search toolbar, desktop filters, phone filter/sort sheet/disclosure, selected filters, count/pagination and empty/error/loading states. | Query URLs/retention, keyboard and matching semantics preserved; reduced vertical setup, no lone page/repeated empty prose. Search-quality issues recorded separately, not silently expanded into backend work. |
| P4-02 | Standard/compact cards, grids/rails, exact identity/pack/stock/price/options/add/saved states and image treatment. | Long/short mixed-script identities, unknown/varied prices, sale/no sale and stock states work; full facts accessible; actual cart counts/server checks persist. No invented ratings or generated packs. |
| P4-03 | Phone gallery/contextual toolbar/purchase dock; desktop gallery/thumbnails/buying column; actual variant/quantity state. | No fake dots/options; one coherent purchase action; correct selected pack/price/stock relationship; landscape/keyboard/scroll clearance. |
| P4-04 | Move verified summary/facts and useful help ahead of alternatives; detailed descriptions/specifications/reviews/policies and honest missing-content layout. | No invented medical/review content; no large empty regions; missing fixture descriptions not generalised to production. |
| P4-05 | Verify search → PDP → return/filter continuity → save/add → cart/reload; direct legacy links, canonical/metadata/structured data, image sizing/delivery. | Appropriate catalogue/stock/family/SEO regressions and bilingual responsive checks pass. Record real content/media debt and safe customer cleanup. |

**Evidence:** `implementation-evidence/phase-4.md`, route/state/capture matrix, functional/SEO evidence and exact-pack content register.

**Exit:** catalogue/PDP matches accepted direction and preserves product identity, routes, pricing/stock checks and recovery.

## Phase 5 — Cart, checkout and remaining customer surfaces

**Entry:** P4 verified. **Goal:** one visual system through the full customer journey, with unchanged commercial authority.

| Task | Work / deliverable | Acceptance |
| --- | --- | --- |
| P5-01 | Cart empty/populated/unavailable/error states, selected pack, unit/line amounts, quantities/removal, subtotal/summary/recommendations and dock. | Server-derived estimates explicitly differ from quote/tax/fees; one primary next action/device, recommendation filtering, clear quantity vs product counts, bounded empty-state reading width. |
| P5-02 | Checkout presentation: enabled/disabled, details/review/payment/result, fields/validation/help/summary and keyboard dock. | Existing steps, feature/payment gates and recovery unchanged; no activation to make previews complete. Retire accumulated visual treatments without losing behaviour. |
| P5-03 | Verify checkout quote changes, stock/price conflicts, idempotency, retries/pending states, cancellation/payment return and auth boundaries using disposable fixtures. | Existing corresponding commerce/security tests pass; any behavioural change has focused regression coverage. No provider/live-order operations. |
| P5-04 | Sign-in/account/saved/recent/orders/reorder/addresses/preferences and existing rewards presentation; help/contact/policies/brand/category/collection/guide routes. | All P0-discovered customer routes have a disposition and consistent primitives/states; no invented programme benefits, translated product facts or capabilities. |
| P5-05 | Verify customer navigation/forms/auth/error/reload/locale behaviour and shared-route transitions; remove displaced customer CSS safely. | EN/AR keyboard/responsive checks and relevant account/shared/admin tests pass; no isolated old-theme customer islands. |

**Evidence:** `implementation-evidence/phase-5.md`, full route disposition, enabled/disabled state captures and transaction/auth regression results.

**Exit:** full customer journey covered; server authority/security/backward compatibility preserved and actual remaining limitations explicit.

## Phase 6 — Retirement and final local review

**Entry:** P5 verified. **Goal:** remove superseded authority/implementation safely and prove completion at the requested scope.

| Task | Work / deliverable | Acceptance |
| --- | --- | --- |
| P6-01 | Recheck every old customer rule/token/component/font/asset/generator consumer; remove only migrated/unused customer bindings and prototype artifacts. | No competing active system or restoration path; shared/admin/wholesale/media retained until verified safe. Historical migration evidence is marked superseded. |
| P6-02 | Execute final route/device/locale/state/interaction matrix plus appropriate static/build/unit/E2E/SEO/runtime checks. | Explicit pass/fail/not-run results with source commit, commands, fixture, viewport and limitations; no stale baseline presented as final evidence. |
| P6-03 | Independent finish review against accepted screens and N01–N07 interpretation; fix material findings in bounded batches and reverify affected areas. | Reviewer disposition and fix evidence recorded honestly. No self-certified whole-surface pass from a partial fix verdict or clean detector. |
| P6-04 | Synchronise final guide/sidecar/brief/product/styling instructions and migration status from built code; reconcile all coverage rows and outstanding content/operational needs. | Every requirement has evidence or explicit unresolved/deferred disposition with reason/owner; no silent omissions. |
| P6-05 | Present finished local implementation and obtain final owner visual acceptance; record release readiness separately. | No deployment. Unresolved catalogue rights/content/provider/operational inputs are visible; approval of appearance is not production authorisation. |

**Evidence:** `implementation-evidence/phase-6.md`, final captures, test/reviewer reports, consumer audit, owner decision and remaining-needs list.

**Exit:** verified local redesign and recorded acceptance; deployment remains excluded.

## Verification protocol

Select checks from affected consumers, not an indiscriminate full-suite loop. After code changes, follow root/web AGENTS and version-matched Next docs (`npm run docs:next`) plus runtime verification. Keep data isolated; inspect existing harness/config before commands and record exact setup. Never copy a past port, environment or production `.env` blindly.

- **Every visual phase:** actual phone/tablet/desktop at 100%, English/Arabic, same-page live resize, short landscape, safe areas, software keyboard, large text/zoom, reduced motion, focus/keyboard/semantics, touch targets, contrast, no page overflow and reachable last content.
- **Final width matrix:** 320/360/390; 768/900; 1280/1440 plus wide desktop. Record exact heights and the wide width chosen. Home/search/listing/PDP/cart/enabled+disabled checkout/key customer routes need tracked coverage. Early phases test affected views, final phase reconciles the whole matrix.
- **Data matrix:** long/short/mixed-script names and strengths; variable packs; missing/poor/exact media; unknown/low/high prices; sale/no sale; unavailable stock; one/many images/options; empty/loading/partial/error states. Use labelled fixtures, not production mutations.
- **Behaviour:** search URLs/Enter/Escape/fallback/Arabic matching, back/query/filter/scroll continuity, direct legacy navigation/reload, saved/cart persistence/counts, variant/add/quantity, authoritative stock/price/tax/fee/quote, idempotency and payment/auth recovery.
- **CSS:** computed state colours, emitted aliases, specificity/layers, portals/theme inheritance and storefront → admin → wholesale transitions. Source comments alone are not isolation proof.
- **Runtime/delivery:** terminal and Next MCP errors, browser console/network, metadata/canonicals/structured data, image delivery and appropriate performance/bundle evidence. Never claim conversion or speed gains without measurements.

Existing check entry points (reinspect when used): `npm run typecheck`, `npm run lint`, `npm run build:foundation`; select tests via existing runner/config. `npm test` has a build prehook; do not assume scripts have no side effects. Relevant E2E suites include responsive-layout, navigation/menu, shared-controls, storefront/ui-repairs, search, catalog-discovery/filters, product-families, campaigns, arabic, public-routes, next-checkout, stripe-checkout, customer-account, admin-design/admin and wholesale. These are a starting map, not proof every new requirement is already tested. Add meaningful focused coverage for changed behaviour, especially commerce/auth. Existing shared-fixture E2E tests run with one worker; do not parallelise independent suites against the same mutable fixture.

## Recording and completion rules

At every checkpoint update progress with task status, files/commit, tests and limitations, evidence paths, new decisions, unresolved items and the exact next task/action. Use `not_started`, `in_progress`, `awaiting_review`, `verified`, `blocked` or `deferred`. Verified requires cited evidence; deferred needs an explicit decision, not convenience. Blocked requires the actual missing dependency and independent work that can continue; do not infer approval from elapsed time.

For each completed phase write `implementation-evidence/phase-N.md` with: source commit; tasks/coverage rows addressed; before/after captures and conditions; files/consumer migrations; exact checks/results; visual/owner decisions; failures/limitations; rollback approach; remaining items; next eligible task. Keep concise durable summaries tracked, with large raw evidence ignored. If ignored evidence is lost, recapture before relying on it.

New findings get stable `NEW-###` coverage rows and phase/task assignment. Changes to the plan get a dated decision entry and affected requirements; never erase earlier rejection/acceptance history or mark old evidence current after source changes. No percentage completion based on files edited; report verified tasks and satisfied gates.
