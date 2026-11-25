# Storefront design system: Al Mina Quick — 25 November 2026

The owner found the first Quick Commerce pass still "basic" (for example, the address slide-up was not full width). They asked for
the tokens, design system, components and whole store flow to be rebuilt to copy the reference apps (Talabat, Tata 1mg and similar;
`docs/design/references/checkout flow/`), then reviewed with `/impeccable` and refined with `/emil-design-eng`.

## What changed

- **Tokens** (`storefront-tokens.css`, `--qc-*`; documented in `docs/design/tokens.md`) were derived with `/ui-ux-pro-max` and from colours
  sampled from the screenshots. The skill's generic "pharmacy green" recommendation was rejected in favour of the reference values:
  - action: 1mg coral `#FF5443`, darkened to `#DA3729` for 4.6:1 with white; coral text `#C42F22`;
  - canvas: `#F2F3F7` (1mg and Zomato);
  - savings: 1mg mint `#E3F9EC` with green `#1B7A3E`;
  - deals: Talabat lime `#CFFF00`;
  - ink and secondary text: `#1C1C1E` and `#3D4152`;
  - radius scale with pill actions, one elevation scale, and motion and layer tokens.

  Old token names remain only as aliases for the structural stylesheets.
- **Design docs:** `DESIGN.md` was rewritten. `docs/design/tokens.md` is new. `components.md` and `page-patterns.md` were rewritten.
  `colors.md` and `typography.md` were removed. `references.md` and `responsive.md` point to the new documents.
- **Component system** (`storefront-system.css`, replacing `storefront-skin.css`):
  - pill buttons (primary, secondary, text) and 52px fields;
  - chips and the address pill;
  - search pill and header;
  - tab bar with a coral current tab;
  - Talabat product tiles: lime "Save AED n", a round "+" on the photo that grows into a "− n +" stepper, and a muted disabled control when out of stock;
  - category tiles;
  - Zomato bottom sheets: full width on phones with a floating dark close, a centred 480px dialog on wider screens.
    This fixes the narrow address sheet, which was capped by an old `max-inline-size` rule in `storefront.css`; that rule is removed;
  - 1mg sections on grey bands, delivery row, bill, savings strip and pay bar;
  - checkout payment cards, the cart line grid, and PDP sections.
- **Markup:**
  - **Tile:** the sticker shows the saving in dirhams.
  - **Delivery sheet:** scroll body, floating close, grabber.
  - **Cart:**
    - Talabat header: back, title and count, "Add items";
    - lime "Save n%" on each line.
  - **Checkout review:**
    - "Delivering to … Change" row;
    - text "Back";
    - text "Hide/Details".
  - **PDP:** the save badge uses the lime sticker.
  - **Carousel:** slides fill the track, which removes the gap.

## Review passes

- `/impeccable` polish found:
  - the tile "+" icon was hidden at ≥600px by a legacy rule (P1). It is fixed;
  - applied-filter chips still used teal text (P3). They are fixed.

  A confirm round then passed.
- `/emil-design-eng`:

  | Before | After | Why |
  |---|---|---|
  | Sheet and menu exits used `ease-in` | Exits use the strong ease-out (200ms) | `ease-in` delays the first frame and feels sluggish |
  | Stepper entered from `scale(.6)` | `scale(.85)` + opacity | Nothing should appear from almost nothing |
  | Reduced motion removed every transition | Sheets and scrim keep a 160ms fade; only movement is removed | Reduced motion means less movement, not lost context |
  | Mega menu grew from the top-left in Arabic too | `transform-origin: top right` in RTL | Popovers grow from their trigger |

  Kept: press scales (0.97 buttons, 0.94–0.96 tabs and chips, 0.85–0.9 small icon controls) at 100ms; hover effects only on fine pointers;
  only transform and opacity animate.

## Verification

- **Responsive sweep:** 20 routes × 9 widths (320–1920) were captured on the local preview stack. All 180 captures have zero horizontal
  overflow and no console errors other than the expected 401 and 404 responses. Arabic (RTL) was checked at 390px.
- **Checks:** typecheck, lint, unit tests (330 pass, 3 skipped), `build:foundation` (with the CI environment), and `smoke:foundation`,
  `smoke:storefront` and `smoke:seo` all pass.
- **Playwright:** a full run on the fresh build passed 220 tests and found three real regressions. They are fixed, and the affected suites
  (critique, account, Stripe checkout, storefront, commerce) pass again:
  - The payment radio was hidden with `pointer-events: none`, so clicks landed on the card label. It now covers the card, invisibly.
  - Text fields dropped their focus outline. They now keep a 2px `info` outline as well as the ink border.
  - The critique spec asserted that the cart heading has no links (the confirmed 2026-11-22 preference). The Talabat header the owner
    asked for restores a back circle and "Add items". The spec now asserts exactly those two links, both to `/products`.
    This reverses the 2026-11-22 preference; the owner confirmed it on 2026-11-25 ("Keep it").
- **Not verified:** physical devices and the owner's visual acceptance.
