# Al Mina Pharmacy · Quick Commerce Edition

**Approved design direction for the customer storefront (replaces Market Green / Coral Edition on 2026-11-24, at the owner's request).**
Al Mina should look and feel like the delivery apps its customers already use every day — Talabat, Tata 1mg, Blinkit, Zomato,
Swiggy, Noon — while staying unmistakably Al Mina through its own coral and teal mark. Shopping is fast and visual: grey tiles
hold product packs, one coral colour means "buy", green means "you saved", and every purchase step ends in one big pay bar.

Reference screens: `docs/design/references/checkout flow/` (29 screens from the apps above). They govern **visual language and
interaction anatomy**. Their content does not transfer: no memberships ("pro", "Gold", "Care Plan"), tips, service or packaging fees,
ETAs, free-delivery thresholds, cashback or ratings appear unless Al Mina's own systems supply them.

The previous Market Green / Coral documents remain in git history. `docs/design/*.md` are updated to this direction; where an older
sentence in them conflicts with this file, this file wins.

## What the references share (and we adopt)

| Pattern | References | Al Mina rule |
|---|---|---|
| Grey app canvas, white sections | 1mg cart/checkout, Zomato cart, Noon | Purchase, account and detail pages sit on `app` grey with white `sheet` sections. Browsing pages stay white. |
| One saturated action colour | 1mg/Talabat coral-orange, Zomato red | `action` coral for every purchase action. Never for decoration. |
| Green means saving | 1mg "₹288 saved", Swiggy "✓ Applied", Blinkit "Save ₹2" | `save` green on `save-tint` for real discounts, applied coupons and confirmed steps. |
| Address pill in the header | 1mg, Swiggy, Zomato | Pin + "Deliver to" / saved area + chevron, in a grey pill. |
| Square grey product tiles, add on the photo | Blinkit, Zomato "+", Med7 | Pack on `well` grey, 1:1, an "Add" pill floating on the tile's bottom corner. |
| Discount sticker | Blinkit/Med7 lime "Save", 1mg red "-51%" | Green "Save n%" sticker, top-left of the tile, from real sale data only. |
| Category tiles | Med7 "Shop by categories" | Rounded grey squares with the pack/photo, label below, 4 per row on phones. |
| Bill summary | Zomato, 1mg, Swiggy | Item total → discount (green) → fees as returned → bold "To pay". Unknown fees say when they are confirmed. |
| Full-width pay bar | All | Total on the start side, big coral button on the end side, safe-area aware. |
| Sheets | Zomato, Swiggy | Rounded-top sheet, dark circular close above it on phones. |
| Thick section bands | 1mg, Noon | 8px `app` bands between white sections on phones instead of nested borders. |

## Foundations

| Decision | Specification |
|---|---|
| Colour | See [colors](docs/design/colors.md). `app` #F3F5F7 canvas, `canvas` #FFFFFF sheets, `ink` #20232E, `muted` #5F6370, `line` #E6E8EC, `well` #F3F5F7, `action` #D7303A (hover #C42A33, pressed #A9232B), `tint` #FFF0EE, `save` #0E7A3E on `save-tint` #E6F6EC, `teal` #0B6E6E on `teal-tint` #E4F4F3, `warning` #8A5300 on `warning-tint` #FFF5D6, `error` #B8262F. Logo coral `brand` #FF6465 is for artwork only (white on it fails AA). |
| Type | Manrope (Latin) 500–800, Noto Sans Arabic (Arabic). Headings 800 with −0.02em tracking; prices 800 with tabular numerals; body 15px phone / 16px desktop; inputs always ≥16px. See [typography](docs/design/typography.md). |
| Shape | Hierarchy, not one radius: page sheets 20px, product/category tiles 16px, media wells 12px, buttons and fields 12px, pay bar button 14px, chips/steppers/address pill full pill, stickers 6px. |
| Depth | Flat. Borders only on interactive fields, steppers and product tiles (1px `line`). Shadow only on things that float: add pill `0 2px 6px ink/14%`, sticky bars `0 -4px 16px ink/8%`, sheets/menus `0 8px 28px ink/16%`. |
| Space | 4, 8, 12, 16, 20, 24, 32, 48. Phones: 16px gutters, 12px between tiles, 8px section bands. Desktop: 32px gutters, 24px grid gap. |
| Icons | Phosphor; regular weight in controls, bold for the add "+", fill for the current tab. 20px controls, 24px navigation. |
| Motion | See below and [components](docs/design/components.md#motion). |

## Signature components

- **Product tile.** White tile, 1px `line`, 16px radius, 8px padding. 1:1 `well` with the contain-fit pack. Green "Save n%" sticker top-start,
  save heart top-end, coral-outlined "Add" pill (white, 36px visual / 44px target, soft float shadow) bottom-end over the well. Below:
  brand/pack in `muted` 12px, full name 14px/600 ink, price 16px/800 with strike-through former price. Unavailable tiles grey the pack and
  replace "Add" with a quiet "Out of stock" label.
- **Address pill.** Grey pill, coral pin, bold place ("Deliver to" when unknown), chevron. Opens the delivery sheet.
- **Search.** 48px grey field, 12px radius, no border, magnifier at the start; the submit sits inside as a coral square on desktop only.
- **Section heading.** 20px/800 (24px desktop) with a coral "See all" + chevron, no box.
- **Sheet section.** White, 20px radius on desktop; on phones full-bleed white blocks separated by 8px `app` bands.
- **Bill.** Labels with dotted underline where they explain a charge; savings rows green; "To pay" 17px/800; a green "You save AED n
  on this order" strip when catalogue savings exist.
- **Pay bar.** Fixed bottom on phones; start: small "Total" label + bold amount; end: 52px coral button, 14px radius, label states the
  action ("Proceed to checkout", "Review order", "Place order").
- **Stepper.** Coral pill "− n +" (outlined in cart lines, filled when used as the add control).

## Motion

Motion answers a tap and shows what changed; nothing animates on its own except the first-visit delivery sheet.

| Moment | Spec |
|---|---|
| Press | Buttons, tiles and pills scale to 0.97 in 100ms ease-out; release 160ms. |
| Add to cart | The add pill swaps to a check with a 180ms scale-in (0.6 → 1) and the cart badge pops (1 → 1.18 → 1, 260ms). |
| Sheets | Enter 240ms `cubic-bezier(.32,.72,0,1)` from the bottom (phones) or 96% scale + fade (desktop); exit 160ms ease-in. Scrim fades with it. |
| Pay bar | Slides up 220ms when it first appears. |
| Hover (pointer devices only) | Tiles lift the pack 2px and the add pill fills coral, 160ms. |
| Reduced motion | All transforms removed; colour and state changes stay instant. |

Only `transform` and `opacity` animate.

## Content rules

Use Al Mina's real catalogue, prices, stock and delivery data. Savings shown are catalogue sale prices against the former price; final
totals, fees and VAT only appear when checkout returns them. Copy is short, active and specific ("Add", "Proceed to checkout", "Place order").
No all-caps labels except the existing "Item total" micro-label pattern in the pay bar.

## Ownership

Pricing, stock, quote, coupon, payment and order logic keep their existing owners. This document governs presentation only. Admin follows
`docs/design/admin/`.
