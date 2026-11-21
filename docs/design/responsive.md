# Responsive, PWA and RTL layout

The content container is centered with a maximum inner width of 1280px, excluding the page gutters. Below that maximum, inner width equals viewport width minus two gutters. Filter rail gaps are separate from card gaps. All measurements are CSS pixels.

## Width and grid rules

| Viewport | Gutter / card gap | Listing grid | Detail / cart / checkout |
|---|---|---|---|
| Below 324px | 16 / 12px | One column | One column |
| 324–599px | 16 / 12px | Two columns | One column |
| 600–899px | 24 / 16px | Three columns, filter sheet | One column, forms max 640px |
| 900–1199px | 32 / 16px | 200px filter rail + 24px rail gap + three columns | Two columns, 32px gap, 300px cart/checkout summary |
| 1200px and up | 32 / 24px | 224px rail + 24px rail gap + four columns | Two columns, 32px gap, 360px cart/checkout summary |

A card must remain at least 140px wide. Reduce columns whenever actual available space requires it. At 900px, the listing has 836px inner width and 612px after rail/gap, giving approximately 193px cards. At 1200px, 1136px inner width leaves 888px after rail/gap, giving 204px cards. At 1280px inner maximum the filtered cards are 240px. Unfiltered desktop shelves can use four or five columns according to content, retaining the minimum width.

Homepage mobile shelves can use two-column grids or horizontal rails with 160–200px cards and 12px gaps. Use one shelf treatment consistently on a page. Results use normal vertical document scrolling. Category rails preserve vertical page scrolling and offer an all-categories route.

## Navigation and fixed regions

Below 900px use the mobile header and labeled bottom navigation. Keep the existing primary destinations, with a maximum of five, a 24px icon and a minimum 56px bar plus safe area. Selected destinations use fill, label and current-page semantics. From 900px use the desktop identity and department rows. Mobile headers scroll with the document. Desktop sticky identity rows use their measured height when offsetting content.

Only one fixed bottom action region is active at a time. Browse pages use navigation. Product detail may show a purchase bar after the inline action leaves view. Required options must be chosen before purchasing, or the fixed action returns the user to the missing choice. Cart and checkout give their existing task continuation priority. Fixed regions reserve their measured outer height, including safe-area padding exactly once, in the document scroll area. Release fixed positioning when zoom or viewport height would obscure usable content.

Use minimum 44 × 44px targets, with enough separation to prevent adjacent activation. Minimum button and field heights grow for wrapped text. Never obscure keyboard focus, errors or the last result with a fixed region. Preserve native Back, scrolling and pinch zoom.

## PWA and keyboard

Respect top, bottom and side safe-area insets in standalone mode and landscape. Sheets use the dynamic viewport, scroll internally and retain close/recovery controls. When the keyboard opens, keep the active input and its suggestions visible and move unrelated fixed navigation out of the way. Verify this on physical iOS and Android devices. A resized browser viewport alone does not establish keyboard or gesture behavior.

Use existing offline/error behavior. Show connection failures with a recoverable action and preserve draft input where supported. Announce purchase success only after confirmation from the existing commerce flow. Keep direct links and reload useful for every supported customer page.

## RTL and text expansion

Set locale language and document direction. Use logical properties for padding, margins, alignment, drawer edge and progress direction. Mirror directional arrows and reading order while keeping DOM focus order aligned. Keep logo and product artwork intact. Preserve numeric/SKU/phone runs and isolate mixed-language values as defined in [Typography](typography.md).

Arabic labels and long product names grow naturally. At 200% text enlargement, 400% zoom with a 320px effective viewport, and WCAG text-spacing overrides, reflow to a single column where needed. Release sticky regions and avoid horizontal document overflow. Localized chip collections wrap before labels shrink.

## Acceptance matrix

Review English and Arabic at 320, 390, 768, 900, 1024 and 1440px, plus widths immediately around breakpoints. Include long names, absent/failed images, unavailable combinations, cart failures, checkout errors and pending order status. Inspect portrait/landscape PWA, open keyboard, reduced motion, keyboard-only access and screen-reader price/status pronunciation. Record browser emulation and physical-device evidence separately.

## Safe-area and sticky-action handoff

A mobile task bar uses 12px block padding around a 44px minimum action, 16px inline padding and the bottom safe-area inset. The reserved document space is the bar's measured outer height. Its measurement already includes that inset. Increase height for labels, validation/status feedback and zoom.

At effective widths below 900px, a detail purchase bar appears only after the inline action leaves the visible area and while the user is outside a conflicting modal or input task. It operates the same quantity/selection/request state. When required choices are incomplete, its action identifies the choice task and returns focus to that group. Browsing navigation yields to the purchase bar. On cart and checkout, use the same single-region rule. At short viewport heights, move controls back into document flow and preserve the available navigation route.

Desktop sticky summaries begin 16px below the measured occupied header and stop at their parent boundary. If content plus offset exceeds the available viewport, use normal flow. At breakpoint changes, preserve draft form/filter values and the current gallery selection. Touch and text expansion can override contextual column defaults to preserve the 140px card minimum and accessible controls.
