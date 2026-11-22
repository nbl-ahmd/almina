# Market Green storefront implementation review — 2026-11-21

**Superseded visual acceptance:** the user subsequently rejected the first implementation as blocky and over-underlined. The scoped findings below are historical review evidence, not acceptance of reference fidelity. See `MARKET_GREEN_REFERENCE_CORRECTION_2026-11-21.md` for the correction.

This records the finished customer storefront as an extension of the approved Market Green / Coral Edition system. It does not revise that system. [PRODUCT.md](../../PRODUCT.md), [DESIGN.md](../../DESIGN.md) and [the supporting specification](../design/design-review.md) retain their existing authority and precedence. Admin and wholesale are outside this visual review.

## Evidence and disposition

Source inspected: the storefront layout and its four semantic stylesheets, local font setup, product cards/detail/purchase dock, cart, checkout, account/sign-in, filter panel and Phosphor adapter. Final captures are under `.impeccable/review/final/`: home, listing, product, cart, checkout and account at 1440px and 390px, with full-page and viewport variants; Arabic home/product/account at 390px; and the open phone filter sheet. Representative viewport captures were visually checked against source and the approved documents. The captures use synthetic local catalogue/customer services; they are not production catalogue evidence.

The finish review initially requested five fixes. Its follow-up disposition was **ship at the scored-fixes scope**, with all five resolved and no material regression in the reviewed batch. This is a bounded finish finding, not blanket acceptance of every checklist item in the approved specification. The final captured runtime-error list is empty (`.impeccable/review/final/runtime-errors.json`). No design detector ran.

Subsequent gallery behavior corrections set the main image's `draggable={false}` so native image dragging does not intercept pointer swipe, explicitly restore focus to the Zoom button on dialog close, and permit vertical pan plus native pinch zoom through `touch-action: pan-y pinch-zoom`. Final source was rechecked after these changes. They change neither visual geometry nor tokens; the retained screenshots remain visually representative. The separate implementation/test report records the passing focused regression run and exact validation counts. Physical-device gesture verification remains outstanding.

| Finish finding | Shipped resolution and evidence |
|---|---|
| PDP purchase anatomy | Detail source places identity and pack/strength before price and availability, then options and the quantity/purchase control. Longer summary, delivery help and secondary actions follow purchase. Real warnings remain adjacent to purchase. |
| Desktop cart order | CSS explicitly places editable items in the first left row, help/recommendations below, and the summary in the right column spanning both rows. The 1440px capture shows items beside the summary. |
| Compact checkout header | Checkout's layout marker switches the shared chrome to logo and contact help, hiding browse/search/account/cart/department controls and bottom browse navigation. The checkout captures show the compact task header. |
| Shelf price alignment | Card purchase regions grow from the bottom; the price block reserves 56px and stacks current/former amounts. A sale and a regular-price product retain aligned current amounts and purchase actions. |
| PDP title role | The final semantic override restores the approved fluid page-title size and line-height instead of the earlier fixed detail title. Arabic retains natural tracking and 1.6 line-height. |

## Concrete system mapping

These are observed implementation bindings, not newly approved tokens. The authoritative values remain in [Colors](../design/colors.md) and [Typography](../design/typography.md).

| Approved role | Shipped binding and use |
|---|---|
| White shelves / neutral wells | `color.canvas` → `--color-canvas` (`#ffffff`); `surface` → `#f6f7f6`; `text` → `#1a241d`; `muted` → `#59655d`. Flat canvas cards sit around square neutral media wells. |
| Purchase versus branding | `action` → `#d63d44`, `hover` → `#c93640`, `pressed` → `#a62832`, with white purchase labels. `brand` → `#ff6465` carries dark offer text. The two coral roles remain distinct. |
| Supporting expression / selection | `forest` and `focus` → `#173c25`; `lime` → `#c5f28a`; `tint` → `#fff0ee`. Forest/lime supplies the home campaign; forest/tint supplies choice/navigation emphasis. |
| Boundaries / statuses | Divider `#dce3dc`, control `#788279`, success `#236245`, warning `#79500f`, error `#952436` are mapped in the scoped token file. Control borders and error/status copy use semantic roles. |
| Spacing / shape | Steps 4/8/12/16/24/32/48/64px map to `--space-*`; badge/control/card/panel map to 4/8/12/16px radii. The semantic CSS also uses these established dimensions directly. |
| Depth / feedback | Floating shadow is `0 4px 16px rgb(26 36 29 / 12%)`; scrims use text ink at 40%. Feedback is 140ms; sheet timing tokens are 200ms enter and 140ms exit. Token presence does not establish that every overlay animates with those timings. |
| Focus | Light-surface controls use a 2px forest outline with 2px offset and canvas separation; the forest support surface reverses the ring colors. |

The mapping lives in [storefront-tokens.css](../../apps/web/src/app/(storefront)/storefront-tokens.css). [storefront.css](../../apps/web/src/app/(storefront)/storefront.css) binds owned controls and scoped utility generation; [storefront-pages.css](../../apps/web/src/app/(storefront)/storefront-pages.css) supplies page anatomy; [storefront-chrome.css](../../apps/web/src/app/(storefront)/storefront-chrome.css) supplies navigation/footer presentation. Native CSS scope and the storefront wrapper contain this presentation at the customer boundary.

