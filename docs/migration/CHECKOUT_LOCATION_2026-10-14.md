# Checkout address autofill — 2026-10-14

The user requested restoration of the legacy OpenStreetMap checkout behavior, including address, emirate, city and the delivery link. This supersedes the earlier pin-only implementation. Google Geocoding requires billing even within its free allowance; the user chose OpenStreetMap instead.

## Runtime behavior

**Use my current location** requests browser permission only on click, then sends numeric coordinates to the same-origin Next `/api/checkout/location` gateway. The gateway validates origin/CSRF, body size, coordinate ranges and response contracts, and forwards a POST to Render `/api/v1/checkout/location`. No third-party scripts or browser geocoding calls are required. Responses are private/no-store and this endpoint is active only with checkout enabled at the Next gateway.

The API uses Nominatim reverse geocoding, validates its response and UAE country code, canonicalizes the seven emirates (including ISO subdivision codes and legacy English spelling variants), and prefers suburb/quarter/neighbourhood/industrial area before city/town. It returns the address, canonical emirate, city/area and Google Maps delivery link together. Unknown emirates, missing area or malformed responses fail instead of guessing. GPS is a suggestion, not a pricing or authorization boundary.

The form fills all three address fields and the pin atomically, keeps them editable, preserves contact/building/flat details, and requires review before ordering. Editing an address field clears its pin and invalidates the quote; removing the pin also invalidates review. Contact and building edits retain the pin. Pending uncertain submissions stay locked and retry the exact original intent. The existing API stores all confirmed fields and `customer.maplink` in the order snapshot. Delivery fees continue to be calculated by the server from the selected emirate.

While locating, address fields and order review are disabled to avoid overwriting intervening edits. Permission denial, provider failures, outside-UAE results, incomplete addresses, unsupported browsers and timeouts preserve existing details and leave manual checkout available. A 20-second overall deadline rejects late GPS/geocoder results, with a five-second provider deadline. Low GPS accuracy requires checking the suggested location. Building/flat details require customer confirmation; reverse geocoding cannot guarantee a specific apartment.

## Provider policy and availability

The public Nominatim service is a free, capacity-limited service, **without an SLA**. [Its usage policy](https://operations.osmfoundation.org/policies/nominatim/) limits the entire application to one request per second, requires an identifying User-Agent, visible attribution, moderate user-triggered use, caching and the ability to change providers. Do not use it for address autocomplete, bulk imports or confidential information. The form discloses that coordinates are sent to OpenStreetMap and displays linked attribution. Customers can always choose manual entry. Review privacy notices before hosted launch.

A MongoDB lease shared across API instances allows at most one upstream call in flight, and uses the MongoDB server clock and spaces calls by at least 1.1 seconds after the preceding call finishes. Provider rate rejections impose a 60-second cooldown; other upstream failures impose a 10-second cooldown. Busy callers get a retry message. A configurable daily budget defaults to 500 upstream requests. Cached successes are reusable for 24 hours with approximately metre-resolution coordinates; cache entries store no customer identity, original GPS fix or map URL. Cache keys hash the provider endpoint and rounded coordinate; the exact pin is regenerated for every response. Logs/telemetry contain no coordinates, address text or provider URLs. Invalid/outside-UAE results are not cached. Database or quota failures prevent upstream calls.

The public service can reject requests or withdraw access. For contractual availability or larger traffic, configure a managed or self-hosted Nominatim-compatible endpoint. Local hardening does not create a provider SLA. Multiple independently hosted environments sharing the public provider must route through the same throttle/database or use separate managed services; independent counters cannot enforce an app-wide public limit.

## Configuration and rollout

Server-only settings on the Render backend (examples in `backend/.env.development.example` and `.env.production.example`):

```env
GEOCODING_ENABLED=true
GEOCODING_REVERSE_URL=https://nominatim.openstreetmap.org/reverse
GEOCODING_USER_AGENT=AlMinaPharmacy/1.0 (+https://alminapharmacy.com/contact)
GEOCODING_DAILY_LIMIT=500
```

The defaults above also support the local demo without an API key. The configured contact URL must identify the deployed application. Endpoint configuration permits HTTPS without credentials/query strings and rejects redirects; the client cannot select its own upstream host. Set `GEOCODING_ENABLED=false` to disable autofill while preserving manual checkout. An optional server-side Geoapify adapter was added on 6 November; see [delivery zone setup](DELIVERY_ZONES_2026-11-06.md). Never put keys in endpoint URLs or NEXT_PUBLIC variables.

The additive API index plan includes TTL indexes on `geocoding_cache.expiresAt` and `geocoding_limits.expiresAt`. Plan/review/apply them through the existing index migration command before hosted launch. The isolated local demo applies these two indexes on startup. They only expire short-lived cache/quota records; existing customer/order data is untouched. `_id` indexes serialize leases and budgets. Reads reject expired cache records even before TTL cleanup. Rollback: disable geocoding or restore the preceding app version; existing orders and customer fields remain compatible. Retain the additive TTL indexes to clear residual cache entries. No production index changes or deployment were performed in this session.

## Verification

- 11 normalization/config/input unit cases and five existing API plus three contract cases passed (19 total).
- Three real disposable-Mongo integration tests passed: concurrent instances, cache reuse/expiry, daily budgets, TTL indexes, released leases, shared provider cooldown and rejected malformed/outside/provider-error responses.
- 23 compiled checkout/commerce Chromium cases passed (final rerun: 59.1 seconds), including autofill field values, map link, all four persisted order fields, review invalidation, failures/manual fallback, saved-intent retry, CSRF/method/input validation and responsive accessibility at 360/390/768/1280px.
- Clean lint/typecheck and isolated Turbopack production build passed.
- One real provider smoke used the public Burj Khalifa landmark, not a person's location, and returned a full Dubai address, area and delivery link through the maintained service.

Tests use disposable local databases and synthetic provider responses unless explicitly described as the public landmark smoke. No production database, customer data, Google billing account or device location was accessed.

Live Next.js MCP reported no compilation/runtime errors. The optional headless manual probe encountered denied browser location permission and correctly retained manual checkout; the successful autofill/order flow was verified in Chromium contexts with explicit synthetic geolocation permission. Proof: `.verification-results/checkout-autofill.jpg`.
