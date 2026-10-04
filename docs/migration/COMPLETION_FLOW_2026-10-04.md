# Migration completion and database recovery

## Current result

The migration is not complete. The Next.js 16.3.8 storefront and admin exist, and this branch adds Tailwind 4, operational Next checkout, reviewed-total protection, recovery tooling and a staging deployment workflow. The catalog/admin write APIs, Drive media, notifications and several provider integrations still depend on the legacy backend. The retained React fallback now builds with Vite; CRA tooling is removed. The fallback itself remains until those replacements and the hosted cutover are verified.

The owner confirmed that master automatically deploys to Render service `srv-cv1dn5lds78s73doqjm0` and supplied an organization dashboard for a replacement MongoDB cluster. The Render dashboard currently requires sign-in in the available browser. Its build/start commands, deployed commit, environment, health path and auto-deploy mode have not been inspected. No website hosting project has been supplied. No production database or provider was accessed, and no hosting configuration was changed.

## Branch integration

All twelve modernization branches are ancestors of `de1bbe0`, the tip of `codex/production-migration-readiness`. They form a cumulative sequence, not twelve independent changes. `codex/complete-production-migration` starts at that tip and includes all fourteen modernization commits. Merge the cumulative PR once; do not cherry-pick every branch or repeatedly merge the same changes. Keep the source branches until the cutover observation window and rollback verification pass.

Master requires an up-to-date successful `verify` check, including for administrators. The previous failed dependency gate (5 high in root, 59 high in frontend) is resolved: all three lockfile audits now report zero high/critical findings. CRA's unsupported build stack was replaced with Vite without removing fallback routes; Next lint root discovery uses a narrowly scoped adapter over maintained tinyglobby, with directory semantics and lint enforcement regression tests. The gate remains enforced. Obsolete Vercel configuration files are removed. Cloudflare/Netlify/Vercel account connections still need removal by the owner; they are not required branch checks.

