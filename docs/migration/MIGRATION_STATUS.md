# Migration status

Last updated: 2026-10-02.

## Current state

Repository audit complete for audit baseline `3d27241`. An additive modernization foundation is implemented on `modernization/foundation`: Next.js 16.3.8/React 19.3/Node 24 LTS, npm workspaces, TypeScript/ESLint, shared validation/client contracts, isolated environment configuration, persistent API health/error/logging conventions and a lazy database boundary. The legacy frontend/backend and their lockfiles remain intact. No production data, deployed services or credentials were changed; no route cutover occurred. See [foundation decisions, dependencies/conflicts and verification](FOUNDATION_2026-10-02.md). Audit deliverables A–O and rollout/rollback gates remain recorded in [the production audit](PRODUCTION_AUDIT_2026-10-02.md).

## Blocking findings

- P0: committed credential material, unauthenticated privileged operations and staff provisioning, public password hashes and customer/message PII, unprotected realtime broadcasts, client-authoritative totals and unsafe stock/order creation.
- P1: unrestricted messaging/uploads/query predicates/regex, unsigned/replayed webhook processing, insecure SMTP certificate handling, session weaknesses and reachable dependency vulnerabilities.
- Integrity prerequisites: define approved VAT/delivery/cancellation policies, transactions/idempotency/numbering, immutable new order snapshots, legacy schema/media compatibility and safe reconciliation.

No finding is recorded as remediated. Credential validity and prior revocations are unknown; required rotation/revocation is documented in audit section F and has not been performed.

Foundation follow-up conflicts: retained legacy PM2 tree has 23 advisory entries including two critical; compatible ESLint 9 stack is deprecated pending plugin ESLint 10 support. Root build/start remain legacy deployment contracts, while root installation now requires Node 24/npm 11. These do not authorize a deployment or replace the blocking remediation work.

## Verification performed

- Static review of eight mounted API routers/49 handlers, nine models, 44 active frontend route definitions/consumers, commerce/auth/media/integrations and deployment/test configuration.
- Tracked credential-file presence and a redacted pattern scan of 616 reachable historical text blobs across 179 commits; no credential values recorded in artifacts. Six distinct hardcoded bearer literals were found in WhatsApp helper history; revocation status is unknown.
- Read-only lockfile advisory audits: root 38, backend 52, frontend 102 vulnerable package entries, including tooling/transitive trees; not unique exploit counts.
- Audit-time official Next.js documentation/security review identified 16.3.8 without installing it. Foundation implementation rechecked registry/security sources and installed that patched stable 16.x release with matching bundled documentation.

Foundation verification completed locally: install and clean `npm ci`, full typecheck, lint, 30 unit/integration tests, web Turbopack production build, API bundle and compiled production smoke. Next DevTools MCP configured and connected; runtime compilation/error diagnostics clear. Browser navigation/reload, server rendering, console/network, React server boundaries, 375/1280 px layouts verified. The preview remains noindex and database-disabled; smoke verifies upstream failure, health, real 404s and absent production MCP.

Not performed: database/provider/deployment access, production probing/index verification, real customer/staff/commerce workflows, legacy Node 24 runtime validation, hosted CI execution, or production-route performance measurement. A post-change CRA bundle measurement is recorded in the dependency report; no pre-change artifact was available for comparison. These remain rollout gates.

## Dependency modernization assessment

Completed a controlled dependency inventory and cleanup on 2026-10-02. Removed confirmed-unused CRA/backend packages, replaced Express `body-parser` middleware with Express built-ins, consolidated UUID usage, and regenerated both legacy lockfiles. Kept active production dependencies until their routes/workflows migrate. Root and legacy audit findings remain; the full decision table, direct inventory, test/build results, and package-specific decisions are in [the dependency modernization report](DEPENDENCY_MODERNIZATION_2026-10-02.md). CRA builds with warnings at 507.6 kB gzipped main JS. Its Jest run is blocked by the existing Swiper ESM import, and the backend test script is a placeholder; upload/parser major upgrades remain separately unverified.

## Next ordered work

1. Confirm actual production deployment, owners, credential status, backups/recovery and read-only data/media/URL inventory.
2. Remediate legacy API security with compatible legacy client authentication and regression coverage.
3. Repair commerce integrity in the shared API before moving checkout.
4. Use the independently verified foundation to migrate low-risk storefront routes incrementally after security/integrity gates; confirm deployment commands and isolate sanitized staging first.
5. Migrate cart/checkout/admin/integrations through verified compatibility adapters; cut over progressively with safe rollback.
6. Remove legacy structures only after usage/retention and recovery verification.

Future implementation must update this file with completed gates and evidence, not merely planned changes.

## Storefront preview route migration

Implemented the requested storefront route structure in the isolated Next.js preview on `codex/storefront-routes`. Public catalog pages now fetch/render on the server through a guarded read-only legacy adapter; client islands handle only gallery/cart interactions and browser storage. Existing product IDs and category MongoDB IDs remain the route identity, with readable slug prefixes. Legacy product/category links are supported and query parameters retained. Permanent redirects are gated by `STOREFRONT_REDIRECTS_VERIFIED` (false by default), pending real staging/production target and URL inventory verification. Typography/palette/card language use the existing PT Sans and pharmacy assets; no production redesign/cutover occurred.

Cart imports legacy IDs/quantities, ignores stored prices and rechecks current catalog/store status through server actions. The checkout URL provides saved-cart review, with ordering disabled: live checkout migration is **incomplete** until the audited pricing, policy, atomic inventory and idempotency prerequisites are remediated. No order, inventory, customer, integration or database writes were introduced. Unmigrated legacy routes remain owned by the legacy deployment.

Local verification: full typecheck/lint, 34 unit/integration tests, Turbopack production build, compiled storefront smoke and foundation smoke passed; running Next.js 16.3.8 Turbopack route/compilation/error diagnostics clear after intentional outage recovery. Browser direct navigation and refresh passed for all nine expected routes, dynamic details/categories, old shared URLs and 404s. Verified legacy cart import with forged prices, persistence, quantity/stock limits, removal, store closure, 375/1280 px layouts/mobile links and error-boundary retry. React inspection confirms server pages/navigation with small interactive islands. Verification used only a synthetic loopback API; production visual/data parity and real checkout remain unverified. See [route contracts, gates, limitations and reproducible verification](STOREFRONT_ROUTES_2026-10-02.md).
