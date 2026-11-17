# Phase 0 evidence — baseline and ownership

Started 17 November 2026. **Phase 0 remains in progress; only P0-01 is verified in this checkpoint.** Task definitions: [phases](../implementation-phases.md). Mutable status: [progress](../implementation-progress.md). Requirement mapping: [coverage](../implementation-coverage.md).

## P0-01 — Baseline reconciliation

### Scope and repository state

- Owner instruction: “do the Next task: P0-01, baseline reconciliation.” This checkpoint executes that task only; it does not implement P0-02 or replacement screens.
- Repository: `/Users/administrator/Nabeel/dev/almina`.
- Branch: `codex/storefront-pharmacy-app-reference` (existing focused branch; no branch/history rewrite).
- Starting HEAD: `005ad88713063a4257742273eeadbb5f1609fe63`, phased-tracker preparation.
- Starting working tree: clean, including no pre-existing untracked edits reported by Git.
- Runtime review baseline: `324a2ed`; review/reference archive: `72312c9`; tracker: `005ad88`.
- `git diff --name-only 324a2ed HEAD -- apps/web/src packages/ui scripts/tooling` returned no differences. Current tracked storefront implementation therefore still matches the reviewed source; this does not turn old screenshots/tests into current verification.
- No uncommitted implementation to preserve, merge or adopt at entry. Existing preview processes were left running; no production process or data operation performed.

### Source-plan versions and drift

All three source documents match the original fingerprints recorded in implementation-progress.md:

| Source | SHA-256 at this checkpoint | Result |
| --- | --- | --- |
| system-review-2026-11-17.md | `301fc808dfcfc0f5e225af8ef06de4901efc5700d7d729a0d590030337413021` | Unchanged |
| storefront-direction-plan-2026-11-17.md | `0ad4464c3d4c040e281ca5d35f59b4d0132d5ed72077747a8b4f9c116848acd7` | Unchanged |
| reference-review-2026-11-17.md | `6e620940f7f4a25d8126f5578726b8ebde6f1744783ec53142a2fcb41ec68307` | Unchanged |

Root/web AGENTS.md, PRODUCT.md, the phase/coverage/progress documents and the project-profile skill are the context inputs. Existing DESIGN.md, DESIGN-BRIEF.md, web styling instructions and project-profile reference-02 binding describe the incumbent candidate. They were not changed since the archived review. The new plan explicitly treats supporting visuals as proposals. This is expected authority-transition work for P2-05, not permission to restore or default to the incumbent appearance. Consumer/binding inventory belongs to P0-02.

### Approval reconciliation

| Category | Current authority / disposition |
| --- | --- |
| Confirmed identity and experience | Exact #FF5A5F, actual logo/business facts, prominent search, compact factual cards/dirham, app-like mobile, deliberate desktop and working coded review workflow remain confirmed. |
| Functional and production boundaries | English/Arabic/RTL, accessibility, SEO/routes/identifiers, server-authoritative commerce/auth, compatible integrations and shared/admin safety remain mandatory. |
| Local work authorisation | Earlier local redesign authorisation remains valid within its scope. Current instruction explicitly executes P0-01. No routine re-approval requested. |
| Proposed supporting identity | Near-white/neutral ground, supporting palette, type, geometry/density and desktop lead remain proposals. No owner screen selection for the new reference set is recorded. |
| Phase 1 decision gate | Comparable coded screens must be reviewed before final replacement guide/tokens. Tracker creation and P0-01 authorisation are not that visual approval. |
| Production release | Not authorised. No production database/provider operations or deployment in any replacement phase. |

### Verified local preview setup

The existing listeners were independently rediscovered rather than assumed from a past URL:

| Service | Observed identity | Local endpoint / source |
| --- | --- | --- |
| Catalogue fixture | PID 34387, cwd repository root; child of local preview launcher | `127.0.0.1:4861`; `scripts/tooling/storefront-reference-fixture.mjs` |
| Next dev server | PID 34390, cwd apps/web; Next CLI parent 34388 | `127.0.0.1:4860`; Turbopack, Next 16.4.2 |
| Existing launcher | PID 34386; command `node /tmp/almina-reference-runtime.mjs storefront` | Temporary local convenience wrapper; do not rely on this file or these PIDs surviving a restart. |

Runtime versions observed: Node `v24.21.0`, npm `11.19.0`, installed Next `16.4.2`. `npm run docs:next` resolves bundled docs under repository-root `node_modules/next/dist/docs`. This records the installed baseline, not a latest-release audit or an upgrade decision.

