# Page patterns — Al Mina Quick

Components: [components.md](components.md). Each screen copies the flow of the reference app noted.

## Home (Talabat pharmacy home)
Header with plain "Deliver to" address text and search → campaign carousel (16px radius, coral pill action) → "Shop by care" category tiles (4 per row) →
product shelves (2-column tile grid on phones, 4 on desktop) with coral "View all ›" → brands → help block → footer.

## Listing, category, search (Talabat / Blinkit)
Title and short description → filter pill + category chips (scrolling row) → result count and sort pill → tile grid → pagination pills.
Search shows the query chip and the same grid; empty results offer categories.

## Product detail (1mg)
Grey canvas. White section: gallery in a `well`, brand/category, name (h1), price + former price + lime save sticker, stock, quantity
stepper pill + coral "Add to cart" pill (no price inside it; "Go to cart" once added, no icon), then two info rows: delivery in
Ras Al Khaimah and returns. No SKU line, no extra cart or contact links. Further white sections: overview/specifications tabs, help, reviews, related
tiles. Phones: sections edge to edge between grey bands; a pay-bar style purchase dock appears when the inline action scrolls away.

## Cart (Talabat)
Back circle · "Your cart" + count · "Add items" pill. Delivery row (yellow when no area yet). Lines with steppers. "Order summary":
savings strip, bill, coupon, note on when totals are final. Pay bar: item total + "Proceed to checkout". Help and recommendations below.

## Checkout (1mg / Zomato)
Back · "Checkout" · secure label; step indicator (coral current, green complete). "Your order" section. Delivery: "Delivering to" row
when a place is known (address fields behind "Edit address details"), otherwise two choice rows (current location, choose on map) →
"or type the address" → address fields with a one-line delivery pin → building/flat/note. Errors under each field. Contact section. Review &
payment: payment choice cards (selected = coral border on tint), bill with "To pay". Pay bar states the action ("Review order",
"Place order").

## Address sheet (Zomato "Select an address")
Bottom sheet: grabber, "Where are we delivering?", current saved place card, saved addresses, "Use current location" (coral pill),
"Choose on map" (secondary pill), "or enter your area", emirate + area fields, save. Map view is full screen with a fixed centre pin and
a confirm pill.

## Account (1mg sign-in)
Grey canvas, one white sheet: title, short reason, email field, coral full-width "Continue", code step with resend timer. Signed in:
sections for orders, addresses, rewards, reminders, preferences.

## Content pages
White canvas, 65-character measure, h1 → sections; any actions use the same pills.

## Shared rules
One h1 per page, main landmark, skip link. One fixed bottom region at a time (tabs, purchase dock or pay bar). Existing URLs, metadata
and structured data are unchanged.

## Enclosed checkout (Baymard)
On phones the checkout hides the store header, tabs and footer: a white sticky top bar (back circle, "Checkout", lock) is the only
chrome; the cart hides the footer. Desktop keeps the logo bar and footer. The order-placed screen follows the "Order placed" component.

