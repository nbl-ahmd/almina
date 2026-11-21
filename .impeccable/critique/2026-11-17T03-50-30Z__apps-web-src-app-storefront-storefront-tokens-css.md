---
target: Al Mina replacement storefront design system and direction review
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/Users/administrator/Nabeel/dev/almina/apps/web/src/app/(storefront)/storefront-tokens.css"
target_fingerprint: "sha256:6a3fa539d19384c7618ebb6fdd0a64be11b0ebea9d73a586581b691267f14a72"
target_path: /Users/administrator/Nabeel/dev/almina/apps/web/src/app/(storefront)/storefront-tokens.css
timestamp: 2026-11-17T03-50-30Z
slug: apps-web-src-app-storefront-storefront-tokens-css
---
# Storefront system review — 17 November 2026

Method: dual-agent (A: `/root/system_direction_review_a` · B: `/root/system_direction_review_b`). Independent assessments, then synthesis. Target: `src/app/(storefront)/storefront-tokens.css` and its customer consumers at commit 324a2ed. New supplied references are analysed in [reference review](reference-review-2026-11-17.md); implementation recommendations are in the [detailed direction plan](storefront-direction-plan-2026-11-17.md).

## Verdict

The current store is a usable candidate, but it is still category-interchangeable. Coral and the actual Al Mina logo provide recognition; lavender grounds, rounded white panels, deep teal utility accents and retained route-specific treatments do not yet create one authored storefront. Previous responsiveness and control repairs are useful foundations, not proof that the requested visual identity has been achieved.

The next step is a replacement system demonstrated on actual screens, rather than another round of individual colour/radius changes. Recommend a compact, search-first pharmacy store: app-like task composition on phones and complete, purposeful merchandising on desktop. Exact supporting palette, fonts and measurements remain proposals until viewed and accepted together. Exact #FF5A5F and factual product/commerce constraints remain confirmed.

## Design health

All ten shopping heuristics apply. Scores reflect the inspected candidate and source-backed interactions; unexercised checkout/auth/recovery states limit confidence. This is not a security audit, conversion measurement or production-release certification.

| Heuristic | Score /4 | Main finding |
| --- | --- | --- |
| System status | 3 | Real stock/counts and loading feedback; full transaction states not re-exercised. |
| Shopping conventions | 3 | Familiar pack/price/actions; browsing priorities are diluted by setup space. |
| User control | 3 | Search clear/Escape, filters and navigation exist; contextual PDP back is not browser-history restoration. |
| Consistency | 3 | Shared card anatomy and customer scope; typography, route geometry and state ownership remain mixed. |
| Error prevention | 3 | Existing unavailable/variant/server checks retained; not a fresh business-logic audit. |
| Recognition | 3 | Labelled tabs and useful facts; purchase amounts arrive late in phone browsing. |
| Efficiency | 3 | Quick add/search work as a foundation; stacked listing controls add vertical travel. |
| Visual simplicity | 2 | Too many similar rounded containers and weak shopping/editorial contrast. |
| Error recovery | 3 | Honest source-backed fallback paths; full failure journey not rerun. |
| Help | 2 | Contact/policies exist; useful product information follows recommendation detours. |
| **Total** | **28/40** | Usability foundation; visual-direction acceptance remains pending. |

## Five priorities

### 1. P1 — System changes do not reliably govern the components

The customer file defines 40 custom properties, but spacing variables are not directly consumed in the new customer CSS. Nominal content width and several radii are repeated as literals. There are 633 pixel literals across the four customer CSS files; this is a lexical inventory, not 633 defects. Many values are valid breakpoints, image dimensions or intentional component details. The problem is unpredictable ownership and missing role mapping.

More materially, unlayered customer action rules outrank layered utility states. The added-state background/border utilities in cart-controls.tsx cannot win against the matching accent declarations in storefront-controls.css. This was established from the cascade; B did not mutate the basket and did not observe a failed addition. Keep the functioning count/announcement behaviour separate from the colour-state risk. The global inline primary-foreground literal is white, while the customer runtime variable is ink: verify the emitted utility, not only the variable name.

