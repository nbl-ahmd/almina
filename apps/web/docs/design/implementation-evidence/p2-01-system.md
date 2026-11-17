# P2-01 — accepted storefront token foundation and consumer migration map

17 November 2026, starting `c5fd8e4`, clean branch `codex/storefront-pharmacy-app-reference`. P1-05 closes on the owner's **“continue next” after the N03 revised PDP was shown**. This is authorization to proceed with that local direction, recorded explicitly rather than approval inferred from code completion. Prior explicit choices remain A/full-width desktop campaign, five wide-screen home columns, Figtree/Alexandria and the shown supporting system. No release/deployment approval.

## Scope and single runtime authority

`apps/web/src/components/storefront-system/tokens.module.css` is the accepted replacement system's **single value source**, scoped to its exported `.system` opt-in class. It contains primitive → semantic → component roles. `design-proof/layout.tsx` is its first runtime consumer; `proof.module.css` now consumes these roles instead of owning a parallel palette/scale. New route consumers migrate in P3–P5. This is not a production-route theme switch or a renamed incumbent token sheet.

- **Primitive:** values already exercised on the accepted coded screens: exact #FF5A5F, existing near-white/ink/support/status colours, spacing/type/shape scales, widths, targets, icon size and feedback timing. No new visual generator, palette or font was introduced.
- **Semantic:** text/surface/action/focus/border/selected/saved/unavailable/error roles; container/target/icon/elevation/motion roles; spacing/radius/type scales and weight/leading/tracking roles. Numeric scales describe reusable values; component slots carry contextual purpose.
- **Component:** card padding/gap/radius, search field/action geometry and surface, purchase background/foreground, campaign shape, page gutters/title sizes, product title/price sizes. These govern actual existing consumers; they are not unused specimen-only definitions.
- **Bilingual type:** accepted Figtree/Alexandria use additional `next/font/local` CSS-variable exports. The system resolves its body family by language. Existing `.className` consumers retain the same actual fonts, weights, display and preload behavior. No global font replacement or new provider.
- **Isolation:** no `:root`, `.storefront-shell`, `.admin-app` or `@theme` selector in the new module. No accepted tokens injected into document-wide defaults, old shared styles or vendor portals. Consumer opt-in is required.

[Complete definition/consumer snapshot](p2-01-system/token-consumers.json) records all declarations, layers, dependencies and direct CSS lines. It is audit evidence, **not** a second runtime or generator input. All new variables are referenced; all accepted-system references resolve, with no cycles. Font bindings are intentionally supplied by Next; remaining `--proof-*` properties are local grid calculations, measured dock clearance and synthetic inset hooks, not another visual system.

## Actual consumer ownership and migration

| Current owner / consumers | Status after P2-01 | Destination / safe removal condition |
| --- | --- | --- |
| New system module → gated proof layout → proof home/listing/PDP/cart/account/error | **Migrated first consumer.** Scoped colour/space/type/radius/container/icon/motion/elevation and selected component slots are active. | P2-02 validates cascade/state/portal contracts; P2-03 specimen; P3/P4/P5 migrate production route groups. Preserve accepted captures while migrating. |
| Former raw proof palette and repeated visual scale values | **Removed from proof module.** Component/layout rules reference the new source. | Do not reintroduce `--proof-accent/ink/line/ground` or another copied colour sheet. P6 removes proof-only comparison infrastructure, not the accepted system. |
| `storefront-tokens.css` → incumbent customer, wholesale `.storefront-shell`, root 404 | **Frozen legacy compatibility.** Values untouched; misleading isolation comment corrected to name actual consumers. | Wholesale/root-404 boundary and computed behavior verified before any replacement/removal; NEW-001/002 remain P2-02/P3 and P6 work. No delete-by-name assumption. |
| `storefront.css` + controls/cart/checkout CSS | **Retained effective legacy implementation.** No selector/value edited. | P2-02/P2-03 map state ownership; P3–P5 migrate actual routes/components; P6 retires only after consumer checks. |
| Root `globals.css` theme/base/utilities | **Shared compatibility retained.** Accepted module does not redefine it. | P2-02 controls aliases/scope after consumer verification; P6 root/vendor/global cleanup. Global headings/native controls and root 404 count as consumers. |
| Shared `components/ui` Button/Input/control styles, customer + wholesale | **API and existing outcomes retained.** No new utility library or variant fork. | P2-02/P2-03 semantic adapters must respect actual variant/disabled/focus/invalid states and wholesale boundaries. Migrate callers before removing old bindings. |
| `storefront-fonts.ts` → incumbent customer, root 404, proof | **Additive variable exports only.** Same licensed assets/font configuration; existing class users remain. | Future accepted consumers opt into variables. Do not remove `.className` exports or licences while legacy consumers remain. |
| Admin console, maps, campaign editor/artwork/Outfit | **Unchanged separate styling.** No system-module import or palette alias change. | NEW-003 campaign-preview dependency stays assigned; no customer cleanup deletes admin/vendor/managed-preview assets. |
| Delivery dialogs/menus, provider controls | Existing native ancestry/portal boundaries retained. | P2-02/P2-03 must exercise portal container, RTL and keyboard behavior when production shell consumers migrate; external Google/payment branding is outside token authority. |

