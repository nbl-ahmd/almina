# Storefront replacement — progress and resume record

Last updated: 18 November 2026. This is the single mutable status ledger for [implementation phases](implementation-phases.md) and [requirement coverage](implementation-coverage.md).

## Current checkpoint

- **Current work:** **P5-02 verified.** Checkout uses the accepted storefront system and one responsive action across details, review and payment. [Checkout evidence](implementation-evidence/p5-02-checkout.md).
- **Next eligible task:** **P5-03 — checkout commerce, retry, provider and authentication regressions.**
- **Verified implementation tasks:** 26 of 34 (Phases 0–4 and P5-01–P5-02).
- **Completed preparation:** read all three source documents; created seven phases, stable tasks, source-to-task coverage and this resume protocol. The duplicated direction-plan path in the owner's message is one source, not extra scope.
- **Branch at preparation:** `codex/storefront-pharmacy-app-reference`.
- **Source-review baseline:** 324a2ed (incumbent UI repairs); 72312c9 (review/plan/reference archive). Later tracker commits are documentation, not visual implementation.
- **Working tree at start of preparation:** clean. Reinspect on every continuation; this is historical evidence only.
- **Runtime/testing this checkpoint:** P5-02 isolated build, typecheck, lint, 38 unit checks and checkout, cart and shared-route browser regressions. Bilingual captures and keyboard/resize cases are recorded. Native device and assistive-technology verification remain open.
- **No production data access or deployment. Accepted local direction is distinct from completed system/release acceptance.**

## Phase status

