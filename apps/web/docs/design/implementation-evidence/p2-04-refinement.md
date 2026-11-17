# P2-04 — contrast, type, shape, icons and motion

17 November 2026. Starting `f83f29f`, focused branch `codex/storefront-pharmacy-app-reference`. **Verified for this accepted-system refinement task.** A/full-width campaign/five-column home, N03 image-first phone PDP, Figtree/Alexandria, exact #FF5A5F and the supporting screen system are preserved. The public storefront is not switched by this task. P2-05 owns final DESIGN.md/sidecar/instruction reconciliation.

## Findings and changes

| Finding | Decision / implementation | Evidence / consumers |
| --- | --- | --- |
| Shared default Button rendered at 12px while the accepted native-control role was 10px | Additive `data-shape` metadata lets the scoped boundary apply the accepted 10px role to default shared buttons. Explicit pill and rounded shapes retain their existing library shapes. Shared class/variant behavior outside the scope is unchanged. | [Before](p2-04-refinement/control-before.json); EN/AR runtime tests verify 10px default,14px explicit rounded and pill geometry. Shape samples use actual shared Button. Search remains 12px with8px inset submit; cards14px/campaign18px remain distinct. |
| Long English shared buttons exceeded a 320px document under doubled text | Within the accepted boundary, shared buttons have bounded width, zero minimum width and wrapping text. No overflow hiding, text truncation or smaller type. | Initial enlarged-text test and live diagnostic identified toggle/destructive/placeholder/feedback labels. Final EN/AR same-document resizing passes320→390→768→1440→390; visible shared buttons have no internal text overflow. This is synthetic computed text scaling, not native zoom. |
| Sale compatibility alias reused error colour | Offer gets explicit semantic text/surface roles using existing ink/campaign colours; the accepted `--color-sale` compatibility alias now points to offer text. Actual invalid inputs and destructive actions continue using explicit error ownership. | A labelled offer-style sample advertises no promotion. Selected pack uses slate/current state, success green border/label, saved rose heart/pressed state, error red alert/invalid state and offer ink-on-campaign surface. Real offer data/purchase presentation migrates in P4; no discount invented. |
| Shared controls used different feedback timing; utility menu links needed an explicit scoped reduced-motion contract | One 120ms feedback role and one ease-out curve own background/border/text transitions. Removed duplicate route-level transition ownership. Reduced motion removes transitions/animations in the opted-in scope, including portals, while preserving selected/disclosure transforms and immediate state changes. | Before measurement confirmed Button/Input already respected reduced motion; they were **not broken**. Portal links now have measured zero transition duration; dialog animation is none. No artificial spinner delay, entrance sequence or image animation added. |
| Informational stock inset and count-size exceptions were implicit | Named compact count 10px and stock 11px roles. Stock inset becomes3px/8px wide and 2px/6px phone, using existing spacing values; previous inline insets were 7px/5px. | One-pixel inline adjustment, same vertical density. Full status text remains visible and noninteractive. Card/image/price/purchase structure is unchanged. |
| Icon stroke depended on library defaults | Explicit accepted stroke role 1.5 for stroked currentColor SVGs,22px standard size | Actual Heroicons save glyph measures1.5px/22px in both scripts. Filled dirham artwork is excluded from the stroke selector and remains unmirrored. No new icon library. |

No new palette, fonts, layout, factual copy, product imagery, API, pricing, stock, authentication or checkout behavior. Additions to the existing token source are purpose roles, stroke and easing; there is still one accepted value source. Shared Button's only global change is additive shape metadata. All geometry/colour/motion refinements remain inside the opted-in accepted boundary.

## Measured colour decisions

[Actual EN states](p2-04-refinement/contrast-en.json), [AR states](p2-04-refinement/contrast-ar.json) and [pairing summary](p2-04-refinement/pairing-summary.json) retain numeric measurements.

| Pair | Ratio / decision |
| --- | --- |
| Ink on exact coral |4.79:1; normal labels retained |
| Ink on hover/pressed coral |4.59:1; normal labels pass |
| White on exact coral |3.05:1; counterexample, not permitted for normal text |
| Muted text on canvas |5.94:1 |
| Stock / unavailable / saved text on their surfaces |6.49 /5.87 /6.21:1 |
| Offer ink on campaign surface |12.23:1; distinct from error |
| Error on canvas |7.41:1 |
| Focus on canvas / input boundary on subtle surface |6.89 /3.23:1; ≥3:1 for tested indicators |
| Inactive text on disabled surface |3.92:1; inactive-control contrast exemption recorded, not counted as passing normal text |

Enabled default/hover/pressed, pending, added, selected, offer and all feedback-state text are checked at ≥4.5:1. Saved icon and real input border/invalid/focus checks use≥3:1. Labels, aria-current/pressed/invalid and role/status semantics carry meaning alongside colour. Error and success borders are measured as different. The extra muted control states are not treated as failures merely because their inactive text falls below 4.5:1.

