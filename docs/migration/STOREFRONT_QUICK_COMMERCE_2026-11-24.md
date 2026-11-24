# Storefront Quick Commerce redesign — 24 November 2026

Follow-up to [storefront modernization](STOREFRONT_MODERNIZATION_2026-11-24.md), same branch. The owner asked for the storefront's visual
identity, not just its layout, to match the supplied delivery-app references (Talabat, Tata 1mg, Blinkit, Zomato, Swiggy, Med7,
Noon; `docs/design/references/checkout flow/`). It also asked for the remaining pages and a motion pass.

## Direction

`DESIGN.md` now describes the **Quick Commerce Edition** and replaces Market Green / Coral. `docs/design/colors.md` and `typography.md` were
rewritten. The other design docs carry a supersession note: their interaction, accessibility, RTL and data-honesty rules still apply, and the
new documents win on visuals. Al Mina keeps its own coral/teal mark. Reference memberships, fees, ETAs, tips and cashback do not transfer.

| Decision | Value |
|---|---|
| Canvas | White for browsing. Grey `#F3F5F7` with white sheets for cart, checkout, product detail and account |
| Action | Al Mina coral `#D7303A` (4.8:1 with white) for every purchase action |
| Savings | Green `#0E7A3E` on mint: "Save n%" stickers and the "You save AED n on this order" strip, from real sale prices only |
| Info | Logo teal `#0B6E6E` (utility bar, links, focus) |
| Type | Manrope 500–800 (existing self-hosted variable font, extended to 800), heavy headings and prices |
| Shape | 20px sheets, 16px tiles, 12px wells/controls, 14px pay buttons, pill chips/address/steppers, 6px stickers |

## Implementation

- **Tokens:** `storefront-tokens.css` has the new palette and radius/motion scales. Older names (`surface`, `divider`, `forest`, `lime`,
  `success`) alias the new ones, so retained selectors follow automatically. Tailwind theme utilities gain `app`, `line`, `well`, `save`,
  `teal` and the tint tokens, plus radii (`rounded-tile`, `rounded-sheet` …).
- **Visual layer:** `storefront-skin.css` is loaded last and owns colour, type, shape and motion. Superseded category-tile and header-cart rules were
  deleted from the older stylesheets rather than overridden.
- **Product tile (Blinkit anatomy):** square grey well, green save sticker, name then pack or brand, price with strike-through, and a compact
  coral-outlined **Add** pill (`AddToCart compact`). It keeps the same accessible names ("Add to cart: …"), stock checks and cart logic. After
  adding, the control becomes a green full-width "Go to cart" row. Unavailable tiles grey the pack and show "Out of stock".
- **Header:** grey address pill with coral pin, borderless grey search, coral cart button with a badge that pops on change, teal utility bar,
  and coral current tab in the bottom navigation.
- **Home and listings:** coral "View all ›" section links, 4-up category tiles on phones (auto-fit on desktop), pill chips, and a teal-tint
  campaign with a coral call to action.
- **Cart:** per-line strike-through former price (new display-only `formerPrice` on cart lines, from the catalogue), a green savings strip,
  coral steppers, an amber "Where should we deliver?" row, white full-bleed sheets on grey, and a 52px pay bar.
- **Checkout:** grey canvas, padded white sheets, coral current step and green completed steps, pay bar.
- **Product detail:** purchase area and every section below it as white sheets on grey, full bleed on phones, with a 52px add button.
- **Account:** grey canvas, white sign-in sheet, full-width coral action.
- **Categories page:** 3/4/6/8-column tile grid.
- **404:** now loads the same visual layer.

## Motion (Emil design-engineering rules)

| Surface | Motion |
|---|---|
| Delivery sheet (native `<dialog>`) | `@starting-style` slide up 240ms `cubic-bezier(.32,.72,0,1)` on phones; scale 0.96 + fade on wider screens; exit 160ms; backdrop fades |
| Filter sheet, menu, gallery (Radix) | Keyframes keyed to `data-state`; slide from the bottom or start edge, mirrored in RTL; shorter exits |
| Search suggestions, mega menu | 160ms scale 0.97 + fade from the top |
| Add to cart | Badge pop on the header and tab badge (remount by count); "Go to cart" scale-in |
| Pay bar | Slides up 220ms on first appearance |
| Press | 0.97 on buttons and pills, 0.96 on tabs and chips, 0.9 on stepper buttons, 100ms |
| Hover | Pack lift and add-pill fill, pointer devices only |
| Reduced motion | The existing storefront rule removes all transitions and animations |

Only `transform` and `opacity` animate.

## Verification

- Typecheck and lint are clean; 328 unit tests pass.
- **Full Playwright suite on an isolated production build: 221 passed and 8 failed on the first run.**
  - The axe contrast check found coral `#D7303A` used as text on the grey canvas (4.39:1). Every coral word now uses `action-text`
    `#C42A33` (5.16:1 on grey, 5.64:1 on white); fills and borders keep `#D7303A`.
  - A homepage spec expected the category row to hide its scrollbar. The grid keeps `scrollbar-width: none`.
  - The delivery-sheet spec measured the sheet mid-slide. It now waits for the sheet's animations to finish.
  - All 35 specs in those files pass, and 32 tile/cart/family/redesign specs pass after the final tile fix.
- Visual sweep: 15 routes × 9 widths (320–1920) plus a 320–430 re-sweep. The first sweep found horizontal overflow at 320/360px from the add
  pill's enlarged hit area; it now extends vertically only. Final result: **no overflow and no console errors** other than the intentional
  404 and the guest `/account` reads.
- Arabic (RTL) home, cart and listing checked at 390px: correct direction, mirrored steppers and sheets, Arabic "Add" label and savings strip.

## Not changed / follow-ups

- The checkout form's internal fields, address and map tooling keep their structure; only the surface, chips and actions are restyled.
  A step-by-step address sheet like Zomato's is a separate, behaviour-sensitive change.
- There is no quantity stepper on product tiles: "Add" adds one and offers "Go to cart". A tile stepper would add cart edits outside the cart
  page and needs its own tests.
- Campaign artwork is the existing fallback (teal tint plus the courier photo). Real merchandising banners should come from the
  campaigns admin.
- Native Arabic review, real-device motion and safe-area checks, and owner sign-off on the new identity remain release checks.
