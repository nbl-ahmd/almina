# Production migration: release and recovery procedure

Status: **BLOCKED — preparation only; no deployment or production migration performed.**

The owner confirmed Render deploys the backend from GitHub `master`, at `https://almina-of4b.onrender.com`; the live storefront is `https://www.alminapharmacy.com/`. Changes remain on separate branches, unmerged. Read-only GitHub verification on 2026-10-03 confirmed repository `nbl-ahmd/almina` uses `master` and requires the up-to-date GitHub Actions `verify` check, including administrators. Render service IDs/settings readback, storefront hosting details, staging URL, current live deployment SHA, backup/restore records and credential-rotation records are still unknown. Do not merge to trigger production while these gates remain blocked.

Preparation started from local SHA `380ad03dcda23f1f53371c374ce13ccb0c0b2723`; remote `master` was `3d27241f0ec7254a965db1a942be2dae795e0fc1`. Neither proves the current production SHA. The release candidate must be the final reviewed commit containing all intended changes, not either of these incidental observations. No new deployed SHA exists as evidence in this task.

## Release evidence and hard stops

Create an access-controlled release record without secret values, customer data, tokens or signed URLs:

```sh
mkdir -p .verification-results
npm run --silent release:gate -- template > .verification-results/release.json
npm run release:gate -- preflight .verification-results/release.json
# After additive migration and deployment behind the traffic gate:
npm run release:gate -- cutover .verification-results/release.json
# Only after production acceptance and the observation window:
npm run release:gate -- complete .verification-results/release.json
```

The template intentionally fails. Enter full 40-character SHAs, UTC timestamps, named owners and durable restricted evidence references. Store the final record in the team's release/incident system; ignored local files are not durable evidence. `startedAt` is the start of this release's verification, before staging checks. `cutoverAt` is the actual production traffic switch. Each passed check must reference the candidate SHA and be performed during this release; production checks must follow the switch. Pending, failed, missing or skipped checks block their phase. Retained components explicitly record their old SHA as their candidate and observed SHA. A worker sharing the legacy process records that same deployment rather than inventing a separate service.

The tool checks completeness and consistency of operator attestations. It cannot authenticate evidence or configure Render's deployment gate. An operator must compare every reference with actual provider/CI results. Do not remove a blocker until evidence resolves it. A successful command does not deploy, authorize contraction, or independently prove production readiness. `contractAllowed` must remain false even after acceptance. Set `observedUntil` to the end of actual monitoring; completion requires at least 24 elapsed hours after `cutoverAt` and an observation attestation at or after that endpoint, including evidence of a normal traffic peak.

Current hard stops:

- Full dependency audit previously failed on high/critical findings; rerun and resolve under controlled dependency changes. Passing security regression tests alone is insufficient.
- No verified current/new Render deploy, restored backup, production credential revocation, data reconciliation, staging/provider delivery or monitored production observation.
- Next customer checkout is disabled. Preserve the working legacy checkout route/client and shared safe transaction writer, or stop this rollout. Do not route customers into the disabled Next checkout or pretend the new checkout is ready.
- Legacy notification outbox processing is embedded in the persistent legacy process. Keep it running until an independently verified replacement exists. Same-origin auth and media compatibility must remain intact.

### Preparation verification on 2026-10-03

Passed: 7 release-gate regressions, 59 security regressions, 20 disposable MongoDB integration/load tests, 12 local Chromium smoke tests, lint and workspace typecheck. The CLI emits valid JSON and exits 1 for the actual pending release record. No application behavior changed, so a new application build was not required for this tooling/documentation change; browser checks exercised existing compiled fixture applications. Exact-final-SHA hosted CI/build remains mandatory before release.

The fresh dependency audit failed: root 19 high/2 critical, backend 13 high/0 critical, frontend 64 high/1 critical vulnerable dependency entries. Reports are in ignored `.verification-results/audit-*.json`; these are dependency entries rather than unique advisory counts.

Anonymous read-only GET probes returned homepage 200, robots.txt 200 text/plain and sitemap.xml 200 XML. Homepage raw HTML had a CRA root and no canonical link detected. Backend `/` returned 500 JSON; this is a single route observation, not proof that every API fails. Investigate the expected route/health contract and Render logs before attributing cause. The sanitized probe report is `.verification-results/production-readonly.json`. No authenticated/customer endpoints or production mutations were exercised. These observations are baseline findings, not production smoke acceptance.

