# Repository readiness review — 2026-10-14

Scope: current local checkout on `codex/fix-local-dev-catalog`, including existing uncommitted startup/catalog changes. No production host, database, credential or provider was accessed. Local Git includes integration merge `b5c05ff`; older held/unmerged statements in migration documents are historical, not current repository state. That merge does not prove deployment.

## Assessment

The source migration is substantially implemented. This is a Next storefront/admin with maintained TypeScript commerce domains, not just a foundation preview. Production readiness remains conditional on operator evidence and representative staging acceptance. Local success cannot prove hosted delivery, data compatibility at production scale, or safe cutover.

| Area | Implemented in the checkout | Remaining acceptance |
| --- | --- | --- |
| Frontend | Next 16.3.8, React 19.3, App Router, server catalog rendering, interactive cart/checkout/admin islands, Tailwind 4, shared UI tokens; old frontend directory removed | Actual Node SSR hosting, deployed artifact identity, representative mobile/media/accessibility and route acceptance |
| Routes/SEO | Storefront and admin route parity, legacy ID redirects, metadata, raw server HTML, robots, sitemap shards, structured data | Real URL inventory, correct production origins/indexing, CDN/media and crawler checks |
| API | Express 5.2.1; maintained TypeScript modules shared by versioned and compatibility routes; persistent full runtime remains `backend/server.js` | Actual ingress/proxy/CORS/cookie/streaming acceptance, capacity and worker supervision |
| Database | Native MongoDB driver 7.7; shared persistent pool, bounded queries, explicit additive migration/index scripts; Mongoose removed | Atlas topology, production document/index inventory, migration rehearsal, reconciliation, backup and restore evidence |
| Security | HTTP-only digest-backed sessions, current-role/city RBAC, CSRF/origin checks, protected routes, upload validation, webhook verification, redacted errors/logging | Rotate/revoke historically exposed credentials, review accounts/roles, verify deployed boundary and TLS/headers |
| Commerce | Server pricing/tax/fees in minor units, transactional stock/order/receipt/outbox/counter writes, retry idempotency, immutable snapshots, once-only eligible cancellation restock | Approved production policy/data, coordinated safe-writer activation, real business acceptance and stock/order reconciliation |
| Administration/integrations | Catalog/inventory/orders/staff/store/recovery/WhatsApp workflows; maintained email, Drive/media, push and outbox adapters | Controlled real delivery/upload/webhook tests, historical media references, sender/templates, retry and worker recovery |
| Quality/operations | CI verify gate, isolated browser fixtures, real disposable replica-set integration tests, release evidence CLI, optional consent reporting | Exact-candidate hosted CI, real alerts/dashboards/on-call/rollback rehearsal and observed production operation |

Installed versions are inventory facts, not a fresh assertion that they are the newest patched releases. Recheck framework/runtime advisories and compatibility before release.

## Remaining engineering and release work

1. Finish/review/commit the existing local startup/catalog changes; release checks must run on an exact committed candidate, not only this working tree.
2. Confirm the chosen frontend/API host, runtime commands, component SHAs, origins, proxy trust, secrets and health paths. Root `build` builds the compatibility API; it does not deploy the Next frontend. Static SPA hosting cannot provide the current server-rendered application.
3. Rotate exposed historical credentials and review staff privileges. Clean source and clean dependency audits do not revoke credentials already present in Git history.
4. Create representative sanitized staging data, inventory legacy IDs/fields/URLs/media, explain production query patterns, and rehearse additive migrations with backups and idempotent reruns. Prove transaction support and recoverability.
5. Verify controlled SMTP/WhatsApp/push/media delivery and failures through actual staging ingress. Local provider doubles do not establish inbox/device delivery.
6. Connect process metrics to durable central monitoring and alerts. Consent reporting is optional, bounded, process-local and partial; it is not complete session/error monitoring. Rehearse graceful draining, worker leases/retries and rollback.
7. Resolve catalog scale/cache decisions: storefront compatibility pagination still uses bounded offset queries; versioned routes have cursors. Categories/banners have tagged caching and an authorized purge route, but admin writers do not invoke it. Validate acceptable freshness; for multiple instances provide shared invalidation/cache behavior and realtime bus behavior as applicable. Measure representative media, cold/warm routes, API/Atlas latency and hosted Core Web Vitals.
8. Rehearse coordinated cutover with all old writers paused, additive data preserved, read-only routes first, then authorized commerce activation. Complete the twelve journeys, exact-SHA checks, at least 24 hours including a normal peak, and zero unexplained order/stock differences. Later legacy field/media contraction is a separate release.