Repository integration and production cutover are separate. Once protected CI passes, merge using a merge commit whose subject contains `[skip render]`, which [Render documents as an auto-deploy skip phrase](https://render.com/docs/deploys). Preserve all source branches. Verify a skipped event in the Render dashboard when access is available. This phrase does not disable future auto-deploys or manual deployments: pause/configure deployment before further master changes. Do not interpret a merged PR as hosted acceptance or release-gate completion.

## Changes delivered in this branch

- Next checkout reviews a server quote before submitting intent, requires its canonical SHA-256 acknowledgment, and rejects changed prices/delivery/totals before writing inventory or orders. The transactional server remains authoritative.
- Exact checkout intent and its retry key are saved before submission. Reload/network uncertainty retries the original request. Committed retries retain their original totals even after catalog changes.
- Checkout gateways enforce exact Origin/custom-header CSRF, strict contracts, bounded bodies, timeouts, no redirects and no-cache responses. Checkout stays disabled unless `CHECKOUT_ENABLED=true` is explicitly configured.
- Tailwind 4/PostCSS is installed in Next. Checkout uses responsive utilities. Existing verified component CSS remains; this is not a claim that every screen has been converted to utility classes. Preflight is omitted to preserve existing form/admin styles.
- Recovered Cloudinary raster uploads can be rendered from one explicitly configured account, through constrained image patterns and CSP. No API key is needed by the website. URLs from other accounts, SVGs, fetch delivery, credentials and query strings are rejected.
- Updated backend Google APIs, Nodemailer, Multer and Sharp; removed PM2/nodemon in favor of the hosting platform's Node process supervision. Root build now uses lockfile installations. Removed an unused CRA email template/package and unused direct Tailwind package, preserving the compatibility client. Its Vite environment names are `VITE_API_ORIGIN`, `VITE_MAINTENANCE_MODE` and `VITE_VAPID_PUBLIC_KEY`; inspect the actual source for defaults before configuring a fallback host.
- Admin product stock edits require the loaded stock value and use an atomic conditional update. Stale forms reject with 409, including after checkout. Zero stock/price edits work, and product price precision is validated to two decimals. Image replacement retains previous Drive assets until reference-aware cleanup; upload failure cannot delete existing images. An audited stock-adjustment ledger remains follow-up work.
- CI now uploads the hidden verification directory and audit files correctly. The new staging workflow requires a successful foundation run for the exact candidate commit, deploys backends before web, and waits for matching live commit evidence. It cannot target the known production Render service.

## Recover the empty database

### 1. Prepare a separate staging database

Use the replacement Atlas cluster with separate named staging and production databases, restricted database users, required TLS and backups. Verify the region, replica-set transactions, network access and a restore into a separate database. Rotate credentials previously tracked in Git and configure new provider secrets through hosting settings. Do not put connection strings or passwords in issue descriptions, source files, browser settings or chat.

Cloudinary contains images, not authoritative prices, stock, VAT flags or lost order history. Export an image manifest from the existing account, including public ID, secure URL and available filename/context metadata. Match assets against a reviewed spreadsheet using identifiers/barcodes where available. Ambiguous matches require a person to review them. Do not infer product names/prices/stock from images.

### 2. Bootstrap a closed store and first administrator

`npm run db:recovery:plan` prints a connection-free plan. Applying requires all of:

- Explicit matching `APP_ENV`, `NODE_ENV`, `WEB_ORIGIN`, `DATABASE_MODE=enabled`, `DATABASE_ENV`, `MONGODB_DATABASE` and injected `MONGODB_URI`.
- `RECOVERY_BOOTSTRAP_ALLOWED=true` and `COMMERCE_WRITERS_PAUSED=true`.
- `RECOVERY_ADMIN_USERNAME`, `RECOVERY_ADMIN_NAME` and a `RECOVERY_ADMIN_PASSWORD_FILE` readable only by its owner. The password must be 12–72 characters and at most 72 bytes; the script refuses symlink files and never prints it.
- An owner-selected `ORDER_NUMBER_FLOOR` above the known lost historical order range. A value cannot be guessed from an empty collection. Keep existing `OD` identifiers and external-reference compatibility while preventing reuse.

Run `npm run db:recovery:apply` only in the maintenance window for the reviewed target. It refuses populated business collections and atomically creates one administrator, a closed store, an explicit order floor and a rerun marker. Index/policy setup is additive. Exact reruns do not change a password, reopen the store or reset counters. Different bootstrap parameters are rejected. The default command never connects. Never attach this apply step to build, startup or automatic deployments.

### 3. Import reviewed products as hidden drafts

Use `recovery-products.example.json` as the input shape. Each batch contains at most 500 rows/4 MiB. Store AED money as decimal strings with at most two decimal places; preserve barcode strings and stable `product_id` values. Optional sale price must not exceed price. Set `CLOUDINARY_CLOUD_NAME` to the surviving account name and include only verified HTTPS raster upload URLs from that account. The importer does not contact Cloudinary or delete media.

`npm run db:recovery:catalog -- reviewed-products.json` validates and summarizes the file without a database connection. To apply, add `--apply` and set `RECOVERY_CATALOG_ALLOWED=true` and `COMMERCE_WRITERS_PAUSED=true`, with the explicit matching database settings above.

An applied batch requires the recovery marker and a closed store. All products are disabled with stock zero; new categories are disabled. Exact reruns are no-ops, including after later stock edits. Conflicting existing IDs or ambiguous categories reject the whole transaction. This recovery importer intentionally does not overwrite existing products or stock. Correct conflicting batches by review; do not delete data to make an import pass.

After import, use the authenticated admin to review category/product details, match images, verify physical stock, enter stock, and enable reviewed categories/products while the store remains closed. Do not use the old `/api/batch` CSV importer for recovery: it lacks these guarantees. The authenticated CSV/JSON preview/commit interface and spreadsheet-to-CSV template conversion are now implemented; see [recovery workflow](RECOVERY_IMPORT_2026-10-04.md). Hosted recovery acceptance remains required. Perform a synthetic staging purchase/cancellation and verify inventory, VAT/delivery, order numbering and notifications before opening production.

Lost customers and orders remain lost unless an independent export/backup is found. Do not fabricate history, import invented customers, or present images as database recovery. Document the recovery date and retained independent fulfillment/accounting records.

## Hosting and pipeline sequence

1. Confirm the existing Render service's repository, master deployment mode, root directory, Node version, build/start commands, public origin and injected secrets. Require the final `verify` result before deployment. Render supports **After CI Checks Pass**; see [Render deployment behavior](https://render.com/docs/deploys). The new workflow does not change the owner's current auto-deploy setting.
2. Provision isolated staging copies: the persistent modular API, the retained legacy API/outbox provider worker, and a Next website. Both APIs must use the same staging database. They are separate services during transition because legacy catalog/admin/provider ownership is still present. Never route staging to production collections or real customer notification destinations.
3. Build the modular API with `npm ci` and `npm run build --workspace @almina/api`; start with `npm run start:api`. Set its HTTPS `WEB_ORIGIN`, explicit database environment and trusted ingress configuration. Probe `/health/ready`, then verify transaction-capable checkout and authenticated operations.
4. Build the retained service with root `npm run build`; start with root `npm start`. The platform supervises Node. Configure `AUTH_ALLOWED_ORIGINS` to the exact staged website origin and the required rotated integration credentials. Its URI must name the same database used by the modular API. Confirm outbox delivery and all retained admin/media/provider routes. The retained readiness/drain implementation is documented in [lifecycle](RETAINED_LIFECYCLE_2026-10-04.md); hosted termination/provider acceptance remains required before production promotion.
5. For a Render-hosted Next website, use root `npm ci` followed by `DATABASE_MODE=disabled npm run build:foundation`; start with `npm run start:web -- --hostname 0.0.0.0 --port "$PORT"`. Use the actual staging `APP_ENV=staging`, `NODE_ENV=production` and HTTPS origins during its build so compiled headers/image patterns match hosting. Set `API_ORIGIN` to the modular service and `LEGACY_API_ORIGIN` to the retained service. Do not put database/provider credentials in the website environment. Do not set the test-only isolated-build flag unless it is also set at startup. A different website host needs an equivalent reviewed adapter.
6. Configure GitHub's `staging` environment with reviewers, allowed deployment refs, secret `RENDER_STAGING_API_KEY`, and variables `RENDER_STAGING_API_SERVICE_ID`, `RENDER_STAGING_LEGACY_SERVICE_ID`, `RENDER_STAGING_WEB_SERVICE_ID`. These must identify staging copies, never production. Disable independent auto-deploy on these staging copies to prevent racing the pinned deployment. Dispatch **Deploy verified staging release** with a full verified commit SHA. [Render's API supports commit-specific deployment](https://api-docs.render.com/reference/create-deploy). No workflow has been dispatched and no Render credential is configured by this branch.
7. After the deploy is live, perform hosted acceptance, including admin login/logout/expiry/city scoping, catalog/media CRUD, stock races, quote changes, retry after lost response, order lifecycle, SSE/realtime reconnect, email/WhatsApp/push, provider outages, crawler routes, mobile layout, caches and upstream failure handling. Provider delivery and hosted smoke acceptance are separate from a successful provider deployment response.
8. Produce the existing release-gate evidence for the exact release SHA, backed by CI artifacts, backups/restore rehearsal, credential rotation, hosted measurements and business acceptance. Only then coordinate the traffic/writer switch and production deployment. Git integration may occur earlier with the explicit Render skip phrase described above; master auto-deploys must be paused/configured before subsequent commits.
9. Observe errors, readiness, checkout rejection/duplicate rates, stock drift, slow queries, outbox backlog/delivery, auth failures, crawler errors and performance. Use the runbook's observation duration and rollback triggers. Do not enable customer analytics that includes addresses, prescription/health data, credentials or complete checkout payloads.
10. Roll back application routing and binaries to the last verified compatible release if acceptance fails; pause writers as necessary. Preserve committed orders, receipts, stock and outbox records. Do not reverse stock by restoring an old database snapshot over new transactions. Reconcile the notification queue and compare counters before reopening.

## Focused continuation evidence

Recovery preview/commit, immutable stock adjustments, retained readiness/drain, signed product media replacement/archive, catalog creation/metadata persistence and transactional WhatsApp inbox processing are now implemented in stacked focused PRs. See the current [migration status](MIGRATION_STATUS.md) for exact scopes and CI runs. The [operations dashboard](OPERATIONS_DASHBOARD_2026-10-04.md) adds administrator-only process snapshots and bounded database candidates; hosting-wide collection, external alerts and ledger reconciliation remain required. Earlier counts below describe the integrated baseline. No hosting acceptance or production cutover is claimed.

## Remaining implementation gates

| Area | Work required before completion |
| --- | --- |
| Dependency gate | Resolved locally: zero high/critical across lockfiles; require the same result from protected CI and keep monitoring. |
| Backend ownership | Migrate catalog/category/banner/staff/store/import writes and provider/media operations into maintained modules, or explicitly accept documented retained components at cutover. |
| Inventory admin | Implemented: stale-stock protection, immutable actor/reason/delta receipts and exact stock-edit replay; creation, sale and invoice decimal-money validation. Hosted races/reconciliation remain required. |
| Media/admin | Verify recovered Cloudinary preview/gallery/SEO delivery on the host; implement safe replacement, signed uploads and orphan review without deleting surviving assets. |
| Product recovery UX | Implemented: spreadsheet/CSV templates, authenticated preview, row errors and hash-bound transactional commits. Verify hosted recovery/publishing; the legacy batch route remains blocked for recovery. |
| Operations | Named Atlas backups, restore rehearsal, protected secrets, health checks, graceful draining, provider retries, outbox monitoring, alerts and fulfillment reconciliation. |
| UI | Complete component-by-component Tailwind adoption and coherent pharmacy design; verify all storefront/admin forms, errors, empty states and image layouts. |
| SEO/performance | Hosted canonical/redirect/robots/sitemap/schema validation against recovered IDs; measurements and budgets against representative products/images. |
| Analytics | Consent-aware, PII-free commerce events, checkout funnel and operational metrics; keep prescription/customer details out of analytics. |
| Cutover | Hosting project/config access, green protected CI, exact-release staging/business acceptance, rollback evidence and observation. |

## CRA retirement condition

Do not delete `frontend/` now. CRA tooling has been removed. Current browser regression tests build and exercise the retained React checkout through Vite as a compatibility baseline; the hosted replacement is unverified. After Next hosts all required routes and business/provider behavior, migration callers and tests to Next are complete, and production observation/rollback requirements pass, remove the fallback client in a separate reviewed commit. Preserve reusable assets, templates and URL redirects before deletion. Then verify no script/import/CI/hosting path references `frontend`, rebuild and run the full replacement suite. Only that later commit can claim CRA retirement.

## Verification recorded locally

Lint/typecheck, 49 unit tests, 7 release-gate tests, 95 API/security/upload regressions, 22 real disposable-replica-set integration checks, Vite compatibility build and Next production foundation build pass. The Chromium suite passes all 19 scenarios, including Next checkout at 360/390/768/1280 px without overflow, changed-price rejection, retry after a committed response is lost, CSRF/tampering, and retained admin/React behavior. Recovery plan/validation commands operate without connecting. These results are local evidence; hosted providers/deployment and production cutover remain unverified. The dependency audit now passes across all three lockfiles. Hosted integration/provider and production release evidence are still absent.
