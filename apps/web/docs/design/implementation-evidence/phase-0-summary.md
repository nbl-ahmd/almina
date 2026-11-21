# Phase 0 — consolidated baseline and exit record

17 November 2026. P0-05 synthesis prepared from `f1a7d99` on `codex/storefront-pharmacy-app-reference`; starting tree clean. This closes **baseline preparation**, not the redesign or its acceptance. No screens, runtime rules, final tokens, APIs or product behaviour changed during this synthesis.

**Resume through [progress](../implementation-progress.md). Next task: P1-01, write the prototype contract using the [Phase 1 input packet](../phase-1-input-packet.md).** This synthesis does not execute that contract or generate screens.

## What is established

| Baseline question | Evidence / result | Boundary |
| --- | --- | --- |
| What source was reviewed? | Runtime UI repairs at 324a2ed; source review/reference archive 72312c9; task tracking 005ad88; P0 checkpoints d6fd0f5, 944bf72, 85bebc7, f1a7d99. | Tracked app/package/tooling source remains unchanged from reviewed implementation. Historical evidence is dated, not automatically current. |
| Has the plan changed? | All three source-plan SHA-256 fingerprints still match the preparation record. | Original fingerprints preserved; future owner instructions/diffs must be reconciled, not silently replace history. |
| Which requirements are confirmed? | Actual identity/facts, exact #FF5A5F, prominent search, compact factual cards/dirham, app-like mobile, deliberate desktop, EN/AR/RTL, accessibility, existing routes/SEO and authoritative commerce/auth. | Supporting palette/fonts/shape/density/desktop lead are proposals; no new visual selection recorded. |
| What does the styling actually affect? | Eight local CSS modules and all 40 customer tokens mapped to consumers; root/shared styles, wholesale, root 404, admin campaign preview/fonts and portals explicitly traced. | Wholesale directly shares customer CSS/shell. Admin independence cannot be inferred from untouched files; no shared deletion or global token switch is safe without migration proof. |
| What routes/states must survive? | 61 physical page/handler/robots entries, 15 layout/error/loading boundaries; Next reports those plus favicon (62 patterns). S01–S14 state and H1–H4 harness map. | Dynamic patterns are not concrete URL counts/capabilities. Account functions mostly share /account; Arabic UI is cookie-driven, with limited explicit editorial paths. |
| What does the incumbent look like now? | 94 final capture cases/188 PNGs, EN/AR at phone/tablet/desktop, nine tracked representative images plus measured hierarchy/reading widths. | Responsive desktop-engine captures, not native touch/software keyboard or full accessibility/security/performance verification. |
| Was enabled commerce represented safely? | Fresh isolated fixture build; signed-out/customer/business and unsaved staff campaign states, quote-only checkout. Fixture stock 4, orders/receipts/payments 0. Temporary harness/browser sessions closed. | Synthetic data/providers only. No production data, live provider readiness, transactional regression pass or release approval implied. |
| Could a future session resume reliably? | Task ledger, coverage rows, source fingerprints, durable evidence/index/representative captures, explicit decisions/open needs and this handoff. | Raw large evidence is ignored; if unavailable or stale, recapture before relying on it. |

## Evidence bundle

1. [P0 checkpoint log and authority/runtime reconciliation](phase-0.md) and [safe preview runbook](preview-runbook.md).
2. [Style ownership/removal conditions](p0-02-style-ownership.md) and [token/component/asset index](p0-02-style-consumers.json).
3. [Route/state/query/SEO/test-harness map](p0-03-routes-states-tests.md) and [route/boundary/test index](p0-03-route-index.json).
4. [Fresh baseline/content report](p0-04-baseline.md) and [94-case image/measurement manifest](p0-04-capture-manifest.json), with nine linked retained screenshots.
5. [Per-requirement reconciliation](p0-05-reconciliation.json): 63 C-requirements plus six NEW-findings, each mapped to baseline evidence, future owners and acceptance still owed.
6. [Phase 1 input packet](../phase-1-input-packet.md): reading order, constraints, proposed experiments, representative screens/states, safety boundaries and review gate.

## Review findings carried forward

