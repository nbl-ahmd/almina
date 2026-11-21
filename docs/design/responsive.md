# Responsive storefront

Use available inline width in CSS pixels. The page shell has a maximum content width of 1280px, centered with equal outer margins. The catalogue grid below describes product columns within the listing. Reduce columns if the available width would push a card below 140px. A media well reserves its aspect ratio before loading.

| Viewport | Page gutter / grid gap | Listing | Product detail, cart and checkout |
|---|---|---|---|
| Below 600px | 16 / 12px | Two columns from 324px where space permits, otherwise one. Filter and Sort sit above results. | One column. Gallery first, then purchase controls. Checkout totals appear before the final action. |
| 600–899px | 24 / 16px | Three columns, filter sheet. | One column, with forms capped at 640px. |
| 900–1199px | 32 / 16px | 200px filter rail, 24px rail gap and three columns. | Two columns. Product gallery and details share width equally. Checkout reserves 300px for the summary. |
| 1200px and up | 32 / 24px | 224px filter rail, 24px rail gap and four columns. An unfiltered shelf can use five. | Two columns with a 32px gap. Reserve 360px for the checkout or cart summary. |

## Navigation and touch

Below 900px use the mobile header. On browse screens, bottom navigation uses the existing primary destinations, a 24px icon and a visible label per item, with a minimum 56px bar plus the bottom safe-area inset. Mark the current page programmatically and with the filled icon. At 900px switch to the desktop header and department row. Keep route names, destination order and cart count consistent across widths.

Use at least 44 × 44px for tap targets. On a narrow detail page, a fixed purchase action may replace bottom navigation when the inline button scrolls out of view. Checkout gives its stage action priority. Allow only one fixed bottom action region. Reserve its measured outer height including the safe-area inset in the scroll area so the last item and keyboard focus stay visible.

## PWA and viewport behavior

Respect top, bottom and side safe-area insets in standalone and landscape modes. Sheets size to the dynamic viewport and scroll internally. With the keyboard open, keep the focused field and suggestions visible and move unrelated fixed navigation out of the way. Keep native Back, link navigation, zoom and scroll restoration available. Show a readable connection state when a request fails offline. Display purchase success only after confirmation from the existing order flow.

## Arabic and bidirectional layout

Set document language and direction from the active locale. Use inline-start/end for spacing, alignment, drawer anchors and progress steps. Mirror directional arrows and reading order. Preserve logo artwork, product packs, numeric strings and non-directional icons. Keep DOM, reading and keyboard order aligned. Isolate Latin SKUs and prices as specified in [Typography](typography.md). Long Arabic labels may wrap to two lines or grow the component. Keep sticky controls clear of the expanded content.

## Acceptance checks

Review at 320, 390, 768, 900, 1024 and 1440px, in English and Arabic. At 200% zoom, verify the layout reflows, price and strength remain legible, and no fixed element covers the focused control. Check long names, missing photos, unavailable variants, failed cart updates and form errors. Test an installed PWA in portrait and landscape with the keyboard open, reduced motion enabled and a screen reader reading prices and order status.

## Grid arithmetic and sticky placement

Treat 1280px as the inner content maximum, excluding page gutters. Below that maximum, subtract two gutters from viewport width. Subtract the rail and rail gap before calculating listing columns. At 900px, the 836px content area leaves 612px after the 200px rail and 24px gap, giving three cards of about 193px with 16px card gaps. At 1200px, 1136px inner content leaves 888px after rail and gap, giving four 204px cards with 24px gaps. At 320px, the 288px inner width supports one card. Check widths immediately on either side of every breakpoint.

A bottom bar uses 12px vertical and 16px inline padding around a 44px minimum action, plus the safe-area inset. Grow for Arabic text and zoom. On product detail, show the fixed purchase bar only below 900px after the inline action leaves view, while purchase options remain valid. If a required choice is missing, the fixed action reads Choose options and returns focus to that group. The inline and fixed controls operate the same selection and busy state. Hide the browse bottom bar while this purchase region is shown. Checkout uses its stage action under the same single-region rule.

Desktop sticky content begins 16px beneath the actual occupied header. Limit persistent headers to the identity row so the department row scrolls away. On phones the header scrolls with the document, giving results and product media more room. At 400% zoom and an effective 320px viewport, reflow to one column and release sticky positioning when it would obscure content. Support WCAG text-spacing overrides without clipping labels or controls.
