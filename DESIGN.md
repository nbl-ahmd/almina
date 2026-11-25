# Al Mina Pharmacy · Al Mina Quick

**The storefront design system (replaces Market Green and the first Quick Commerce Edition, 2026-11-24, at the owner's request).**
Al Mina looks and behaves like the delivery apps its customers use every day. The visual language, tokens, components and flows are
taken from the reference screens in `docs/design/references/checkout flow/` — Talabat (pharmacy listings, tiles, pill actions, cart),
Tata 1mg (sections on grey, bill, savings strip, pay bar, sign-in), Zomato and Swiggy (address pill, bottom sheets, "Delivering to"),
Blinkit (product grid). Al Mina keeps its own name, logo and catalogue; nothing of the reference brands' identity is used.

## Documents

| Document | Owns |
|---|---|
| [docs/design/tokens.md](docs/design/tokens.md) | Every token: colour, type, radius, space, elevation, motion, layers — with measured contrast |
| [docs/design/components.md](docs/design/components.md) | Component anatomy and states: buttons, fields, chips, tiles, steppers, sheets, header, tabs, bill, pay bar |
| [docs/design/page-patterns.md](docs/design/page-patterns.md) | Screen flows: home, listing, product, cart, checkout, account, content pages |
| [docs/design/responsive.md](docs/design/responsive.md) | Breakpoints, safe areas, PWA, RTL and accessibility acceptance |
| [docs/design/references.md](docs/design/references.md) | Which reference screen each pattern comes from, and what does not transfer |

Code: tokens in `apps/web/src/app/(storefront)/storefront-tokens.css` (`--qc-*`), components in `storefront-system.css`.
Admin follows `docs/design/admin/`.

## The system in one screen

- **Canvas.** White for browsing (home, listing, search). Purchase, product detail and account screens sit on grey `#F2F3F7` with white
  sections; on phones the sections run edge to edge, separated by 8px grey bands (1mg).
- **One action colour.** Coral `#DA3729` (1mg's coral, darkened to 4.6:1 with white) fills every purchase action. Coral words use
  `#C42F22`. The brighter brand coral `#FF5443` is for pins and icons only.
- **Savings are green, deals are lime.** Mint strip `#E3F9EC` with green `#1B7A3E` for "You save"; Talabat lime `#CFFF00` stickers
  with ink text for "Save AED n".
- **Everything you press is a pill.** Primary and secondary buttons, chips, steppers, search and the address pill are fully rounded
  (Talabat). Fields are 12px, cards 16px, sheets 24px on top.
- **Tiles.** White tile, square grey well, lime save sticker top-left, round white "+" on the photo's corner that turns into a
  "− n +" pill. Name, pack, price and former price below.
- **Bottom sheets.** Full width on phones with a dark round close floating above (Zomato); centred 480px dialogs from 600px.
- **Pay bar.** Fixed on phones: total on the start side, a 52px coral pill on the end side.
- **Type.** Manrope 500–800: 800 for headings and prices, 700 for labels and actions, 500 for body. Body 15px on phones, 16px desktop,
  inputs always 16px.
- **Motion.** Taps answer in 100ms (scale 0.97); sheets rise on an iOS drawer curve (300ms) and leave faster (200ms); the "+" grows
  into the stepper; cart badges pop. Only transform and opacity animate; reduced motion removes movement and keeps a short fade on sheets.

## Rules that do not bend

- WCAG AA: 4.5:1 for text, 3:1 for control boundaries and focus; targets ≥ 44px (visual can be smaller with an extended hit area).
- Real data only. No invented memberships, fees, delivery times, ratings, cashback or "free delivery" thresholds — the reference
  apps' "pro", "Gold", "Care Plan", tips and service fees do not transfer.
- Prices, stock, quotes, coupons, payments and orders keep their server owners. Design never changes a commerce decision.
- One primary action per screen region; one fixed bottom region at a time.
- English and Arabic both ship: logical properties, mirrored directional icons, isolated Latin/number runs.
