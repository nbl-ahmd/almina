# Migration status

Last updated: 2026-10-03.

## Current state

Repository audit complete for audit baseline `3d27241`. An additive modernization foundation is implemented on `modernization/foundation`: Next.js 16.3.8/React 19.3/Node 24 LTS, npm workspaces, TypeScript/ESLint, shared validation/client contracts, isolated environment configuration, persistent API health/error/logging conventions and a lazy database boundary. The legacy frontend/backend and their lockfiles remain intact. No production data, deployed services or credentials were changed; no route cutover occurred. See [foundation decisions, dependencies/conflicts and verification](FOUNDATION_2026-10-02.md). Audit deliverables A–O and rollout/rollback gates remain recorded in [the production audit](PRODUCTION_AUDIT_2026-10-02.md).

## Blocking findings

- P0: committed credential material, unauthenticated privileged operations and staff provisioning, public password hashes and customer/message PII, unprotected realtime broadcasts, client-authoritative totals and unsafe stock/order creation.
- P1: unrestricted messaging/uploads/query predicates/regex, unsigned/replayed webhook processing, insecure SMTP certificate handling, session weaknesses and reachable dependency vulnerabilities.
- Integrity prerequisites: define approved VAT/delivery/cancellation policies, transactions/idempotency/numbering, immutable new order snapshots, legacy schema/media compatibility and safe reconciliation.

The audit baseline remains historical; authentication/authorization findings are remediated in local source by the hardening work below, pending production rollout. Critical checkout findings are remediated in local source by the commerce work below, pending staged verification and production rollout. Credential validity and prior revocations are unknown; required rotation/revocation is documented in audit section F and has not been performed.

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
2. Roll out the locally verified auth boundary with rotated credentials, reviewed accounts, same-origin routing and static-host headers; verify sanitized staging first.
3. Repair commerce integrity in the shared API before moving checkout.
4. Use the independently verified foundation to migrate low-risk storefront routes incrementally after security/integrity gates; confirm deployment commands and isolate sanitized staging first.
5. Migrate cart/checkout/admin/integrations through verified compatibility adapters; cut over progressively with safe rollback.
6. Remove legacy structures only after usage/retention and recovery verification.

Future implementation must update this file with completed gates and evidence, not merely planned changes.

## Modular API service migration

Implemented an additive modular Express 5.2.1/TypeScript service on `codex/modular-api`: public catalog, staff login/session/logout, server-enforced admin/city-scoped order reads, explicit DTOs/projections, strict request schemas/body limits, indexed text-search predicates, scoped cursor pagination, secure headers, exact-origin CORS, rate limits, request deadlines, redacted structured logs/request IDs and graceful draining/database lifecycle. Indexes have an explicit additive/idempotent plan/apply script; no index was applied and no database was contacted. See [route/auth, schema/index inventories, performance queries and compatibility changes](MODULAR_API_2026-10-02.md).

This does not remediate the retained legacy backend or constitute a production cutover. Legacy callers/deployment/media/provider integrations and all commerce/admin mutation workflows remain legacy-owned. Checkout integrity, account inventory/credential rotation, legacy authentication rollout, database/index explain checks and distributed ingress quotas remain required gates. New staff sessions intentionally reject the legacy compromised JWT contract and enforce current server-side city assignments; unassigned staff have no order access.

Local verification: full typecheck/lint, 52 automated tests with synthetic query doubles/loopback HTTP, API bundle, full foundation production build, compiled-process/foundation smoke and connection-free index plan. No production/customer data, provider integrations or database index plans were exercised against a live database. Planner/load behavior remains unverified.

## Storefront preview route migration

Implemented the requested storefront route structure in the isolated Next.js preview on `codex/storefront-routes`. Public catalog pages now fetch/render on the server through a guarded read-only legacy adapter; client islands handle only gallery/cart interactions and browser storage. Existing product IDs and category MongoDB IDs remain the route identity, with readable slug prefixes. Legacy product/category links are supported and query parameters retained. Permanent redirects are gated by `STOREFRONT_REDIRECTS_VERIFIED` (false by default), pending real staging/production target and URL inventory verification. Typography/palette/card language use the existing PT Sans and pharmacy assets; no production redesign/cutover occurred.