**Fix:** specify primitive → semantic → component roles with one customer value source and explicit base/variant/state ownership. Map route consumers before replacing them. Consolidate checkout's duplicated rules after comparing actual states. Keep admin/shared consumers until independently migrated. Suggested Impeccable work: extract/document after screen-direction approval.

### 2. P2 — Phone browsing spends too much space before a purchase decision

On the inspected 390×844 home, the campaign, category row and headings push first-card amounts/actions below the first screen. On listing, breadcrumbs, intro, category shortcuts, filters, count and sort stack until cards start around y510; amounts arrive near the fixed-navigation edge. This is prioritisation and travel distance, not proof that scrolling content is permanently obscured.

**Fix:** budget the phone first view; protect wide usable search, use compact location context, combine result/filter/sort controls, shorten repeated introductions and bound campaigns. Reduce structural repetition before reducing product text or touch targets. Suggested work: adapt/layout.

### 3. P2 — Desktop space is not yet matched by useful retail content

The desktop campaign/category split is functional, but the featured set is capped at four products, followed by two large text-only collection links and text brand pills. The new desktop references show stronger shelf rhythm, distinct category/brand content and selective campaign breaks. Their enormous hero, copied services and full page length are not appropriate requirements.

**Fix:** compose desktop independently around a strong search header, useful category lane, aligned product shelves, purposeful managed content and a compact complete footer. Small data sets need an intentional short page, not repeated products or fabricated sections. Compare shallow full-width versus split campaign compositions on the same data before selecting. Suggested work: shape/layout.

### 4. P2 — Colour and container roles flatten the hierarchy

Lavender page/subtle, white cards, coral actions, teal links and route-local success colours appear together. Checkout carries a hard-coded neutral panel and blue confirmation treatment alongside customer semantic states. A white PDP is an intentional focus-mode possibility, but it needs a coherent surface contract rather than appearing as a different product.

**Fix proposal:** test a quiet near-white shopping ground, restrained neutral secondary/media surfaces, coral action/campaign emphasis and distinct semantic states. Keep actual logo aqua purposeful. Define where a frame is necessary and where plain content is clearer. Do not turn selected, success, sale and saved into the same coloured state. Suggested work: colorize/distill/typeset.

White text on the confirmed coral calculates to approximately 3.05:1; current ink on coral is approximately 4.91:1. Keep readable dark normal text unless a different compliant pairing is explicitly established. These local contrast calculations do not approve the rest of a palette.

### 5. P2 — Product confidence and media discipline lag behind purchase emphasis

The sample PDP places similar products before verified summary/facts and detailed information. The fixture has only honest contact guidance instead of a reviewed description, which cannot establish production catalogue completeness. Photos vary from packshots to a handheld Bioderma image.

**Fix:** gallery → identity/pack → amount/stock/options/purchase → useful verified summary/facts → full information → alternatives. Collapse empty structural space and preserve required product/policy information. Obtain verified exact-pack replacement media and reviewed descriptions where needed; do not generate medical content or fake packs. Suggested work: shape/clarify/layout.

## What to retain

- Prominent desktop search, GET fallback and existing keyboard suggestions match the known-item shopping task.
- Compact factual cards, dirham amounts, stock and quick add avoid fabricated ratings and support efficient buying.
- Mobile PDP has a contextual toolbar and purchase dock rather than simply shrinking the desktop. Arabic layout visibly mirrors in the inspected views.
- Customer palette scope, existing server authority and responsive regression work are useful foundations to preserve while replacing appearance.

## Reference synthesis

Seven assets form four families. N02/N03 are the same green mobile concept; N04/N06/N07 are the same desktop family. Do not mistake repetition for seven votes for green.

