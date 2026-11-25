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

## Owner review round (same day)

The owner reviewed the running store and listed nine problems:

- the address still sat in a box;
- long place names ran into the logo;
- the product page had a boxed delivery note with many links;
- the "Go to cart" check icon looked generated;
- old tokens leaked into several pages;
- the location icon tile and badge looked generated;
- errors appeared in a summary box;
- the header had a "Contact our team" link;
- the checkout address entry had a stack of buttons.

There were too many coral links overall.

Changes, each taken from the references (Talabat first, then 1mg and Zomato):

- **Header:**
  - "Contact our team" removed, including the checkout header.
  - The address is now plain text: "Deliver to" above the place and a chevron, with no pill or pin. The place truncates.
- **Links:** links are now ink. Coral text remains only for Change/Edit, steppers, the current tab and selected chips. Ghost buttons are ink.
- **Old palette:** the legacy `teal`, `forest` and `lime` aliases now resolve to ink or grey, so the old palette no longer leaks into
  older stylesheets or utilities. The last raw hex was replaced. The focus outline is ink.
- **Product page:**
  - the SKU line and the price inside the button are removed;
  - the boxed delivery note and its link row are replaced with two 1mg info rows: delivery, and returns;
  - "Go to cart" has no icon;
  - tabs, gallery controls and specification links are ink;
  - the disabled stepper button lost its extra ring.
- **Delivering-to rows** (cart, checkout, payment, receipt): a small grey pin, "Delivering to **Home**", the address below, and
  "Change". The tinted icon tile and the label badge are gone, and there is no yellow empty state.
- **Checkout address:**
  - "Use my current location" and "Choose on map" are now Zomato list rows.
  - Location messages are a line of text.
  - The delivery pin picker is one row with text actions. It is kept because delivery-zone pins depend on it.
- **Checkout errors:** each error shows under its own field. The summary box is removed, and the first invalid field takes focus.
  A request-level error is one quiet line at the top of the form.

## Second owner review: flow refinement

The owner found the confirmation and pay bar still bare. They asked for a full critique of every flow screen with `/impeccable` and
`/emil-design-eng`, closer adherence to Talabat, Zomato and 1mg, and the checkout guidance from Baymard and PageFlows. (The Medium article
returned 403 and was not read.) The whole flow (home → listing → product → cart → address sheet → checkout → errors → review →
confirmation → account) was captured at 390 and 1280 before and after (`.local-demo/redesign/flow.mjs`).

Changes:

- **Enclosed checkout on phones** (Baymard): the store header contents, tabs and footer step aside. The address sheet's dialog stays
  mounted so "Change" still opens. The top bar is a sticky white "← Checkout 🔒". The cart hides the footer.
- **Progress:** three labelled steps on one line (Delivery · Payment · Confirmed) instead of one label and two bare numbers.
- **Pay button** (Zomato): the total sits inside the coral button with the action on the end. The duplicated total beside the button is
  gone. Accessible names are unchanged ("Proceed to checkout", "Review order", "Place order — AED n").
- **Coupon** (1mg): one box with "Apply" inside it; applied codes show as a dashed green row.
- **Order placed** (Zomato/Talabat): a drawn green tick, then white cards for the tracker, number and total, items and delivery, and next
  steps. "Contact pharmacy" is a quiet link. The redundant progress row is hidden.
- **Bill:** a dashed rule above the total.
- **Address sheet:** the saved place is a plain grey row, and "Use current location" / "Choose on map" are list rows.
- **Cart:** help is one row with a chevron, and recommendations scroll sideways on phones.
- **Basket bar** (Talabat "View basket"): on browsing pages on phones, a coral bar above the tabs shows the cart count and "View cart".
  Count only, no prices.

`/emil-design-eng` review:

| Before | After | Why |
|---|---|---|
| Confirmation disc entered from `scale(.6)` | `scale(.8)` + opacity, then the tick draws (stroke-dashoffset, 360ms) | Nothing appears from almost nothing; the tick is the one authored moment |
| Confirmation cards appeared at once | One short cascade (380–500ms, non-uniform delays) after the tick | A rare, once-per-order screen can carry a single orchestrated entrance |
| Choice rows faded to 60% on press | A `well` wash on press | Fading the whole row reads as disabled |
| No hover cue on pay buttons | The chevron nudges 2px on fine pointers only | Hover feedback without touch false positives |

