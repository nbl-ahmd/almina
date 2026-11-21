# Pharmacy operations: accounts, delivery and receiving

## Audit and direction

The production API was already serving merged commit `82889bd`; this was not simply a missing deployment. The live setup contained one paused store (`prime`), no location, no zones and inactive routing. Its existence demonstrated that creation had succeeded, but account creation and delivery readiness were being conflated. No reproducible production creation exception was observed.

Concrete defects found:

- Branch directory/serviceability editors called paths omitted from the frontend gateway allowlist, producing 404s.
- Store identities inherited broad human-staff permissions because the session DTO omitted `accountType`.
- Public listings and operational branches had independent names and no stable relationship.
- Paused branches still participated in named-area routing, and an inactive fallback could be activated.
- One push subscription per account let a second receiving device replace the first.
- Background push was not configured in hosting; the frontend's disabled button could never enable it.
- Creation required a delivery detour, navigation scattered fulfilment settings across engagement/growth, readiness was not linked to the next task, and notification failures appeared with success styling.

The incumbent neutral admin design is retained. The operational separation follows the documented ideas of [Shopify locations](https://help.shopify.com/en/manual/inventory-and-locations/locations/setup), [restricted business settings](https://help.shopify.com/en/manual/your-account/users/roles/permissions/settings-permissions) and [device/location-aware staff notifications](https://help.shopify.com/en/manual/fulfillment/setup/notifications/staff-notifications). These are reference patterns, not copied assets or an assertion that Al Mina has Shopify's capabilities.

## Implemented flow

1. **Branches & delivery:** create a branch and its store credentials immediately. Adding a delivery area during creation is optional. The store account is transactionally tied to the branch ID.
2. Follow the persistent next task: login, actual location/coverage, counted availability, enabled receiving/fallback, then zone activation. The expandable checklist links to each editor. Positive allocation counts describe product availability, not guaranteed whole-cart fulfilment.
3. Manage shared fees and customer-facing store listings in the same workspace. New published listings select an existing branch; the API validates IDs, rejects duplicates and supplies canonical names. Linked retired locations are omitted from public reads. Old unlinked documents remain readable, but must be linked before republishing.
4. **Team & access:** store accounts are visible as linked, read-only records. Administrators and legacy staff are separate tables. Legacy staff's retained catalogue-viewing, marketing and image-review permissions are explicitly identified for review/deactivation.
5. Store accounts land in pending orders and see only Orders and Order alerts. Shared server/gateway authorization blocks marketing, image review, business settings and account administration. Public catalogue requests from a store account use published-only reads.
6. **Order alerts:** receiving counts and address-review links persist independently of transient arrivals. Optional sound alerts on arrivals and reminds every minute while orders await confirmation; the oldest waiting order is highlighted after five minutes. Browser autoplay requires a deliberate sound action.

Pausing a branch removes it from new named-area routing. Existing frozen polygon assignments remain available for fulfilment/history. Unmatched addresses always remain visible to administrators; the enabled fallback handles named-area exceptions. Activating routing without an enabled fallback is rejected.

## Identity and notification compatibility

`users.accountType: branch` is an additive marker; managed accounts retain the persisted `user` role for compatibility, while capabilities are enforced using verified server metadata. A malformed managed account cannot sign in. Existing person accounts are preserved; no custom role system or external identity infrastructure is introduced.

Recreating a removed store can reclaim its disabled, orphaned managed username. The old identity is tombstoned and audited, its sessions revoked, and a fresh account receives the new credentials. A person account, paused current store or active identity is never adopted or overwritten.

Push registration maintains up to five endpoint-deduplicated `users.pushSubscriptions`, with `subscription` retained as a compatibility pointer. Atomic per-document updates preserve concurrent registrations. Device-specific removal retains other devices. Durable per-device receipts retain leasing, retry bounds and unknown-outcome quarantine; the worker does not advance an account cursor until its devices are terminal. An expired primary subscription does not suppress another device.

`GET /api/orders/notification-settings` is authenticated and returns readiness, the deliberately public application-server key and hashes identifying only the current account's registered devices. It never returns a private key, endpoint or customer information. The frontend compares its device hash, distinguishes local registration from account registration, disables irrelevant actions and uses separate error/success feedback. Rotated application-server keys require a fresh browser subscription.

## Production changes actually performed

At the owner's explicit cleanup request, the paused `prime` configuration was removed using the existing protected, revision-checked routing API. The before snapshot is protected and ignored at `.verification-results/operations/production-branches-before.json`; the server's routing audit also retains the before state. The removal transaction disables the store account and revokes sessions. Readback showed revision 4, zero branches/logins, inactive delivery and **four pending orders still in the administrator inbox**. No order, customer, price, product stock or historical account record was deleted. The public directory was already empty.

New notification keys were generated once into ignored, mode-0600 `.env.notifications-production.local` and saved to the existing Render API service. `ADMIN_PUSH_ENABLED=false` remains explicit. The owner subsequently supplied `info@alminapharmacy.com`, which is now the configured `mailto:` provider contact. The existing Contact page was the initial valid fallback; HTTPS contact subjects are also supported by [RFC 8292](https://www.rfc-editor.org/info/rfc8292/) and the [web-push library](https://github.com/web-push-libs/web-push). Render deployed the initial configuration as `dep-dbnev6s9v7es73cjguu0` and accepted the supplied-contact update as `dep-dbnf78u7bikc73cd1tu0`; health readback remained ready at the existing master revision. This is configuration preparation, not notification activation or release of this candidate.

## Release and operator setup

No new service, paid provider or database migration is required. Preserve the prior delivery indexes, including GeoJSON `2dsphere`, unique branch/product allocation and managed branch-login uniqueness. This change adds no index. Existing documents lacking the new fields have compatible reads.

Deploy the verified persistent API before the frontend, because the frontend now checks notification/device state through its API. Render requires:

| Variable | Purpose |
| --- | --- |
| `ADMIN_PUSH_ENABLED` | Keep `false` until activation is intentional; set `true` after deployment/configuration checks. |
| `ADMIN_PUSH_PUBLIC_KEY` | Matching application-server public key; may be returned to an authenticated browser. |
| `ADMIN_PUSH_PRIVATE_KEY` | Render-only secret; never frontend configuration, Git or logs. |
| `ADMIN_PUSH_SUBJECT` | Monitored `mailto:` address or the real HTTPS Contact page. |

No matching Vercel key is required by the new notification UI. After activation, each real receiving device must sign in with the intended store account, enable browser push and allow notifications. Enable sound separately while keeping the inbox open. Headless verification does not establish real device delivery.

The owner/admin must configure real branch names, locations, boundaries, counted stock and receiving devices. None were invented. Browser sleep, permissions, connectivity and operating-system restrictions can delay alerts; the inbox remains authoritative. This does not implement SMS/phone escalation or guarantee staff acknowledgement.

Rollback code independently of data. Old workers see only the compatibility primary subscription, so secondary devices lose delivery until the newer worker returns. Historical records and additive arrays should remain. Do not restore removed branch configuration without reviewing its disabled account, stock, orders and fallback first; the cleanup snapshot is evidence, not an automatic rollback command.

## Verification

The final candidate passed 270 unit tests, 156 API tests and 204 disposable-database integration tests; typecheck, lint and the isolated production build passed. Fourteen admin/branch/routing browser cases passed across 360/390/768/1280 widths, followed by focused notification recaptures and a final four-case branch/routing run verifying that the location next action opens and focuses the map. The dev runtime also created a synthetic branch successfully with no browser errors, no compilation issues and no Next runtime/configuration errors. GitHub checks are reported on the pull request. All database tests use disposable loopback replicas, and no test orders or provider notifications were sent to production customers. The UI review covers the admin surface; it does not establish production delivery readiness.
