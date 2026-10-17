# Storefront refinement — 2026-10-15

The owner supplied nine browser annotations covering navigation spacing/density,
icon geometry, product photos, product-page filler, checkout presentation,
location selection and hover treatment.

## Changes

- Desktop navigation uses a dedicated link row with single-line destinations.
  The primary row prioritizes the logo, delivery area, search and contact/cart.
  Mobile search has bottom padding. Existing product/catalog mobile headers and
  bottom navigation remain.
- Icon circles use explicit square dimensions, centering and shrink prevention.
  Storefront text links use subtle color changes rather than inherited hover
  underlines; keyboard focus remains visible.
- Product media uses a neutral white frame with contain sizing. Full product
  photos remain visible without cropping; their original backgrounds are kept.
- The four technical filler points under the product gallery are removed.
  Real descriptions, category facts and pharmacy contact remain.
- Checkout groups contact, delivery and payment in separated form sections with
  consistent fields, placeholders and a distinct order summary. Current-location
  action sits next to the address section. Address-provider details are kept
  out of the primary flow; attribution remains beside a detected pin.
- Confirmation uses a receipt-style order number/total and clear next actions,
  using only the committed server response. Keyboard focus moves to the receipt
  heading after submission. No invented delivery stages or ETA.

## Delivery area

A dismissible first-visit invitation opens a native modal dialog. Shoppers can
choose city/emirate manually or explicitly request browser geolocation, confirm
its result and save. Saved values are schema-validated, bounded and kept in local
storage on this device; coordinates, map pin, street address and contact details
are not stored by this feature. Storage failure is reported. Changes sync across
tabs. Invalid stored values are ignored. Checkout prefills city/emirate on entry;
exact address and optional delivery pin remain the customer's checkout inputs.

The existing protected, rate-limited location gateway is reused. If lookup is
unavailable (including checkout being disabled), manual area selection works.
Permissions-Policy allows consented same-origin geolocation on explicit storefront
routes; admin/API defaults stay disabled. No browser GPS prompt runs on arrival.
Timeout, denial and late-result handling preserve manual entry.

This creates a presentation preference for future delivery features. It does not
filter products, calculate ETA or override server-authoritative checkout fees,
prices, tax, stock, quote acknowledgment, order intent or idempotency.

## Verification

Verification uses synthetic local catalogs and disposable commerce fixtures;
production data and external geocoding providers are not used for test orders.
Build, typecheck, focused lint and all 21 catalog/SEO/commerce unit regressions pass.
The broad browser run passes 31 of 32 cases, including all three new area tests.
The remaining case still expected product pages to forbid geolocation. Its
expectation now checks consented storefront access and disabled admin access;
the focused five-case rerun passes, including checkout and confirmation at
360/390/768/1280px with axe and overflow assertions. No assertions were waived.

Live visual/overflow/axe checks pass at 360/651/833/1456px for home, catalog,
product, cart, checkout and the location dialog. Escape restores focus. Final
screenshots are in `/tmp/almina-cohesion-*` and confirmation captures are in
`.verification-results/checkout-confirmation-{390,1280}.png`. Next diagnostics
report no compilation/config/session errors.

No dependency,
database schema, integration replacement or deployment is included.