| Phase | Status | Entry / unresolved gate | Evidence |
| --- | --- | --- | --- |
| 0 Baseline/ownership | verified | All five tasks complete for baseline scope; implementation requirements still open | [Exit summary](implementation-evidence/phase-0-summary.md) |
| 1 Direction proof | verified | Owner A/five/support selections and N03 PDP continuation recorded; not release acceptance | [Contract](prototype-contract.md), [phase evidence](implementation-evidence/phase-1.md) |
| 2 Accepted system | verified | All five tasks evidenced; public consumer migration remains P3–P5 | [Phase exit](implementation-evidence/phase-2.md#phase-2-exit) |
| 3 Shell/home | verified | P3-01–P3-04 verified. | [Phase 3 exit](implementation-evidence/p3-04-shell-home.md) |
| 4 Catalogue/PDP | verified | P4-01–P4-05 verified locally. | [Phase 4 exit](implementation-evidence/phase-4.md) |
| 5 Cart/checkout/customer | in_progress | P5-01–P5-02 verified. P5-03 commerce and authentication verification follows. | [Cart](implementation-evidence/p5-01-cart.md), [checkout](implementation-evidence/p5-02-checkout.md) |
| 6 Retirement/final review | not_started | Needs all preceding implementation, regressions and traceability | — |

## Task ledger

Definitions and acceptance live in implementation-phases.md. Update only status/evidence here. Accepted status vocabulary: `not_started`, `in_progress`, `awaiting_review`, `verified`, `blocked`, `deferred`. Cite exact task evidence/commit when marking verified; record dependency/reason for blocked or deferred work. Never check a task merely because code was edited.

| Task | Status | Evidence / commit / limitation |
| --- | --- | --- |
| P0-01 | verified | [Baseline reconciliation](implementation-evidence/phase-0.md#p0-01--baseline-reconciliation); starting HEAD 005ad88; read-only runtime smoke, no restart/visual acceptance |
| P0-02 | verified | [Ownership matrix](implementation-evidence/p0-02-style-ownership.md), [consumer index](implementation-evidence/p0-02-style-consumers.json); source d6fd0f5, no runtime edits |
| P0-03 | verified | [Routes/states/harness map](implementation-evidence/p0-03-routes-states-tests.md), [route/test index](implementation-evidence/p0-03-route-index.json); source 944bf72, read-only Next route reconciliation |
| P0-04 | verified | [Fresh baseline/content report](implementation-evidence/p0-04-baseline.md), [94-case manifest](implementation-evidence/p0-04-capture-manifest.json), nine retained images; source 85bebc7, limitations/NEW-006 explicit |
| P0-05 | verified | [Exit summary](implementation-evidence/phase-0-summary.md), [69-row reconciliation](implementation-evidence/p0-05-reconciliation.json), [Phase 1 packet](phase-1-input-packet.md); starting source f1a7d99, documentation only |
| P1-01 | verified | [Contract PC01–PC08](prototype-contract.md), [checkpoint](implementation-evidence/phase-1.md); source 8f3f2fd, planning only, setup not launched |
| P1-02 | verified | [Coded proof/runbook/limits](implementation-evidence/p1-02-coded-proof.md), [16-view manifest](implementation-evidence/phase-1-proof/capture-manifest.json); starting 33f248e; no final visual approval |
| P1-03 | verified | [Density/colour/type/hard-case evidence](implementation-evidence/p1-03-density.md), [90-case index](implementation-evidence/p1-03-density/case-index.json); starting 44b12e3; no final supporting-value/lead acceptance |
| P1-04 | verified | [Modes/continuity/limits](implementation-evidence/p1-04-modes.md), [captures](implementation-evidence/p1-04-modes/capture-manifest.json); starting 82e202a, no final screen acceptance |
| P1-05 | verified | Owner selected A/five/support system, requested N03 revision, then said “continue next” after [revised PDP](implementation-evidence/p1-05-image.md) was shown; record closes local direction gate, not release |
| P2-01 | verified | [Token foundation/consumer map](implementation-evidence/p2-01-system.md), [token index](implementation-evidence/p2-01-system/token-consumers.json); source c5fd8e4, opt-in consumers, legacy shared values frozen |
| P2-02 | verified | [Cascade/state/scope report](implementation-evidence/p2-02-cascade.md), measured before/after + emitted rule, EN/AR portal/state records; source 2d35c15, no new palette/shared theme switch |
| P2-03 | verified | [Specimen/state coverage and checkout map](implementation-evidence/p2-03-specimen.md), captures/computed parity; source 33f8f65, no public theme switch or order submission |
| P2-04 | verified | [Refinements and measured contrast/type/shape/icon/motion](implementation-evidence/p2-04-refinement.md), nine captures; starting f83f29f, public/admin/shared consumers retained |
| P2-05 | verified | [Accepted authority/retirement/bindings report](implementation-evidence/p2-05-authority.md), archive hashes, rendered metadata; starting 078e9c5, documentation only |
| P3-01 | verified | [Mobile public-route implementation and checks](implementation-evidence/p3-01-mobile-shell.md) |
| P3-02 | verified | [Desktop/tablet and footer implementation](implementation-evidence/p3-02-chrome.md) |
| P3-03 | verified | [Public home implementation and checks](implementation-evidence/p3-03-home.md) |
| P3-04 | verified | [Bilingual responsive and route checks](implementation-evidence/p3-04-shell-home.md), localized failures, WebKit focus restoration and compatibility scopes |
| P4-01 | verified | [Listing/search implementation, captures and checks](implementation-evidence/p4-01-listing.md) |
| P4-02 | verified | [Cards/rails, bilingual captures and checks](implementation-evidence/p4-02-cards.md) |
| P4-03 | verified | [Bilingual gallery, purchase layout and responsive verification](implementation-evidence/p4-03-detail.md) |
| P4-04 | verified | [Product facts, reviews, sparse states and bilingual captures](implementation-evidence/p4-04-information.md) |
| P4-05 | verified | [Contextual return, bilingual checks and Phase 4 exit](implementation-evidence/phase-4.md) |
| P5-01 | verified | [Cart states, estimates and responsive continuation](implementation-evidence/p5-01-cart.md) |
| P5-02 | verified | [Checkout details, review, dock and results](implementation-evidence/p5-02-checkout.md) |
| P5-03 | not_started | — |
| P5-04 | not_started | — |
| P5-05 | not_started | — |
| P6-01 | not_started | — |
| P6-02 | not_started | — |
| P6-03 | not_started | — |
| P6-04 | not_started | — |
| P6-05 | not_started | — |

## Decisions and approval state

| ID | Decision | State / source | Consequence |
| --- | --- | --- | --- |
| D01 | Exact #FF5A5F, actual identity/facts, search priority, compact cards/dirham, app-like mobile and complete desktop | Confirmed earlier owner instructions, preserved by all three source docs | Do not ask again or replace them with reference greens. |
| D02 | Near-white/neutral support palette, deliberate type/shape/density and desktop lead | Proposed in the direction plan; not final screen acceptance | Test together in P1; finalise only after recorded screen decision. |
| D03 | Figtree/Alexandria | Existing licensed candidate; retention is unapproved | Deliberately compare on realistic bilingual content; one alternative only if warranted. |
| D04 | Existing routes, accessibility, localization, server authority, auth and integrations | Confirmed product/production constraints | Preserve in every phase; tests required for commerce/auth changes. |
| D05 | Create phases/progress/context preservation | Current owner request, 17 November 2026 | Preparation completed; does not itself record approval of a future visual candidate. |
| D06 | Local work authorisation | P0-01 expressly requested, then successive “do next” instructions executed P0-02–P0-04; earlier local authorisation retained within scope | Routine task execution does not require repeated permission; final candidate screen acceptance remains a distinct gate. |
| D07 | Production deployment | Excluded by owner instructions | No phase may deploy. |
| D08 | Phase 0 baseline exit | P0-05 reconciles all five baseline tasks and 69 requirement/finding assignments | Complete for baseline scope; not visual approval, product readiness or deployment. |
| D09 | Prototype execution contract | P1-01 selects additive dev-only /design-proof outside customer group, separate 4870/4871 fixture/process/output, scoped proof styles and same-data desktop lead comparison | Planned code-led mechanism, not working infrastructure yet. P1-02 verifies it; supporting visuals remain candidates until P1-05. |
| D10 | Working isolated coded proof | P1-02 verifies same-data A/B, shared phone/listing/PDP, EN/AR, gates and bounded helper/runtime checks | Provisional roles/fonts/density only. Local 4870/4871; no existing route/theme switch. Reviewer's four fixes resolved; P1-03/P1-04/P1-05 still required. |
| D11 | Density/typography/colour/shape experiments | P1-03 verifies 4/5 comparisons, readable hard cases, mobile purchase clearance and provisional state contrast; one reviewer correction resolved | Proposals only, no accepted palette/font/grid/lead. P1-04 continuity and P1-05 screen decision remain. |
| D12 | Prototype modes and continuity | P1-04 verifies focused search, query/scroll/back, server-checked cart, localized recovery and synthetic SKU/media association; enabled checkout review/admin regressions pass | Proof checkout/account remain explicit limited contracts. No order submission, global NEW-004/005 fix, native-device certification or final screen approval. P1-05 owner decision is next. |
| D13 | Owner screen selection | Owner structured response chose A/full-width campaign, five wide-screen home columns and retained shown Figtree/Alexandria/near-white/dark-on-coral/compact-card system | Confirmed, supersedes B recommendation. No need to ask these settled choices again. Final token architecture remains P2. |
| D14 | Compact phone PDP toolbar | Owner requested correction preview; implemented/verified Back/details/cart toolbar and six revised captures | Correction preview awaits owner response; P1-05 remains awaiting_review. No release/deployment approval. |
| D15 | Revised direction accepted for next stage | Owner said “continue next” after N03 PDP revision was shown | Close P1-05 and execute P2-01; does not authorize deployment or treat later screens as approved. |
| D16 | Accepted-system source and migration boundary | P2-01 uses scoped tokens.module.css with primitive/semantic/component roles and actual proof consumers | Old shared customer/wholesale/root styling remains frozen compatibility; alias/cascade verification P2-02, final guide P2-05. |
| D17 | Control/cascade boundary | P2-02 owns migrated native/shared/purchase/save/quantity/field states in scoped boundary.module.css; layout module no longer competes for them | Runtime foreground alias with white out-of-scope fallback; legacy added/saved meaning owned in existing controls file. Portals require in-scope ancestry. P2-03 completes remaining component contracts. |

Append dated decisions/corrections with affected task/coverage IDs and source (owner message or verified repository evidence). Link durable visual decisions into decisions.md; do not erase previous decisions or mistake proposed values for approval.

## Open inputs and risks

| ID | Item | Disposition / next step | Owner task |
| --- | --- | --- | --- |
| O01 | Verified exact-pack photo quality varies; PD0826 reference fixture is handheld | Reviewed six local reference photos. No verified alternate for PD0826 in that set. Retained the original association. Production asset quality and rights remain open. | P0-04, P4-02, P6-04 |
| O02 | Reference fixture deliberately lacks reviewed descriptions | Complete and sparse rendering verified separately in P4-04. Production catalogue completeness and native content review remain open. | P0-04, P4-04, P6-04 |
| O03 | Campaign cadence/content, delivery coverage/promises, live payments/provider readiness and asset rights | Keep unverified; no invented banners/services/claims. Use labelled representative fixtures, retain actual gates. | P0-03–P0-04, P6-04 |
| O04 | Added-state layer conflict confirmed in emitted CSS; primary-foreground remains dormant alias trap; checkout overrides inventoried | Resolve in P2; actual computed transition checks still owed. Not an observed failed order/add. | P2-02–P2-03 |
| O05 | Old instructions/guide/runtime still describe incumbent visual candidate | Treat as existing implementation evidence; align authority after accepted P1 screens, no silent restoration of rejected look. | P0-01, P2-05 |
| O06 | Search matching/Arabic quality and true back/scroll behaviour | P4-05 verifies contextual return and an offline search benchmark. Representative catalogue relevance and Arabic matching remain open. | P0-03, P4-05 |
| O07 | NEW-001/002/003: wholesale shares customer CSS/shell; root 404 imports it; admin campaign preview shares artwork/Outfit | Isolation/compatibility and preview policy required before accepted customer system switch; see P0-02 matrix. No shared deletion yet. | P2-01–P2-03, P3-03–P3-04, P6-01 |
| O08 | NEW-004: browser Back restores search URL and scroll in Chromium/WebKit. NEW-005: Arabic root 404 and route errors now localized, saved/account copy remains open. | P4-05 verifies in-page return with exact query, filters and focus. P5 verifies saved/account UI. | P3-04, P4-05, P5-05, P6-02 |
| O09 | NEW-006: two longer supplemental H1 dev-browser sequences stayed on Arabic home loading shell; direct HTTP/fresh contexts resolved | Cause unassigned. Twelve bounded P3-04 fixture cycles resolved and twelve P4-05 returns did not reproduce the stall. Broader long-session verification remains open. | P3-04, P4-05, P6-02 |

No blocker to starting P1-02 with the contract safeguards has been demonstrated at this checkpoint. Future blockers must name the actual dependency, affected tasks and independent work that can continue. Content/rights/release needs cannot silently disappear when code is done.

## Evidence index

- Source review: [system review](system-review-2026-11-17.md), [direction plan](storefront-direction-plan-2026-11-17.md), [per-image analysis](reference-review-2026-11-17.md).
- Reference originals: repository-root `docs/design/storefront/references/2026-11-17/manifest.json` (N01–N07, four families; private planning assets).
- Historical independent review notes: `.verification-results/direction-review-2026-11-17/assessment-a.md` and `assessment-b.md`; ignored/raw evidence may not exist in another checkout. Durable synthesis is the tracked system review.
- Historical critique snapshot: repository-root `.impeccable/critique/2026-11-17T03-50-30Z__apps-web-src-app-storefront-storefront-tokens-css.md`. 28/40 is the past usability review, not a current phase pass.
- Phase evidence: [P1-01 contract](prototype-contract.md), [Phase 1 checkpoint](implementation-evidence/phase-1.md), [Phase 0 exit summary](implementation-evidence/phase-0-summary.md), [69-row reconciliation](implementation-evidence/p0-05-reconciliation.json), [Phase 1 input packet](phase-1-input-packet.md), [baseline checkpoints](implementation-evidence/phase-0.md), [P0-04 capture/content report](implementation-evidence/p0-04-baseline.md), [94-case manifest](implementation-evidence/p0-04-capture-manifest.json), [P0-03 routes/states/harness map](implementation-evidence/p0-03-routes-states-tests.md), [route/test index](implementation-evidence/p0-03-route-index.json), [P0-02 ownership matrix](implementation-evidence/p0-02-style-ownership.md), [complete consumer index](implementation-evidence/p0-02-style-consumers.json) and [preview runbook](implementation-evidence/preview-runbook.md). Raw smoke: `.verification-results/storefront-replacement/phase-0/p0-01-runtime.json`. Existing preview preserved; no restart tested. Future captures/logs are indexed by source commit, viewport/locale/state and conditions.

## Source-plan fingerprints at preparation

These identify the reviewed inputs, not a runtime lock. If a source changes, reread the diff, update affected coverage/tasks/decisions and record a new checkpoint. Do not silently overwrite this original fingerprint record.

| Source | SHA-256 |
| --- | --- |
| system-review-2026-11-17.md | `301fc808dfcfc0f5e225af8ef06de4901efc5700d7d729a0d590030337413021` |
| storefront-direction-plan-2026-11-17.md | `0ad4464c3d4c040e281ca5d35f59b4d0132d5ed72077747a8b4f9c116848acd7` |
| reference-review-2026-11-17.md | `6e620940f7f4a25d8126f5578726b8ebde6f1744783ec53142a2fcb41ec68307` |

## Checkpoint log

### 2026-11-17 — Tracker preparation

- **Scope:** owner requested durable phases/progress from the three review documents; repeated direction-plan path deduplicated.
- **Changed:** phase definitions/resume rules, source coverage, progress ledger and minimal navigation links/instruction pointers.
- **Verification:** source documents read; task IDs, requirement mappings, document links, fingerprints and diff checked during preparation. No app tests/build/browser rerun for this documentation-only change.
- **Completed:** preparation only; all implementation tasks remain not_started.
- **Decision/gap:** no new final visual approval, production access or deployment.
- **Next:** P0-01 baseline reconciliation, followed by P0-02 ownership/cascade inventory. Read the current repository and instructions before touching runtime files.

### 2026-11-17 — P0-01 verified

- **Authorisation:** owner explicitly requested baseline reconciliation. No new supporting palette/font/layout or final visual approval inferred.
- **Starting state:** branch `codex/storefront-pharmacy-app-reference`, HEAD `005ad88713063a4257742273eeadbb5f1609fe63`, clean tree. Runtime source unchanged from 324a2ed; all three review fingerprints matched.
- **Completed:** baseline/version/authority reconciliation, current loopback preview identification, safe runbook and capability limits. [Evidence](implementation-evidence/phase-0.md) records commands/results, source and approval boundaries, rollback and partial coverage contributions.
- **Checks:** exact synthetic fixture identity and four HTTP routes 200/sample notice; local Next errors empty; installed Node/npm/Next recorded. New document links, source hashes, runbook shell syntax and diff checked. Full browser/capture matrix, build/tests and restart cycle not run and not claimed.
- **Remaining:** P0-02–P0-05, actual new-screen decisions and known content/rights/operational inputs. No demonstrated blocker to the next task.
- **Next:** P0-02; inspect storefront-tokens.css, global @theme/layers, storefront-controls.css and cart-controls.tsx, then trace consumer/scope/portal and admin/wholesale dependencies. Record safe migration/removal conditions.
- **Cleanup:** no process started/stopped and no runtime code/config changed; existing healthy preview retained. Raw ignored smoke evidence indexed above. Commit contains this checkpoint; resolve it through Git history rather than embedding its own hash.

### 2026-11-17 — P0-02 verified

- **Authorisation:** owner said “do next”; next eligible ledger task was P0-02. Inventory only; no new aesthetic or runtime approval inferred.
- **Starting state:** d6fd0f5 on the existing focused branch, clean tree. Three source-plan fingerprints retained; implementation unchanged.
- **Completed:** source ownership/removal matrix, all 40 customer token reference lists, CSS import/layer counts, shared UI/import closures, fonts, public asset consumers, portals/vendor boundaries and instruction/metadata/generator binding audit.
- **Evidence:** [ownership report](implementation-evidence/p0-02-style-ownership.md), [durable consumer index](implementation-evidence/p0-02-style-consumers.json), [phase checkpoint](implementation-evidence/phase-0.md). Raw graph/audit/emitted rules: `.verification-results/storefront-replacement/phase-0/p0-02-*`.
- **Findings:** NEW-001 wholesale imports customer CSS/shell and care colours; NEW-002 root 404 imports customer CSS/fonts; NEW-003 admin campaign preview shares CampaignArtwork/Outfit. Assigned future tasks in coverage; none silently resolved.
- **Checks:** 264 source files, eight local CSS modules, 40 customer token definitions, no unresolved relative code imports in bounded AST graph; emitted CSS confirms added-state layer precedence. No current primary-foreground utility consumer/rule in inspected scope, so recorded as dormant risk. No deletion based on lexical no-match. New links/JSON/task status and diff checked.
- **Limits:** no browser/computed-state/auth/payment/route matrix, build or test suite; no code changes. Import reachability and emitted CSS are not runtime visibility, final style isolation or deletion proof.
- **Next:** P0-03 route/state/test map, including root unknown URLs, wholesale shared wrapper and staff campaign preview paths. Select correct isolated fixture for each state; catalogue preview cannot exercise full commerce/auth.
- **Cleanup:** existing preview left running, no new server/browser/session started. Ignored audit scripts/evidence intentionally retained. This checkpoint is in its own documentation commit.

### 2026-11-17 — P0-03 verified

- **Authorisation:** owner said “do next”; ledger identified P0-03. Starting HEAD 944bf72 on the existing branch, clean tree. No new aesthetics or scope expansion.
- **Completed:** physical route/boundary inventory, customer/CMS/account/business/staff page-family map, API/resource/redirect/SEO/query/locale contracts, S01–S14 state checklist, H1–H4 harness/lifecycle selection and appropriate existing tests.
- **Evidence:** [route/state/test map](implementation-evidence/p0-03-routes-states-tests.md), [full index](implementation-evidence/p0-03-route-index.json). Raw script/counts/Next response: `.verification-results/storefront-replacement/phase-0/p0-03-*`.
- **Checks:** 36 pages + 24 handlers + robots = 61 source entries; 15 inherited boundaries. Local Next reports same entries plus favicon (62). 32 E2E files / 130 AST test expressions inventoried, not executed cases. Source fingerprints, paths/links/JSON/task assignments and diff checked.
- **Findings:** NEW-004 catalogue browser-back/query/scroll verification gap; NEW-005 literal English generic error copy needs localised-state coverage. Existing NEW-001/002/003 carried into route/fixture mapping. No claims of observed browser failure or production enablement.
- **Limits:** no test suite/build/new browser/server/transaction/database/provider operation. Local catalogue/reference preview cannot establish account/full commerce correctness; use disposable harness per report.
- **Next:** P0-04; prepare a dated EN/AR phone/tablet/desktop route/state capture manifest, validate local fixture/source identity, then capture and measure content hierarchy and media limitations without changing screens.
- **Cleanup/rollback:** existing preview retained, no processes started/stopped. Documentation-only checkpoint; no runtime rollback needed. Raw audit evidence retained intentionally.

### 2026-11-17 — P0-04 verified with recorded limitations

- **Authorisation/source:** owner said “do next”; P0-04 was next. Starting HEAD 85bebc7, clean tree. Runtime styles/content not redesigned.
- **Completed:** 94 final cases / 188 PNGs, EN/AR at 390×844, 900×1000 and 1440×900 (staff preview phone/desktop); nine representative images tracked. [Report](implementation-evidence/p0-04-baseline.md) and [manifest](implementation-evidence/p0-04-capture-manifest.json) preserve hashes, conditions, source and exact measurements.
- **Harness/state:** H1 real reference media with synthetic facts; H3 disposable signed-out account/business and unsaved staff draft; H4 details/reviewed synthetic quote. Zero orders/receipts/payments, stock remains 4. No production data/providers. Native touch/keyboard and full state/functional suites not exercised.
- **Checks:** fresh isolated p0-baseline build passed; final cases have no page overflow or collected JS errors; 82 main/flow/staff console records had no errors. H1 Next compilation/config/session diagnostics empty. Not a complete accessibility/security/performance/production pass.
- **Observations:** phone/tablet home purchase rows arrive at/below fold; descriptions/media/empty reading widths measured. NEW-005 expanded with observed English saved/root-404 in Arabic shell. NEW-006 records repeated long-session dev loading-shell condition; fresh initial contexts/HTTP resolve, cause unassigned. Corrected capture locator/URL/lazy-image-wait mistakes excluded from final cases.
- **Coverage:** baseline contributions recorded in phase/report; C/NEW implementation requirements remain open. Existing catalogue/rights/business claims remain unverified, not invented.
- **Cleanup/rollback:** all five owned browser sessions closed; temporary H2–H4 harness exited 0, ports stopped and disposable fixture cleaned. Original H1 preview retained. Generated next-env change restored. Documentation/artifacts only; raw scripts/logs/large images intentionally ignored, representative images retained.
- **Next:** P0-05 synthesize the Phase 0 evidence/coverage/open-items packet for Phase 1. No new visual direction implementation or final token approval inferred.

### 2026-11-17 — P0-05 verified; Phase 0 baseline complete

- **Authorisation/source:** owner said “do next”; P0-05 was next. Starting f1a7d99 on existing focused branch, clean tree. App/package/tooling source unchanged from reviewed 324a2ed; source-plan fingerprints still match.
- **Completed:** [consolidated exit summary](implementation-evidence/phase-0-summary.md), [per-row reconciliation](implementation-evidence/p0-05-reconciliation.json) and [Phase 1 input packet](phase-1-input-packet.md). All 63 C-requirements and six NEW-findings have baseline evidence, valid future tasks and explicit proof still owed; zero unmapped.
- **Disposition:** P0-01–P0-05 verified for baseline scope. All 69 implementation obligations remain open in the dated reconciliation, not falsely closed by inventory/captures. Content/rights/provider unknowns and NEW-001–006 remain visible. Supporting visuals still proposed.
- **Verification:** source/coverage/task IDs, future owners, evidence/reference paths, source fingerprints, manifest/retained hashes and diff checked; no runtime edit. No new browser/build/fixture/test suite in this documentation-only task. P0-04 measurements/build are dated baseline evidence, not current release proof.
- **Next:** P1-01 prototype contract using the input packet. Define isolated coded proof scope, matched data, home/listing/PDP device/locale/state coverage, one direction's experiments and actual screen-review criteria. Do not mark P1-01 complete from preparation or start final guide/tokens before screen approval.
- **Cleanup/rollback:** existing preview untouched; no task process started/stopped. Documentation-only rollback. Progress remains single status authority; all later checkpoints must preserve decisions/open findings and source drift.

### 2026-11-17 — P1-01 verified; Phase 1 started

- **Authorisation/source:** owner said “do next”; next task P1-01. Starting 8f3f2fd on existing branch, clean tree; runtime/source plans unchanged. No repeated interview or new visual acceptance inferred.
- **Completed:** [prototype contract PC01–PC08](prototype-contract.md), [phase evidence](implementation-evidence/phase-1.md). Defines one candidate direction, fair home full/split comparison, same data/identity and shared phone sequence, listing/PDP/RTL/state minimums, reference borrowing/unknowns and actual review gate.
- **Process decision:** additive dev-only Next namespace outside storefront group, planned local web/fixture 4870/4871 and existing tagged output, CSS Modules/proof-root roles, existing validation helpers and no live/shared theme changes. Guards/noindex/loopback/data/provenance/removal obligations explicit; not launched/implemented by this task.
- **Verification:** contract acceptance clauses, source/reference/fixture paths and hashes, source fingerprints/task IDs/local links/diff checked. No UI code, final tokens, browser/build/test/fixture process or deployment. N03/N07 originals re-examined with full N01–N07 analysis; all reference reuse limits retained.
- **Open:** P1-02 coded proof, P1-03 stress experiments, P1-04 interaction/mode verification, P1-05 concrete owner screen decision. All C/NEW implementation proofs remain owed; NEW-001–006 and content/rights/provider gaps carried explicitly.
- **Next:** P1-02, implement and verify the contract's isolated dev-only gate/data/output/style boundary first, then build comparable working home/listing/PDP views. Read relevant craft/version-matched docs immediately before UI edits. No final DESIGN.md/token replacement before screen review.
- **Cleanup/rollback:** documentation-only, no process or runtime change; revert this checkpoint docs if needed. Progress remains sole mutable status authority.

## Checkpoint template — append; do not replace earlier history

```text
Date / task IDs / executor:
Starting branch and source commit; existing edits:
What changed and why; files/commit:
Coverage IDs addressed; partial/unresolved cases:
Exact checks and pass/fail/not-run results; fixture and runtime setup:
Evidence paths, viewport/locale/state and capture freshness:
Owner/reviewer decisions (actual source, not inferred):
Remaining risks/content/operational inputs; rollback notes:
Statuses updated; phase gate satisfied or still open:
Exact next task ID and first action:
Temporary processes/files cleaned up; existing servers left as agreed:
```

When interrupted or handing off, update this file before yielding where possible. If source changed without a checkpoint, reconcile Git/diffs and stale evidence on resume before claiming completion. Update MIGRATION_STATUS.md after material phase milestones, not as a substitute for this task ledger.

### 2026-11-17 — P1-04 verified

- **Authorisation:** owner continued staged implementation; next eligible task was P1-04. Starting 82e202a, clean tree, existing focused branch. No screen acceptance inferred.
- **Completed:** focused mobile/docked desktop search; safe query/scroll/focus return and native Back proof; SKU/gallery association; localized error refetch; cart recovery/estimate/server check; checkout/account contract screens and task chrome. [Detailed report](implementation-evidence/p1-04-modes.md) separates implemented behavior, synthetic demonstrations and unknowns.
- **Checks:** 15 proof interaction tests, 7 existing-harness checkout/admin/responsive checks, 14 selected units, web types/lint/build and bounded live Next/browser smoke pass. Ten retained captures; actual native keyboard/device/zoom/speech remain unverified. Controlled error/test-failure history preserved. No orders submitted.
- **Ownership:** only dev-only proof, fixtures/tooling/tests and progress evidence changed. Current storefront/admin/wholesale CSS, APIs/commerce logic, final authority and dependencies unchanged. Three source hashes unchanged.
- **Cleanup:** normal proof 4870/4871 restarted with current fixture; original 4860/4861 untouched. Test-owned servers and browser closed, generated next-env noise restored. No production access/deployment.
- **Next:** P1-05 owner screen decision; present concrete comparisons and remaining limitations before P2 final system work.

### 2026-11-17 — P1-05 presented for owner review

- **Authorisation:** owner said “do next”; prepared the concrete screen-selection task from b541e42, clean tree. No runtime code changed.
- **Deliverable:** [Selection packet](implementation-evidence/p1-05-selection.md) and 18 fresh current-source captures compare both desktop leads at both home densities, plus shared phone/desktop listing/PDP in EN/AR. Reference interpretations, proposed support roles/fonts/shapes, limitations and the compact-PDP-toolbar discrepancy are explicit.
- **Recommendation:** B split discovery, five home columns at the tested wide size, four listing columns beside filters, responsive reduction/shared phone sequence and shown supporting system. Recommendation is not owner acceptance. Lead brings purchase row 140px higher at this fixture/viewport; no conversion claim.
- **Checks:** captured 18 routes/states at 200, fonts/images settled, no document overflow/browser page errors; references/screens inspected, local links/manifest hashes/diff checked. No app changes, so no repeat build/unit suites. Capture browser closed, preview processes preserved.
- **State:** P1-05 awaiting_review, verified count remains 9/34. Record actual owner response and any changed evidence before P2. No final DESIGN.md/tokens/instruction changes, production access or deployment.

### 2026-11-17 — P1-05 owner selection and toolbar correction

- **Owner response:** A/full-width campaign, five wide-screen home columns; retain shown supporting system and preview compact PDP toolbar. These choices supersede B recommendation. No further palette/font/lead vote needed.
- **Changed:** proof defaults to selected A/five; phone PDP has compact sticky Back/details/cart toolbar instead of browse header/breadcrumb. Desktop unchanged; sanitized query/scroll/focus return and server purchase logic reused.
- **Evidence:** [correction report](implementation-evidence/p1-05-toolbar.md), six revised current screenshots; 17 interaction tests, types/lint/build, live Next compile/session and browser checks pass. No independent review or native-device certification inferred.
- **Boundary:** only proof UI/tests/evidence changed, no shared/admin/wholesale/commerce implementation. Generated next-env noise restored; original/proof previews preserved, test browsers/servers closed. No production data/provider access/deployment.
- **Next:** only toolbar revision acceptance/correction remains; P1-05 awaiting_review and count 9/34 until response, then P2-01.

### 2026-11-17 — P1-05 N03 image-first correction

- **Owner request:** rejected standalone toolbar; directed mobile PDP toward 03-green-pharmacy-screens, “top full for image” and other aspects. Existing A/five/support choices unchanged.
- **Changed:** full-width phone image with overlay Back/Save/Cart, no toolbar-title strip/browse header; compact product summary, local related-product rail, existing sticky purchase. Desktop/shared/commerce untouched.
- **Evidence:** [latest report and eight captures](implementation-evidence/p1-05-image.md), 17 interaction tests/types/lint/build pass. No independent/native-device/release certification inferred.
- **Next:** review this revised PDP before closing P1-05/P2. Previous toolbar captures are superseded history, not a fallback. Count stays 9/34; no final design/token authority change or deployment.

### 2026-11-17 — P1-05 closed, P2-01 verified

- **Owner instruction:** “continue next” following the shown N03 image-first PDP. Recorded as authorization to close the direction checkpoint and begin P2; A/five and the shown supporting system remain selected. No release/deployment approval inferred.
- **Implemented:** one scoped primitive → semantic → component CSS value source, actual proof consumers migrated, additive bilingual font variables, removed raw proof palette and repeated visual scales; explicit legacy consumer/Tailwind migration map. Old shared values untouched, misleading legacy token isolation comment corrected.
- **Verification:** 17 proof flows, 8 incumbent-harness checkout/admin/responsive/boundary checks, 5 units, type/lint/build and live Next/browser smoke pass. Fourteen retained captures and six matched comparisons show no material visual drift. [Full report and limits](implementation-evidence/p2-01-system.md).
- **Ownership:** only accepted system/proof consumers, additive font bindings, legacy comment, focused tests and evidence changed. No root/admin/wholesale/API/commerce/style value switch or dependency change. No orders submitted. Original/proof previews retained, test/browser processes closed, generated next-env noise restored.
- **Next:** P2-02 actual cascade/scope/literal foreground/state/portal verification. P2-03 specimen, P2-04 refinements and P2-05 authority alignment remain separate. Count 11/34; no production access/deployment.

### 2026-11-17 — P2-02 verified

- **Authorisation:** owner continued; next eligible P2-02, starting 2d35c15 on focused branch, clean tree. Accepted direction unchanged.
- **Fixed:** compiled primary-foreground literal via scoped runtime alias; legacy added/hover and compact saved/hover ownership; accepted native/shared/purchase/save/quantity/field state boundary, pending vs unavailable, invalid-field semantics/focus and route-CSS/portal ancestry contracts. No raw palette or commerce-domain change.
- **Evidence:** [detailed report](implementation-evidence/p2-02-cascade.md), four captures, settled baseline/correction and computed/emitted EN/AR data. 22 proof tests, 10 compiled harness regressions, 6 units, types/lint/build, bounded live Next/browser checks pass. Initial test scoping/diagnostic/guard failures retained and corrected, not counted as passes.
- **Instructions:** short web AGENTS boundary pointer clarifies current owner; full authority reconciliation remains P2-05. Shared root fallback/admin/wholesale outcomes verified, not blanket stylesheet deletion. Native/device/provider/independent review limits explicit.
- **Cleanup:** temporary test/capture/browser processes closed, existing previews preserved, next-env output restored. No order submission, production data/provider access, dependency upgrade or deployment.
- **Next:** P2-03 full specimen + checkout style consolidation/mapping; P2-04 contrast and P2-05 final guide remain. Count 12/34.

### 2026-11-17 — P2-03 verified

- **Authorisation/source:** owner continued; starting 33f8f65 on the focused branch. Accepted A/five, N03 PDP and supporting system retained.
- **Implementation:** dev-only full specimen reuses working campaign/categories/options/cards/gallery/cart, shared controls, disclosures and actual sheets. Labelled feedback/format/placeholder demonstrations are distinct from real cart requests. Embedded dock does not measure viewport clearance. Selected options/thumbnails use accepted boundary ownership.
- **Checkout:** 21 proven overridden declarations removed; active styling retained and mapped for P5. Eight measured EN/AR/details/review states match, no checkout/domain/provider changes or orders.
- **Evidence:** [Report](implementation-evidence/p2-03-specimen.md), 14 captures, matched-home zero-pixel comparisons, deletion audit and computed contract. 26 proof + 14 compiled regressions + 16 units/type/lint/build/live checks pass. Dev export 500 recovered by owned preview restart, output/cache retained; capture-helper/locator failures and heading-specificity correction recorded.
- **Cleanup/limits:** no production access/deployment/dependency upgrade. Disposable harness/browser processes closed, original/proof previews retained, generated next-env noise restored. Native/provider/independent release review remains open; NEW-006 not globally resolved.
- **Next:** P2-04 role/type/shape/icon/motion refinements; P2-05 final guide authority remains separate. Count 13/34.

### 2026-11-17 — P2-04 verified

- **Source/authorisation:** owner continued; starting f83f29f. Accepted direction preserved; no new palette/font/layout.
- **Changes:** accepted default Button consumes 10px role while explicit shapes remain; long shared labels wrap at doubled text; offer/error meaning separated with existing colours; count/stock inset/icon stroke/easing roles explicit. One scoped motion owner covers shared portal links and preserves reduced-motion immediate states.
- **Evidence:** [Report](implementation-evidence/p2-04-refinement.md), nine captures, before/after 16-case text sweeps and actual bilingual state measurements. 32 proof,14 compiled retained regressions, 17 units/type/lint/build/live checks pass. Initial pill-test serialization, enlarged-text overflow and motion-consumer guard findings are recorded accurately.
- **Decisions:** 10px redundant counts only/full accessible names; stock 11px with wide 3/8 and phone 2/6 inset; accepted photos static, legacy guarded zoom retained until P4. No final guide rewrite; P2-05 owns reconciliation.
- **Safety/cleanup:** no orders, provider/production data access, dependencies or deployment. Test/capture/browser processes closed; existing previews preserved, next-env noise restored. Native/provider/independent release review and NEW findings remain bounded/open.
- **Next:** P2-05 final authority alignment. Count 14/34.

### 2026-11-18 — P2-05 verified / Phase 2 exit

- **Authorisation/source:** owner continued; starting 078e9c5, clean focused branch. Existing staged authorisation includes replacing the stale active guide; no repeat palette/font/composition decision needed.
- **Authority:** rewrote DESIGN.md/sidecar, brief/directions/decision register and project styling/profile bindings from selected P1/P2 screens/runtime. Archived five former active records with source hashes and exclusion notices. Four original reference/review/plan sources retain body/history and now point to current authority. Product capabilities/facts retained.
- **Checks:** nine focused tests; repository/workspace typecheck and lint; ten isolated metadata renders, four bilingual/viewport computed samples, clean read-only home/specimen/admin-login/Next smoke. Accepted/runtime/shared/admin/package sources unchanged. P2-04 broader browser/build results are retained, not falsely rerun.
- **Limits/cleanup:** no UI/CSS/API/commerce/provider/data change, dependency change, orders or deployment. No active project generator binding found; generic skills remain available but cannot overwrite the selected system. Existing previews kept; temporary browsers closed. Device/provider/Arabic/final-release gates and NEW findings remain open.
- **Next:** P3-01 public mobile shell and search/location/cart/task modes. P3-02 desktop shell, P3-03 home and P3-04 regression/retirement remain staged. Count 15/34.


### 2026-11-18 — P3-01 verified

- Migrated the mobile public shell in a worktree on the storefront branch. Search retains its native query and suggestion paths, delivery area persists on the device, and cart/checkout have focused task navigation.
- Saved bilingual captures and compiled storefront regression evidence. The existing public PDP toolbar remains assigned to P4-03.
- Continue with P3-02 desktop/tablet shell and footer.


### P3-02 verified

- Desktop and tablet header keep delivery, account and cart available while allocating a flexible search width. The footer wraps across widths and uses the same destinations in desktop and phone groups.
- EN/AR captures and compiled regression evidence recorded. Continue with P3-03 public home merchandising.


### P3-03 verified

- Migrated the public home campaign, category row, comparison grid, verified brand links and published content placements. Recorded fixture coverage for sparse stock, failed catalogue and managed campaign behavior.
- Continue with P3-04 shell and home verification before starting catalogue and PDP migration.


### 2026-11-18 — P3-04 verified and Phase 3 exited

- Verified bilingual shell and home with responsive and zoom measurements, route and browser Back continuity, footer clearance and scoped portals. Localized route recovery and fixed WebKit delivery focus return.
- Isolated accepted responsive bindings from the compatibility shell. Kept active shared styles for root 404, wholesale, public catalogue, PDP and checkout consumers.
- 40 Chromium cases and 12 WebKit cases passed. Physical devices and broader release checks remain open. Continue with P4-01.


### 2026-11-18 — P4-01 verified

- Migrated catalogue, category, offers and search to the accepted surface and typography. Filter and Sort share the phone toolbar. Desktop uses the same native filter form in an open left rail, with applied filters beside sort.
- Preserved known query values, search interpretation and literal mode, server pricing/stock, category redirects and indexing rules. Clear filters keeps the term and sort, with a separate Clear search action. Pagination appears when another page can be reached.
- Verified localized loading, empty, partial identifier match and failed query recovery. Fixed filter focus on live resize and an early phone disclosure being closed during WebKit hydration.
- See the [report and comparison captures](implementation-evidence/p4-01-listing.md). Card media/anatomy and further public grid/rail consumers carry into P4-02. Representative Arabic matching remains under O06.


### 2026-11-18 — P4-02 verified

- Migrated public standard cards and compact related/history presentations to the accepted system. Removed card-specific legacy overrides and static-image zoom while keeping route-level grid counts.
- Preserved exact identifiers, readable pack/strength details, real stock and saved state, and server-validated quick add. Grouped results show the price of the displayed SKU and link to real options. Local failed or missing images show explicit placeholders.
- Recorded [screenshots and checks](implementation-evidence/p4-02-cards.md). The handheld image remains associated with PD0826. Continue with P4-03 gallery and buying composition.


### 2026-11-18 — P4-03 verified

- Implemented the full-width phone gallery with Back to category, Save and Cart over the image, plus a measured portrait purchase dock. Desktop retains normal storefront navigation and a side-by-side buying column. Short landscape uses the same controls in flow.
- Verified real photo selection, missing-image recovery, exact SKU price/stock/options, integer quantity entry and the existing stock-checked purchase path. Confined related-card overflow to its own rail.
- Continue with P4-04 product information and alternatives. P4-05 owns contextual overlay return, query/scroll/focus continuity and the Phase 4 exit.


### 2026-11-18 — P4-04 verified

- Placed product copy, supplied warnings, specifications, contact, delivery and returns, and reviews before related products. Kept catalogue/verified review text and existing policy and commerce sources.
- Reduced the sparse state to available facts and a missing-description message. Removed superseded product information rules and scoped section spacing.
- Recorded [bilingual screenshots and checks](implementation-evidence/p4-04-information.md). Next is P4-05 contextual return, continuity and the Phase 4 exit.


### 2026-11-18 — P4-05 verified and Phase 4 exited

- Restored exact browse URLs, scroll and focused links from the product page. Verified ordinary variant history and category fallback for direct or reloaded product pages.
- Verified the return-to-results journey through saving, adding a selected quantity and reloading the cart. The [Phase 4 evidence](implementation-evidence/phase-4.md) records bilingual responsive, regression and SEO checks, and remaining content and media work. Continue with P5-01.


### 2026-11-18 — P5-01 verified

- Migrated cart loading, empty, populated, unavailable and retry states. Kept exact pack data, server estimates, stock checks and recommendation exclusion. A single continuation moves from the portrait dock into the desktop or short landscape summary.
- Verified bilingual resizing and keyboard focus, checkout-enabled and ordering-unavailable routes, cart reload, selected SKU pricing and local admin family editing. [Implementation evidence](implementation-evidence/p5-01-cart.md). Continue with P5-02.


### 2026-11-18 — P5-02 verified

- Migrated checkout details, review, disabled, completion and hosted payment return to the accepted system. The form and summary share one responsive continuation with measured dock clearance.
- Verified local bilingual presentation, keyboard and resize behavior, and existing checkout gates and recovery. [Implementation evidence](implementation-evidence/p5-02-checkout.md). Continue with P5-03.
