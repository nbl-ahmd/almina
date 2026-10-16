# Atlas setup for Al Mina

Recommended topology: one business organization, production in its own Atlas project/cluster, separate nonproduction project/cluster for hosted staging, and the existing local replica-set demo for daily development. A cloud development database is optional inside the nonproduction cluster. Do not put staging/development on the production cluster.

## Names

| Resource | Name |
| --- | --- |
| Organization | Al Mina Pharmacy |
| Production project | almina-production |
| Production cluster | almina-prod-01 |
| New production target database | almina_prod |
| Production runtime database user | almina_prod_api |
| Nonproduction project | almina-nonproduction |
| Nonproduction cluster | almina-nonprod-01 |
| Staging database | almina_staging |
| Staging runtime database user | almina_staging_api |
| Optional cloud development database/user | almina_development / almina_dev_api |
| Existing local demo database | almina_local_demo |

The production target name is a proposal for a new deployment, not authorization to rename or abandon the existing production database. If preserving/moving the existing cluster, retain its current database name and URI behavior until a separate reviewed migration changes them.

## Create the account and organization

1. Register at https://cloud.mongodb.com with a business-controlled email/account; verify it and enable MFA. For Google/GitHub sign-in, enable MFA at that provider. Store recovery codes securely. Staff pharmacy users are application accounts, not Atlas owners.
2. Create organization `Al Mina Pharmacy`, select Atlas when prompted, and enter business billing details for paid production resources. Keep a second trusted named owner for recovery if available; do not share one login among staff.
3. Create projects `almina-production` and `almina-nonproduction`. Assign human roles separately by responsibility. Each project holds its own database credentials/network settings. Names are organizational labels, not credentials.

## Create clusters

1. Choose Atlas Core for the established architecture; avoid an unfamiliar preview edition during this migration.
2. Check the Render API's current region in its dashboard before choosing Atlas. Prefer AWS in the matching region: Render Frankfurt → eu-central-1; Singapore → ap-southeast-1; Oregon → us-west-2; Virginia → us-east-1; Ohio → us-east-2 where the selected tier supports it. Use the same region for nonproduction as production when rehearsing performance. Keep Vercel server functions near the API where possible; the browser/CDN location does not determine database placement.
3. In the production project, create `almina-prod-01`, a dedicated replica-set deployment, with backups and continuous recovery enabled. M10/M20 are candidate tiers for low-traffic workloads; select final capacity from representative data/load results. MongoDB recommends M30+ for general production workloads. Check the quoted regional cost, storage, backups and scaling limits before provisioning. A tier label alone proves no capacity target.
4. In nonproduction, create `almina-nonprod-01`: Free M0 for a small synthetic staging catalog, Flex for more capacity/daily snapshots, or dedicated for production-equivalent load/restore rehearsal. Free has no managed backups; Flex has no continuous backup/PITR. Those tiers are not a faithful production performance comparison.
5. Prefer MongoDB 8.0 where selectable to match the tested application baseline; do not opt into automatic major-version upgrades before compatibility testing. Atlas manages patch availability.
6. Skip generic sample datasets. Preserve replica-set transaction support for checkout. Enable production termination protection when available and set billing/storage/connection/CPU/replication alerts appropriate to the chosen tier.

## Database users

For each project, open Database Access/Database Users and add a password-authenticated runtime user. Generate a unique strong password and store it in the password manager/provider secret configuration.

Production: `almina_prod_api`, role `readWrite` on only `almina_prod` (or the reviewed existing database name). Restrict access to `almina-prod-01` when offered. Staging: `almina_staging_api`, readWrite only on `almina_staging`, restricted to `almina-nonprod-01`. Optional development: `almina_dev_api`, readWrite only on `almina_development` in nonproduction. Do not select readWriteAnyDatabase/Atlas admin for the normal backend account. Use separately reviewed temporary migration credentials if a migration needs additional privileges; use read-only access for inspection where sufficient.

Atlas login users manage infrastructure; MongoDB database users authenticate the API; pharmacy admin/staff users live in the application's users collection. These three identities are separate.

## Network access

In Render, open the API service's Connect/outbound information and copy every listed outbound IP/CIDR range. Add those ranges to the production Atlas project's database IP access list. Add the staging Render service's ranges only to nonproduction. If regional outbound ranges are shared, this is network filtering rather than per-service identity; database credentials remain the authentication boundary.

For Compass or local cloud-development use, add your current public IP to nonproduction, preferably with expiration. A laptop IP may change. Production operator access should be controlled and temporary. Do not add 0.0.0.0/0 as the standard setup. Vercel does not need database network access because this application connects Atlas only from the persistent API.

## Database creation and connection strings

The database name in a URI does not create the database until a write creates data. You can use Atlas Data Explorer/Create Database to create the selected database with an empty `products` collection; that name matches the existing app. Do not manually invent order/user schemas or load sample documents. The reviewed application setup/migrations initialize the other collections and indexes.

