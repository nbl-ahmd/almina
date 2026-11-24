# Delivery location flow (phase 1) — 2026-11-24

## Why

Customers who opened the installed app saw "Location permission was denied" with no prompt, and the location control lived inside
checkout, after the customer had already committed. Delivery apps (Talabat, Swiggy, Zomato, Flipkart) ask where to deliver first, let the
customer confirm an exact spot on a map, and then reuse it everywhere. This phase brings that shape to the storefront.

Reference notes (secondary sources; compare against the real apps before treating any detail as fact): Zomato and Swiggy ask for current
location or a map pin, then the full address; permission is asked at launch. Chrome's own guidance is to ask for location only after a tap
(web.dev "User Location" and "Web permissions best practices"): prompts shown without a user action are allowed about 12% of the time against
about 30% after one, and a permanent block cannot be re-prompted, so the fallback has to be instructions plus a manual route.

## What changed

1. **Permission handling** (`lib/location/access.ts`). One tap triggers the native prompt. A refusal is explained for the customer's real
   situation: installed Android app, Chrome tab, an app's built-in browser (Instagram, Facebook, TikTok, WebViews), iPhone, desktop. A refusal
   while the browser still says "prompt" means it never asked (embedded browser, or Android's own Location permission for Chrome is off) and gets
   the same steps. Timeouts and missing GPS never tell the customer to change a permission.
2. **First-visit sheet** (`components/delivery-location.tsx`). A first-time visitor sees "Where are we delivering?" once per visit, about 1.4 s
   after the page settles, never on checkout, cart, account or admin. Choices: Use current location, Choose on map, enter an area, Browse first
   (silences the sheet for 7 days). The sheet does not request permission by itself; the tap does.
3. **Pin map** (`components/location-pin-map.tsx`). Full-screen map, fixed centre pin, the point under the pin is the choice. Address lookup runs
   once the map is still for 700 ms and only at street zoom (15 or more). Confirm stays disabled until the address resolves, and outside the UAE
   it explains why.
4. **Saved delivery point** (`lib/location/browser.ts`). `almina.delivery-point.v1` holds the confirmed spot (coordinates, address, emirate,
   city) on this device only; `almina.delivery-area.v1` still holds the area so older visitors keep working. The header chip shows the area.
5. **Checkout** pre-fills address, emirate, city, pin and map link from the saved point, shows a "Delivering to" card with Change, and reuses
   the same guidance when its own location button is refused. The server still validates the address and coordinates in the order; nothing here
   is trusted for price, fee or coverage.

## Map provider decision

Google's interactive map, Places and Geocoding all need a Google Cloud billing account (a card). Since March 2025 each product has a free
monthly cap (10,000 requests for Essentials products such as Dynamic Maps and Geocoding, 5,000 for Pro), and charges apply above it. The no-card
demo key is for prototyping only. So phase 1 stays on OpenStreetMap tiles with Leaflet and the existing reverse-geocoding service, and
customers can still open any pin in Google Maps from checkout (a plain link, free, no key).

Known limits to revisit as traffic grows:

- The public Nominatim service allows about one request a second and is not meant for heavy use. The API already enforces a global lease and
  `GEOCODING_DAILY_LIMIT` (500 by default) and caches results for a day. A busy lookup shows "Try again" in the sheet.
- There is no address search box yet (search-as-you-type is against the public Nominatim policy). Options: Geoapify (the code already supports it
  as `GEOCODING_PROVIDER=geoapify`; check its free plan terms), or Google Places once billing is acceptable. Swapping the map to Google later
  means moving tiles, search and reverse lookup together, because Google's terms do not allow mixing its data with other maps.

## Phase 2: coverage check at confirm

`POST /api/v1/checkout/coverage` (web proxy `/api/checkout/coverage`, same origin/CSRF rules as the address lookup) answers `serviceable`
(zone name, estimated minutes, delivery fee, minimum order), `outside`, or `unchecked` (zone rules switched off). The pin map calls it beside
the address lookup (it never touches the address provider) and shows "We deliver here · about N min · delivery AED X", or blocks Confirm with
"outside our delivery area". A failed or missing answer is treated as unchecked, so a broken check never stops a customer. It is advice only:
checkout still validates the pin against zones, stock and minimums on the server. Tested in `tests/delivery-zones-integration.test.ts`.

## Phase 2b: details step and saved addresses

After Confirm location the sheet asks for a label (Home, Work, Other), building or villa, flat or floor and a note for the rider, all optional
("Skip for now" keeps just the pin). They are stored with the saved point on this device and copied into checkout's building, flat and note
fields. Signed-in customers also see up to three saved addresses that carry a pin, default first, selectable with one tap.

## Not yet built

- Address search with suggestions (needs a provider key: Geoapify's free plan needs no card, but the public Nominatim service forbids search-as-you-type).
- Writing the details back to the signed-in address book (needs name and mobile, which the sheet does not collect).
- Saved address book for signed-in customers with Home, Work and Other labels (the account already stores addresses; the sheet does not use them
  yet) and a building/flat step inside the sheet.
- Storefront revamp: delivery-aware product availability and ETA on product and cart pages, and the checkout as a single address-first screen.

## Rollback

Everything is additive. Removing the sheet's auto-open (the timer in `DeliveryLocation`) restores the old behaviour; the old area form still
works, and the saved point is optional everywhere it is read.
