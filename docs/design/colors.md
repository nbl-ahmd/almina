# Color system — Quick Commerce Edition

Semantic tokens for the customer storefront (`apps/web/src/app/(storefront)/storefront-tokens.css`). Tailwind utilities use the same names
(`bg-app`, `text-save`, `bg-teal-tint` …). Contrast is computed with WCAG relative luminance from opaque sRGB.

## Palette

| Token | sRGB | Role |
|---|---|---|
| `app` | #F3F5F7 | Grey app canvas behind purchase/account/detail sheets; section bands on phones |
| `canvas` | #FFFFFF | Sheets, tiles, header, text on action |
| `ink` (`text`) | #20232E | Names, headings, prices, body |
| `muted` | #5F6370 | Secondary text, pack sizes, former prices |
| `line` (`divider`) | #E6E8EC | Tile borders, row dividers |
| `well` (`surface`) | #F3F5F7 | Product and category media wells, search field, address pill |
| `control` | #858A96 | Field and stepper boundaries (3:1 on white) |
| `action` | #D7303A | Every purchase action, add pill outline, coral links |
| `hover` | #C42A33 | Action hover; coral text on `tint` |
| `pressed` | #A9232B | Action pressed |
| `tint` | #FFF0EE | Selected chips, coral icon tiles, cart badge halo |
| `brand` | #FF6465 | Logo coral; artwork only |
| `save` (`success`) | #0E7A3E | Savings, applied coupons, confirmed steps |
| `save-tint` | #E6F6EC | Save stickers, savings strip |
| `teal` (`forest`) | #0B6E6E | Delivery/info accents, secondary links, focus ring |
| `teal-tint` | #E4F4F3 | Delivery chips, info banners, campaign fallback fill |
| `warning` | #8A5300 | Attention text |
| `warning-tint` | #FFF5D6 | Attention banners (location far from device, missing slot) |
| `error` | #B8262F | Validation and failure text |

`forest` and `lime` remain as aliases for older selectors: `forest` → `teal`, `lime` → `teal-tint`.

## Measured contrast

| Foreground | Background | Ratio |
|---|---|---|
| canvas | action | 4.80 |
| canvas | hover | 5.64 |
| ink | app | 14.33 |
| muted | canvas | 5.88 |
| muted | app | 5.48 |
| save | canvas | 5.42 |
| save | save-tint | 4.84 |
| teal | canvas | 6.05 |
| teal | teal-tint | 5.34 |
| warning | warning-tint | 5.81 |
| hover | tint | 4.86 |
| error | canvas | 6.26 |
| canvas | brand | 2.89 — never put white text on logo coral |

## Recipes

| Element | Default | Hover / pressed | Selected / unavailable |
|---|---|---|---|
| Primary action | action fill, canvas label | hover, then pressed + 0.97 scale | Busy keeps width with a spinner; disabled is muted on well |
| Add pill | canvas fill, 1.5px action border, action label | action fill, canvas label | Added: save-tint fill, save check |
| Secondary button | canvas fill, 1px line, ink label | well fill | — |
| Chip | well fill, ink label | line fill | tint fill, action label, 1px action border |
| Save sticker | save-tint fill, save label, 6px radius | — | — |
| Field | canvas, 1px control | ink border | Invalid: error border + message |
| Focus | 2px teal outline, 2px canvas offset | — | — |
