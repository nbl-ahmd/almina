# P2-02 — cascade, state and scope ownership

17 November 2026, starting `2d35c15`, clean focused branch. **Verified for this staged boundary/state task.** Accepted A/five home, N03 phone PDP, supporting palette/fonts and commerce contracts preserved. No final guide rewrite, production-theme migration or deployment.

## What the browser established

[Settled before](p2-02-cascade/baseline.json) and [after](p2-02-cascade/after.json) distinguish actual observations from source risks:

- **Confirmed conflict:** incumbent added button stayed at hover coral `rgb(255,116,120)` instead of its intended added surface. Layered `data-added` utilities could not beat the unlayered control owner. The corrected settled added/hover state is `rgb(255,231,233)` with `rgb(23,91,90)` border, using the **existing legacy values**. No new legacy palette.
- **Confirmed emitted trap:** `.text-primary-foreground` compiled to literal `color:#fff`. Defining a raw same-named property in a customer shell could not change that literal. It now emits `color:var(--ui-primary-foreground,#fff)`. Accepted and legacy opt-in scopes supply their intended foreground; outside them, admin retains white fallback.
- **Additional inline field aliases:** control border/hover/disabled also contained compiler literals. They now resolve through scoped `--ui-control-*` bridges with the **same old fallback values** outside opt-in scope. Normal accepted Input border/hover computes from accepted roles; admin still computes its prior border. [Emitted alias rules](p2-02-cascade/emitted-aliases.json).
- **Preserved, not falsely fixed:** accepted save/hover already settled correctly to saved colours. An initial read during its 120ms transition looked different; the settled baseline verified it works. Its state declaration moved to the common owner, preserving the result.
- **Source coupling resolved and measured:** accepted purchase pending previously used the same disabled-fill rule as unavailable. Pending now retains primary fill/text with progress cursor, while unavailable uses disabled roles. Actual held server-action requests and actual unavailable SKU verify the distinction. Real in-cart state is the quantity stepper/count, with existing positive surface/border roles; it is not a fake success message.
- **Legacy saved-hover ordering:** equal-specificity saved and hover declarations were ordered so hover could replace the selected surface. Moved the existing saved declaration after hover. Compiled production tests verify both incumbent PDP/card added feedback and compact saved/hover EN/AR.

## One owner per concern

| Concern | Owner / precedence contract | Verified consumer |
| --- | --- | --- |
| Raw values | `storefront-system/tokens.module.css`, unchanged | All accepted state aliases resolve to existing roles. No new colour literals in the boundary module. |
| Native button baseline | `boundary.module.css`: opt-in `.boundary :where(button:not([data-slot]))` | Low-specificity baseline cannot defeat explicit control roles. Shared Button size/shape/padding utilities remain its API; the native reset excludes them. |
| Shared Button variants | `.boundary [data-slot='button']` + explicit variant | Primary/default/accent use accepted foreground/background; outline/secondary/ghost/link/destructive have their own purposes. Shared component implementation/API and outcomes outside scope unchanged. |
| Final meaning states | Same boundary module, after variants | Added → disabled → busy priority is explicit. Hover conditions use `:where(...)` so they add no specificity; busy explicitly follows disabled because pending controls are also disabled. No `!important` state patch. |
| Actual purchase/save/quantity | Semantic `data-store-control` / state hooks, same boundary owner | Runtime pending, real count/added, unavailable and saved-hover. Deleted competing state declarations from proof layout CSS. |
| Invalid + focus | Boundary invalid border/outline; scope focus treatment | Shared Input and actual city validation use `aria-invalid`; city error is associated through `aria-describedby`. Changing/reopening clears invalid presentation. Error colour wins over normal focus colour without hiding the focus ring. |
| Layout + geometry | Owned route/proof CSS module | Search field grouping, image/dock/grid geometry remain there. Search suppresses only its input outline in favour of the existing group ring; nested buttons retain focus. Generic motion policy remains layout-local. |
| Incumbent added/saved | Existing `storefront-controls.css` | Removed competing added colour utilities from `AddToCart`; one unlayered data-added selector matches/exceeds its hover variant and appears after it. Saved meaning follows hover in that same owner. Business functions unchanged. |
| Utilities / aliases | Root foreground/field compiler aliases are runtime bridges; scope supplies values | Accepted `--ui-primary-foreground` resolves to accepted dark foreground; legacy shell resolves to existing legacy ink; no scope/admin fallback remains white. |

The accepted boundary is deliberately **unlayered** because the repository retains layered root utilities and unlayered legacy compatibility. This is not a claim that wrapping new state rules in a late named layer would beat unlayered declarations—it would not. Scope + low-specificity native defaults + explicit variant/state order are the tested contract. Do not introduce competing unlayered fill/state rules or per-caller colour utilities. Shared utilities still own dimensions where their API specifies them. P2-03 owns full component specs; P2-04 owns complete state contrast/refinement.