The production procedure and release CLI already encode these gates. Historical audit counts and old incomplete-checkout/CRA statements must not be treated as current source findings. Current frontend checkout exists, but defaults to disabled until explicitly enabled and accepted.

## Local testing

Local frontend, full API and real MongoDB testing are supported. Integration/browser harnesses create disposable loopback replica sets and synthetic users/products; they do not load the application URI. MongoDB must be a replica set for checkout transactions; a standalone process is insufficient.

For installation use Node 24.21/npm 11.19 and run `npm ci`, `npm ci --prefix backend`, then `npx --no-install playwright install chromium`. MongoDB test binary 8.0.17 downloads on first use unless `TEST_MONGOD_PATH` supplies one.

For automated verification, follow [the complete local command sequence](LOCAL_VERIFICATION_2026-10-05.md). `npm run test:integration` starts a real disposable database. The isolated production build and `AL_MINA_ISOLATED_BUILD=1 npm run test:e2e:smoke` test compiled Next customer/admin workflows; the browser harness owns ports 4709–4740 and refuses occupied listeners.

For interactive testing, build commerce, then start the fixture:

```sh
npm run build:commerce
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" node --import tsx scripts/tooling/e2e-commerce-fixture.mts
```

In a second root terminal:

```sh
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" APP_ENV=development WEB_ORIGIN=http://127.0.0.1:4760 API_ORIGIN=http://127.0.0.1:4730 LEGACY_API_ORIGIN=http://127.0.0.1:4730 CHECKOUT_ENABLED=true NEXT_TELEMETRY_DISABLED=1 AL_MINA_ISOLATED_DEV=1 npm run dev -- --port 4760
```

Open `http://127.0.0.1:4760` and `/admin/login`. Fixture login: `synthetic-admin` / `synthetic-test-password`; staff login uses `synthetic-staff` with the same synthetic password. These are public synthetic test credentials only. The fixture starts an open store with limited stock and seeded products; state is disposable and provider responses are synthetic. Never expose its reset endpoints publicly.

For persistent manual testing, provision a dedicated local replica-set database or separate development Atlas database, configure its explicit database name in ignored `backend/.env.local`, initialize local policy/indexes/admin/catalog using the reviewed procedures, and run `npm run dev`. Expected defaults are Next on 3000 and full API on 4000. `npm run dev:api` runs only the full API; `npm run dev:web` only Next. `npm run dev:api:foundation` serves the versioned-only foundation and is insufficient for current storefront compatibility reads. Empty-database recovery creates a closed store and requires deliberate reviewed catalog/stock setup.

The current launcher can fall back to `backend/.env`, preserves the selected URI exactly and starts full workers. A production URI means local checkout/admin/worker effects on production. Use a dedicated test database and test-only provider configuration for complete manual testing. Local HTTP settings do not isolate data.

## Fresh verification

Lint, full typecheck and database-disabled isolated production build passed. Direct `node --import tsx --test tests/*.test.ts` passed 230 tests, with 34 database-gated cases skipped in that run; the dedicated real replica-set suite separately passed all 52 tests with no skips. Both lockfile audits returned zero high/critical advisories. All 58 compiled Chromium browser cases passed in 2.1 minutes, covering storefront/admin/checkout/recovery/telemetry/WhatsApp behavior, with responsive cases at 360/390/768/1280 px. Browser traces/reports are under ignored `.verification-results/`.

No production readiness attestation, deployment or destructive migration was performed. Existing working-tree edits were preserved.
