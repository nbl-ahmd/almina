# Production verification and rollout gate

Reviewed and expanded on 2026-10-03, branch `codex/production-verification-review`. No production database, migration, provider delivery or deployment was exercised.

## Review findings and changes

| Finding in the original proposal | Change |
| --- | --- |
| API tests lacked clean backend dependencies and generated commerce adapter ordering | CI installs the backend lockfile; API/security scripts build the adapter before testing. A clean root/backend installation was verified. |
| HTTP smoke was described as E2E | Added pinned Playwright Chromium tests against compiled Next and CRA applications, with real cookie sessions and transactional orders in an isolated replica set. HTTP smoke remains a separate check. |
| Transaction and concurrency suites could skip in CI | CI starts a disposable MongoDB replica set and requires database tests to run. Missing database configuration fails the required suites. |
| Legacy changes could miss workflow path filters | The existing foundation workflow now runs for every push and pull request. Its final check remains `verify`. |
| Audit omitted legacy lockfiles or tolerated high findings | Audit all three lockfiles at the high threshold; audit failures and service errors fail the gate. No exclusions or advisory exceptions were added. |
| Documentation incorrectly said the Next admin did not exist | Exercise the implemented admin login, session, role restrictions and order update through Chromium. Next customer checkout remains disabled; checkout verification covers its current legacy owner. |
| Uploaded MIME labels were trusted | Decode image metadata before effects and require an allowed format matching the declared MIME, with size and pixel limits. Regression tests cover real upload middleware and mutation routes. |
| WhatsApp verification challenge could be reflected as HTML | Strictly validate scalar handshake parameters and bounds, require the configured verification token, and return the opaque challenge as plain text. Signed POST forgery/replay checks remain covered. |

## Coverage

| Requested area | Automated evidence |
| --- | --- |
| Pricing, discounts, VAT, delivery, product validation | `commerce.test.ts`, `commerce-policy.test.ts`, `storefront.test.ts`: integer minor units, inclusive VAT rounding, minimum-order boundary, fee aliases, malformed products and untrusted amounts/quantities. |
| State transitions and inventory rules | `commerce-integration.test.ts`: all 36 state pairs, immutable snapshots, transaction rollback, stock races, idempotency, once-only cancellation/restocking and migration reruns. |
| Auth, RBAC, public catalog, admin APIs | `auth-security.test.ts`, `admin-migration.test.ts`, `api.test.ts`, `api-modernization.test.ts`: real loopback HTTP with synthetic repositories for boundary tests; real MongoDB catalog and commerce suites verify persistence. |
| Product mutations, order creation/cancellation | `catalog-integration.test.ts`, `commerce-integration.test.ts`: actual legacy mutation handlers and both commerce HTTP stacks against a disposable replica set. Media/provider effects are excluded. |
| WhatsApp webhook validation | `auth-security.test.ts`: handshake token/shape validation, signed POST validation, forgery and replay rejection. |
| Home, search, category, product details, add to cart | `tests/e2e/storefront.spec.ts`: compiled Next pages, direct navigation/reload, cart persistence/stock limits, 360/390/768/1280 px layouts and disabled Next checkout boundary. Read-only catalog responses are deterministic fixtures. |
| Checkout, successful order, invalid checkout, stock exhaustion | `tests/e2e/commerce.spec.ts`: compiled CRA client and actual legacy writer, database assertions, mobile/desktop success, invalid form, stock lost after quote, uncertain-response reload and same-key replay. |
| Admin login and order update | `tests/e2e/admin.spec.ts`: compiled Next admin, actual cookie auth and MongoDB-backed order API; login failure/success, refresh/logout, staff denial, dispatch, invalid cancellation and cross-city order denial. |
| Anonymous admin, role escalation, order IDOR, price/quantity tampering, Mongo query abuse, upload abuse, webhook forgery, duplicate orders | Auth/security, catalog, commerce and upload regressions; browser retry confirms a single persisted order and stock deduction. |
| Catalog, search, details, checkout performance and concurrent purchase | `performance-api.test.ts`: actual Express API, 500 synthetic MongoDB products, warmups, repeated requests and a 20-buyer/5-stock race. JSON measurements are uploaded in CI. |

Security API doubles isolate authorization and parser behavior; they are supplemented by real database and browser tests, rather than used as evidence of production data/provider parity. Database tests use generated database names on a newly started loopback replica set. The harness never accepts an application MongoDB URI or loads a dotenv file. Destructive fixture cleanup applies only to those generated test databases.

### Performance budgets

After three excluded warmups, listing/search/details each use 30 requests at concurrency 3 with p95 below 1,500 ms. Checkout uses 15 measured requests at concurrency 1 with p95 below 3,000 ms. The stock race requires exactly five successes, fifteen conflicts, stock zero and five orders, with p95 below 5,000 ms. Compiled storefront smoke also measures a coarse five-sample SSR p95 below five seconds. These are synthetic regression budgets, not production SLOs; production-sized indexes, query plans, latency, provider behavior and distributed ingress still require staging acceptance.

## Reproduce locally

Use the pinned Node/npm versions from `.nvmrc` and `package.json`.

```sh
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npx --no-install playwright install --with-deps chromium
npm run lint
npm run typecheck
npm run test:unit
npm run test:api
npm run test:security
npm run test:integration
npm run test:performance
npm run build:commerce
CI=false npm --prefix frontend run build
APP_ENV=development WEB_ORIGIN=http://127.0.0.1:3000 DATABASE_MODE=disabled AL_MINA_ISOLATED_BUILD=1 npm run build:foundation
AL_MINA_ISOLATED_BUILD=1 npm run smoke:foundation
AL_MINA_ISOLATED_BUILD=1 npm run smoke:storefront
npm run test:e2e:smoke
npm run audit:security
```