Kept: the basket bar slides up once on mount and its badge pops per change, and the coupon-applied row pops in. Reduced motion shows the
tick complete and removes all movement.

Verification: typecheck, lint, 330 unit tests and the foundation build pass. The full Playwright run passed 224 tests and found two real
issues:

- the pay button's small "Total" label was 4.35:1 at 85% opacity; it is now full white (AA);
- hiding the footer on phones also hid the optional-usage consent controls; the footer's links hide, but its privacy controls stay.

After the fix, the affected suites (telemetry, next-checkout, checkout design review, coupons; 38 tests) pass. Physical devices and the
owner's visual acceptance are not verified.


## Third owner review: browsing pages and full polish

The owner asked for the same treatment on the home, listing and product pages, for a fix to layout overflow, and for a full
`/impeccable` review.

- **Overflow:** a scan of 10 routes at 13 widths (320–1280) and in Arabic at 6 widths found no horizontal overflow on the current code
  (`.local-demo/redesign/overflow.mjs` reports any element that sticks out and is not inside a scroller). The owner's screenshot showed an
  intermediate cart help row whose no-wrap "Contact the pharmacy" text pushed the page wider; that row had already been replaced.
- **Home** (Talabat):
  - shelves are one swipeable row on phones and one row of five or six tiles on desktop, instead of tall two-column grids;
  - the compact shelves use the same product tiles;
  - brands are square logo tiles with names below;
  - the dark "conversation away" card became one help row;
  - the "In the spotlight" slider was removed (no reference has it);
  - the routine block lost its border and uppercase labels;
  - section descriptions are hidden on phones.
- **Listing:** desktop grids fit five to six tiles a row (176px minimum) instead of four large ones, and the lone "1" pager is hidden when
  there is only one page.
- **Product page:** the photo fills a square well (6% inset) instead of floating small in a tall box, and similar products swipe as a shelf
  on phones.
- **Polish batch:**
  - unavailable tiles show only "Currently unavailable" (no save sticker on top);
  - cart lines with a stock problem show the message in red;
  - the 404 page lost its uppercase eyebrow label;
  - the sale sticker never wraps in narrow tiles;
  - brand rails snap at the gutter.

## Success animations and micro-interactions

The owner asked for interaction and success animations across the flows, including an animation with sound after an order is placed
and before the confirmation screen, modelled on quick-commerce apps (Swiggy, Instamart, Zomato). Swiggy's published motion work pairs
micro-interactions with haptics and sound, and e-commerce guidance favours quick, unambiguous add-to-cart feedback over flashy effects.

- **Order placed:** a full-screen green celebration with a disc, ring, tick draw, confetti, chime and haptic, then it fades to the receipt
  (`order-celebration.tsx`). It is verified frame by frame at 150/500/900/1400/1900/2500ms (`.local-demo/redesign/celebrate.mjs`).
- **Coupon accepted:** a confetti burst, a two-note chime and a haptic.
- **Add to cart:** on phones the basket bar bumps and gives a haptic tap.
- **Smaller touches:** the savings strip sweeps once, the heart pops on save, "Go to cart" settles in, checkout steps rise in, and the pay
  button shimmers while working.
- **Shared helpers:** `lib/ui/celebration.ts`. The chime is synthesized (no asset); browsers without Web Audio or vibration simply skip it.
- **Not verified:** the sound itself (headless capture has no audio output) and haptics on a physical Android phone. Stripe payments
  redirect to the provider, so the celebration covers cash on delivery; the Stripe return page keeps its existing confirmation.

Verification for both rounds (browsing redesign and motion): typecheck, lint, 330 unit tests and the foundation build pass. The full
Playwright run passed 226 tests and found two real issues, both fixed:

- **Contrast:** the checkout step entrance faded in, so the accessibility audit caught text mid-fade below 4.5:1. The entrance now only
  moves.
- **Listing grid:** the denser desktop grid broke the agreed three/four columns beside the filter sidebar. The sidebar listing is now
  exempt.

The affected suites (market-green, next-checkout, coupons, storefront; 51 tests) pass.

