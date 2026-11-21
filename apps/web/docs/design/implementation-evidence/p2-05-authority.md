# P2-05 — accepted design authority reconciliation

18 November 2026. Starting 078e9c5, branch `codex/storefront-pharmacy-app-reference`, clean at entry. **Verified for documentation/authority scope. Phase 2 is complete.** Accepted direction is unchanged; public consumer migration starts in P3. No application/CSS/API/business behavior changed or deployed.

## Current authority

| Source | Responsibility |
| --- | --- |
| Root AGENTS.md | Production, security, architecture and commerce safeguards; unchanged |
| PRODUCT.md | Verified customers/tasks/capabilities/constraints/localization, not visual tokens |
| DESIGN-BRIEF.md / screen-directions.md | Accepted experience/scope/compositions, open questions and screen requirements |
| DESIGN.md | Accepted scoped design specification with eight canonical sections and a checked frontmatter projection |
| storefront-system/tokens.module.css | Single accepted runtime value source; unchanged |
| storefront-system/boundary.module.css | Opted-in controls/variants/meaning states/aliases; unchanged |
| .impeccable/design.json | Regenerated metadata and ten standalone visual snippets; no CSS-generation or commerce role |
| system-bindings.json | Source mapping used to check documentation drift; never a generator input |
| Web AGENTS.md / project-profile skill | Active workflow/consumer/precedence instructions |
| decisions.md / implementation-progress.md | Choice/evidence precedence and mutable task/resume status |

[Machine-readable authority map](p2-05-authority/authority-map.json) records exact paths, exclusions and retained consumers.

## What was replaced or retired

Rewrote the active storefront DESIGN.md and sidecar from the accepted P1/P2 system. The prior guide's lavender surfaces, stale colour/type/shape values, split desktop/four-column composition, standalone toolbar, pending-selection language and incumbent token ownership no longer define new work. The new records describe A/full campaign/five wide columns, quiet supporting system, N03 phone PDP and actual measured component roles/states.

Archived the previous DESIGN.md, sidecar, brief, screen directions and chronological decision register under [pre-P2-05 history](../archive/2026-11-18-pre-p2-05/README.md), with source hashes and explicit superseded/excluded notices. Conventional active names are not used in the archive; JSON is `design.superseded.json`. Historical C-series owner messages and pending/review records remain available without competing with resolved decisions.

Replaced active brief/screen directions/decision register with confirmed requirements, selected local choices, verified implementation and open-question sections. P1-05 is accurately described: explicit A/five/support choice, declined toolbar, N03 correction, then continuation after the revised preview. It is not fabricated production sign-off. Current phone proof has a two-column product section; the old public horizontal rail is not its current geometry contract. References still supply hierarchy/anatomy, not screenshot claims.

The four reference/review/plan documents retain their original content, with top notices separating historical proposals from current authority. Unresolved functional/review suggestions remain in coverage/phases, not discarded. P0/P1/P2 evidence remains historical verification rather than a collection of competing active style instructions.

## Instructions and product context

Web AGENTS and the project-specific profile now point at the accepted scoped token/state owners. Removed their stale declaration that storefront-tokens.css owns replacement values, their pending-visual-acceptance language and superseded toolbar/rail instructions. Preserved architecture, accessibility, responsiveness, routes, factual content, server authority, shared consumers, tooling and no-deployment boundaries. Root instructions and admin guidance/metadata are unchanged.

PRODUCT.md keeps the entire capability table, customer/task facts, localization/accessibility, business/architecture and unknown-business-context sections. Only dated status and visual-precedence paragraphs were reconciled: product facts remain distinct from screen composition and selected local direction remains distinct from release readiness. No capability, payment method, delivery promise, programme term or analytics claim was added.

No project npm/CI/tooling/profile binding invoking an old token generator was found in the inspected configuration. Therefore no fictitious automation removal is claimed. Generic design-system/brand/UI-UX generator capabilities remain installed and unbound; active instructions prohibit using them to replace the selected palette/font/token system. Local ignored extraction helpers are not committed regeneration tooling. Neither DESIGN.md, metadata nor the archive is imported to generate runtime CSS. No unapproved tonal ramps or alternate colour candidates were synthesized for the sidecar.

## Documentation fidelity