A separate before/after text sweep covers 16 cases each: EN/AR ×390/1440 × home/specimen/PDP/stress. Both report zero sampled text failures, zero document overflow and no page errors. [Before](p2-04-refinement/before.json), [after](p2-04-refinement/after.json). Method uses computed text colour and ancestor background compositing, skips hidden/screen-reader/inactive-button text and applies normal/large text thresholds. It does not inspect text inside images, every pseudo-element, every possible overlay or browser/assistive technology. It is supplementary evidence, not whole-site accessibility certification.

## Type, density, shape and elevation

- Keep accepted Figtree Latin and Alexandria Arabic. Runtime font-family selection is verified, fonts settle before captures, and mixed-script factual product identities remain unchanged. Arabic heading tracking stays normal; price numerals and dirham remain in the existing LTR run.
- Keep the accepted compact hierarchy and five-column wide home. No new type pair, global spacing increase or page-composition change. Tests cover 200% **synthetic text doubling** and live reflow, normal360/390/tablet/desktop and short-height dock cases through existing suites. Physical device, native browser zoom and OS text settings remain later checks.
- Cards use a quiet 14px border without elevation. Search uses 12px outer/8px submit radius; native/default accepted actions 10px; explicit pill is opt-in. Campaign 18px remains visually separate. Overlay elevation remains the existing offset/blur token, not a card shadow everywhere. The large accepted gallery keeps its factual photos and existing containment.
- **10px badge decision:** allow only compact redundant counts with a full accessible cart count/name. It is not a standalone target or the sole product fact. New role is consumed by compact proof count chrome; wide proof count remains 12px. Existing10px incumbent `cart-link.tsx`/`navigation-links.tsx` are retained legacy consumers for P3 migration, not silently rewritten/admin-shared deleted. Stock labels use 11px and explicit insets, not the count exception. Other small utility labels remain existing accepted screen treatment; this task does not establish a blanket10px body-text rule.
- **Photo hover decision:** keep accepted comparison/gallery images static. Real gallery-image transform remains none under hover, including reduced motion. The incumbent `product-card.tsx` still has motion-safe 1.035 hover zoom; retained until its P4 consumer migration. Removing shared customer implementation early is not required to establish the replacement decision.
- **Motion decision:** immediate state feedback with 120ms colour/border transition when allowed; no product zoom, entrance choreography or shopping delay. Reduced motion is an immediate final state, not a 0.01ms surrogate animation. No resetting transforms needed for disclosure arrows or portal placement.

## Verification and limitations

- **32 proof browser tests pass**, including six new bilingual refinement cases. Contrast/meaning states, geometry, icon stroke, portal reduced-motion, selected family/saved/cart state, large text/live resize and the existing navigation/keyboard/safe-inset/task-mode cases are included.
- **14 compiled retained regressions pass** against isolated `.next-verification-p2-refinement`: actual quote/review without order submission; admin/wholesale/root-404/style-state and responsive checks. Public/admin/shared behavior remains intact for those cases. The checkout style test ran in its default functional mode; this is not a new checkout before/after pixel comparison.
- **17 selected units pass**, root lint, web typecheck and isolated production build pass. Updated the existing token-reference/cycle guard to inspect the actual boundary and specimen consumers after moving motion ownership out of the route module; no weakened reference/cycle assertion. Installed Next 16.4.2 and matching bundled CSS guidance consulted.
- Scoped static detector scan returns `[]`, with stale DESIGN.md excluded from detector context because its reconciliation belongs to P2-05. This is not a quality verdict or whole-app scan. No new generator, library or dependency installed.
- [Nine capture manifest](p2-04-refinement/capture-manifest.json): home desktop/Arabic phone, shared controls/feedback in both scripts, both phone PDPs and a labelled doubled-text sample. Fresh Chromium loopback-only contexts, fonts/visible images settled; only development diagnostics hidden. Images/status/hashes and zero overflow/page-error observations retained. Visually inspected representative home, Arabic controls, feedback, PDP and enlarged text.
- Live Next config/session/compilation issues are empty; owned browser errors empty. No preview restart or cache deletion this task. Incumbent 4860/4861 and proof 4870/4871 remain; disposable test/capture/browser processes closed. Generated next-env output restored before commit.
- Initial tests assumed a pill serialized as 9999px; Chromium computes the existing full radius to a much larger value. Corrected the test to verify pill geometry without changing its appearance. The initial enlarged-text failure was real and fixed with wrapping. Initial unit guard assumed motion was consumed only by route CSS; updated it for the actual new owner. Failed logs remain locally under `.verification-results/storefront-replacement/p2-04/`, not counted as passes.

Native devices, Safari/Firefox, screen-reader reading order/announcements, provider integration, independent final visual review and release acceptance remain open. Existing NEW-001–NEW-006 are not globally closed. No production data/provider access, order submission or deployment.

## Next

P2-05 reconciles final DESIGN.md/sidecar, brief/screen directions and styling instructions with the accepted runtime, preserving verified product facts and excluding retired generators/authority. This report records bounded component decisions; it does not replace that final authority task. Public screen migration remains P3–P5 and legacy retirement P6.
