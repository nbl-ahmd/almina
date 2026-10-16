# Vercel frontend, Render API, Atlas database

The owner confirmed this target on 2026-10-14. Existing production frontend and backend are currently on Render; the intended frontend migration is to Vercel. Production Atlas data and provider credentials are unchanged by this implementation.

## Service ownership

Browser → Vercel Next.js (`apps/web`) → Render persistent Express (`backend/server.js`, maintained `apps/api` TypeScript domains) → MongoDB Atlas. Both `/api` compatibility and `/api/v1` contracts use the same persistent database pool. Email/push/outbox workers stay with the Render process. Next does not connect MongoDB. Browser admin/checkout requests use same-origin Next gateways; HTTP-only host cookies are forwarded server-to-server to Render. Browser cookies need no cross-site domain or localStorage tokens.

Do not deploy the standalone foundation-only `apps/api/dist/server.js` as the full production API: storefront/admin compatibility reads and provider workers require the combined runtime.

## Vercel setup

- Framework: Next.js; project Root Directory: `apps/web`.
- Include files outside that root so root lockfile and shared workspace packages are available.
- Node: 24.x compatible with the repository pin; install: `cd ../.. && npm ci`; build: `npm run build` from `apps/web`.
- Normal output directory, no static export or SPA rewrites. `apps/web/vercel.json` supplies the framework/install/build commands.
- Git deployment hold remains false until hosted acceptance is reviewed. Root/backend/API Vercel holds are retained so the backend is not accidentally deployed to Vercel. Manual staging workflow is explicit and exact-commit gated; it does not promote production.
- Production server variables: `APP_ENV=production`, `WEB_ORIGIN=https://www.alminapharmacy.com`, both `API_ORIGIN` and `LEGACY_API_ORIGIN` pointing to the full Render HTTPS API; checkout remains false until the release gate passes. Configure the public media account name if required. No database URI, provider secret or `NEXT_PUBLIC_*` is needed.
- Staging: `APP_ENV=staging`, exact HTTPS staging `WEB_ORIGIN`, separate staging Render API origins. Use a stable staging alias/domain, and open that hostname during acceptance. A random deployment hostname is not automatically authorized: no wildcard Origin policy is introduced. Keep staging noindex.
- `NODE_ENV=production` is the build/runtime mode on Vercel; do not configure development mode on a hosted preview.
- Admin gateways cap bodies at 4 MiB; browser multipart selection caps total files at 3 MiB to leave framing headroom. Cloudinary gallery selection states that total limit before submission. Render retains its existing independent validation/limits. Larger media currently requires resizing/splitting before upload; a future direct object-storage upload flow requires its own authenticated receipt/asset verification design.
- Category/banner mutations through the authorized Next admin gateway expire their cache tags after successful writes. Bulk/recovery category additions also expire the category tag. A cache failure never converts a committed mutation into a failed write/retry. Other API clients must explicitly purge via the authenticated route or accept the existing TTL behavior. Verify actual Vercel cache behavior during staging.
- Admin event streams end after 20 seconds and reconnect/reconcile; explicit Node function duration is 30 seconds. Browser fallback polling remains available. No permanent socket or worker is hosted in a Vercel function.

