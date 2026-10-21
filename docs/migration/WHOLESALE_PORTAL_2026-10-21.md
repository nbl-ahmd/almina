# Private wholesale portal — 21 October 2026

## Decision and scope

Branch: `codex/wholesale-portal`. One application, one API and one inventory pool; a separate private `/wholesale` customer experience and `/admin/wholesale` management page. No extra domain or duplicate catalogue is required. A trade subdomain can be added later with deliberate cookie/origin configuration, without building a second commerce system.

Owner-confirmed rules: invitation only, pharmacy verification and approval, business profiles (for example Salon and Pharmacy), shared stock, payment on delivery, configurable minimum quantities/case multiples/maxima. Credit terms and separate warehouse stock are outside this release.

Retail navigation contains no wholesale signup or account-type switch. Signing in through Google/email establishes identity; it never grants business access. Reuses the existing provider configuration and verified sign-in flow. Missing provider setup fails closed.

## Pharmacy setup

1. Admin → Wholesale → Business profiles. Create Salon/Pharmacy/etc. Medicine access is off by default. Only enable it after the pharmacy verifies that business profile's eligibility. Publication/review restrictions still apply.
2. Product trade prices. Select a product by name, enable wholesale, opt it into the relevant profiles, and enter an explicit AED **unit** price, minimum quantity, case multiple and maximum. The minimum must be a case multiple. Prices use the same inclusive/exclusive VAT basis as the existing checkout policy; the server applies VAT and delivery rules. No automatic retail-to-trade discount or fallback price exists.
3. Businesses & invitations. Enter the approved email, business name, profile and verification reference. Choose individual products/categories, or explicitly allow all products already priced for the profile. Empty assignments grant nothing. Review and approve the business.
4. Create the private invitation link and send it to that business through the pharmacy's normal channel. Invite delivery is manual; no email provider is silently configured or used. Links expire after seven days. Reissuing invalidates the earlier link.
5. Recipient verifies sign-in with that exact email and accepts the invitation. Links are single-use and cannot grant access to a different mailbox.
6. Business orders from its private catalogue, reviews server-calculated totals and places a payment-on-delivery order. Orders enter the existing fulfilment workflow and carry a Wholesale label/business snapshot for staff.

Stock is a count of sellable units, not ERP cartons or fractional quantities. Existing imported website stock was deliberately capped at 1–10. Staff must reconcile and enter actual available units before offering larger case orders. This implementation never changes stock or invents quantities/prices during setup. Maximum per-product quantity is 1,000, matching the current commerce contract.

## Access and commerce guarantees

- Admin configuration requires server-enforced admin identity; branch staff cannot configure it. Private requests require a valid current customer session and an approved, accepted, active matching business profile.
- Prices live in separate `wholesale_terms` documents and never enter public product DTOs/search/feeds. No private prices render on signed-out or ordinary customer accounts. Private pages/responses are no-store and noindex; these headers supplement authentication rather than replace it.
- Both explicit product/category assignment and an enabled profile price are required. Draft, unreviewed, archived, inactive and disabled catalogue records are excluded. Salon-style profiles exclude medicines; active eligible medicine profiles still cannot expose unreviewed products.
- Account suspension, profile deactivation, product visibility, price and quantity rules are checked again on the server during quote/checkout. Quote changes require review. Browser-supplied prices/totals and identity roles are rejected.
- Uses existing atomic order/stock transaction, order numbering, immutable monetary line snapshots, city routing, durable notifications, idempotency and cancellation/restock handling. Retail and wholesale consume the same product stock.
- Wholesale request fingerprints include channel and authenticated owner. They cannot collide with retail intent replays. Membership is checked before a private replay is returned.
- Retail vouchers/rewards do not apply to trade orders. Payment is due on delivery; no credit is offered.
- A pending checkout is saved per signed-in customer in session storage before submission. Uncertain failures retain the same key across reloads. Corrupt recovery state blocks another checkout and directs the customer to contact the pharmacy.
- No public wholesale enrollment, automatic email upgrade or client-editable account type exists.

