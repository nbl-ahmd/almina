# Al Mina Pharmacy

Next.js 16 App Router storefront and administration, TypeScript commerce domains, Express 5 persistent API and native MongoDB transactions. Use Node 24.21.x and npm 11.19.x.

[Local setup, disposable sample application and complete verification commands](docs/migration/LOCAL_VERIFICATION_2026-10-05.md) explain how to run without production data or provider credentials. [Migration status](docs/migration/MIGRATION_STATUS.md) records evidence and focused draft PRs.

Install from both committed lockfiles:

```sh
npm ci
npm ci --prefix backend
npx --no-install playwright install chromium
```

The active frontend is apps/web. apps/api contains maintained API/domain modules; backend retains the production-compatible Express entry point and adapters. npm run dev:api alone does not include the full management surface. Follow the local guide for the disposable full application.

Production hosting is owner-managed. Keep [release acceptance and rollback](docs/migration/PRODUCTION_CUTOVER_2026-10-03.md), the required verify gate, historical fields/media and compatible rollback artifacts. Local verification does not authorize a master merge or production cutover.