`test:integration` includes performance tests; the standalone performance command is useful during focused investigation. The harness downloads MongoDB **8.0.17** on demand through `mongodb-memory-server-core`, or uses an explicitly supplied local binary (`npm run test:integration -- /path/to/mongod`). Download/start occurs only in the test command, never during installation/build. Plain `npm test` may skip database suites; use `test:integration` for mandatory real database evidence.

Playwright **1.63.0** owns its matching Chromium version. Browser fixture servers bind loopback only, get explicit synthetic configuration and never inherit backend `.env` or production credentials. External requests are isolated; the legacy Bootstrap CSS is vendored with its original license and exact SRI digest so layout tests remain faithful without CDN access. Failure traces, screenshots, JUnit, fixture logs and performance/audit JSON are under ignored `.verification-results/`. npm lifecycle approvals are scoped to the pinned existing build dependencies in root/backend manifests.

## CI and production gate

`.github/workflows/foundation.yml` retains the workflow **Modernization foundation** and required final check **verify**. Four independent jobs cover:

- Quality: clean install, lint, typecheck and unit tests.
- API: clean root/backend installs, API/security boundaries, mandatory replica-set catalog/commerce/lifecycle tests and performance budgets.
- Browser: all three installs, pinned Chromium, commerce adapter, CRA fixture build, foundation production build, compiled-process smoke and Chromium E2E.
- Audit: root, backend and frontend lockfiles; every high/critical finding blocks promotion. Reports are retained even on failure.

`verify` runs even after prerequisite failures and succeeds only when all four jobs report success; skipped or cancelled jobs cannot produce a successful gate. Workflow tests have no production credentials. CRA fixture compilation uses `CI=false` because the retained CRA application has existing build warnings; those warnings are logged, while lint and all other checks remain required.

On 2026-10-03, GitHub branch protection was applied and read back for `master`: require up-to-date **verify** from the GitHub Actions app, enforce for administrators, disallow force pushes and branch deletion. No code was pushed. The expanded workflow takes effect when this branch is merged. This protects branch updates; provider-side direct/manual deployments also need the hosting gate below.

### Current release blockers

Local review verification passed 43 unit tests, 95 API tests, 59 focused security tests (overlapping API coverage), 20 real database/load tests with no skips, and 12 Chromium E2E tests. Clean installation, lint, typecheck, foundation production build and compiled smoke passed. CRA compilation retains documented warnings. These local results are not a hosted CI run.

The strict audit currently **fails**: root 19 high / 2 critical, backend 13 high / 0 critical, frontend 64 high / 1 critical dependency findings. Root critical findings include `systeminformation` and `vm2`; the frontend includes `swiper`. Counts are the npm report's dependency entries, not unique advisory counts. Resolve and re-run before promotion; do not force-upgrade legacy dependencies without compatibility review or weaken the threshold. Full reports are generated by `audit:security`.

### Preview/staging hosting: pending configuration

GitHub exposes a legacy Vercel preview integration, but it does not establish deployment targets/account access for `apps/web` or the persistent `apps/api` service. No new hosted preview/staging deployment has been created. The provider/project choice was requested from the owner. Do not repoint the legacy deployment based on guessed configuration.

Once targets are identified:

1. Configure pull-request previews and a persistent staging environment using the workspace commands/configuration in [Foundation](FOUNDATION_2026-10-02.md). The API needs a persistent Node runtime.
2. Use separate hostnames, a sanitized staging database/name/user, least-privilege credentials and sandbox/stub notification/media providers. Use database-disabled previews when appropriate; never copy production `.env`, data or credentials. Retain `noindex, nofollow`.
3. Make the production deployment job require successful `verify` for the exact source commit. Restrict hosting manual deployments and production environment access so they cannot bypass that gate. Promote an immutable artifact/commit rather than rebuilding different source.
4. Run hosted smoke and staged auth/RBAC, catalog parity, checkout/retry/cancellation, upload/webhook, admin, provider recovery and backup restoration checks. Verify migration-specific plans before any reviewed apply operation.
5. Keep the prior application artifact/route configuration available and rehearse traffic rollback before production promotion. No production cutover is authorized by test configuration alone.

## Rollback runbook

1. Stop promotion. Record the failing commit, deployment ID and observation time. Use the configured host's rollback/traffic alias to the last known-good immutable application artifact; keep the previous deployment available throughout the observation window.
2. If a changed commerce writer or schema is active, pause checkout/status writes first. Keep the shared safe transaction writer active or leave checkout paused. Never restore the old independent unsafe stock/order writer.
3. Preserve additive fields, immutable order snapshots, retry receipts, counters and notification outbox records. Do not restore a stale database snapshot over newer orders, lower the order counter or reverse a migration without its reviewed data-safe rollback. Prefer a forward fix when reversal could lose committed orders.
4. Verify health, customer routes, login/session and RBAC. Reconcile order count/high-water mark, stock and cancellation effects, receipt replay and pending notification jobs before resuming writes/traffic. Check logs without exposing customer data or secrets.
5. Record the traffic switch, affected build, reconciliation results and forward fix in the incident/migration record. Require full CI and staging acceptance again before re-promotion.

For transactional migration constraints use [Commerce integrity](COMMERCE_INTEGRITY_2026-10-03.md). This review ran no production migration; application rollback does not require removing the additive commerce schema. Hosting-specific console/CLI rollback commands must be recorded once the actual deployment targets are confirmed.