References: [Vercel monorepos](https://vercel.com/docs/monorepos), [function payload/duration limits](https://vercel.com/docs/functions/limitations), [project configuration](https://vercel.com/docs/project-configuration).

## Render and Atlas setup

- Keep the API repository root and existing production `npm run build` / `npm start` contracts. Build installs root/backend locked dependencies and generates the maintained commerce bundle. It opens no database and runs no migration. Startup checks the bundle and starts the persistent API/workers.
- Node/npm must match `.nvmrc` and engines. Let Render provide `PORT`.
- Configure `APP_ENV=production`, `NODE_ENV=production`, exact Vercel storefront `AUTH_ALLOWED_ORIGINS`, and explicit `MONGODB_URI` with the reviewed database name. Never use `AUTH_TRUST_PROXY=true` or trust every client-supplied forwarding header. Verify the actual ingress before setting bounded trusted IPs.
- Health path: `/health/ready`; `/health/live` distinguishes process availability. Validate graceful draining and worker ownership at deployment.
- Use `backend/.env.staging.example` / `.env.production.example` for the combined API, rather than the foundation-only API workspace templates. Only ignored runtime env files or provider-injected secrets hold credentials. `ALMINA_RUNTIME_ENV_FILE` can explicitly select an env file; the local demo injects a blank file to prevent reading owner configuration.
- Atlas: separate production and staging/development databases and service accounts, transaction-capable topology, restricted Render outbound IP access, TLS, backups, least privilege and explicit database names. No Atlas password is sent to Vercel. Inspect indexes/query plans and rehearse backup restore before production activation.
- Provider secrets stay in Render. Test real SMTP/WhatsApp/push/Drive/Cloudinary on controlled staging destinations and record receipt/retry evidence. Demo checkout queues notifications but lacks provider credentials, so real delivery is deliberately unavailable.

References: [Render Atlas connection](https://render.com/docs/connect-to-mongodb-atlas), [health checks](https://render.com/docs/health-checks).

## Exact-commit staging workflow

`.github/workflows/deploy-staging.yml` requires successful hosted verification of the requested full SHA, then deploys one combined Render API and the Vercel staging frontend. The previous duplicate versioned/legacy Render deployments and Render web deployment are replaced by this target ownership.

Configure GitHub's protected `staging` environment with `RENDER_STAGING_API_KEY`, `VERCEL_STAGING_TOKEN`; variables `RENDER_STAGING_API_SERVICE_ID`, `VERCEL_STAGING_PROJECT_ID`, optional `VERCEL_TEAM_ID`. The Vercel project must already exist, link this GitHub repository, have `apps/web` root, and contain the reviewed staging variables. The staging API service must run the full persistent entry point against staging Atlas. No workflow provisions a cluster, migrates data or rotates secrets.

The Vercel tool checks project identity/root/framework/Git link, requests the exact SHA with an explicit staging target, makes only one deployment POST, and reads back READY/project/SHA evidence. Failure or uncertain response must be inspected before retrying. It supports no production promotion. Provider acceptance and deployment protection must be verified on the actual account before claiming hosted readiness.

## One-command persistent local demo

```sh
npm ci
npm ci --prefix backend
npm run dev:demo
```

Open `http://127.0.0.1:4760`. API is loopback 4770; MongoDB replica set is loopback 4781. `demo-admin` / `local-demo-password`; `demo-staff` uses the same public synthetic password, scoped to Dubai. Two synthetic categories and four products include sale, VAT, ordinary stock and out-of-stock behavior. Placeholder images keep the demo independent of external media.

MongoDB 8.0.17 downloads from the test binary provider on first run unless `TEST_MONGOD_PATH` supplies a compatible binary. Data lives under ignored `.local-demo/mongo`; the Next dev cache is separate `.next-demo`. Ports are refused when occupied. Ctrl-C drains the owned API/Next processes and stops MongoDB; restarting preserves stock/orders/sessions and does not re-seed existing rows. Seeding refuses any other database name, replica-set identity, non-loopback member or unmarked nonempty database. There are no public fixture reset endpoints. Keep the demo loopback-only.

The launcher constructs a fresh allowlisted child environment and an explicit blank API env file. It accepts no database URI arguments, uses no production database credentials, and has no real notification provider credentials. Failed/missing notification delivery remains visible; it is not represented as real acceptance.

For a real development Atlas database, configure ignored `backend/.env.local` with `APP_ENV=development` and an explicitly separate development URI, initialize approved local catalog/admin/policy and use `npm run dev`. Root dev now requires that file and development label; it no longer falls back to production `backend/.env` or relabels a production configuration. This supersedes the earlier shared-database development decision. Choosing a production database but labelling it development is still unsafe; configuration labels cannot prove database isolation.

## Verification and remaining release gates

Fresh evidence and the manual browser order journey are recorded in the migration status. Source tests cover chunked/declared upload bounds, cache mutation scope, real seed replay preserving checkout receipts/stock, and mocked Vercel exact-SHA/staging checks. Compiled browser tests exercise cache freshness and rejection before oversized upload mutations.

Final local results: lint/typecheck/production build and foundation/storefront/SEO smokes pass; 234 broad source tests pass (35 database-gated skips tested separately), all 53 real MongoDB checks pass, all 59 compiled Chromium cases pass, both dependency audits show zero high/critical findings, and runtime diagnostics are clear. Manual computer-use checkout/admin viewing created and verified demo OD5001 (AED 61, stock 12 → 10); restart preserved that order/receipt/stock. The in-app cancellation confirmation controls timed out; that manual cancellation was not completed, while automated cancellation/restock/post-dispatch rejection checks passed. A screenshot from the passing compiled admin order check is `.verification-results/admin-order-price.jpg`.

Actual Vercel/Render/Atlas configuration, exact deployed artifacts, account credentials, real provider acceptance, representative data/media/load, restore rehearsal and monitored order/stock reconciliation remain operator gates. No service was provisioned, no production data was seeded, no production migration/deployment was run, and no Git deployment hold was lifted. Use the existing release evidence CLI and cutover procedure with Vercel frontend rollback plus Render safe-writer rollback; preserve committed orders/receipts/stock and additive fields.

## Owner deployment decision — 2026-10-16

For this release the owner explicitly selected the existing Render frontend and API, using GitHub master auto-deployment for quick hosted testing. The Vercel frontend move is deferred; its deployment hold stays in place. Merge only after protected verification succeeds, without the Render skip phrase on the release merge commit, then verify the deployed artifacts and health. This authorization does not authorize importing the ERP catalogue, enabling feeds, changing Atlas data or bypassing failed release checks. Existing Render build/start/environment settings must be preserved unless a verified incompatibility needs a focused correction.
