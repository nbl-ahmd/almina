# Multi-branch delivery zones — 6 November 2026

## Scope and current state

Additive implementation over the existing pharmacy receiving and named-area routing workflow. Polygon mode defaults off. No production branches, boundaries, available-stock allocations, staff assignments or activation have been created by this change. The repository's maintained commerce API uses the native MongoDB driver; no second ORM or infrastructure was introduced.

Administrators manage branches/warehouses under **Branches**, including name, contacts, address, actual coordinates, descriptive operating hours and availability. Existing branch IDs and staff assignments remain in use. **Delivery Zones** draws, edits and removes GeoJSON polygons with Leaflet/Geoman, with a keyboard GeoJSON alternative. Each zone has branch priorities, fee in AED, minimum order, estimate and colour. Orders show the receiving branch and allow an authorized, audited transfer before dispatch.

## Deterministic selection

With polygon mode active, the server requires a numeric delivery point and uses MongoDB `$geoIntersects` against active polygons (longitude first). Typed city spelling does not select a branch or override polygon coverage; the older city serviceability rules apply only when polygon mode is off. The customer's full street/building/contact details still accompany the order.

For a branch covered by multiple zones, the lowest zone-priority number wins, with zone ID as a stable tie-break. Each branch is then checked against that zone's minimum and every line's available branch inventory. Eligible branches are ordered by **branch priority, straight-line distance, then branch ID**. There are no partial allocations across branches. Shared catalogue availability, publication, tax, discounts, store availability, payment and server pricing rules remain mandatory. The larger store/zone minimum applies. Zone fees replace the old emirate fee, including its free-delivery threshold. Cart previews suppress old free-delivery claims until a delivery pin can be reviewed.

No pin, outside coverage, unavailable stock or unmet minimum yields an explicit checkout error before an order is committed. Existing named-area/fallback routing and its address-review inbox continue for legacy orders; new polygon orders are visible through their stored branch assignment, even after zone changes or deactivation. Administrators retain the all-orders inbox. Push recipients use the same assigned branch.

## Stock and payments

`branch_inventory` is **available stock**, excluding reservations. Administrative allocation does not add catalogue stock. Sum of available branch allocations cannot exceed the current shared available stock. Allocation edits use expected revisions, audit reasons and idempotency keys. Shared administrative stock reductions reject conflicting allocations.

Checkout conditionally decrements shared and selected-branch stock in the same MongoDB transaction as the order/checkout receipt. Configuration writes and checkout use a shared transaction fence, including while polygon mode is off, so concurrent activation cannot admit an order using a stale no-pin snapshot. Initial fence creation is safe under concurrent transactions. The existing checkout key prevents repeat reservation. Cancellation, card-session expiry and eligible refund restoration restore both ledgers under the existing once-only restoration gate. Orders retain immutable quote/line snapshots plus a separate current `deliveryAssignment`.

Reassignment requires an administrator, expected old branch, reason, pre-dispatch status, current coverage and whole-cart available stock. It transfers the reserved quantities atomically and sends a staff alert without sending a second customer confirmation. It rejects a different delivery fee instead of silently changing a charge. Original monetary snapshots remain unchanged.

## Deployment and admin setup

1. Review and release API and web changes together; do not activate while either runs old code.
2. Run `npm run db:indexes:plan` offline. Apply `npm run db:indexes:apply` with the existing approved API database environment. The additive plan includes a delivery-zone `2dsphere` index, a unique branch/product allocation index and assigned-order lookup. It never drops collections or indexes. Activation verifies required indexes exist. Investigate existing duplicate allocation rows rather than deleting data if index creation fails.
3. Enter real locations under Branches. Do not use the initial RAK map centre as a branch position. Hours are descriptive; operators must toggle availability for closures.
4. In Users, assign every receiving staff account to its real branch; keep at least one active operator in every enabled branch, choose the legacy fallback, and activate branch routing. Keep inbox alerts enabled and explicitly opt into sound/push on the receiving device.
5. Count and allocate actual **available** inventory per branch. Include all saleable SKUs that each branch can fulfill. Never duplicate the same physical units across branches. Review shared stock and any ERP/import updates before activation.
6. Draw actual delivery polygons, assign branches/priorities, fees, minimums and realistic delivery estimates, then mark the zones active. Review overlaps intentionally. Save and reopen the boundaries before activation.
7. Activate zone delivery explicitly. Check real covered/outside addresses, mobile manual pin/GPS, no-pin errors, quote fees, whole-cart availability and receiving branch using an approved test process. Do not create a real charge merely to verify configuration.

