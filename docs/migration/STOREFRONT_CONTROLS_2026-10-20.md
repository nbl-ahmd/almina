> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Storefront form controls — 2026-10-20

## Scope and direction

Refined the existing storefront using Emil Kowalski's design-engineering guidance, shadcn's forms guidance and the explicitly requested Impeccable plugin (installed version 4.3.1). The owner deferred updating Impeccable to a later session.

Retain cobalt for primary actions, Outfit typography and the light storefront palette. The problem was inconsistent control geometry, pale boundaries, competing CSS and unclear states rather than the brand colour itself. Controls now have a neutral white surface, ink labels, stronger neutral borders, a cobalt keyboard outline and explicit error/disabled treatment. No full-site brand reset, new marketing claims or authentication changes are included.

| Before | After |
| --- | --- |
| Native fields with repeated per-form overrides | Editable shared Input, NativeSelect and Textarea components |
| Different button heights, radii and disabled treatments | Shared Button variants and sizes; disabled controls retain their appearance when hovered |
| Labels wrapping arbitrary control structures | Explicit Field/FieldLabel associations with stable IDs |
| Native checkbox styling varied by page | Radix checkbox with keyboard support and a clickable label row |
| Broad legacy selectors affected new controls | New data-slot controls are excluded from legacy button/input defaults |
| One-off form spacing and helper typography | FieldGroup layout, common helper text, responsive columns and 16px input text |

## Components and dependencies

Used the official shadcn CLI to install editable `new-york` Radix component source, then adapted it to Al Mina. Added exact workspace dependencies `radix-ui@1.8.1`, `cn@0.5.0` and `class-variance-authority@0.7.1`; the committed workspace lockfile records transitive dependencies. No Lucide or second icon family was added: icons use existing Heroicons. Registry defaults were not applied as a global theme/reset.

Source lives in `apps/web/src/components/ui/`: button, input, native-select, textarea, checkbox, label, separator, field and shared control styles. `apps/web/components.json` records aliases and the Tailwind stylesheet. Simple forms retain their existing React/native form behavior; no additional form-state library was needed.

Migrated sign-in/code verification, account communication preferences, address book, delivery-area dialog, checkout, listing filters, review form, reward controls and reminder forms. Native select remains deliberate: it keeps the operating system's mobile picker. Hidden form values remain native hidden inputs. Admin controls, the custom search combobox, quantity steppers and other unrelated surfaces are outside this slice.

Custom CSS remains in `globals.css` for existing base/legacy controls and in the storefront stylesheet for its theme, shell and purposeful motion. Semantic aliases bridge shadcn names to the active surface tokens. New controls receive their shape/state styles in the shared source, avoiding form-specific descendant overrides. Preflight remains omitted to protect existing admin rendering.

No server commerce calculations, authentication endpoints, stock, prices, orders, production data, Google credentials or deployment settings changed in this slice. Existing backend/auth changes elsewhere in the working tree belong to prior tasks.

## Impeccable audit

Integrity verdict: **pass for the scoped controls**. Shared geometry and state variants implement the existing pharmacy storefront identity without decorative commerce claims. This is a bounded local audit, not a WCAG certification or production performance assessment.

| Dimension | Score / 4 | Evidence and limits |
| --- | --- | --- |
| Accessibility | 3 | Label associations, visible keyboard focus, Radix checkbox click/Space support, native validation; automated axe checkout/confirmation checks. Manual assistive-technology testing remains outside this pass. |
| Performance | 3 | No per-frame React state or new animation engine; selective source primitives and native select. Real-device bundle/CWV benchmarking was not performed. |
| Responsive | 3 | Account and checkout exercised at 360/390/768/1280px, no document overflow; 44–48px buttons and clickable checkbox label rows. Extreme text scaling is not certified. |
| Theming | 3 | Shared semantic state tokens, existing single light theme. Some inherited page-specific surface literals remain; dark mode was not introduced. |
| Implementation integrity | 4 | One control system, existing Heroicons, native form payloads preserved, required consent and commerce regressions verified. |
| Total | **16/20** | Good within the stated scope |

Detector evidence: `outputs/storefront-controls-2026-10-20/impeccable-detect.json`. The single scan reported **five advisory typography findings**, no other findings. Four inherited 10/11px badge/helper sizes were replaced with the common `text-xs` step. The compact sign-in heading intentionally retains its existing 28px size, verified at narrow widths; this is a documented local exception rather than an undetected type-system mismatch. No detector configuration was silenced and no automatic Impeccable update was run.

Remaining observations: **P3** — legacy controls outside this scope can be migrated gradually; **P3** — broader page-specific styling and the single sign-in heading exception remain. No verified P0/P1/P2 control defect remains from this pass. Audit scores apply to this scoped work, not the entire application.

## Verification

- Root/workspace typecheck and lint pass.
- 168 unit tests pass.
- Isolated API/web production foundation build passes without database access.
- First focused account/checkout pass: 32 browser tests pass, including real local email gateway/session coverage and commerce/GPS/idempotency regressions.
- Full isolated smoke: 105/109 passed initially; four newly added hover assertions stopped on disabled pointer-event handling. After correcting the test driver and waiting for the existing 150ms colour transition, all nine account tests plus two new native-filter/required-consent tests passed (11/11). Thus all 109 original cases and the two added control cases have passed across these runs; a second complete suite was not repeated for a test-only timing correction. The reminder fixture is explicitly a reviewed synthetic general-sale item so the eligibility-gated consent surface is exercised.
- Live Turbopack delivery-area dialog checked through the in-app browser. Next's development MCP reports no configuration or session errors. The separate development account preview lacks its disposable API after tests stop and correctly offers retry/guest fallback; production provider readiness is unchanged.

Visual evidence: `outputs/storefront-controls-2026-10-20/` contains desktop/mobile account and checkout captures. Code/sign-in captures are in `outputs/customer-sign-in-polish-2026-10-20/`. Images use synthetic test products/customer details. Keyboard-focused skip navigation can appear in full-page test captures; it is an existing accessibility affordance.

## Rollback

Revert only this control migration, shared primitives/configuration and dependency additions together. Restore original control tags, labels and per-form styling before removing components. Do not revert unrelated pre-existing Arabic, campaign or customer-auth changes from the working tree. No data rollback is needed.
