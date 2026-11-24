# Purchase flow polish — 2026-11-24

Reference: `docs/design/references/checkout flow` (Zomato, Tata 1mg and Noon-style carts). Common shape: one scrolling screen, delivery row first,
itemised bill, a pay bar that stays in reach, sign-in only where it unlocks something, and details asked only once.

## What changed

- **Shared vocabulary** (`app/(storefront)/purchase-flow.css`, `pf-*`): delivery row, cards, line rows, itemised bill, pay bar, saved-address chips,
  status tracker. It sets no price, fee or total.
- **Cart**: delivery row ("Delivering to Home · address · Change", opens the delivery sheet), line totals with unit price and Remove, a bill card
  (item total, delivery and VAT shown at checkout), and a sticky bar with the item total and Checkout on phones.
- **Checkout, details step**: delivery comes first (saved address chips, a "Delivering to" card with Change, or a "Where should we deliver?" tile with
  Use my current location / Choose on map); building, flat and note sit beside it; the manual emirate/city/street fields and the pin map are behind
  "Edit address details" once a place is chosen (they open by themselves on a validation error). Contact comes after. The order is visible on phones
  with line totals, and the sticky bar shows the item total.
- **Signed-in customers are not asked again**: e-mail comes from the account (`/api/customer/me`); name and mobile from the default saved address, and
  that address is used unless the customer picked another spot on this device. Contact shows as one row with Edit. Guests see the fields and a
  "Sign in" prompt. Nothing is sent that the customer did not see, and the server still validates every field.
- **Confirmation**: order placed / confirms / on the way tracker, item thumbnails with totals, delivery address, estimate and payment method.

## Not changed

Pricing, quote, stock, coupon, payment and order creation logic are untouched; the form still submits the same fields.

## Rollback

Revert the PR. No data or API changes.