No new mandatory environment variable is required. The existing geocoder defaults remain. Optional Geoapify reverse lookup uses server-only `GEOCODING_PROVIDER=geoapify` and `GEOAPIFY_API_KEY`; omit any old `GEOCODING_REVERSE_URL` override when switching providers. Existing `GEOCODING_ENABLED`, contact user agent, cache, daily budget and global request throttling remain. Do not use `NEXT_PUBLIC` for the key. `GEOCODING_ENABLED=false` preserves manual address/pin entry. OpenStreetMap tiles need the narrowly added image CSP host; attribution remains visible. Provider/tiles receive requests only when their controls are used.

## Compatibility and rollback

New customer coordinates, optional branch details, zone collections and order assignment fields are additive. Existing addresses without coordinates can still be loaded; customers add a pin when active zone mode requires it. Existing orders are not migrated or repriced. The public verified branch directory remains separately curated; internal warehouse/contact edits do not silently publish it.

Rollback starts by disabling zone delivery through the admin page, then retaining the compatible API until every existing zone reservation can be fulfilled/restored correctly. Merely reverting to pre-zone backend code while zone orders remain reserved is unsafe: it cannot restore the branch ledger. Do not delete branch inventory, order assignment history or zone audit records. While polygon mode is off, legacy orders update shared stock only; reconcile counted branch allocations again before reactivation. Disable a branch before decommissioning; deletion is blocked by assigned staff, active zone references, positive available inventory and open or still-refundable card reservations (including dispatched card orders). Disable a branch to retain these references while decommissioning.

## Limits and operations

- Intended for a few branches: bounded 20 branches, 100 zones, 200 vertices per ring and five holes, with validation against crossing/degenerate boundaries. Regions crossing the antimeridian and very large boundaries are deliberately unsupported.
- Distance is Haversine, not driving distance. Estimates are configured, not live traffic promises. Operating hours are not a scheduling engine.
- There is no automatic ERP branch inventory feed in this scope. External catalogue import/ERP stock writers must be reconciled with manual branch allocations. A global-stock check at checkout still prevents global overselling, but stale branch allocations can cause rejected orders or incorrect physical-branch availability. Keep a counted source of truth and reconcile before activation; automate that existing ERP integration separately when its branch mapping is known.
- Catalogue pages show storewide stock until checkout coverage review. Customers may encounter a coverage/whole-cart stock error after adding products. No branch stock is invented or auto-split from global stock.
- The public Nominatim fallback is globally throttled/cached and has an existing daily budget. Geoapify remains optional and subject to the account's configured allowance; no subscription was purchased.
- Browser permission denial, insecure contexts, tile/provider failure and low GPS accuracy retain manual address and numeric pin entry. Customers should adjust the pin and verify their building details. Location is user supplied and is not proof of physical presence.

## Verification

Local evidence: 264 unit and 151 API/security cases passed; the full disposable integration suite passed 188 cases, followed by passing expanded zone (11), geocoder (4), and saved-address/growth (10) checks. The existing browser regression run passed 52 of 53 cases; its one stale privacy-page heading assertion was corrected to the current policy heading and passed in the final four-case browser batch. That batch also passed the full admin-to-pinned-checkout flow, Arabic GPS/account/wholesale controls and pin-removal review invalidation. The additional Arabic evidence capture passed. Typecheck, lint, isolated production build, seven release checks, dependency audit (zero high/critical) and Next development compilation/runtime diagnostics passed. The independent UI review checks the original extension plus Arabic/removal corrections; see the scoped UI review record. No production index application, branch configuration or rollout is represented by these checks. Focused real replica-set tests cover polygon overlap/hole/outside matching, explicit activation, priority/nearest-stock selection, complete-cart stock, concurrent reservations, reassignment, staff visibility/alerts, immutable totals and once-only cash/card stock restoration. Browser tests use disposable data and simulated provider responses; they do not establish a production deployment or actual branch accuracy.
