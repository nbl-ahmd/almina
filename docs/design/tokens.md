# Tokens — Al Mina Quick

Source of truth: `apps/web/src/app/(storefront)/storefront-tokens.css`. Names are `--qc-<role>`. Colours were sampled from the
reference screens (`docs/design/references/checkout flow/`) and changed only where AA required it. Contrast is WCAG relative luminance
on opaque sRGB.

## Colour

| Token | Value | Sampled from / role |
|---|---|---|
| `bg` | #F2F3F7 | 1mg bands #EFEFEF, Zomato canvas #F5F6FB — app canvas behind sections |
| `surface` | #FFFFFF | Sections, tiles, sheets, bars |
| `well` | #F5F6F8 | Product image wells, search, address pill |
| `line` | #E8E9ED | Dividers, tile borders |
| `line-strong` | #D4D5D9 | Secondary button and chip borders |
| `control` | #8B8D97 | Field hover boundary (3.4:1 on white) |
| `ink` | #1C1C1E | Headings, names, prices (1mg #333436, deepened) |
| `ink-2` | #3D4152 | Body copy (Swiggy) |
| `muted` | #686B78 | Secondary text — 5.3:1 on white, 4.8:1 on `bg` |
| `action` | #DA3729 | 1mg action coral #FF5443 at 4.6:1 with white — all purchase fills |
| `action-hover` / `action-pressed` | #C42F22 / #A8261B | Fill states |
| `action-text` | #C42F22 | Coral words — 5.6:1 on white, 5.2:1 on `bg` |
| `action-tint` | #FFF1EE | Selected chips, coral icon tiles |
| `brand` | #FF5443 | Pins and icons only — never under white text (3.2:1) |
| `save` / `save-tint` | #1B7A3E / #E3F9EC | 1mg "₹288 saved" strip — 4.9:1 |
| `save-strong` | #0E8045 | Zomato pay green — completed steps, 5.0:1 with white |
| `deal` | #CFFF00 | Talabat "Save 33%" lime — always with `ink` text (14.6:1) |
| `info` / `info-tint` | #0B6E6E / #E4F4F3 | Al Mina teal — delivery info, focus ring |
| `warning` / `warning-tint` | #7A4A00 / #FFF4D6 | 1mg yellow notices |
| `danger` / `danger-tint` | #B3261E / #FDECEA | Errors |
| `scrim` | ink at 50% | Sheet backdrop |

## Type (Manrope; Noto Sans Arabic for Arabic)

| Role | Phone | Desktop | Weight |
|---|---|---|---|
| Page title (h1) | 24 | 32 | 800 |
| Section title | 20 | 24 | 800 |
| Sheet / card title | 18–20 | 20 | 800 |
| Product name (tile) | 14 | 15 | 600 |
| Price (tile) | 15 | 16 | 800, tabular |
| Body | 15 | 16 | 500 |
| Label, button | 14–16 | 15–16 | 700 |
| Support | 12–13 | 13 | 500–600 |
| Sticker / micro | 11 | 11 | 800 |

Inputs are always 16px. Arabic line height ≥ 1.6, natural tracking.

## Radius, space, elevation, layers

| Group | Values |
|---|---|
| Radius | `xs` 6 (stickers) · `sm` 8 · `md` 12 (fields, wells, tiles' inner) · `lg` 16 (cards, tiles) · `xl` 24 (sheet tops) · `pill` (buttons, chips, steppers, search, address) |
| Space | 4-point grid: 4, 8, 12, 16, 20, 24, 32, 40, 48. Gutter 16 / 24 (≥600) / 32 (≥900). Band 8 |
| Elevation | `e-1` 0 1 2 ink 6% (resting icon buttons) · `e-2` 0 4 12 ink 8% (floating add, stepper, focused search) · `e-3` 0 12 32 ink 14% (sheets, menus) · `e-bar` 0 −4 16 ink 8% (bottom bars) |
| Layers | sticky 20 · popover 30 · scrim 40 · modal 50 · toast 60 · skip link 70 |

## Motion

| Token | Value | Use |
|---|---|---|
| `t-tap` | 100ms | Press scale (0.97 buttons, 0.94–0.96 tabs/chips, 0.85–0.88 small icon buttons) |
| `t-fast` | 160ms | Colour, popovers, count change |
| `t-base` | 220ms | Stepper grow-in, pay bar, dialogs |
| `t-sheet` / `t-exit` | 300ms / 200ms | Sheets in / out |
| `ease-out` | cubic-bezier(.23,1,.32,1) | Entries and responses |
| `ease-drawer` | cubic-bezier(.32,.72,0,1) | Sheets (iOS drawer) |

Only `transform` and `opacity` animate. Hover effects only on fine pointers. `prefers-reduced-motion` removes all motion.