[Local font setup](../../apps/web/src/lib/storefront-fonts.ts) self-hosts Manrope and Noto Sans Arabic through `next/font/local`, weight range 400–700, with swap display. Latin uses Manrope/Arial; Arabic uses Noto Sans Arabic/Tahoma. Arabic preload is disabled. Body is 16px/1.5, Arabic 1.6; product names are 16px/1.375 at weight 600; card prices 18px/700; detail prices 24px/700. Section headings step from 22px to 28px at 900px. Page-title size clamps from 28px to 40px; the final PDP line-height clamps from 34px to 46px. Campaign size clamps from 36px to 56px with tight tracking. The build does not expose a complete `type.*` CSS-variable ramp: these roles are expressed through semantic selectors and retained component utilities. This record does not promote every surviving utility size or line-height into a system token.

The storefront icon adapter exports Phosphor SVG components using the server-safe package entry. Named controls retain text or accessible labels; selected mobile destinations use filled glyphs with labels and current-page state. This preserves the approved icon family without replacing unrelated consumers.

## Anatomy and responsive behavior

| Surface | Observed implementation |
|---|---|
| Home | Search precedes the single dominant lime campaign, then category access and the first shelf. Categories use 80px media/glyph wells; neutral collection modules and the forest support section vary later content. Cards use full names, separate pack labels when supplied, genuine availability and coral purchase/choice actions. |
| Listing / search | Actual result context, category links, filters/sort and product grids precede pagination. Below 900px, the Radix filter dialog portals within the storefront boundary and exposes Apply, Reset, Cancel and close. Back dismisses the phone sheet. Desktop keeps the filter rail. |
| Detail | Equal desktop gallery/purchase columns with 32px gap; phone gallery first. The media well is square, contain-fit, with a 560px desktop image maximum. The purchase dock reuses one control tree and observes its height rather than duplicating quantity/request state. It docks after its inline marker leaves view. |
| Cart | Editable rows preserve identity, quantity and per-item pricing. The summary explicitly leaves delivery/VAT/final total to checkout rather than inventing an amount. Phone continuation takes precedence over bottom browsing navigation. |
| Checkout | Existing delivery → review/payment → completion tasks remain. Fields retain labels and 48px minimum height; supported payment choices receive forest/tint selection treatment. Returned line totals, fees, tax and final amount populate the summary. Phone stage action is the dominant bottom region. |
| Account | Existing sign-in/provider, profile, addresses and order-history components receive the shared typography and controls. Sign-in source retains its 440px maximum. Captured account recovery offers Retry and guest checkout because the local provider is unavailable. |

The centered outer container is 1344px including desktop gutters, yielding the approved 1280px maximum inner width. Gutters are 16px below 600px, 24px from 600px, and 32px from 900px. Product grids are one column below 324px, two on phones, three from 600px; filtered desktop listings use a 200px rail/three columns from 900px and a 224px rail/four columns from 1200px. Home desktop shelves use four columns. Cart/checkout summaries are 300px from 900px and 360px from 1200px.

Below 900px the labeled bottom navigation yields to cart/checkout task bars and an active product purchase dock. These regions include bottom safe-area padding. Detail docking releases around dialogs/focused text inputs; checkout observes visual-viewport keyboard changes; short viewports (at most 500px high) return task bars to flow. Reduced-motion CSS removes animation/transitions. The storefront wrapper carries locale language/direction, logical spacing is used throughout the semantic layer, and Arabic headings/buttons receive natural tracking and taller lines. These source mechanisms are not physical-device verification.

## Reference translation

The approved [reference mapping](../design/references.md) remains unchanged. Pharmily's search-first discovery/category/bottom-navigation anatomy appears in the phone shell. Medicare's campaign/shelf/collection rhythm appears in the desktop home composition. Electronics shopping informs gallery, choices, quantity and purchase handoff; blue pharmacy informs square pack wells and editable cart rows; muted teal informs neutral detail surfaces, summary separation and labeled payment options. Al Mina's mark, coral/forest/lime roles and fonts supply the identity. No fresh audit of Sephora, Glossier or Mobbin was performed, and reference prices, ratings or medical/service claims were not adopted as catalogue facts.

## Limits and drift left outside the system

The local synthetic catalogue genuinely lacks pack photographs. The neutral well and localized Image unavailable fallback are intentional resilience states, not approved replacement product artwork. Real pack optical balance, image transfer/layout shift and full-catalogue long-name density still need representative production-compatible media. Account fallback captures demonstrate an unavailable provider, not a working production sign-in integration. The implementation's E2E verification uses synthetic providers to exercise real input/authentication logic; the separate implementation/test report owns run results.

Physical iOS/Android devices, installed-PWA keyboard/safe-area behavior, screen-reader output/price pronunciation and native Arabic approval were not verified here. There is no field Core Web Vitals evidence. The capture set does not establish every breakpoint, text enlargement/spacing condition, network state or payment outcome in the approved acceptance matrix. Campaign copy/artwork still requires the approval specified by the incumbent system.

Pre-existing documentation drift: root DESIGN.md is the approved prose specification rather than the newer tool's token-frontmatter/canonical-section format, and `.impeccable/design.json` is absent. Neither was regenerated because this is an ordinary extension with an explicit preservation boundary. The missing sidecar, isolated component utility values, synthetic media/provider fallbacks and outstanding acceptance checks are not canonized as new visual rules. No app defect was repaired by this documentation pass.
