# Branch polygons control delivery and receiving — 8 November 2026

## Owner's workflow

Create the branch login, set the actual branch pin, draw its delivery polygon,
and enter delivery terms. **Create branch & enable delivery** saves and enables
that complete setup atomically. An existing branch uses **Delivery area → Add
delivery zone → Save area & enable delivery**. The polygon and its branch link
are the coverage and receiving rule. No named-city allocation, fallback chooser
or independent order-routing activation is required. Branches share main stock.

The former Delivery Zones admin URL redirects to Branches. Its APIs remain
compatible. Branch setup no longer exposes the legacy named-area editor, the
public-directory city's coverage restrictions, or the old order-area dropdown.
Public directory descriptions are separate factual store information, with no
manual coverage list in the branch workspace. Storewide commerce policy remains
available as optional settings, not another prerequisite for a branch inbox.

## Atomic activation and data compatibility

`saveZone` accepts optional `enableDelivery`. Existing clients that omit it retain
save-only behaviour. When true, the same staff-write transaction saves the zone,
validates a real branch pin, active receiving login, active polygon and existing
2dsphere index, enables the branch and turns on polygon checkout. New branch
creation with a zone and enabled=true uses that same gate; any failure rolls back
branch, credentials, zone and activation. A draft without a zone remains paused.
All privileged operations recheck the administrator server-side.

Legacy `growth_settings/order-routing` still holds the branch registry and
historical fields. Its `active` flag and `areaIds` do not gate polygon delivery.
The new path does not set that flag or invent city assignments. Main stock,
coverage and branch priority/distance remain server-authoritative. Branches with
no active receiving account are excluded from new assignments. Last-account
protection also applies when polygon delivery is on and legacy routing is off.
Pausing a branch stops only new assignments, retaining its existing inbox.

The first explicit enable action requires a customer pin and rejects addresses
outside active saved polygons across checkout. The UI explains this cutover;
merely deploying this code or opening/editing a draft does not activate it.
Disabling every branch leaves polygon mode on and rejects new uncovered orders;
it never silently falls back to city spelling or legacy fees.

Existing orders retain assignments, monetary snapshots and original addresses.
Pre-zone order compatibility remains behind the existing API, without a new
setup screen. Administrators retain access to every order, including older ones
without a polygon assignment. No production order is reallocated by this release.

## Optional place search

The map's explicitly submitted search uses the existing server geocoder:
Nominatim or configured Geoapify. Requests are admin-only and CSRF-protected;
queries/results are bounded, UAE-filtered, not logged, and cached for 24 hours.
The forward/reverse geocoders share one MongoDB lease, at least 1.1 seconds
between provider calls, a 15-second lease, configured daily quota (default 500)
and rate-limit cooldowns. There is no search-as-you-type, prefetch or bulk lookup.
The endpoint is replaceable with `GEOCODING_SEARCH_URL` (HTTPS search endpoint);
otherwise the configured reverse URL's final `/reverse` becomes `/search`.
Existing `GEOCODING_ENABLED`, `GEOCODING_PROVIDER`, `GEOAPIFY_API_KEY` and contact
User-Agent settings apply. Provider keys remain on the server.

The public Nominatim policy requires explicit moderate user searches, identifying
User-Agent, attribution and an aggregate maximum of one request/second; it
prohibits autocomplete and bulk/systematic searches. See
https://operations.osmfoundation.org/policies/nominatim/ . These constraints are
implemented here; the public endpoint is best effort, without a service SLA.
Only public place names should be entered, never customer information.

Show on map only moves the view. Use boundary explicitly replaces the current
unsaved polygon after confirmation when the provider supplies a valid supported
Polygon. It does not manufacture boundaries from points or combine disconnected
MultiPolygons. Review the shape before saving. To serve several separate places,
add multiple zones to the branch. Missing or excessive/invalid boundaries stay
manual drawing tasks. A failed search never blocks drawing or saving a valid zone.

## Deployment and rollback

No new dependency, mandatory credential or data backfill. First activation also
bypasses unrelated legacy city/staff setup inside the same atomic branch-create
transaction; the subsequent zone gate must succeed or every write rolls back. Existing delivery
indexes must already be applied. Deploy API and web together after review. Do not
revert to the former city-activation requirements after branches have been enabled
through polygons; retain the unified activation/receiving guards in a forward fix.
No data, city mappings, orders, physical stock or old audit collections are deleted.

## Verification

- 272 unit tests, 158 HTTP/API tests and all 213 disposable-database integration
  tests passed. Added end-to-end domain checks for one-action activation with
  legacy routing off, city misspellings, missing/outside pins, branch pause,
  receiving privacy, notification recipients and last-login protection.
- Optional place search checks strict administrator access, UAE filtering,
  actual supported geometry, cached repeat queries and a shared forward/reverse
  quota. It never creates or changes delivery zones itself.
- Nine focused browser flows passed: branch/login creation and recovery, public
  directory compatibility, real polygon drawing/full-screen editing and place
  search, checkout with charged zone fee, Arabic customer location controls,
  overlap priority, branch inbox/notification scope, reassignment and visibility
  of older unassigned orders. Setup and map overflow checked at
  360/390/768/1280px; mobile/desktop screenshots inspected.
- Typecheck, lint, production compilation and Next.js dev MCP checks passed.
  Verification used synthetic loopback fixtures; production stock, orders,
  branches, accounts and configuration were not modified.

After the first full run, the final 13-case branch suite also passed the additional
first-activation case with an active legacy registry and unrelated operators.
The final two map/location browser cases passed again after the area-name field
was exposed. CI retains the existing streamlined workflow; no automatic browser
suite, additional job or dependency upgrade was introduced.