`boundary.module.css` exports only an opt-in ancestor class and semantic aliases. It has no root/admin/wholesale selector or raw palette. `design-proof/layout.tsx` applies it beside the accepted token root. The retained `.storefront-shell` entry is **not** switched to the accepted palette. Legacy values/assets/importers stay until their migration stages.

## Theme navigation and portals

- The gated `/design-proof/style-contract` diagnostic mounts **real shared Button/Input and StorefrontMenu** consumers, plus a standalone compiled-foreground probe. It is a small test contract, not the planned P2-03 full specimen or a new shopping screen. Static diagnostic states do not simulate customer/order/provider capability. `requireProof()` runs before locale reads, inherited metadata is noindex, no sitemap/public-nav link added, and compiled production returns 404.
- Client navigation through the actual footer to incumbent `/contact`, followed by native Back, intentionally loads retained route CSS. Accepted computed primary geometry-independent colours/border/opacity/direction remain identical afterward. This tests retained-style coexistence, not just fresh isolated requests.
- Existing Radix Popover and mobile Dialog portal content remains **inside the accepted root** through its current container ref. EN/AR tests verify ancestry, inherited accepted text and direction, Escape closure and focus return. No body-wide theme/provider or alternate portal stack added.
- Actual native delivery dialog retains DOM ancestry in the browser top layer; invalid/focus colours inherit the accepted scope. Existing admin portal/container/vendor code is untouched. Arbitrary third-party/body portals are not certified; future accepted portals must receive an owned in-scope container and direction, then be tested.
- Wholesale and root 404 retain old page values and no `--store-action`; their compiled foreground probe resolves to existing ink. Admin probe remains white. Existing root/shared palette and vendor/provider styles remain retained compatibility. NEW-001/002/003 broader consumer separation is not falsely marked complete.

## Verification and evidence

- **22 proof tests pass:** prior 17 interaction flows plus four EN/AR computed style/portal/navigation contracts and a disabled stress-sample migration regression. [EN state values + emitted rule](p2-02-cascade/state-en.json), [AR](p2-02-cascade/state-ar.json). Normal primary, added+hover, pending, disabled/unavailable, ghost, invalid+keyboard focus, saved+hover, actual pending/add/quantity and portal directions/ancestry verified.
- **10 production-harness tests pass:** quote/review with no order submission and proof-off route checks (including diagnostic), admin login/dashboard + white fallback, wholesale/root-404 isolation/foreground probes, incumbent PDP/listing added and compact saved-hover EN/AR, five responsive regressions. Disposable fixture only; no live database/providers or production data.
- **6 selected units pass**, including scope/reference/cycle guard and new single-state-owner check. Root lint, web typecheck and isolated production build `.next-verification-p2-cascade` pass. Installed Next 16.4.2 bundled CSS guidance consulted. Live Next compilation/config/session errors empty; owned browser diagnostic smoke has no browser errors.
- [Four curated captures](p2-02-cascade/capture-manifest.json): shared diagnostic EN/AR at 1440×900, actual native invalid-dialog EN/AR at 390×844. Development diagnostic chrome alone is hidden in screenshots; native dialog and focus behavior are real browser interactions, not image mockups.
- Initial extra tests matched the main PDP action **and related-card actions**, corrected by scoping to the purchase dock. One AR pending mouse probe hit a development-diagnostics overlay; the extra probe uses keyboard activation, while existing interaction/compiled-production tests retain mouse coverage. A source guard initially also matched the retained motion-only rule; narrowed it to competing base fill/state rules. Failed raw runs are retained; none are counted as passes.

Raw logs/traces: `.verification-results/storefront-replacement/p2-02/` (ignored). Native iOS/Android, physical safe areas/software keyboard, screen-reader speech, browser zoom and external provider controls remain unverified. No independent review or exhaustive whole-app accessibility certification claimed. No palette/font/layout direction replacement or dependency upgrade; no commerce/auth domain implementation changed, production mutation or deployment.

## Instructions, remaining work and cleanup

Added a short staged control-boundary pointer to web AGENTS.md; it disambiguates incumbent `storefront-controls.css` from accepted `boundary.module.css` without prematurely rewriting the full design authority. Final guide/sidecar/instruction reconciliation remains P2-05.

Existing 4860/4861 and 4870/4871 previews remain running. Test-owned 4896/4897 and disposable production-harness ports plus owned browser/capture sessions were closed. Generated next-env output restored. No shared stylesheet/media deletion.

**Next P2-03:** complete the component/state specimen across the specified shell, cards, fields, options, gallery, overlays/cart/docks; map retained checkout visual definitions without changing quote/auth/payment logic. Use this state/scope owner, extend the accepted token source only with justified roles, and retain actual consumer boundaries. P2-04 contrast and P2-05 authority alignment remain separate tasks. No deployment.
