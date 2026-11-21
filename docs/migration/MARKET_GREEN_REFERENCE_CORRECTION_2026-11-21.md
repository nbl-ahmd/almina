# Reference-alignment correction — 2026-11-21

The user rejected the first implemented storefront as blocky, excessively underlined and insufficiently aligned with the five supplied reference images. Its earlier finish verdict is not user acceptance. This correction keeps the approved Al Mina palette, fonts, commerce behavior and accessibility requirements while making the references the visual authority for composition.

## Cause

The persistent underlines were explicitly authored in the new storefront CSS for campaign, shelf and category links. The current specification requested underlines in prose, not across shopping actions. Retained component utility classes also regained visible bordered/padded geometry when Tailwind was enabled. Explicit source scoping protected admin/wholesale boundaries but did not itself redesign those old storefront wrappers. This is an implementation and interpretation error. The inspected evidence does not establish retired documents as the source of those decisions.

## Correction and reference mapping

| Finding | Correction | Reference evidence |
|---|---|---|
| Framed, segmented PDP | White media stage; 230px phone missing-image state; connected identity/price/quantity/action; no price slab or outer details/reviews frame | Teal and electronics detail composition; Pharmily pack-first hierarchy |
| Excessive underlines | Filled campaign CTA; plain named text/arrow shelf/category/secondary actions; persistent underlines limited to prose | All five references distinguish shopping actions without pervasive text underlining |
| Tall category rectangles | Circular media with labels outside; 64px homepage phone wells and 80px desktop wells | Pharmily and teal category shortcuts |
| Oversized mobile campaign | Approximately 200px campaign, compact 28px title and adjusted subject crop; tighter section rhythm | Pharmily/teal short campaign banners |
| Loose merchandise grouping | Compact count/filter/sort opening; shared shelf rows for identity/stock/price/actions; capped two-card cart recommendations | Blue pharmacy merchandising and Medicare dense desktop shelves |
| Nested transaction boxes | Editable cart rows with selective dividers, exposed totals, unboxed explanatory note, fewer repeated support blocks; shorter prefooter space | Electronics/teal carts and checkout organization |
| Account nesting and contradictory copy | Unframed sign-in/guest presentation; email promises depend on configured capability; privacy remains available; Arabic actions separated | Restrained task surfaces and existing account capability truth |
| Conflicting visual authority | Current docs explicitly prioritize the five references and latest correction for composition; historical boards/external observations are archive context | User instruction |

Actual catalogue images remain authoritative. The isolated demo has no product photographs; missing-image states remain honest rather than fabricated. No new palette, font, package, API, authentication, inventory, pricing or payment implementation was introduced.

## Validation

- Production foundation build, root lint and root typecheck pass.
- 39 selected browser checks pass; the final 18-case filter/gallery/responsive rerun also passes after the overlay correction. Coverage includes catalogue filters, keyboard navigation/contrast, account flows and guest fallback, checkout layout, gallery gestures/focus, docking and responsive grids from 320px to 1440px.
- Settled English/Arabic desktop/phone captures record no uncaught page errors. A scrolled viewport capture was discarded and recaptured from the document top before review.
- The first review of the rejected implementation requested eight material corrections. The fresh reviewer scored all eight requested composition corrections resolved. It then found a filter stacking regression; removing the trigger wrapper stacking context and suppressing bottom navigation while the sheet is open resolved that finding in English and Arabic. Final disposition was ship at the scored-fixes scope; this is not user visual acceptance.
- Physical-device PWA/keyboard, manual assistive-technology and production media/field-performance checks remain outstanding. User visual acceptance is separate from automated checks and scoped review.

## Updated visual evidence

Current screenshots are saved under `screenshots/reference-correction/`. The previous `screenshots/market-green/` set remains historical evidence of the rejected first implementation.

## Scoped design-system recheck