| References | Borrow | Avoid / limit |
| --- | --- | --- |
| N01 teal home/PDP | Grouped search/location, distinct campaign lane, gallery/options/buying continuity. | Floating dark-nav decoration, pet branding, seller/360/video controls. |
| N02/N03 green pharmacy | Short home sequence, compact category/product access, unframed detail image and nearby quantity/action. | Onboarding gate, assumed identity, tiny labels, medical/discount/delivery claims and unsupported camera/chat. |
| N05 teal pharmacy phone | Broad search, location/cart grouping, labelled category discovery. | Its oversized gaps, prescription/voice/scan capability and repetitive placeholder packs. |
| N04/N06/N07 desktop | Clear shelf grammar, product frames, category/brand distinction, selective campaigns, complete page ending. | Huge Pharmacy lettering, lime rebrand, every promotional block, unsupported consultation/prescription/app/healthcard/testimonials. |

The [per-image record](reference-review-2026-11-17.md) covers navigation/search, location, card density, categories, PDP, cart/checkout, type/colour/spacing/imagery and Borrow/Avoid/Adapt/Unknown for every file. No static reference establishes checkout safety, native back behaviour, sticky logic, keyboard handling or RTL.

## Cognitive load and customer risks

The main load is repetition and vertical travel, not simply the existence of more than four products/categories. Product comparison and familiar labelled navigation are legitimate choices, not automatic violations of a four-choice limit. There are five bottom destinations; retain their labels and test priority, rather than inventing a new taxonomy during visual work.

- **Interrupted phone shopper:** search is immediate, but listing setup delays comparison. Test query/filter/scroll continuity on returning from PDP; the current contextual back link goes to category, not necessarily the original search.
- **First-time cautious shopper:** exact pack/price help, but suggestions before product facts and inconsistent photos reduce confidence. Bring genuine facts forward; never substitute reassurance claims for evidence.
- **Arabic or edge-case shopper:** current RTL is coherent in inspected views. Long mixed-script identities, large text, absent content, unavailable options and software keyboard need to be included in prototypes, not patched at the end.

The journey's strength is recognisable merchandise and reachable purchase. Its confidence valley is the transition into sparse product information. A redesigned confirmation may finish cleanly, but cannot compensate for uncertainty before purchase.

## Minor observations

- 10px cart-count badges are undocumented role exceptions, not a general need to enlarge all type. They have complete accessible count labels.
- Stock badge 3px vertical inset is compact informational styling, not a failed touch target; evaluate with the whole card.
- Product-photo hover zoom is mild and reduced-motion guarded. Stable pack comparisons would be a reasonable proposal; removing it is not a commerce fix.
- Empty-cart prose could use a tighter reading width. Avoid adding more empty-state decoration.
- Generic fallback product photos, staff imagery and sample notices need correct provenance/meaning. Development controls visible in preview screenshots are not customer production UI.

## Detector and browser evidence

The scoped static scan covered 102 customer/shared UI TSX files: **0 primary findings and 2 typography advisories**, both undocumented 10px cart badges (`cart-link.tsx:9`, `navigation-links.tsx:32`). This clean result does not validate the identity or CSS cascade. The two advisories are not two failed accessibility checks.

Native Chrome inspection covered home, listing, PDP and empty cart on phone/desktop, including English/Arabic in B. A independently inspected desktop home and phone home/listing/PDP without detector results. No order was submitted. Populated-cart transaction states, full keyboard recovery, payment, performance and operational readiness were not re-audited in this planning pass.

Browser detector overlays were successfully injected on representative pages. The observed unique rules were `cramped-padding` and `image-hover-transform`; per-page counts repeat these and must not be summed as unique faults. Navigation-divider padding was a false positive, compact stock badge inset was low priority, and guarded image zoom was optional motion polish. Source-derived state/layer conflicts above were identified manually, not by a clean detector result.

## Plan and completion

Follow the [staged plan](storefront-direction-plan-2026-11-17.md): baseline/ownership → comparable coded direction proof → accepted system → shell/home → catalogue/PDP → cart/checkout/customer → retirement and independent release review. Approve concrete phone/desktop home/listing/PDP compositions before finalising supporting colours/fonts/measurements. Include RTL and difficult content from the start. Do not add another generator or a broad override sheet.

No further product-preference interview is required for this review: search priority, actual identity, coral, app-like mobile, complete desktop, compact density and commerce constraints are already supplied. The next decision is accepting/refining the proposed direction before implementation; the present request stops at review and plan.
