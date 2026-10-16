# Local completion and verification

Update 2026-10-14: use `npm run dev:demo` for a one-command persistent, isolated demo (Next 4760, full API 4770, local replica set 4781). Synthetic accounts are `demo-admin` and `demo-staff`, password `local-demo-password`. Data persists under ignored `.local-demo`; provider credentials are absent. Normal `npm run dev` now requires development-labelled `backend/.env.local` and never falls back to production `.env`. This supersedes the shared-database development instructions below. The hosting target is Vercel web / Render API / Atlas; see [the current setup guide](VERCEL_RENDER_ATLAS_2026-10-14.md).

The owner will configure hosting and has requested local verification only. The candidate runs Next.js 16.3.8/React 19.3 for every storefront/admin route, Tailwind 4 and maintained TypeScript Express 5.2.1 domains with native MongoDB 7.7. The old CRA/Vite application is not an active build, browser-test or deployment dependency of this held candidate. Reviewed compatibility routes and historical database fields remain intentionally; source/media rollback evidence is preserved. No master merge, production deployment or destructive data operation occurred.

## Install

Use Node 24.21.x and npm 11.19.x as specified by .nvmrc/engines. From the repository root:

```sh
npm ci
npm ci --prefix backend
npx --no-install playwright install chromium
```

No database is connected during installation or build. Do not copy production credentials into local files. Automated fixtures construct new disposable loopback databases and synthetic users/providers rather than using backend/.env. First use downloads MongoDB 8.0.17 unless TEST_MONGOD_PATH points to a compatible local binary.

## Verify the candidate

Run sequentially; the browser harness owns ports 4709, 4710, 4711, 4720, 4730 and 4740. Stop interactive fixtures first. The ownership guard fails rather than touching somebody else's listener. Unit tests also temporarily reserve port 4730.

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:release
npm run test:api
npm run test:integration
APP_ENV=development DATABASE_MODE=disabled WEB_ORIGIN=http://127.0.0.1:3000 NEXT_TELEMETRY_DISABLED=1 AL_MINA_ISOLATED_BUILD=1 npm run build:foundation
AL_MINA_ISOLATED_BUILD=1 npm run smoke:foundation
AL_MINA_ISOLATED_BUILD=1 npm run smoke:storefront
AL_MINA_ISOLATED_BUILD=1 npm run smoke:seo
AL_MINA_ISOLATED_BUILD=1 npm run test:e2e:smoke
AL_MINA_ISOLATED_BUILD=1 npm run analyze:web
npm run audit:security
```

The isolated build uses .next-verification, separate from live dev caches. Smoke/browser children use explicit isolated environments. Evidence is written under ignored .verification-results/. CI runs these release-relevant checks and retains the fail-closed required verify job.

## Explore locally

Build the maintained compatibility service first:

```sh
npm run build:commerce
```

Start the disposable synthetic API in one terminal, from the root:

```sh
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" COMMERCE_TELEMETRY_ENABLED=true node --import tsx scripts/tooling/e2e-commerce-fixture.mts
```

In a second terminal, start Next using its explicit isolated dev mode:

```sh
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" APP_ENV=development WEB_ORIGIN=http://127.0.0.1:4760 API_ORIGIN=http://127.0.0.1:4730 LEGACY_API_ORIGIN=http://127.0.0.1:4730 CHECKOUT_ENABLED=true COMMERCE_TELEMETRY_ENABLED=true CLOUDINARY_CLOUD_NAME=synthetic NEXT_TELEMETRY_DISABLED=1 AL_MINA_ISOLATED_DEV=1 npm run dev -- --port 4760
```

Open http://127.0.0.1:4760 and /admin/login. Synthetic credentials are username synthetic-admin (or synthetic-staff), password synthetic-test-password. These are test fixtures, never production credentials. The fixture contains one explicitly priced product, four units, an open synthetic store and City A delivery; customer/stock/order state is disposable. The recovery browser tests separately reset to a closed store and verify disabled drafts with zero stock. Imported stock/price/identity is never inferred from filenames. Stop both terminals when done; never expose this fixture on a public host. Its reset endpoints and provider doubles are test infrastructure only. Signed Cloudinary/WhatsApp operations here use synthetic responses; no real message/upload is sent. Real SMTP/Google/Web Push SDK behavior is exercised separately against controlled loopback transports.

For a durable local database, use explicit backend/.env.local configuration and the reviewed bootstrap/index/recovery procedures. On 2026-10-10 the owner explicitly requested the same configured database for dev and production; the development launcher preserves its exact URI/database. Automated verification still uses disposable databases, and migration/bootstrap scripts must not target production without their separate approval and rollback gates. The full persistent Express production entry point remains npm start after npm run build:commerce.

`npm run dev` now builds the compatibility adapter, starts the full API using backend/.env.local (or backend/.env if the former is absent), checks catalog readiness and starts Next with matching API origins. `npm run dev:api` starts that full API alone. The former isolated versioned API command is retained as `npm run dev:api:foundation`. For an already-running API, explicitly configure API_ORIGIN / LEGACY_API_ORIGIN in apps/web/.env.local; root dev verifies the compatibility response contract before starting Next. `npm run dev:web` runs Next alone. Example files are templates and are never loaded. See [the catalog startup fix and configuration limits](DEV_CATALOG_STARTUP_2026-10-10.md).

## Recorded result and deployment handoff

On 2026-10-05: lint/typecheck, production build, 109 unit, 110 API/security/provider, 52 real disposable MongoDB and seven release-gate regressions pass. Full compiled browser run passes all 58 cases, including all eight expanded telemetry cases. All four required viewport widths, keyboard/accessibility, recovery, admin/RBAC, atomic checkout/cancellation/inventory, uncertain retries and provider outages are covered. Raw HTML/SEO and foundation/storefront smokes pass. Both audits report zero high/critical advisories. Artifact and synthetic API performance budgets pass; they do not establish hosted Core Web Vitals.

Functional candidate #42 at 1737833 also passed required verify in GitHub runs 37269338774 / 37269362509. Vercel/Cloudflare preview checks fail and are part of the owner-managed hosting handoff.

Local results cannot prove actual email inbox/WhatsApp/push delivery, hosting configuration, backup/restore or live traffic/reconciliation. The owner handles those checks using PRODUCTION_CUTOVER_2026-10-03.md and the release-gate evidence template. Roll back/close checkout on integrity differences, duplicate orders, negative/unexplained stock, auth failures, sustained 5xx/checkout failure or latency thresholds, or database/provider failures as specified there. Keep the expand/migrate/verify contract: no legacy field contraction before successful production observation. Release-gate tests pass by proving incomplete production evidence is rejected; no production completion record has been fabricated.