Source bindings cover all documented colours/radii/spacing, mapped typography size/weight/leading/tracking, motion duration/easing and overlay shadow. Active metadata contains extensions/narrative/snippets, not a second primitive token array. Snippet CSS uses only existing runtime colours; the ten examples cover primary/outline/ghost/destructive actions, field, navigation, stock, missing-data card frame, family option and quick add.

[Metadata render](p2-05-authority/metadata-preview.png) and [computed values](p2-05-authority/metadata-render.json) show isolated shadow-DOM examples with local font faces. They are simplified visual examples, not a replacement component library, full screen or working commerce flow. No handlers, data mutations, remote fonts or new offers are supplied. The missing-data card and stock/option examples are labelled noncommercial. The field reflects the observed compact label-host context; it does not canonize that inherited field size as a universal future form rule.

[Four live EN/AR×390/1440 context samples](p2-05-authority/runtime-styles.json) establish current type/shape/colour values before documenting them. The guide preserves exact coral and measured dark foreground, reduced-motion/static imagery, role exceptions and actual shape APIs. Layout-specific strategies live in the brief/screen directions, with source/implementation status explicit. [P2-04](p2-04-refinement.md) retains the actual contrast/density/device-test limits.

## Verification

- **Nine focused tests pass**, including three new authority checks: frontmatter/metadata/source agreement, exact original archive hashes and active instruction exclusions, and balanced local Markdown-link resolution. Existing token cycle/scope, stylesheet policy and proof URL guards pass. Narrative rules/overview match the guide. Generic skills and archive originals are preserved.
- **Repository/workspace typecheck and root lint pass.** No new dependency, lockfile change or application code. [Preserved-source hashes](p2-05-authority/preserved-sources.json) confirm accepted tokens/boundary, incumbent tokens/checkout, shared Button, admin guide/sidecar, root AGENTS and package/lock files match starting 078e9c5.
- **Ten metadata examples render without overflow/page errors.** Runtime smoke of accepted home/specimen and incumbent admin login returns 200, one h1, no document overflow or page errors in fresh local contexts. [Read-only smoke](p2-05-authority/runtime-smoke.json). No existing user browser tab was controlled. Next config/session errors are empty.
- P2-04's **32 proof/14 compiled retained browser checks and isolated build** remain evidence for unchanged runtime code, **not newly rerun results for this documentation task**. A second production build or full commerce suite would not validate these prose/metadata changes more meaningfully. No claim of new device/provider testing.
- Temporary browser/render helpers closed; existing 4860/4861 and 4870/4871 previews preserved. No restart/cache deletion, production data/provider access, auth/order submission or deployment.

## Remaining sources that can influence later work

- Retained storefront/shared CSS, root Tailwind aliases, old component defaults and unmigrated customer/checkout/account routes still affect actual public rendering. They are legacy compatibility, not aesthetic authority. P3–P5 migrate consumers, P6 removes displaced structures after verification. Do not delete shared/admin/wholesale/root-404 dependencies early.
- Admin has its own active DESIGN.md/sidecar and independent font/theme. Do not apply the customer guide to it. Wholesale/shared/root-404 still need their known consumer boundaries.
- Proof split/four-column query controls and earlier source-review proposals remain comparison/history inputs. New default composition comes from this guide and current screen directions, not those alternatives.
- Reference assets, historical annotations, generated generic campaign/category art and variable-quality existing product photos remain visible inputs. Use the accepted interpretation and factual media/provenance limits; do not infer claims or switch palettes from images.
- General skills/generators remain available; they do not confer authority to restore retired values. New owner revisions require a recorded decision and matching source/screen checks.
- Native devices, OS/browser zoom, screen readers, Safari/Firefox, Arabic pharmacy review, production catalogue/search/media representativeness, provider readiness, independent final review and release acceptance remain open. NEW-001–NEW-006 are not globally closed by documentation.

## Phase exit and resume

All five Phase 2 tasks now have evidence: single accepted values; scoped state/cascade/portal ownership; reusable actual-component specimen and conservative checkout map; measured contrast/type/shape/icon/motion; and truthful authority alignment. Public theme migration remains unperformed. Next **P3-01** implements the mobile shell/search/location/cart/navigation contexts in public consumers while preserving existing behavior. Follow the progress ledger; do not deploy.
