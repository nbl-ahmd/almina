# Local completion and verification

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

For a durable local database, use a separate local replica set, explicit backend/.env.local configuration and the reviewed bootstrap/index/recovery procedures; do not aim scripts at production. The full persistent Express entry point is npm start after npm run build:commerce. Next npm run dev uses the apps/web development example with API/legacy origins explicitly matching the API. npm run dev:api alone starts the versioned API foundation; it is not the full retained management surface.

## Recorded result and deployment handoff

On 2026-10-05: lint/typecheck, production build, 109 unit, 110 API/security/provider, 52 real disposable MongoDB and seven release-gate regressions pass. Full compiled browser run passes 57 cases; expanded telemetry rerun passes eight (58 distinct cases). All four required viewport widths, keyboard/accessibility, recovery, admin/RBAC, atomic checkout/cancellation/inventory, uncertain retries and provider outages are covered. Raw HTML/SEO and foundation/storefront smokes pass. Both audits report zero high/critical advisories. Artifact and synthetic API performance budgets pass; they do not establish hosted Core Web Vitals.

Local results cannot prove actual email inbox/WhatsApp/push delivery, hosting configuration, backup/restore or live traffic/reconciliation. The owner handles those checks using PRODUCTION_CUTOVER_2026-10-03.md and the release-gate evidence template. Roll back/close checkout on integrity differences, duplicate orders, negative/unexplained stock, auth failures, sustained 5xx/checkout failure or latency thresholds, or database/provider failures as specified there. Keep the expand/migrate/verify contract: no legacy field contraction before successful production observation. Release-gate tests pass by proving incomplete production evidence is rejected; no production completion record has been fabricated.
