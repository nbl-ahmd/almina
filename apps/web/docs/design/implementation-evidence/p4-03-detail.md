# P4-03 — Gallery and purchase layout

18 November 2026 · `codex/storefront-pharmacy-app-reference` · starting point `ee53cbb`

[Phase plan](../implementation-phases.md) · [Screen directions](../screen-directions.md) · [Accepted image-first proof](p1-05-image.md)

## Implementation

- On phones the product image fills the width. Back to category, Save and Cart sit over it in separate 44px targets. Desktop keeps the storefront header and pairs the gallery with the buying column. Both use the accepted canvas, typography and controls.
- Only multiple actual image records get a thumbnail selector or mobile photo arrows. Missing or failed images show a localized message. Thumbnails and the main view preserve the selected SKU's image association. The mobile related-products rail scrolls within the page width. The ordering of the information and alternatives is staged under P4-04.
- The buying area shows the exact SKU, localized stock state and catalogue price. Existing variant links select actual combinations and preserve their stock and price. Selecting a different SKU resets quantity and image state. Unavailable SKUs keep their disabled add action. Quantity entry clamps to a valid integer and the existing server validation still controls whether the item can be added.
- The portrait dock shows the unit price beside quantity and Add to cart. Its measured height provides footer clearance, including when status feedback or Arabic text changes the height. The same controls appear in flow on short layouts at 500px in height or less. Desktop shows the price above the controls. The overlay Back link keeps its category destination. Browser Back preserves search and scroll in the local regression. The overlay's contextual return behavior remains P4-05.

## Captures

- Phone at 390px [English](p4-03-detail/en-390.png) · [Arabic](p4-03-detail/ar-390.png)
- [Arabic at 320px](p4-03-detail/ar-320.png) · [English in short landscape](p4-03-detail/en-667.png)
- Desktop at 1440px [English](p4-03-detail/en-1440.png) · [Arabic](p4-03-detail/ar-1440.png)
- [32-case viewport matrix](p4-03-detail/viewport-matrix.json). Chromium and WebKit ran eight live viewport sizes each in both locales, from 320px to 1440px. No document overflow. At 390px the fixture's dock measured 63px in English and 75px in Arabic. The 320px dock reflows onto two lines. The matrix records the known local 404s for guest saved items and optional reminders.

## Verification

The isolated production build, workspace typecheck, lint, 28 focused unit checks, 43 Chromium cases and 24 WebKit cases passed. Live Next.js compilation and runtime diagnostics were clean. The retained Arabic catalogue test now exercises the localized catalogue retry that P4-01 introduced.

Browser coverage includes responsive and footer focus clearance, single/multiple/failed media, exact SKU selection and its metadata, integer quantity, stock limits, sold-out state, cart updates, browser Back continuity and retained admin editing. Two scoped axe scans of the mobile product page reported no violations. Native software keyboards, physical safe areas and assistive-technology checks remain open. No production data access or deployment.