The inspected launcher passes a clean allowlist (PATH/HOME/TMPDIR plus explicit local development configuration), sets `APP_ENV=development`, `DATABASE_MODE=disabled`, local API and legacy API origins, `AL_MINA_ISOLATED_DEV=1`, `ALMINA_REFERENCE_PREVIEW=1` and disabled Next telemetry. It does not import backend startup or backend environment files. Root and apps/web `.env`, `.env.local`, `.env.development`, `.env.development.local` were absent at this checkpoint; only presence was checked, no secret-bearing file values were read or printed.

The fixture source is an in-process read-only HTTP catalogue with local media, synthetic price/stock and deliberately blank descriptions. It has no database/provider client and rejects non-GET requests. Its specific identity endpoint responded `almina-reference-preview-synthetic`; the generic health identity alone would not distinguish it from the base catalogue fixture. Both API origins must stay explicitly loopback: do not allow a default origin to select an external catalogue.

The isolated development output resolves to `apps/web/.next-admin-dev` by current Next configuration; the name does not make this an admin fixture. Do not start another dev instance using that output concurrently, remove it while live, or replace the running server merely to collect baseline evidence.

Durable [preview runbook](preview-runbook.md) records inspected source/configuration, restart preflight, foreground launch and owned-process stop procedure. No restart was executed in P0-01; the healthy existing session was preserved. The runbook is a reproducible equivalent of the inspected configuration, not a claim that a restart cycle was tested.

### Current read-only runtime checks

| Check | Result | Limit |
| --- | --- | --- |
| Loopback listeners/process cwd and launcher/CLI identity | Matched services above | PIDs are historical; rediscover before any process action. |
| `GET :4861/__fixture/reference-health` | 200, exact synthetic-reference identity | Does not establish commerce/auth capability. |
| `GET :4860/`, `/products`, `/cart`, `/checkout` | All 200; all contained visible sample-data notice in HTML | HTTP/render smoke only, not browser interaction or route inventory. |
| Homepage/listing/cart HTML | Included reference CeraVe product data | No completeness or production-content inference. Cart response can include recommendations; this is not proof of a populated device cart. |
| Local Next MCP `get_errors` | `configErrors: []`, `sessionErrors: []` | Not a full-route compilation, network, browser, accessibility or performance audit. |
| Source-plan fingerprints | Three matched | Recheck after future changes. |

Raw local smoke result: `.verification-results/storefront-replacement/phase-0/p0-01-runtime.json` (ignored; durable summary above remains tracked). Checks are GET/read-only; no cart mutations, login, orders or provider calls performed.

### Evidence and capability limits

- Nov16 UI screenshots and Nov17 independent reviewer notes exist in the current checkout. They remain historical captures. Recapture the actual P0-04 matrix with source commit/locale/viewport/state; do not label historical captures current.
- Existing reference preview intentionally lacks full account/order/checkout/payment services. The committed E2E harness separately supports synthetic catalogue and disposable commerce/admin/checkout environments. P0-03 must map those states and select the correct harness before exercising them. Do not enable checkout against the reference-only catalogue just to make a screen appear complete.
- Existing checkout/auth/payment tests were not rerun. No visual acceptance, performance, Arabic interaction or full responsive claim is made by these HTTP checks.
- Exact-pack photo quality, missing fixture descriptions, campaign/rights/delivery/provider unknowns remain in the progress ledger. Nothing in this reconciliation resolves them.

### Coverage and disposition

P0-01 contributes baseline authority/version/approval evidence to C01–C07, C19/C22/C30 preservation context, C48–C50, C55, C59, C62 and C63. These multi-phase requirements are **not closed** by this checkpoint. Component consumer and cascade proof (C07–C18), detailed route/state mapping, captures and final baseline publication remain P0-02 through P0-05.

**Outcome:** P0-01 verified. Phase 0 in progress. No demonstrated blocker to P0-02.

**Next action:** P0-02 — inventory definitions and consumers starting at storefront-tokens.css, global @theme aliases/layers, storefront-controls.css and cart-controls.tsx; trace added-state/primary-foreground precedence, then shared/admin/wholesale and portal consumers. Record ownership/removal conditions before deleting or redesigning anything.

**Changes/rollback:** documentation and progress updates only. Reverting this checkpoint's documentation commit restores the tracker state; there is no runtime/data migration to roll back. Existing servers and temporary launcher remain as found. No transient process was started by this task.

## Remaining Phase 0 work

P0-02 consumer/cascade inventory, P0-03 route/state/test map, P0-04 fresh captures/content inventory and P0-05 baseline synthesis are not started. Append their evidence without overwriting this checkpoint; use the progress ledger as the only status source.