## Data, deployment and rollback

Additive collections: `wholesale_types`, `wholesale_accounts`, `wholesale_terms`. Existing products, prices, identifiers, URLs and historical orders are preserved. Account IDs are SHA-256 of normalized email; invite tokens use 256-bit randomness and only their hash persists. Natural `_id` indexes enforce uniqueness. Configuration writes use revision checks and record actor/time. There is no full configuration history UI in this version.

Index plan adds `wholesale_type_catalogue` on enabled/profile/ID for private catalogue reads. Apply through the existing controlled index mechanism after review; this work did not apply production indexes. Never add a TTL index to the account's invitation expiry field: that would delete the entire business account. Expiry is checked during acceptance.

Deploy compatible API and web together. Leave all profiles/products unconfigured until pharmacy verification. There is no seed of approved businesses or prices. Rollback: suspend profiles/accounts and disable wholesale terms, then roll back web/API as a compatible pair. Retain additive collections and wholesale order snapshots. Never delete orders or restore stock as part of code rollback.

One verified email represents one business account initially. Multiple named buyers per company, per-company negotiated pricing, credit limits, warehouse allocation and automated invitation delivery are future extensions. Business order fulfilment uses the existing staff order screens; there is no separate trade invoicing/statement system in this slice. The existing retail account history can show that signed-in email's orders; a dedicated trade history/reorder interface is not added here.

## Verification

Tests use synthetic browser fixtures and a new loopback-only disposable MongoDB replica set, never the application database. Includes real HTTP customer/admin/staff boundaries, rotated/expired/email-bound invitations, assignment and medicine restrictions, quantity rules, trade-versus-retail pricing, quote changes, suspension, duplicate retries, immutable business snapshots, cancellation and competing retail/trade purchases.

Browser checks cover private sign-in, invitation acceptance, responsive catalogue/order review at 360/768/1280px, uncertain submissions across reloads, corrupt recovery blocking, admin business/invitation controls and existing retail authentication/checkout regressions. Browser mock tests verify UI behavior; real database/API tests verify commerce and authorization. Provider-owned Google authentication still requires configured OAuth and a real account outside synthetic tests.

No production account, database, inventory, credential, email or deployment was changed.

### Recorded results and remaining verification limits

- Root/workspace typecheck, API bundle build/freshness check and isolated web production build passed.
- 171 unit tests passed, including the three wholesale policy/contract tests.
- 39 focused disposable-database tests passed across wholesale, commerce, rewards, order reads and customer identity. A subsequent wholesale-only run also passed all seven tests after adding an ordinary retail-session denial and a runtime check that public product responses contain no private unit-price fields.
- Seven wholesale browser tests passed, including a real admin → invitation → verified customer → acceptance → reload gateway flow. Mobile/desktop ordering, uncertain retries, corrupt recovery and admin setup were checked. The separate retail authentication/checkout run passed its 32 existing cases.
- Scoped lint passed. Repository-wide lint remains blocked by 48 browser-global errors in pre-existing/unrelated `scripts/tooling/capture-*`, `check-*` and `verify-nav.mjs` visual scripts.
- The requested broader browser command was attempted against the complete working tree. Early failures included navigation/search expectations and Arabic placeholder text that differ from the current storefront. During the run, `.next-verification` was replaced (its manifest/chunk timestamps advanced after server startup and `BUILD_ID` disappeared). Later checkout pages lost their hydration/build assets. The run was stopped: 45 passed, 21 failed, one interrupted and 58 unrun. These are not a clean release result. Keep verification output immutable and resolve/rerun the navigation checks before merge/deployment. No assertion or production guard was weakened to make that run green.

The branch contains substantial pre-existing storefront/auth/localization work from before this wholesale task. This task did not discard, commit or publish that work. Review/stage the intended changes deliberately when preparing a PR.
