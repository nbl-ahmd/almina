# Migration status

Last updated: 2026-10-02.

## Current state

Repository audit complete for local HEAD `3d27241`; modernization implementation has not started. Application code, production data, deployed services, credentials and Git history were not changed. Audit deliverables A–O, severity findings, compatibility requirements, rollout/rollback gates and testing strategy are recorded in [the production audit](PRODUCTION_AUDIT_2026-10-02.md).

## Blocking findings

- P0: committed credential material, unauthenticated privileged operations and staff provisioning, public password hashes and customer/message PII, unprotected realtime broadcasts, client-authoritative totals and unsafe stock/order creation.
- P1: unrestricted messaging/uploads/query predicates/regex, unsigned/replayed webhook processing, insecure SMTP certificate handling, session weaknesses and reachable dependency vulnerabilities.
- Integrity prerequisites: define approved VAT/delivery/cancellation policies, transactions/idempotency/numbering, immutable new order snapshots, legacy schema/media compatibility and safe reconciliation.

No finding is recorded as remediated. Credential validity and prior revocations are unknown; required rotation/revocation is documented in audit section F and has not been performed.

## Verification performed

- Static review of eight mounted API routers/49 handlers, nine models, 44 active frontend route definitions/consumers, commerce/auth/media/integrations and deployment/test configuration.
- Tracked credential-file presence and a redacted pattern scan of 616 reachable historical text blobs across 179 commits; no credential values recorded in artifacts. Six distinct hardcoded bearer literals were found in WhatsApp helper history; revocation status is unknown.
- Read-only lockfile advisory audits: root 38, backend 52, frontend 102 vulnerable package entries, including tooling/transitive trees; not unique exploit counts.
- Official Next.js documentation/security notice reviewed: 16.3.8 identified as patched stable 16.x on audit date; no Next dependency installed. Recheck at implementation time.

Not performed: database/provider/deployment access, production probing, installs, builds, unit/integration tests, browser rendering, production index verification or bundle measurements. These are future validation gates, not successful checks.

## Next ordered work

1. Confirm actual production deployment, owners, credential status, backups/recovery and read-only data/media/URL inventory.
2. Remediate legacy API security with compatible legacy client authentication and regression coverage.
3. Repair commerce integrity in the shared API before moving checkout.
4. Introduce a separate Next.js/TypeScript foundation and migrate storefront routes incrementally.
5. Migrate cart/checkout/admin/integrations through verified compatibility adapters; cut over progressively with safe rollback.
6. Remove legacy structures only after usage/retention and recovery verification.

Future implementation must update this file with completed gates and evidence, not merely planned changes.