## Render deployment inventory and controls

The release owner records each web/API/legacy/worker owner, service ID, domain, repository, linked branch, root directory, runtime, build/start commands, health path, current successful deploy ID/SHA, proposed artifact and rollback deploy ID. Record all routing/CDN/static-host changes separately. If the storefront is hosted elsewhere, include that host; Render hosting of the API does not prove storefront hosting.

Before any production-branch push, freeze automatic deployment for the coordinated migration, verify the freeze and queued deploy state, and record how it will be restored. For later routine releases use **After CI Checks Pass** plus the required fail-closed `verify` job; Render accepts neutral/skipped GitHub checks, so a skipped workflow is not sufficient evidence. Restrict manual deployments/hooks to release operators. Build and promote the reviewed full SHA, then read its SHA and successful live deploy ID back from Render for every component. Branch HEAD and a build success are not live-deployment evidence. See [Render deployment controls](https://render.com/docs/deploys).

Do not add a production Blueprint or change existing build/start commands until the inventory is confirmed. Root `build`/`start` remain legacy contracts. Rehearse pinned Node/npm, lockfile installs, commerce adapter generation, persistent workers, graceful draining and production builds in staging. Database migration is a separately coordinated operation: never put `db:commerce:apply` into build/start or an unconditional rolling pre-deploy hook while old writers remain live.

## Preflight evidence matrix

| Gate | Required evidence before deployment |
| --- | --- |
| Current / candidate SHA | Render current live IDs and SHA per component; reviewed candidate full SHA, artifact/build record and exact-SHA hosted `verify` success. All four CI jobs must succeed. |
| Database backup | Correct Atlas project/cluster/database identity; encrypted snapshot/PITR ID, completion time, retention, recovery permissions, recovery point and collection/index inventory. Snapshot must cover orders, products, counters, policies, retry receipts, outbox and sessions as a consistent dataset. |
| Restore rehearsal | Restore the same backup type into a separate isolated cluster; actual elapsed recovery time, restore point, counts/indexes and reconciliation checks below. Agree RPO/RTO before approval. A backup job success is not restore proof. |
| Environment | Compare variable **names**, secret-manager version references and redacted configuration per service with production examples and `packages/config/src/env.ts`; capture reviewed domain/routing/cookie/proxy/runtime settings. No values in release logs. |
| Rotated credentials | Provider records proving replacement and old-key revocation for exposed JWT/bearer credentials and reviewed DB, SMTP, WhatsApp and Drive/service-account credentials. Review staff accounts, role/city assignments and forced re-login. Never roll back to compromised credentials. |
| API compatibility | Staging contract checks for existing public catalog, search, IDs, pagination, quote/checkout, order/admin routes, statuses/errors, uploads, CSRF/cookies, CORS, realtime/SSE and webhook callers. Old bundles sending totals must refresh with a clear recoverable path. Both APIs must read the same intended catalog database. |
| Images | Snapshot-derived inventory of scalar/array product, category, banner, poster and historical email references; CDN and legacy paths decode/render, correct MIME/dimensions, Next optimizer, fallback and signed access behavior. See [media gates](MEDIA_CANONICALIZATION_2026-10-03.md); preserve Drive and old assets. |
| Email / WhatsApp / push | Controlled-recipient receipt and provider message IDs, sender/template/domain acceptance, webhook validation, retry/recovery, outbox drain, staff subscription/permission and reconnect. Provider acceptance alone is not inbox/device delivery. Never broadcast smoke messages to customers. |
| Admin auth | Real login, refresh, logout, session expiry, unauthorized denial, admin/staff city isolation, role revocation and secure cookie/origin behavior through actual ingress. |
| Product/category URLs | Inventory externally shared and current URLs; valid IDs, canonical slug redirects, renamed/deleted handling, query retention, direct navigation/reload, genuine missing-item 404s. |
| Redirects / sitemap / robots / canonical | Verify redirect status and final destination without loops, all sitemap indexes/shards and visible-item membership, public production robots and private exclusions, production-origin canonical tags in raw HTML and valid JSON-LD. Staging remains noindex. |
| Security / CI / audit | Exact candidate hosted `verify`, focused security, transaction/concurrency integration and browser suites; strict all-lockfile audit with no high/critical findings. Tests must not use production credentials/data. |
| Monitoring / rollback | Named on-call, actual dashboards/alerts, measured pre-cutover baseline, metric definitions below and rehearsed retained artifacts/configuration. Missing telemetry blocks cutover. |

Environment review includes `APP_ENV`, `NODE_ENV`, `WEB_ORIGIN`, `API_ORIGIN`, `LEGACY_API_ORIGIN`, redirect/replacement mapping, API host/port/proxy and database isolation settings. Legacy also needs exact `AUTH_ALLOWED_ORIGINS`, `AUTH_TRUST_PROXY`, injected `MONGODB_URI`, SMTP, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, legacy `ACCESS_TOKEN` / `VERIFY_TOKEN`, and `GOOGLE_APPLICATION_CREDENTIALS` configuration as used by active handlers. Inventory push/VAPID configuration and any remaining provider literals in source before declaring rotation complete. Ensure production example `.invalid` hosts and `DATABASE_MODE=disabled` are replaced by reviewed settings only for the intended runtime. Do not load `backend/.env` into tooling, print environments, or add secrets to `NEXT_PUBLIC_*`.

## Backup and restore procedure

1. Database owner records Atlas backup/PITR availability, recovery permissions and approved RPO/RTO. If unavailable, stop; agree a consistent backup method and test it before proceeding. Do not substitute an untested ad hoc live dump.
2. Complete a preflight snapshot and restore it using the provider's restore workflow to a **new isolated recovery cluster**, never over production. Restrict network/users; keep application workers and provider sends disabled. Keep unsanitized restored data restricted; use sanitized copies for general staging.
3. Verify database identity, collections/indexes, document counts, historical amounts/IDs, order-number high-water mark, receipt/order linkage, snapshots and outbox. Run transaction readiness and representative application reads under the recovery environment. Record discrepancies and actual restore duration against RPO/RTO.
4. At the migration window, pause and drain all writers and notification workers, take a final consistent snapshot/recovery point, and capture counts/checksums/high-water marks. Resume workers only after configuration and ownership are verified. Record any queued jobs; avoid replaying already-delivered events.
5. For a recovery incident after new orders exist, freeze writes and preserve the incident database and its backup. Restore to a separate cluster, reconcile every post-recovery-point order, receipt, counter, stock movement and outbox outcome from durable data. Do not replay notifications blindly. If the delta cannot be reconstructed, keep writes paused and escalate; do not overwrite production with a stale snapshot.
6. Switch database configuration only under the database owner's reviewed recovery decision, verify consistency and all critical paths, then resume. Record recovery loss (must meet the approved RPO) and elapsed RTO. A provider-specific restore checklist and successful rehearsal are mandatory evidence, still pending for this installation.

## Expand → migrate → switch → observe → contract later

1. **Expand in isolated staging:** restore/sanitize approved representative data; preserve IDs, legacy fields and media; run connection-free `npm run db:indexes:plan` and `npm run db:commerce:plan`. Compare index definitions, policy, existing conflicts and duplicate order numbers. These plans are descriptions, not live-data dry runs. Rehearse the additive apply and rerun on staging; compare all protected fields.
2. **Preflight:** complete every preflight evidence gate including all twelve staged journeys. Require exact-candidate hosted tests and security audit. Reserve a maintenance window, notify operators through the established process, verify writer freeze/rollback controls and record the traffic routing plan. Operator-owned production smoke recipients/SKUs/orders must be designated in advance.
3. **Pause:** freeze Render auto-deploy/queued deploys, block checkout and all stock/order/status/catalog mutations at every ingress and background path, drain in-flight transactions, and pause relevant jobs. A `COMMERCE_WRITERS_PAUSED=true` variable is only an assertion; prove no old writers remain. Capture the final backup and baseline reconciliation.
4. **Migrate:** with explicitly injected reviewed API/database settings and least-privilege migration access, run `COMMERCE_WRITERS_PAUSED=true npm run db:commerce:apply`. It applies additive indexes, absent historical status/provenance, counter `$max`, and insert-if-absent policy. Record summary/conflicts/unknown numbers and investigate every anomaly; never invent historical snapshots. Re-run once with writers still paused to verify idempotency. Do not run a separate competing index apply.
5. **Verify before serving:** compare paused pre/post collections, IDs, legacy fields, stock, prices, totals, order lines and media references. Check policy, counter, unique/index definitions, retry receipts and unresolved legacy conflicts. Deploy the exact verified artifacts with traffic/writes still gated; ensure every writer uses the shared transaction service. Read back live deployment SHAs. Pass the cutover evidence gate. On failure keep writes closed.
6. **Switch incrementally:** expose read-only storefront routes first, retaining explicitly tested checkout ownership and old URL mappings; then admin paths, then approved commerce traffic. If ingress cannot safely split routes, stop and rehearse a supported routing plan first. Enable workers only with controlled destinations/credentials and verified leases. Run the production smoke below at each stage. Keep legacy fields/assets and safe rollback artifacts.
7. **Observe:** record `cutoverAt`, watch continuously for the first hour and through at least 24 hours including a normal traffic peak. Reconcile immediately, after one hour and at window end. Quiet/zero traffic is not a successful peak: extend observation. Repeat acceptance after any material fix or deployment; use a new release record for a new SHA.
8. **Contract is a separate future release:** only after successful production operation, no legacy consumers/writers, complete reference reconciliation, agreed retention period and a reviewed restore/rollback plan. This release removes no legacy fields, collections, receipts, counters, snapshots, outbox records or media. Do not deploy a destructive down migration.

## Production smoke: record outcome, timestamp and evidence for every row

Run through the public production domain on desktop/mobile with direct navigation and reload. Capture status codes, redacted request IDs and browser console/network results. Raw HTML must be fetched independently of JavaScript hydration. Existing Playwright tests are **disposable local fixtures** and must never be repointed at production: their setup resets fixture data.

| # | Journey | Acceptance |
| --- | --- | --- |
| 1 | Homepage | 200, meaningful server HTML, correct navigation/banner/images, no failed required requests or uncaught JS errors. |
| 2 | Product listing | Published records, correct categories/paging/prices/images, no disabled-item leakage, responsive rendering. |
| 3 | Search | Known term and no-result case; correct results and filters, no 5xx, bounded latency. |
| 4 | Product detail | Inventory-approved product and old alias; correct details/price/media/canonical; missing ID returns real 404. |
| 5 | Add to cart | Add/update/remove, persist/reload; quantity/stock bounds; stale stored prices are not authoritative. |
| 6 | Checkout calculation | Current legacy checkout receives server quote; approved inclusive VAT, discounts, emirate fee, minimum/store-open policy and final integer amount match independently computed expected values. |
| 7 | Order creation | One designated controlled order; saved immutable snapshots, correct server totals, one receipt/number; retry same intent/key after uncertain response returns same order. No customer test data or uncontrolled recipients. |
| 8 | Inventory change | Order deducts exact quantities once, no negative stock. Designated pre-dispatch cancellation restores exactly once; retries do not alter stock again. Retain audit history; never delete the smoke order. Concurrency stress belongs in staging. |
| 9 | Admin login | Authorized operator logs in/refreshes/logs out; anonymous and wrong-role/city access denied. No credentials in screenshots/logs. |
| 10 | Admin order handling | Controlled order visible only to authorized staff; permitted transitions persist/reload with original totals; illegal transitions fail. Use a separate designated order for dispatch versus cancellation. |
| 11 | Notification path | Committed controlled order reaches authorized realtime/SSE and intended push device; reconnect reconciles missed updates; outbox retries recover. Also verify WhatsApp receipt/template/webhook using controlled recipient. |
| 12 | Email path | Controlled inbox receives the correct order and amounts with usable images/links; provider receipt and outbox state agree, failure/retry does not lose or recreate an order. Email is at least once: document any duplicate provider delivery. |

SEO acceptance additionally fetches home/list/product/category HTML using browser and crawler user agents; checks visible text, unique title/description, one expected production canonical, robots directives, JSON-LD and redirect targets; verifies `robots.txt`, sitemap index and every shard against the URL inventory. Search/private/admin/checkout exclusions must remain deliberate. Store raw evidence privately without customer/session content. See [SEO verification](STOREFRONT_SEO_2026-10-03.md).

## Monitoring and explicit rollback triggers

Baseline: at least 30 minutes immediately before cutover plus a comparable normal peak. Tag dashboards by release/component/route without PII. The on-call records numerator/denominator, exclusions and alert destination. Configure alerts before cutover; this repository does not provision a metrics backend.

| Signal | Trigger | Action |
| --- | --- | --- |
| Security / wrong artifact | Any auth/RBAC bypass, secret leak, or live SHA differing from approved component SHA | Immediately isolate affected service; pause writes and stop promotion. |
| Duplicate orders | Any second committed order for the same checkout key/intent | Immediately pause all commerce writers; preserve evidence and reconcile. |
| Inventory / order integrity | Any new negative stock, incorrect total, missing committed order/receipt, unexplained stock delta or counter regression | Immediately pause writers; no tolerance window. |
| HTTP 5xx | Above 1% for 5 min with at least 100 requests, or 3 consecutive critical synthetic failures at 1-min intervals | Stop expansion; roll traffic back to verified compatible artifact. |
| Checkout failures | Unexpected server/timeout failures above 2% for 5 min with at least 20 attempts, or 3 consecutive controlled failures | Pause checkout, preserve retry keys and investigate/rollback safe writer. Exclude expected validation/stock conflicts. |
| Latency | p95 exceeds twice the matched baseline for 10 min, or catalog exceeds 1.5 s / checkout exceeds 3 s for 10 min (at least 20 samples) | Stop expansion and roll back affected route/service after ruling out baseline-wide outage. |
| Database errors | Any transaction/index invariant failure; otherwise 3 connection/transaction errors in 5 min or sustained timeouts for 2 min | Pause writers; inspect DB topology/index/capacity and reconcile before resuming. |
| Client JS errors | New error prevents any critical journey; otherwise affected sessions exceed 1% for 10 min (at least 100 sessions) | Roll back affected client/routes; preserve server-safe writer. |
| Notification/email | Controlled delivery missing after 5 min, oldest deliverable outbox event exceeds 5 min, or queue grows across 3 five-minute samples | Stop expansion; recover worker/provider without replaying checkout. Keep committed orders intact. |
| SEO / media / telemetry | Wrong production canonical/noindex, redirect loop, broken key product image, or lost critical telemetry for 5 min | Stop expansion; restore verified routing/config and repeat acceptance. |

Low-volume periods use safe read-only synthetics and operator-approved controlled journeys; never manufacture real customer orders to meet a sample threshold. Do not classify zero attempts as a 0% failure success. Defaults above must be accepted or made stricter by the release owner before preflight; do not relax during an incident merely to pass.

Reconciliation uses a paused baseline and durable committed events over the observation interval: per product, expected closing stock = opening stock − committed v2 purchases + committed once-only cancellations + audited authorized stock adjustments. Match orders to receipts, immutable totals/lines, unique new numbers, counter high-water and outbox events. Preserve legacy-conflict exceptions as an explicit reviewed inventory; require **zero unexplained new differences**. If manual stock changes cannot be accounted for, keep them paused or keep the release blocked. Compare hashes/counts per stable ID, not just aggregate order counts.

## Render rollback procedure

1. On any trigger, release owner stops promotion and freezes automatic/queued deployments. Record incident time, active SHA/deploy IDs and affected request IDs. Pause commerce/status/stock writers before reversing anything that touches writer compatibility.
2. Use the recorded service's **Deploys → retained successful deploy → Rollback**, only after confirming that artifact retains the safe writer and works with rotated credentials. Dashboard rollback disables auto-deploy; API rollback does not, so verify the actual setting. Confirm retention beforehand. See [Render rollback behavior](https://render.com/docs/rollbacks).
3. Render rollback can restore service-specific environment values; shared environment groups and domain/redirect/header settings differ. Recheck secret versions and all routing/config separately. Never reactivate revoked credentials. If the previous artifact contains compromised auth or the old unsafe writer, leave checkout paused and forward-fix or use a separately prepared compatible rollback build.
4. Do not roll back the database for an application-only failure. Retain every additive field, receipt, counter, snapshot, order and outbox record. Do not lower counters, delete test orders, double-restock, or requeue all notifications. Use isolated disaster recovery only when justified under the recovery procedure above.
5. Verify the rollback deploy's actual SHA, public routes/raw SEO HTML, authentication/RBAC, worker ownership and all reconciliation invariants. Resume writes only after the data owner confirms no unexplained differences. Retain logs and restricted incident evidence.
6. Re-promotion requires a new reviewed candidate, passing exact-SHA CI/audit, staged acceptance and all release gates. Do not reenable automatic deployment until the linked branch and controls are confirmed safe.

## Completion rule

Release owner and database owner record acceptance only when actual production traffic works, all twelve journeys pass, SEO HTML is correct, production security and exact-candidate tests pass, monitoring remains within bounds for the observation window, and order/inventory reconciliation has no unexplained differences. Missing provider access or evidence means **incomplete**, never assumed success. Final completion does not authorize contract/removal work.