| Finding | Baseline determination | Next owner / proof owed |
| --- | --- | --- |
| System/cascade reliability | Emitted CSS confirms added-state utilities lose to unlayered customer accent rules. Primary foreground is a dormant alias trap in inspected output; checkout has accumulated treatments. | P2-01–P2-04: single value/variant/state ownership, compiled alias/computed-state evidence, legitimate shared/admin compatibility. No failed add/order was established. |
| Mobile shopping priority | First home purchase row begins at Y841 EN / Y844 AR in 390×844 and below the 1000px tablet fold. | P1-02/P1-03 and P3/P4: compare compact structure, wide usable search and readable complete merchandise, not smaller facts/targets. |
| Desktop completeness | First shelf is visible in 1440×900; generic text-only discovery and sparse content still need deliberate composition. | P1 comparison of shallow/split desktop lead; P3 conditional actual shelves/campaigns/brands and an intentional sparse-data page. |
| Palette/type/container grammar | Current coral/lavender/teal/route-local state choices and hard-coded geometry do not form the accepted replacement world. | P1 composed experiments, then P2 semantic system only after concrete screen review. Do not turn this baseline into new design authority. |
| Product confidence/media | Related content precedes detail facts; fixture descriptions are blank; actual exact-pack photos vary, including handheld PD0826. | P4 factual hierarchy/verified media; P1 honest complete/missing-content variants. No generated packs or medical copy. |
| NEW-001 | Wholesale imports entire storefront CSS and matches .storefront-shell; old care utilities remain active there. | P2-01/P2-02 isolate or preserve compatibility before customer switch; P5/P6 business regression. |
| NEW-002 | Root 404 outside group imports customer CSS/fonts/Navigation/Footer. | P2-02/P3-04/P6-01 preserve direct unknown URLs/error theme and scope before removing consumers. |
| NEW-003 | Admin CampaignArtwork/Outfit preview is shared and has a separate historical palette. | P2-03/P3-03/P6-01 explicit preview policy and staff/editor/font verification. |
| NEW-004 | No explicit catalogue browser-back/query/scroll restoration test found; PDP back is a category link. | P3-04/P4-05/P6-02 actual continuity tests. Source absence is not observed failure. |
| NEW-005 | Generic error text is English in source; saved/root-404 text remains English in captured Arabic shell. | P3-04/P5-04/P5-05/P6-02 localized UI/error states without falsifying product names. |
| NEW-006 | Longer supplemental H1 sessions stalled on Arabic home loading shell; direct HTTP and fresh initial contexts worked. | P3-04/P4-05/P6-02 bounded isolated reproduction; cause unassigned, not claimed fixed or proven in production. |

## Content, authority and verification debt

- Exact-pack replacement photos, reviewed descriptions and asset publication rights remain open. Local source/media inventory is not permission to mutate production associations or publish references.
- Campaign cadence, category priorities, delivery coverage/hours/promises and live payment/provider readiness remain unverified operational context. Retain actual gates and honest absent modules; do not invent facts to make a reference page look complete.
- Search matching/Arabic quality, full browser-back/scroll continuity, native keyboard/touch, landscape/zoom/reduced motion, portal/cross-surface transitions, signed-in/order/payment recovery and full S01–S14 cases still need the appropriate implementation-stage checks.
- Incumbent DESIGN.md/brief/web styling instructions/project-profile reference binding still describe the existing candidate. Preserve functional guardrails but use the latest three-source proposal for the new prototype exploration. P2-05 will align active visual authority after accepted screens; do not impose the incumbent composition by default or rewrite it prematurely in P0-05.
- Existing passing tests and 28/40 usability review remain scoped historical evidence. A baseline task marked verified is not a whole-product quality verdict.

## Requirement reconciliation

The [coverage register](../implementation-coverage.md) retains C01–C63 and NEW-001–NEW-006. P0-05 reconciles **69 of 69**, with zero unmapped rows. Each has baseline evidence or an explicit planned-only constraint and at least one valid future task owner, plus the proof still required.

All 69 continue as **open implementation obligations** in the reconciliation snapshot. This avoids silently closing later design, accessibility, shared-consumer or production-safety requirements because baseline documentation exists. The progress ledger alone owns mutable task status; this report/JSON is a dated evidence handoff, not a second completion ledger. Future discoveries get NEW-### and an explicit owner/proof.

## Phase 0 exit gate

| Gate | Disposition |
| --- | --- |
| Scope/source/approval/version baseline reconciled | Verified — P0-01. |
| Definitions → consumers → migration destination/removal conditions mapped | Verified — P0-02, including shared boundaries that differed from assumptions. |
| Routes/states/compatibility/SEO/test setups inventoried | Verified — P0-03; no invented pages/features. |
| Fresh bilingual/device baseline and content gaps recorded | Verified — P0-04 with explicit capture limits/unresolved observation. |
| All source requirements/new findings assigned and input packet ready | Verified — P0-05 reconciliation and handoff. |
| New aesthetic finalisation, runtime redesign, deployment | Not performed or approved through Phase 0. |

**Phase 0 complete for baseline scope; ready for P1-01 contract preparation.** No demonstrated blocker to writing that contract. Open media/operational needs and NEW-006 do not vanish; dependent future validation must state its limits. Do not request confirmation for already supplied product requirements or treat this task as automatic approval of supporting visuals.

P0-05 checked source fingerprints, task/coverage/evidence links, retained image hashes and absence of runtime diff. No build, browser, fixture or test suite rerun was needed for this documentation-only synthesis; P0-04 results remain dated evidence. Existing local preview processes were not changed. Rollback is this documentation commit only; no runtime/data migration.