Cart imports legacy IDs/quantities, ignores stored prices and rechecks current catalog/store status through server actions. The checkout URL provides saved-cart review, with ordering disabled: live checkout migration is **incomplete** until the audited pricing, policy, atomic inventory and idempotency prerequisites are remediated. No order, inventory, customer, integration or database writes were introduced. Unmigrated legacy routes remain owned by the legacy deployment.

Local verification: full typecheck/lint, 34 unit/integration tests, Turbopack production build, compiled storefront smoke and foundation smoke passed; running Next.js 16.3.8 Turbopack route/compilation/error diagnostics clear after intentional outage recovery. Browser direct navigation and refresh passed for all nine expected routes, dynamic details/categories, old shared URLs and 404s. Verified legacy cart import with forged prices, persistence, quantity/stock limits, removal, store closure, 375/1280 px layouts/mobile links and error-boundary retry. React inspection confirms server pages/navigation with small interactive islands. Verification used only a synthetic loopback API; production visual/data parity and real checkout remain unverified. See [route contracts, gates, limitations and reproducible verification](STOREFRONT_ROUTES_2026-10-02.md).


## Authentication and authorization hardening

Implemented on `codex/auth-hardening`, 2026-10-02, across both legacy and versioned APIs. Replaced JWT/localStorage auth with shared digest-backed, expiring HTTP-only cookies; enforced current-role/city RBAC and default-deny authorization before legacy handlers/uploads; made staff provisioning admin-only; protected user/catalog/category/banner/store/batch/order/WhatsApp/push operations; added server invalidation, distributed login quotas, exact Origin/custom-header CSRF checks, signed/replay-checked webhooks, realtime reauthorization and stricter security headers/CSP. The legacy client now verifies server sessions and uses cookies, with confirmed browser login/refresh/logout. Public published media contracts are preserved. Source credentials were removed; rotation is still required. No production data/deployment/provider/credential action occurred.

See the [53-handler route authorization matrix](AUTHORIZATION_MATRIX_2026-10-02.md) and [hardening decisions, tests, compatibility and rollout gates](AUTH_HARDENING_2026-10-02.md). Local verification includes 107 passing automated tests with security regressions, typecheck/lint, foundation and CRA builds, compiled API/storefront smoke, Next MCP and browser workflows, and connection-free index planning. Static-host headers are supplied but require operator application to the actual deployment. Compromised legacy JWT/bearer sessions are deliberately rejected, requiring staff re-login and account inventory review.

Guest checkout pricing/inventory/atomicity/idempotency findings are addressed by the shared commerce service below, pending production rollout. Dependency advisories, provider recovery/durable jobs, real index/load checks and production integration/template/media parity remain gates. This work must not be described as a fully secure production commerce cutover.


## Commerce integrity

Implemented locally on `codex/commerce-integrity`, 2026-10-03. Both checkout APIs now share a strict TypeScript transaction service: current DB products and approved server policy determine prices, discounts, inclusive VAT, delivery, AED 10 minimum, availability, stock and final totals. Atomic conditional decrements, order persistence, counter numbering, durable retry receipts and notification jobs commit together. New orders save immutable commercial line snapshots and explicit lifecycle history; pre-dispatch cancellation restores new-order stock exactly once. Legacy routes/screens retain adapters and historical totals; unsafe commercial edits are rejected. Browser checkout sends intent only and preserves retry keys through uncertain results.

The owner approved inclusive VAT, current emirate fees and once-only pre-dispatch restocking. The connection-free plan and gated, idempotent additive migration preserve legacy fields, flag contradictory historical states and mark unavailable snapshot provenance; they never guess historical product prices or stock effects. Real local replica-set regressions cover concurrency, rollback, tampering, duplicate submission, lifecycle races, RBAC, migration reruns and both driver/HTTP stacks. See [implementation, verification, rollout and rollback](COMMERCE_INTEGRITY_2026-10-03.md). No production migration or deployment occurred. Staged business-flow acceptance, production backups/index/data inventory and a coordinated writer maintenance window remain prerequisites to activation. Next storefront checkout remains gated pending its separate migration.
