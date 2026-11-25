# Components — Al Mina Quick

Tokens: [tokens.md](tokens.md). Implementation: `storefront-system.css`. Each component lists anatomy, states and its reference.

## Actions

| Component | Anatomy | States | Reference |
|---|---|---|---|
| Primary button | Pill, 48px (52px in pay bars and sheets), `action` fill, white 700 label, optional 18px icon | hover `action-hover`; pressed `action-pressed` + scale .97; busy keeps width with a spinner; disabled `well` fill, `muted` label | Talabat "Checkout", 1mg "Confirm and pay" |
| Secondary button | Pill, white, 1.5px `line-strong`, ink label | hover `well`; pressed scale .97 | Talabat "Add items" |
| Text action | Coral `action-text` 800 label, no border — only for actions that change something (Change, Edit) | hover `action-tint` pill | 1mg "Change" |
| Link | Ink; underlined in running text. "View all ›" and policy links are ink, never coral | hover underline | Talabat |
| Icon button | 44px circle | pressed scale .92 | Zomato back, close |
| Floating close | 44px dark circle (`ink`) centred 60px above a phone sheet; inside the top-end corner on wider screens | pressed scale .92 | Zomato sheets |

## Inputs

| Component | Anatomy | States |
|---|---|---|
| Field | Label above (14px 700), 52px box, 12px radius, `line-strong` border, 16px text | hover `control`; focus ink border + ink outline; invalid `danger` border + message directly under the field (no summary box); the first invalid field takes focus |
| Search | 48px pill in `well`, magnifier at the start, coral round submit on the end | focus: white fill, ink border, `e-2` |
| Chip | 40px pill, white, `line-strong` border, 13px 700 | selected: `action-tint` fill, `action` border, `action-text` label; pressed scale .96 |
| Checkbox / radio | 20px, `action` accent | — |

## Commerce

| Component | Anatomy | Reference |
|---|---|---|
| Product tile | White, 1px `line`, 16px radius, 8px padding. Square `well` with contain-fit pack. Lime `deal` "Save AED n" sticker top-start (real saving only); save heart top-end; round white "+" (40px, `e-2`) on the photo's bottom-end corner. Below: name (14/600, wraps), pack or brand (12 `muted`), price (15/800) with former price struck through | Talabat "You might also like" |
| Tile stepper | Replaces "+" once in the cart: white pill, coral − and +, ink count; grows in from the corner (scale .85 + opacity → 1, 220ms); count slides on change | Talabat |
| Unavailable tile | Pack greyed, "Currently unavailable" badge; the round control stays visible but muted (`well` fill, bag icon) and disabled, named "Out of stock: {name}" | — |
| Category tile | Rounded 16px `well` square, pack inside, 12px 700 label below; 4 per row on phones | Med7 on Talabat "Shop by categories" |
| Cart line | 64px thumb · name, price + struck former price + lime "Save n%" · unit price; stepper pill at the end with Remove under it | Talabat cart |
| Header address | Plain text, no box or pin: "Deliver to" (12px `muted`) over the place (15px 800) and a chevron; the place truncates before it reaches the logo | Talabat "Deliver to Apartment" |
| Delivering-to row | Small grey pin (20px, no tile), "Delivering to **Home**", address below in `muted` (2 lines), "Change" | 1mg checkout |
| Choice rows | Full-width rows divided by `line`: icon, title, one-line hint, chevron ("Use my current location", "Choose on map") | Zomato "Add Address" |
| Info rows | Product page delivery and returns: icon, title, hint, chevron to the policy | 1mg product page |
| Bill | Rows: item total, discounts in `save`, fees as returned (dotted underline explains), dashed rule, "To pay" 17/800 | Zomato "Bill summary" |
| Savings strip | `save-tint` pill-cornered strip, green check, "You save AED n on this order" | 1mg |
| Pay bar | Fixed on phones, `e-bar` shadow: "Item total" micro label + amount, 52px coral pill with the action name | 1mg, Zomato |

## Navigation

| Component | Anatomy |
|---|---|
| Header (phone) | Logo · address pill · menu; search pill on its own row |
| Header (desktop) | Ink utility bar · logo, search, address pill, account, coral cart pill with badge · department row |
| Bottom tabs | 5 destinations, 22px icons, 11px labels; current = coral label + filled icon; badge pops on change |
| Section heading | 20/24px 800 title, optional 13px `muted` description, coral "View all ›" |

## Overlays

| Component | Anatomy |
|---|---|
| Bottom sheet | Phones: full width, 24px top corners, grabber, floating dark close, internal scroll, safe-area padding. ≥600px: centred 480px dialog with close inside |
| Filter sheet, menu | Radix; slide from bottom / start edge, scrim fades |
| Popover (search, mega menu) | 16px radius, `e-3`, grows from its trigger (scale .97) |

## Interaction states every component ships

Default, hover (fine pointers only), pressed, focus-visible (2px `info` outline with white gap), selected, disabled, busy, error, and
long-content (Arabic and long names wrap; nothing truncates on detail, cart or checkout).