[Historical baseline matrix](p0-02-style-ownership.md) and [import/consumer index](p0-02-style-consumers.json) remain the comprehensive pre-migration graph. Delta here is new opt-in system/proof import plus additive font variables. No broad app/import restructuring or old asset deletion occurred.

## Tailwind alias map — migration contract, not a global rewrite

Accepted screens currently use owned CSS Modules. Do not assume a new custom property can override a utility compiled to a literal. `globals.css` still contains an inline **white `primary-foreground` trap**, and old unlayered controls can defeat utility variants. P2-02 owns compiled/computed evidence and safe adapters; none are silently switched here.

| Existing alias / utility meaning | Accepted semantic destination | Boundary / condition |
| --- | --- | --- |
| brand / primary | `--store-action` | Exact coral; legacy default Button is ink, so variant intent must be mapped, not replaced indiscriminately. |
| brand-hover | `--store-action-hover` | Preserve verified hover foreground pairing; don't restore incumbent lighter hover by habit. |
| primary-foreground | `--store-purchase-foreground` → `--store-text` | **Do not use old compiled white literal on coral.** P2-02 must inspect emitted utility and actual state outcome. |
| ink / foreground | `--store-text` | Root/admin/wholesale defaults keep existing values until separately opted in. |
| muted / muted-foreground | `--store-text-muted` | Current alias `muted` is text-like in this repo; do not reinterpret it as surface automatically. |
| page / background / surface | `--store-canvas` / `--store-surface` | Map actual purpose; page canvas and card surface are separate. |
| subtle / secondary | `--store-secondary-surface` or selected/hover role | Role depends on selection/state; one alias must not flatten distinct status meaning. |
| border / input / control-border | `--store-border` / `--store-border-control` | Quiet card divider and interactive boundary differ. |
| ring / focus | `--store-focus` | Root ring currently brand while focus uses a different root colour. Verify actual outlines; no blind global rebind. |
| destructive / sale | `--store-error` or purpose-specific offer role | Error is not sale semantics. No synthetic offer/review data; P2-03/P2-04 specimens decide valid sale treatment. |
| disabled / selected / saved / stock | Respective independent `--store-*` state roles | Pending/added/saved/invalid/unavailable remain distinct; P2-02/P2-04 prove cascade and colour pairings. |
| spacing / radius / width / type utilities | Component slots and semantic scales | Migrate only opted-in customer callers. Do not reset root scale or wholesale/admin native controls. |

## Layout exceptions and future authority

One value source does not require every layout number to be a token. Route-owned media-query breakpoints, grid percentage formulas, image aspect/contain geometry, intentional 1px rules, screen-reader clipping, measured CSS custom properties and fixed/flow composition remain in the module. These are structural constraints, not a second palette/type scale. Slot-specific component/state audit continues P2-02–P2-04; no claim that every later component already uses the system.

Final DESIGN.md/sidecar/brief/product/instruction reconciliation and superseded generator authority are **P2-05**, not silently completed here. Current incumbent guide/metadata still describe historical implementation; phase decisions and this accepted-system source govern staged replacement work. No generator was added. Do not run old guide/metadata extraction over the rejected runtime to reconstruct accepted tokens.

## Verification

- **17 proof interaction tests pass**, EN/AR, preserving focused search, query/scroll/focus return, overlay PDP navigation, native Back, stock rejection, cart/save/error retry and SKU/gallery relationships. This tests the opted-in consumers rather than a token file in isolation.
- **5 selected unit checks pass**, including the new scope/reference/cycle/component-consumption guard, navigation safety and stylesheet policy. First guard pass read a `:root` comment as a selector; corrected the guard to ignore comments, with the failed raw run retained. Root lint, web typecheck and fresh isolated production build `.next-verification-p2-system` pass.
- **14 retained current render captures**, home A/five, listing and PDP, EN/AR, wide/phone/narrow as applicable; all HTTP 200, no document overflow or browser page errors in the bounded capture run. [Manifest](p2-01-system/capture-manifest.json). [Matched PDP comparison](p2-01-system/pixel-comparison.json) against accepted revision: five screenshots pixel-exact, sixth differs by one pixel; no material visual drift. This is render parity evidence, not a broad accessibility/performance certification.
- **8 existing-harness checks pass**: enabled quote/review and proof-off gates, admin sign-in/dashboard, wholesale/root-404 legacy-value/no-token-leak assertions and five incumbent responsive regressions. Quote/review does not submit an order. Live Next compilation issues and config/session errors are empty; owned browser smoke has no browser errors. No production/database/provider access, dependency upgrade, auth or commerce calculation change.
- Native devices/software keyboard/zoom/speech and release/provider checks remain unverified; existing shared/global findings retain their assigned tasks.

Raw evidence: `.verification-results/storefront-replacement/p2-01/` (ignored). Existing original/proof previews preserved; temporary capture/test browser and E2E processes closed. Generated next-env build noise restored.

**Next P2-02:** resolve actual cascade/layer/base/variant/state ownership and Tailwind literal-foreground behavior with compiled/computed evidence, preserve shared/admin/wholesale/root-404 outcomes and define portal/theme-navigation scope. Do not jump to full page migration or final guide rewrite; those have separate staged tasks. No deployment.
