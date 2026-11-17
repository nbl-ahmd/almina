# Storefront replacement — progress and resume record

Last updated: 17 November 2026. This is the single mutable status ledger for [implementation phases](implementation-phases.md) and [requirement coverage](implementation-coverage.md).

## Current checkpoint

- **Current work:** P0-01 baseline reconciliation verified; Phase 0 is in progress. No replacement UI implementation has started.
- **Next eligible task:** **P0-02 — consumer/cascade inventory**. Start with customer tokens, global theme aliases/layers and button state precedence; trace shared/admin/wholesale and portal consumers before any removal or redesign.
- **Verified implementation tasks:** 1 of 34 (P0-01, baseline documentation/setup reconciliation; no redesigned screens). These are equal checklist counts, not a weighted completion percentage.
- **Completed preparation:** read all three source documents; created seven phases, stable tasks, source-to-task coverage and this resume protocol. The duplicated direction-plan path in the owner's message is one source, not extra scope.
- **Branch at preparation:** `codex/storefront-pharmacy-app-reference`.
- **Source-review baseline:** 324a2ed (incumbent UI repairs); 72312c9 (review/plan/reference archive). Later tracker commits are documentation, not visual implementation.
- **Working tree at start of preparation:** clean. Reinspect on every continuation; this is historical evidence only.
- **Runtime/testing this checkpoint:** read-only loopback fixture identity and home/products/cart/checkout HTTP smoke passed; sample-data notice present; local Next error report empty. No browser matrix, app test suite, build or restart cycle run; those remain distinct checks. See Phase 0 evidence.
- **No production data access or deployment. No final replacement visual approval inferred.**

## Phase status

| Phase | Status | Entry / unresolved gate | Evidence |
| --- | --- | --- | --- |
| 0 Baseline/ownership | in_progress | P0-01 verified; P0-02–P0-05 remain | [P0-01 evidence](implementation-evidence/phase-0.md) |
| 1 Direction proof | not_started | Needs verified Phase 0 and authorised prototype execution | — |
| 2 Accepted system | not_started | Needs concrete Phase 1 screen decision | — |
| 3 Shell/home | not_started | Needs Phase 2 system and state/consumer verification | — |
| 4 Catalogue/PDP | not_started | Needs Phase 3 shell/home verification | — |
| 5 Cart/checkout/customer | not_started | Needs Phase 4 verification | — |
| 6 Retirement/final review | not_started | Needs all preceding implementation, regressions and traceability | — |

## Task ledger

Definitions and acceptance live in implementation-phases.md. Update only status/evidence here. Accepted status vocabulary: `not_started`, `in_progress`, `awaiting_review`, `verified`, `blocked`, `deferred`. Cite exact task evidence/commit when marking verified; record dependency/reason for blocked or deferred work. Never check a task merely because code was edited.

| Task | Status | Evidence / commit / limitation |
| --- | --- | --- |
| P0-01 | verified | [Baseline reconciliation](implementation-evidence/phase-0.md#p0-01--baseline-reconciliation); starting HEAD 005ad88; read-only runtime smoke, no restart/visual acceptance |
| P0-02 | not_started | — |
| P0-03 | not_started | — |
| P0-04 | not_started | — |
| P0-05 | not_started | — |
| P1-01 | not_started | — |
| P1-02 | not_started | — |
| P1-03 | not_started | — |
| P1-04 | not_started | — |
| P1-05 | not_started | — |
| P2-01 | not_started | — |
| P2-02 | not_started | — |
| P2-03 | not_started | — |
| P2-04 | not_started | — |
| P2-05 | not_started | — |
| P3-01 | not_started | — |
| P3-02 | not_started | — |
| P3-03 | not_started | — |
| P3-04 | not_started | — |
| P4-01 | not_started | — |
| P4-02 | not_started | — |
| P4-03 | not_started | — |
| P4-04 | not_started | — |
| P4-05 | not_started | — |
| P5-01 | not_started | — |
| P5-02 | not_started | — |
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
| D06 | Local work authorisation | P0-01 expressly requested 17 November 2026; earlier local implementation authorisation retained within scope | This checkpoint executes P0-01 only. No renewed routine permission needed; new candidate screen acceptance remains a distinct gate. |
| D07 | Production deployment | Excluded by owner instructions | No phase may deploy. |

Append dated decisions/corrections with affected task/coverage IDs and source (owner message or verified repository evidence). Link durable visual decisions into decisions.md; do not erase previous decisions or mistake proposed values for approval.

## Open inputs and risks

| ID | Item | Disposition / next step | Owner task |
| --- | --- | --- | --- |
| O01 | Verified exact-pack photo quality varies; PD0826 reference fixture is handheld | Inventory available alternatives/provenance. Preserve real association; never generate a substitute product pack. Not a blocker to labelled structural prototypes. | P0-04, P4-02 |
| O02 | Reference fixture deliberately lacks reviewed descriptions | Verify actual available content separately; honest fallback only. Do not claim production descriptions are missing. | P0-04, P4-04 |
| O03 | Campaign cadence/content, delivery coverage/promises, live payments/provider readiness and asset rights | Keep unverified; no invented banners/services/claims. Use labelled representative fixtures, retain actual gates. | P0-03–P0-04, P6-04 |
| O04 | Source-derived added-state/primary-foreground/layer conflicts and checkout override accumulation | Confirm current definitions/consumers and computed states before migration. Not recorded as observed failed orders. | P0-02, P2-02–P2-03 |
| O05 | Old instructions/guide/runtime still describe incumbent visual candidate | Treat as existing implementation evidence; align authority after accepted P1 screens, no silent restoration of rejected look. | P0-01, P2-05 |
| O06 | Search matching/Arabic quality and true back/scroll behaviour | Evaluate representative local data; track separately from new styling if outside scope. | P0-03, P4-05 |

No implementation blocker has been demonstrated at this checkpoint. Future blockers must name the actual dependency, affected tasks and independent work that can continue. Content/rights/release needs cannot silently disappear when code is done.

## Evidence index

- Source review: [system review](system-review-2026-11-17.md), [direction plan](storefront-direction-plan-2026-11-17.md), [per-image analysis](reference-review-2026-11-17.md).
- Reference originals: repository-root `docs/design/storefront/references/2026-11-17/manifest.json` (N01–N07, four families; private planning assets).
- Historical independent review notes: `.verification-results/direction-review-2026-11-17/assessment-a.md` and `assessment-b.md`; ignored/raw evidence may not exist in another checkout. Durable synthesis is the tracked system review.
- Historical critique snapshot: repository-root `.impeccable/critique/2026-11-17T03-50-30Z__apps-web-src-app-storefront-storefront-tokens-css.md`. 28/40 is the past usability review, not a current phase pass.
- Phase evidence: [P0-01 baseline reconciliation](implementation-evidence/phase-0.md) and [preview runbook](implementation-evidence/preview-runbook.md). Raw smoke: `.verification-results/storefront-replacement/phase-0/p0-01-runtime.json`. Existing preview preserved; no restart tested. Future captures/logs are indexed by source commit, viewport/locale/state and conditions.

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
