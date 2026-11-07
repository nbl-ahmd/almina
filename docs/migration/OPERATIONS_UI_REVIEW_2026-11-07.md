# Operations UI verification — 2026-11-07

## Scope and outcome

This is an ordinary extension of the existing administration console, not a new visual identity. The final independent review returned **ship at the four-fix UI scope**. All four findings listed below were resolved. The verdict does not establish production activation, real browser-push delivery or whole-surface perfection.

The authoritative visual system remains `apps/web/src/app/(admin)/admin/DESIGN.md`, supported by `apps/web/PRODUCT.md` and the scoped `admin.css`. No PRODUCT, DESIGN or token-sidecar files were changed by this documentation pass.

## Incumbent system comparison

The implementation retains the neutral “Working paper” Operate identity: ink actions and text, white working surfaces, pale gray canvas and hairline boundaries. Semantic colors still describe operational state rather than decorate navigation. Functional map colors distinguish delivery geometry; they are not a replacement control palette.

The local Geist family remains the console's typeface. The recorded hierarchy remains applicable: headline (1.875rem), body (0.875rem), compact table cells (0.8125rem) and labels (0.75rem). Readiness support text uses the body step; its compact completion labels use the label step. No new typeface or display scale was introduced.

The added readiness panel uses the established panel corner (12px), neutral boundary and flat resting surface. Its next action and checklist distinguish the immediate task from optional detail. Device settings use separate status, action and guidance rows with a restrained gap (16px); phone actions stack and reach the existing touch minimum (44px). Disabled device actions use the existing disabled surface, faint text, neutral border and no shadow. Delivery radio controls use the existing ink accent while retaining native semantics and keyboard behavior.

Existing **Ink** and **Working Surface** rules remain appropriate: primary actions use ink, and working panels remain flat at rest. There is no new page-entry choreography or motion system.

## Four resolved review findings

| Finding | Built result and final evidence |
| --- | --- |
| Readiness and sequence | A persistent completion summary presents the next unfinished task. The expanded checklist links login, actual location/coverage, allocated availability, receiving rules and zone activation. The incomplete mobile capture shows “1 of 5” and **Set branch location**. A focused browser assertion also verifies that this action opens the map and focuses its expanded toggle. Allocation counts come from branch inventory and explicitly do not guarantee complete-cart fulfilment. |
| Notification truth and states | The UI distinguishes checking, unavailable, local registration and current-account registration. Account registration is compared using server-provided endpoint hashes. Irrelevant actions are disabled; the final scoped disabled appearance covers both primary and secondary variants. Error recovery is separate from success feedback. Desktop groups status, paired actions and guidance in distinct rows; phone actions stack. |
| Legacy permissions | Team & access separates store accounts, administrators and legacy staff. The legacy section explicitly discloses retained catalogue-viewing, marketing and image-review access and provides assignment/deactivation controls. Store logins remain managed from their branches. |
| Radio styling | Selected delivery-setup radios use the neutral ink accent instead of the browser-blue control treatment. Native inputs and focus behavior remain. |

The operational navigation now groups **Orders**, **Branches & delivery** and **Order alerts** under Fulfilment. **Team & access** names the account-management surface. Store-account navigation is reduced to its allowed order and alert tasks. Shared fees and public listings are available within the branch workspace; public listings select an existing operational branch rather than creating an independently named store identity.

## Evidence

Captures are local verification artifacts under `.verification-results/`; synthetic names and map fixtures are not real store data.

| Capture | State |
| --- | --- |
| `branch-create-login-390.png`, `branch-create-login-1280.png` | Account-first creation with optional delivery setup. |
| `branch-create-coverage-390.png`, `branch-create-coverage-1280.png` | Coverage entry and neutral selected radio controls. |
| `branch-workspace-390.png` | Incomplete branch, visible next action and expanded ordered checklist. |
| `branch-workspace-1280.png` | Completed delivery checks and desktop branch workspace. |
| `operations-access-390.png`, `operations-access-1280.png` | Separate store, administrator and legacy-access sections. |
| `operations-alerts-390.png` | Tested configuration failure, unavailable device status, recovery message and visibly disabled device actions. |
| `operations-alerts-1280.png` | Unconfigured state with status, paired disabled controls and guidance in distinct rows. |
| `routing-inbox-mobile.png` | Mobile receiving inbox and order-attention controls. |

Reported final validation: 270 unit tests, 156 API tests and 204 disposable-database integration tests passed; typecheck, lint and the isolated production build passed. Fourteen admin/branch/routing browser cases passed across widths (360px), (390px), (768px) and (1280px), followed by four recaptured branch/routing cases after notification grouping and one dedicated recapture case after the final disabled-control correction, then a final four-case run including the linked location action. The development runtime created a synthetic branch, with no reported browser, compilation, Next runtime or configuration errors.

The mechanical detector ran once across the changed targets and shared admin stylesheet: 50 advisory findings, zero non-advisory findings. Its shared stylesheet type/radius/color advisories and the functional map-color advisory were passed to the reviewer rather than treated as authorization for unrelated redesign.

## Boundaries and uncatalogued drift

The shared DESIGN description still contains a pre-consolidation Website-management tab list; this review records the current surface flow without rewriting the incumbent specification. Existing warm-badge remnants, tracked micro-labels and stale coral comments already identified by that specification remain inherited drift, not reusable rules. The current task does not promote those remnants or detector advisories into new tokens, prohibitions or design guidance.

Production cleanup and rollout are documented separately in [the operations audit](OPERATIONS_CONSOLE_2026-11-07.md). The owner-authorized cleanup removed one paused configuration while retaining the four pending orders observed during readback. Notification keys are saved in Render with delivery explicitly off. This candidate has not been deployed, real receiving devices have not been opted in, and browser sleep, permissions and connectivity remain delivery constraints. The UI verdict does not remove those operational requirements.