This is a refinement of the pinned Market Green / Coral Edition identity under the user's clarified reference authority. It does not establish a new visual world. The check sampled `PRODUCT.md`, `DESIGN.md`, the current color/type/component/page-pattern specifications, all five supplied reference images, storefront token/chrome/page styles, the font loader and catalogue filter components. Rendered evidence sampled the settled v2 home, detail and cart captures and the replacement v3 English/Arabic filter captures. The v2 filter capture is superseded; this documentation check does not substitute for the final review verdict or runtime test results above.

| System evidence | Observed implementation |
|---|---|
| Palette and semantics | `storefront-tokens.css` retains all 17 documented color values, including white canvas, `#173C25` forest, `#C5F28A` lime, `#FF6465` brand coral and the distinct `#D63D44` purchase action. Hover, pressed, status and focus roles remain separate. |
| Typography | `storefront-fonts.ts` retains locally loaded Manrope and Noto Sans Arabic. The shell preserves locale-specific families and Arabic 1.6 heading/button line height. The campaign correction uses 1.75rem (28px at the standard root size) on phones and 3.5rem (56px) from 900px; this is the explicit compact-campaign clarification, not a replacement type family or general scale. |
| Shape and rhythm | The token diff changes only `--radius-control` from 8px to 12px. The 4/8/12/16/24/32/48/64px spacing steps, badge/card/panel radii, motion durations, floating shadow and layer values are unchanged. Contextual 999px purchase/search capsules, circular category media and 16px media wells are authored in the component styles rather than made into a uniform page-frame rule. |
| Reference composition | The sampled home shows search before a compact campaign and circular categories with external labels. Detail removes the price slab and outer information frames, retaining an honest 230px missing-image phone stage and a connected identity/price/quantity/action sequence. Cart uses editable rows, selective dividers and exposed totals. Shelf subgrid aligns identity, stock, prices and actions without restoring empty slabs. |
| Actions and overlays | Campaign and section actions have no persistent text underline; prose retains its link treatment. Existing focus outlines and semantic controls remain. The mobile filter wrapper no longer establishes a positioned z-index stacking context, and an open filter sheet hides the mobile navigation. The replacement English/Arabic captures show the sheet and scrim above the shopping surface with visible footer actions. |

### Drift and limits retained outside the system

The campaign's Latin `line-height: 1.12` computes to 31.36px at 28px and 62.72px at 56px, while `docs/design/typography.md` specifies 32px and 60px. This small source/spec discrepancy is recorded rather than adopted as a new typography rule or repaired during this documentation-only pass. Existing 8px local treatments also remain for such controls as gallery thumbnails and some navigation/choice elements; the correction is contextual rather than evidence that every radius became 12px or a capsule.

The incumbent `DESIGN.md` lacks the current guide's canonical token frontmatter/section format, and `.impeccable/design.json` is absent. Those pre-existing format/sidecar gaps are preserved under the scoped write boundary. They are not repaired by generating a competing token source. The references themselves use cards, borders and grouped choices, so this recheck establishes no blanket prohibition on those native devices. Missing catalogue photography in isolated fixtures remains a verification limitation; it is not a prescribed merchandising treatment. No defect, unsupported commerce claim or implementation-specific label is promoted into the reusable system.


| Current surface | Evidence |
|---|---|
| Homepage | [Desktop](screenshots/reference-correction/home-1440.png), [phone](screenshots/reference-correction/home-390-viewport.png), [Arabic](screenshots/reference-correction/home-ar-390-viewport.png) |
| Product detail | [Desktop](screenshots/reference-correction/product-1440-viewport.png), [phone](screenshots/reference-correction/product-390-viewport.png) |
| Listing | [Phone](screenshots/reference-correction/listing-390-viewport.png) |
| Cart / checkout | [Cart](screenshots/reference-correction/cart-390-viewport.png), [checkout](screenshots/reference-correction/checkout-390-viewport.png) |
| Guest account | [Arabic](screenshots/reference-correction/account-ar-390-viewport.png) |
| Filter overlay | [English](screenshots/reference-correction/filters-en-390.png), [Arabic](screenshots/reference-correction/filters-ar-390.png) |
