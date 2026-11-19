# P1-03 — density, typography, colour, shape and hard cases

> Historical comparison evidence. The live proof routes and launch commands were retired in [P6-01](p6-01-retirement.md). Captures and the recorded screen decisions remain available.

17 November 2026. Starting commit `44b12e3`, clean branch `codex/storefront-pharmacy-app-reference`. **Verified for P1-03 exploration, not final visual approval.** [PC01–PC08](../prototype-contract.md) and the [phase plan](../implementation-phases.md) remain the authority. No final DESIGN.md, production tokens/instructions, storefront/admin/wholesale theme, API, commerce calculation or deployment changed.

## Working comparisons

- [Full lead, four columns](http://127.0.0.1:4870/design-proof?lead=full&columns=4) versus [five columns](http://127.0.0.1:4870/design-proof?lead=full&columns=5): same copy, six records/order/prices/stock/photos, type and controls. Only wide-screen merchandise density changes.
- [Split lead, four](http://127.0.0.1:4870/design-proof?lead=split&columns=4) versus [five](http://127.0.0.1:4870/design-proof?lead=split&columns=5). Comparison controls are desktop review chrome; phone A/B intentionally share one sequence.
- [Read-only stress cards](http://127.0.0.1:4870/design-proof/stress), [missing-content detail](http://127.0.0.1:4870/design-proof/stress?sample=pdp), [populated detail/gallery sample](http://127.0.0.1:4870/design-proof/stress?sample=complete) and [missing campaign](http://127.0.0.1:4870/design-proof?campaign=none).

Use the existing language switch for EN/AR. Previews remain on the owned 4870/4871 loopback runtime, development-only and noindex. [Launch/stop/environment](p1-02-coded-proof.md#isolation-launch-and-stop) remains unchanged. Original 4860/4861 preview was preserved; temporary 4880 compiled-production gate server and test-owned harness/browser sessions were closed. No production database/provider accessed, order placed or payment attempted.

## Changes and observations

**Phone:** shorter campaign and tighter search/category/section grouping; complete readable names and 44px purchase actions retained. Brand metadata appears once: only an exact case-insensitive brand-plus-space prefix is removed from the visible name, while full original names remain in accessible link labels and product URLs/identity. Product image/stock information share one measured media region; price/actions align across unequal name lengths. No truncated product identity or invented pack chip. Ordinary two-column cards persist at 320/360/390; enlarged text can reflow to one column through an `em`-based minimum instead of squeezing prices.

**Desktop/tablet:** four/five-column same-content comparison at 1280/1440; 900 uses three product columns, wide listing uses four with its filter rail. The actual 1192px shopping width gives ~287.5px cards at four columns and ~227.2px at five, with 14px gaps. Both remain reviewable on the six-record fixture. Five shows more choices per row, with a shorter line budget; four allows longer identities more room. The sixth item remains a truthful second row; no duplicate shelves invented to fill space. These are proposed density settings, not accepted breakpoints or final values.

**Typography:** retained the existing licensed Figtree/Alexandria pair deliberately through normal/long EN, Arabic and mixed-script content, numbers, packs and synthetic 200% text enlargement. Full names reflow; Arabic headings use normal tracking, readable weight and logical direction, and the dirham run remains unmirrored. No alternative pair was needed to resolve the observed geometric problems. This is browser evidence, not native Arabic/pharmacy copy sign-off or owner font acceptance.

**Colour/states:** kept exact confirmed default accent `#FF5A5F` and candidate near-white/ink/status roles. The previous proof hover `#F04E54` with ink measured only 4.13:1; replaced it with provisional `#FB565C` (4.59:1). Rendered settled hover RGB was confirmed. Input/select/stepper/option boundaries now use provisional `#7C898F` rather than faint borders. [Pairings](p1-03-density/contrast.json): ink/coral 4.79, muted/canvas 5.94, positive 6.49, unavailable 5.87, saved 6.21, selected 14.63, focus/canvas 6.89, control boundary/white 3.60. These calculated opaque pairings do not certify every image/disabled/native surface. Disabled samples remain visibly disabled; their text is not claimed as enabled-control contrast. No final palette chosen.

**Shape/state ownership:** retained one CSS Module, quiet bordered cards, square purchase actions, circular save actions and restrained campaign surfaces; no broad storefront override sheet or shared token deletion. Removed duplicate media-query declarations and obsolete eyebrow rules rather than adding another competing style layer. Search/language/logo/breadcrumb/link hit areas meet the measured 44px floor. Listing disclosure now uses one Heroicons chevron with native details semantics; doubled triangle/Unicode plus/minus decoration is removed. Selection/caret and focus remain intentional. Colour feedback stays inside the existing reduced-motion preference gate; no shopping-delay animation added.

**Purchase dock:** reserves its measured height through ResizeObserver while fixed on phone, including wrapped Arabic/large text; its price/action groups wrap without left-edge clipping. Short landscape intentionally places purchase in document flow, preserving usable height instead of covering content. Last footer content remains above the fixed dock in the enlarged-text checks. Desktop clearance stays in flow, without inheriting a mobile padding allowance.

## Measured outcomes

At 390×844, EN and AR first add is **Y721.5–765.5**, above bottom navigation beginning Y780: 14.5px clearance. P1-02 began at Y798.28, so access is ~76.8px earlier; the original baseline began around Y841/844. This is the matched fixture/viewport, not a universal fold promise. The first card is 174px wide; names/amounts remain readable and touch controls remain 44px.

At 1440×900, full-lead/four-column first purchase ends Y969.38 EN/Y990.38 AR; it still needs scroll. Split-lead/five-column ends Y829.38/Y850.38. This demonstrates the lead topology's cost; it is **not a controlled claim that column count alone caused the improvement**. Full-lead four/five comparisons isolate column density separately. Final lead/grid/density choices remain P1-05 owner decisions.

[90-case index](p1-03-density/case-index.json) preserves dimensions, queries, actual grid columns/card widths, price/action/nav/dock rectangles and failure counts. Full raw rectangles/screens remain ignored `.verification-results/storefront-replacement/p1-03/`; selected representative final images are retained alongside the index. [Phone](p1-03-density/home4-en-390.png), [Arabic phone](p1-03-density/home4-ar-390.png), [four columns](p1-03-density/home4-en-1440.png), [five columns](p1-03-density/home5-full-en-1440.png), [split desktop](p1-03-density/home5-split-ar-1440.png), [320px stress](p1-03-density/stress-ar-320.png), [enlarged text](p1-03-density/text200-ar-390.png), [disclosure](p1-03-density/disclosure-ar-390-open.png).

## Synthetic cases and commerce boundary

Stress route is gated before reads and excluded from indexing/navigation feeds. Generic layout-only identities cover long English/Arabic names, unbreakable mixed-script strings, optional/absent brand/pack, huge/zero/**unknown** price and stock states. Unknown price says unavailable; it is never coerced to zero. All synthetic card purchase/save actions are disabled and have no product IDs, purchase links or catalogue/order calls. No factual product photo is attached to an invented name. A shared presentation frame exercises the real card anatomy without introducing nullable price into production Product contracts.

Populated/missing detail samples use explicitly nonmedical layout text, long pack labels and three selectable **placeholder image regions**, not invented actual product angles or medicine descriptions. Sample pack links show selection without commercial variant claims. Actual exact-pack one-image PDP and actual fixture-unavailable PD1237 were also checked. Real multi-image/family association/API continuity remains P1-04/P4 proof, not established by synthetic layout regions. Missing campaign removes the promotion and keeps a useful heading/categories/products, rather than leaving a blank banner.

## Verification and limits

- Installed Next 16.4.2/matched bundled Server/Client guidance consulted. Small client boundaries only; catalogue data/price/stock helpers unchanged. Clean, isolated production build passed on `.next-verification-p1-density` with explicit local origins/database disabled. `next-env.d.ts` build-path noise restored.
- **90 render/geometry cases:** EN/AR at 320, 360, 390, 768, 900, 1280 and 1440; home/listing/real PDP, stress cards/populated sample; matched desktop five-column leads; short landscape, unavailable, missing detail, sparse campaign and synthetic enlarged text. Final assertions: no page/card overflow, clipped dock children, or visible interactive targets below 44px. Hidden skip/closed controls are excluded from hit-area measurements; this does not certify focus behavior for every state. Only Next tool chrome hidden in captures.
- **22 continuity/clearance checks:** same loaded home/listing document resized 1440→900→390→320→1280 in both languages; no header-item collisions/overflow or reload; desktop/phone disclosure updates. Two enlarged-text end-of-page checks place last content above the actual dock. [Results](p1-03-density/runtime-checks.json).
- **Existing checks:** web typecheck, repository lint, production build, **30 selected unit tests** (storefront/location/locale/style policy/proof gate) and **all five existing `tests/e2e/responsive-layout.spec.ts` tests passed**. The existing ownership-guarded disposable E2E harness was used; it did not access production systems. These five tests protect incumbent responsive behavior, not all shopping/admin workflows.
- Proof-root axe scans of home and populated sample: **35 passes each, zero violations and zero incomplete** after giving the synthetic thumbnail group its required role. [Home](p1-03-density/a11y-home.json), [sample](p1-03-density/a11y-stress-final.json). Normal/synthetic sample scopes only; not whole-app accessibility certification.
- Next MCP discovery/compilation/error checks clean. Owned browser errors empty and recorded network had no failed HTTP responses. Synthetic gallery selected region 3 correctly, and search group focus outline/settled hover computed styles were observed. These do not replace P1-04 full interaction testing.
- [Gate evidence](p1-03-density/gates.json): proof home/new stress paths 404 on flag-disabled development and compiled production with flag enabled. No public route/theme replaced. [Detector](p1-03-density/detector.json) run once returned `[]` before final mechanical/reviewer corrections; no final-system approval implied.
- Independent review accepted the density/type/shape hard cases as reviewable, requested one material disclosure-icon correction, then scored it **resolved** after EN/AR desktop/phone open/closed recaptures. Verdict **ship is bounded to that scored fix**, not final storefront acceptance. No approved comp or final quality-bar card was invented.
- Chromium desktop viewport emulation and synthetic doubled computed font/line sizes are labelled accurately. **No native browser zoom, OS text settings, Safari/Firefox, physical touch/keyboard/notch/device certification.** These remain later device/release checks. No unmeasured conversion/performance claim.

Reproduce after launching the owned proof:

```sh
PROOF_BROWSER_SESSION=$(agent-browser session id --scope worktree --prefix p1-density-review)
export PROOF_BROWSER_SESSION
node scripts/tooling/verify-storefront-density.mjs
agent-browser --session "$PROOF_BROWSER_SESSION" close
```

This uses an owned browser session, writes partial progress/raw captures per case and fails on recorded geometry/target violations. Keep any failures; never silently reload-as-pass. The retained index is a compact view of those results. Original P1-02 captures remain historical; this checkpoint supersedes their density/hover/boundary values only within the isolated proof.

## Coverage, next work and eventual removal

P1-03 contributes experiment evidence to C14–C19/C27/C31/C34/C42/C45 and PC02/PC03/PC05/PC08. It does not mark their future acceptance/production obligations closed. All current values remain proposals; five-column eligibility, typography, supporting roles and shape must be chosen on screens in P1-05 before P2 final tokens/guides.

**Next: P1-04.** Demonstrate browse/focused-search/PDP/checkout modes; define cart/account/empty/error contracts; verify keyboard/safe areas/RTL and true query/back/scroll continuity. Complete category/brand/collection suggestion parity and actual variant/gallery relationships with existing helpers. Keep quote/checkout evidence inside the established disposable harness; do not create an order or activate providers for a visual demonstration. Native devices/zoom remain explicitly unverified. NEW-001–003 shared boundaries, NEW-004–005 continuity/translation and NEW-006 incumbent long-session observation retain their assigned work; these 90 proof cases do not resolve them.

New ownership extends P1-02 with `/design-proof/stress`, `CardFrame`, `PurchaseDock`, `SampleGallery`, query-controlled column/sparse experiments, provisional control-boundary role, density capture script and this evidence. No new shipping asset, library, backend API/action, commerce calculation or shared font/theme change. P6 removes the proof-only experiments/helpers/flags/scripts and archives evidence after accepted consumers migrate; preserve reused catalogue/cart/image/currency helpers and assets. Evidence is historical context, never an active design guide.