Open cluster Connect → Drivers → Node.js and select a compatible current driver option. This repo uses native MongoDB driver 7.7. Copy the generated `mongodb+srv://` template. Substitute the specific runtime database user/password and explicitly include the intended database name before the query string. Preserve TLS/retry/majority settings supplied by Atlas. URL-encode special characters in username/password; keep SCRAM authSource=admin if needed when adding the application database path. Example placeholders:

```text
mongodb+srv://almina_prod_api:<ENCODED_PASSWORD>@<ATLAS_HOST>/almina_prod?retryWrites=true&w=majority&authSource=admin
mongodb+srv://almina_staging_api:<ENCODED_PASSWORD>@<STAGING_ATLAS_HOST>/almina_staging?retryWrites=true&w=majority&authSource=admin
```

Do not paste actual URIs/passwords in chat, source, screenshots or browser variables.

## Configure this repository and hosting

The full API is `backend/server.js`, serving versioned and compatibility contracts plus workers. Its configuration uses the database selected in MONGODB_URI. A URI without the intended database path can silently select the driver's default database. Do not deploy the standalone foundation-only API instead.

Render production settings:

```dotenv
APP_ENV=production
NODE_ENV=production
AUTH_ALLOWED_ORIGINS=https://www.alminapharmacy.com
MONGODB_URI=<reviewed production URI injected in Render>
ADMIN_PUSH_ENABLED=false
COMMERCE_TELEMETRY_ENABLED=false
```

Do not activate/change the current production URI simply because a new cluster exists. Keep checkout and writers coordinated with the release gate.

Render staging settings:

```dotenv
APP_ENV=staging
NODE_ENV=production
AUTH_ALLOWED_ORIGINS=https://<exact-staging-web-domain>
MONGODB_URI=<staging URI injected in Render>
ADMIN_PUSH_ENABLED=false
COMMERCE_TELEMETRY_ENABLED=false
```

Vercel gets APP_ENV, exact WEB_ORIGIN, API_ORIGIN and LEGACY_API_ORIGIN pointing to the appropriate Render API. It gets no database URI/password. Hosted previews must use staging API/database; production uses the production API. A stable staging hostname avoids wildcard cookie/Origin permissions.

Daily local development:

```sh
cd /Users/administrator/Nabeel/dev/almina
npm run dev:demo
```

This uses the existing dedicated loopback replica set and persistent synthetic data, no Atlas account, and no real notification credentials. Frontend is 4760, API 4770, MongoDB 4781. Checkout requires a replica set, so an ordinary standalone local mongod is not an equivalent replacement.

If choosing optional cloud development instead, copy backend/.env.development.example to ignored backend/.env.local and set APP_ENV/NODE_ENV=development plus the almina_dev_api URI containing `/almina_development`. Then `npm run dev` runs Next 3000/API 4000. It never falls back to production .env. Cloud dev needs its own reviewed catalog/admin/policy initialization; dev:demo intentionally cannot seed Atlas. Keep real provider credentials absent or use separate controlled testing providers. Example files are never automatically loaded.

Migration/recovery CLIs are separately gated and use the `packages/config` API environment: DATABASE_MODE=enabled, DATABASE_ENV matching APP_ENV and explicit MONGODB_DATABASE in addition to URI/origins. The full runtime does not require those foundation-only variables. Planning commands are connection-free; apply requires the reviewed environment, backup and maintenance/recovery gates. Fresh recovery bootstrap creates a closed store and one administrator; it is not the procedure for replacing an existing production database.

## Backups and existing production data

Enable cloud backups and continuous/PITR recovery on the dedicated production cluster. A proposed starting retention is daily snapshots for 30 days plus a reviewed continuous restore window; choose retention and recovery targets with the business. Include separate-region backup copies if appropriate. Rehearse restoration into a separate target and verify IDs, stock, totals, receipts, counters, indexes and media references before release.

A new account does not necessarily require copying all production data. If the purpose is ownership/billing, Atlas supports moving an existing project between organizations when an owner has access to both. The documented move preserves cluster configuration/connection strings/uptime, but organization teams and API keys need separate review. If a new cluster is required, perform a separately planned verified transfer/restore with preserved IDs/history, final-write coordination and rollback. Existing production remains until acceptance; changing the Render URI is the eventual switch, not the backup/migration itself.

Create and validate nonproduction first, initialize synthetic/sanitized staging data, test Vercel→Render→Atlas including checkout transactions and restore/provider workflows, then rehearse the production migration. Never seed demo orders into production or point production at an empty unverified target.

Sources checked on 2026-10-14: [Atlas organization/project separation](https://www.mongodb.com/docs/atlas/organizations-projects/), [project creation/moves](https://www.mongodb.com/docs/atlas/tutorial/manage-projects/), [cluster tiers](https://www.mongodb.com/docs/atlas/manage-clusters/), [database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/), [IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/), [backups](https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/), [Flex limits](https://www.mongodb.com/docs/atlas/reference/flex-limitations/), [Render Atlas region/network setup](https://render.com/docs/connect-to-mongodb-atlas).
