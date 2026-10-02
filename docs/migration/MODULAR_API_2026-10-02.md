# Modular Node API migration

**Security supersession:** the bearer-session and legacy-auth limitations described in this historical implementation report are superseded by [authentication hardening](AUTH_HARDENING_2026-10-02.md) and the [current route matrix](AUTHORIZATION_MATRIX_2026-10-02.md). Production rollout remains gated.

Implemented on `codex/modular-api`, 2026-10-02. This is an additive production-service migration, **not a deployment or complete migration of the legacy backend**. `apps/api` now owns validated catalog reads, staff sessions and authorized order/staff reads. Legacy checkout, mutations, uploads, realtime and provider integrations remain on the legacy service, with the audited vulnerabilities still unresolved there. Root `build`/`start`, legacy callers, database documents, identifiers, historical totals and shared URLs are unchanged.

## Service architecture and operation

- Express **5.2.1**, confirmed against the registry at execution time; TypeScript, Node 24, MongoDB driver 7.7.0 and Zod 4.6.5 remain pinned. Added Helmet 8.3.0, express-rate-limit 8.7.0 and bcryptjs 3.0.3. No legacy dependency upgrade or startup import.
- `src/http`: middleware composition, strict input validation, cursor validation, versioned routes and centralized error handling. `src/modules/catalog`, `auth`, `orders`: database queries and DTO mapping. `src/database.ts`: lazy shared pool and lifecycle. `src/database/indexes.ts`: explicit additive index plan.
- Unknown fields, arrays in scalar query parameters, MongoDB filters/operators, caller roles, arbitrary sorts and offset pagination are rejected. GET/HEAD bodies are rejected. JSON objects only, 16 KiB maximum, no compressed bodies, multipart or form parsing. Invalid JSON is 400; too large is 413; unsupported types/encodings are 415.
- Exact `WEB_ORIGIN` CORS allowlist, no wildcard/credential cookies; server callers may omit Origin. Preflight permits GET/HEAD/POST and Authorization/Content-Type only. CORS is never the authorization boundary. Helmet supplies security headers; responses use `Cache-Control: no-store` and generated UUID request IDs.
- Global API quota: 120 requests/minute/IP; login quota: 10 attempts/15 minutes/IP. These use **per-process** memory stores. Health/status bypass the public quota. Multi-replica deployments require a shared quota store or equivalent gateway enforcement before cutover. `API_TRUST_PROXY` accepts only up to ten explicit IP addresses; default trusts none. A trusted proxy must overwrite forwarding headers. Behind a proxy without this configuration, users share the proxy IP quota.
- Structured operational logs allow only request ID, route template, method, status and duration. Never serialize paths/query strings, headers, bodies, IPs, database exceptions, passwords or customer fields. Expected failures return stable messages; late failures after a request deadline are contained without Express's default exception logging.
- Request deadline: 10 seconds (504), incoming request/socket timeout: 15 seconds, headers: 10 seconds, keepalive: 5 seconds, maximum 50 headers. Query budgets: 3-second server execution / 5-second driver operation. Pool: maximum ten connections, 3-second pool wait/selection/connect, 5-second socket, 60-second idle lifetime. Configure matching ingress limits and TLS termination.
- Liveness never checks MongoDB. Readiness/status ping MongoDB when enabled and return 503 while draining. Database-disabled foundation mode remains healthy and reports `disabled`; catalog access returns 503. Readiness tests connectivity, not rollout/index/data approval.
- SIGTERM/SIGINT mark draining, stop accepting requests, finish in-flight requests, close the pool and use a ten-second forced shutdown deadline. Repeated signals and pool close are idempotent. Configuration and native database failure messages never leave the service boundary.

## Routes and authorization

All paths below are exact relative to `/api/v1`, except health endpoints. GET routes also support HEAD. Unsupported methods on implemented routes return 405 with `Allow`; unknown routes return 404. Common success envelope: `{ data, requestId }`. Errors: `{ error: { code, message }, requestId }`. Logout is 204 without a JSON body.

| Method | Route | Authentication / permission | Input |
|---|---|---|---|
| GET | `/health/live` | Public | Empty query, no body |
| GET | `/health/ready` | Public | Empty query, no body |
| GET | `/status` | Public | Empty query, no body |
| GET | `/catalog/products` | Public, visible products/categories only | Cursor, categoryId, featured, sale, q |
| GET | `/catalog/products/:id` | Public, visible products/categories only | MongoDB ID; empty query |
| GET | `/catalog/products/by-business-id/:productId` | Public, visible products/categories only | `PD` business ID; empty query |
| GET | `/catalog/categories` | Public, visible categories only | Cursor |
| GET | `/catalog/categories/:id` | Public, visible category only | MongoDB ID; empty query |
| GET | `/catalog/banners` | Public | Cursor |
| GET | `/catalog/store` | Public | Empty query |
| POST | `/auth/login` | Public, separately rate limited | username, password; empty query |
| GET | `/auth/me` | Current staff session | Empty query |
| POST | `/auth/logout` | Current staff session | Empty query, no body |
| GET | `/admin/products` | Admin | Cursor, categoryId, featured, sale, disabled, q |
| GET | `/admin/products/:id` | Admin | MongoDB ID; empty query |
| GET | `/admin/orders` | Admin, or staff limited to assigned cities | Cursor, city, dispatched, canceled |
| GET | `/admin/orders/:id` | Admin, or staff limited to assigned cities | MongoDB ID; empty query |
| GET | `/admin/users` | Admin | Cursor |

There is **no public order list**. The legacy app has no trustworthy customer identity or ownership contract to authorize customer order reads. Order summaries omit name, email, phone and address; authorized detail reads include explicitly selected fulfillment fields. Access outside a staff member's cities returns 404 on details; explicit unauthorized city filters return 403. Empty staff city assignments grant no order access. Admins can read all cities. This intentionally supersedes the legacy frontend-only access policy.

Staff login verifies existing bcrypt hashes asynchronously. Only database roles `admin`/`user` are recognized; request roles are rejected. Passwords are capped at 72 UTF-8 bytes; malformed hashes or costs outside 4–14 fail closed. Credentials and invalid sessions return the same generic 401. Opaque 256-bit bearer sessions last eight hours; only SHA-256 token digests are stored in the new `api_sessions` collection. Expiry is checked on every request regardless of delayed TTL cleanup. Each request reloads the user, role and cities; deleted/disabled users, changed permissions and logout take effect immediately. Password changes do not automatically revoke other sessions yet; no password-update endpoint is migrated.

**Existing staff accounts must be inventoried and verified before enabling this login against production data**, because legacy public signup allowed arbitrary roles. Legacy JWTs are deliberately rejected; their committed signing credential requires rotation/revocation, and staff must log in through the new endpoint after caller migration. Other committed credentials still require the rotation described in the audit; none were rotated here.

## Validation schema inventory

Defined in `packages/contracts/src/api.ts` (with health/error/envelope schemas retained in `index.ts`):

| Schema | Contract |
|---|---|
| `cursorQuerySchema` | Decimal limit 1–100, default 20; optional bounded base64url cursor; strict keys |
| `catalogQuerySchema` | Cursor plus ObjectId categoryId, literal true/false featured/sale, q 2–80 letters/numbers/spaces |
| `adminProductQuerySchema` | Catalog query plus literal true/false disabled |
| `orderQuerySchema` | Cursor plus city 1–100 chars and literal true/false dispatched/canceled |
| `resourceParamsSchema` | Exactly one 24-character hex MongoDB ID |
| `businessProductParamsSchema` | Exactly one `PD` ID with 1–20 digits |
| `loginBodySchema` | Exactly username 1–100 chars and password 1–72 UTF-8 bytes |
| `emptyQuerySchema` | No query keys |
| Private cursor schema | Version 1, 64-character scope digest, ObjectId boundary; no database object input |

Response validation: `productDtoSchema`, `categoryDtoSchema`, `bannerDtoSchema`, `storeDtoSchema`, `staffDtoSchema`, `loginDtoSchema`, `orderSummaryDtoSchema`, `orderDetailDtoSchema`, `pageSchema`, `successSchema`, `statusSchema`, `apiErrorSchema`. Responses are explicit field allowlists and validated before sending. Cursor scope binds filters, resource, and order/user identity permissions; cursors are not credentials and authorization is always reapplied. Changing page size is allowed. The old offset schema remains exported for existing consumers but no new listing uses it.

## Index inventory and migration

Every collection retains MongoDB's existing `_id` index. Legacy `users.username` already declares a unique index in Mongoose; verify its **actual presence and duplicate inventory** before rollout. The new service does not build indexes automatically or assume Mongoose declarations were applied.

| Collection | New index name | Key / options |
|---|---|---|
| products | `v1_product_business_id` | `{ product_id: 1 }`, nonunique pending duplicate inventory |
| products | `v1_product_category_page` | `{ category: 1, _id: -1, disabled: 1 }` |
| products | `v1_product_featured_page` | `{ featured: 1, _id: -1, disabled: 1 }` |
| products | `v1_product_sale_page` | `{ sale: 1, _id: -1, disabled: 1 }` |
| products | `v1_product_search` | name/description text, weights 5/1, language `none` |
| orders | `v1_order_city_page` | `{ customer.city: 1, _id: -1 }` |
| orders | `v1_order_state_page` | `{ dispatched: 1, canceled: 1, _id: -1 }` |
| orders | `v1_order_city_state_page` | `{ customer.city: 1, dispatched: 1, canceled: 1, _id: -1 }` |
| api_sessions | `v1_session_token` | `{ tokenHash: 1 }`, unique |
| api_sessions | `v1_session_expiry` | `{ expiresAt: 1 }`, TTL zero seconds |

`npm run db:indexes:plan` prints this plan without accessing configuration or any database. `npm run db:indexes:apply` requires explicit matching APP_ENV/DATABASE_ENV, enabled mode, reviewed database name and injected least-privilege URI. It was **not run**. Use sanitized staging first, inspect existing indexes and data, review build load, and apply during a controlled rollout. Stable names/specifications make reruns idempotent. A conflicting existing text index fails rather than being dropped; MongoDB permits only one text index per collection. Partial application is additive and can be resumed after resolving conflicts.

Rollback: route traffic back to the legacy owner only where its existing safety permits; retain documents and additive indexes. Nothing here requires deleting data or contracting fields. Index removal is a later operator-reviewed task after query usage is measured. Sessions expire naturally; retaining the new collection does not affect legacy data. Plan index permissions separately from runtime data access.

## Performance-sensitive queries

1. Product listing: validated equality filters, descending `_id` keyset (`_id < cursor`), projected fields, `limit + 1`, no skip/count. Public queries join category visibility by indexed category `_id` before limiting; this avoids the legacy post-page filtering bug. Sparse visible catalogs/orphaned categories can require many candidates; measure documents examined. Admin listing omits the visibility join.
2. Search: bounded plain-word `$text` against the name/description index, then deterministic `_id` pagination. No regex or raw caller predicates. Text filtering plus `_id` sorting can still examine/sort many matches; disk spill is disabled and timeouts are enforced. Measure broad terms and filter combinations with explain in staging. For larger catalogs, introduce a separately verified Atlas Search contract with native search pagination rather than falling back to regex. No search index means 503, never an unindexed regex fallback.
3. Orders: indexed city assignment and `_id` pagination; status filters preserve old missing flags via `$ne: true` for false. This is less selective than a normalized equality status; combined flags and large city `$in` sets need explain/load testing. No nested live-product population or unbounded customer list.
4. Authentication: indexed exact username, unique token digest, indexed user `_id`; async bcrypt is deliberately CPU intensive and separately throttled. Verify the username index on real data and load-test login capacity. Session TTL does not replace expiry checks.
5. Categories/banners/staff: projected descending `_id` pages; no unbounded arrays, skip or total counts. Product details use indexed `_id` or business ID and one category visibility lookup. Store status uses deterministic oldest `_id` singleton selection and fails closed when missing/invalid; verify legacy multiple-store data.

Required staging evidence before cutover: `explain('executionStats')` for representative category/featured/sale/search/status/city combinations and first/later pages, examined/returned ratios, absence of unwanted COLLSCAN, sort memory, p95 timings, pool wait, rate-limit behavior through the actual ingress, and indexes against the actual collection sizes. No database/provider/production probing or performance measurements were performed here.

## Compatibility changes and ownership

- New versioned contracts are additive. No silent redirects/aliases to sensitive legacy routes and no caller/deployment switch. The Next storefront still uses its guarded legacy adapter. Existing `/api/products`, `/api/category`, `/api/orders`, `/api/auth`, `/api/store`, `/api/banners`, `/api/batch`, `/api/whatsapp` remain legacy-owned; their unsafe implementations are **not remediated by deploying the new service alongside them**.
- Legacy JSON `filter`, `disabledCat`, `offset`, raw-array response and arbitrary regex contracts are superseded in v1 by explicit query parameters, bounded cursor envelopes and plain-word indexed search. Substring/regex/relevance behavior changes to word search; result order changes from legacy stock/createdAt/name sorting to stable descending document `_id`. `_id` approximates insertion order, not business creation time. No deep page-number jumping or implicit whole-catalog fetch.
- Public visibility treats a missing disabled flag as enabled, excludes explicitly disabled/orphaned categories/products, and cannot query disabled inventory. New admin product reads include disabled records. IDs and stored prices are preserved; no money conversion or price writes occur.
- DTO IDs are `id`/`productId`/`categoryId`, not serialized raw `_id`/populated Mongoose objects. Media fields remain existing asset references; image streaming/CDN/provider migration is not implemented. Related products use the category-filtered list rather than an unbounded detail response.
- No legacy password hashes, push subscriptions or database-internal fields in staff responses. Order list PII is removed; fulfillment PII is confined to authorized details. Legacy orders have no reliable immutable commercial line snapshots, so detail returns quantity/product references and `snapshotAvailable: false`; no live price/name reconstruction or mutation.
- Checkout, order dispatch/cancellation/editing, pricing/inventory writes, admin provisioning/product/category/banner/store mutations, uploads, batch actions, email, WhatsApp, webhooks, push and socket.io are **not migrated**. These require the audit's commerce/auth/upload/provider tests and policy decisions before replacement. V1 intentionally has no insecure compatibility forwarding for them. This service can run as a separate read migration, but cannot yet replace the entire production backend.

## Verification

Local checks: full workspace typecheck/lint and **52 tests** (17 added API/security regressions plus proxy-configuration coverage), API bundle, full foundation production build with explicit `APP_ENV=development`, compiled-process smoke and index-plan dry run. Tests use synthetic documents/query doubles and loopback HTTP only; no MongoClient connection, production credentials, provider request or commerce data write. Query doubles validate generated predicates/projections/budgets but do not prove MongoDB planner/index behavior. Compiled smoke covers health, disabled-catalog 503, invalid query 400, auth 401, restricted CORS/preflight, headers, body 413 and clean SIGTERM exit.

Initial full-build attempts exposed the required explicit APP_ENV configuration and a shared-contract `.js` import incompatible with Turbopack's TypeScript resolution. The contract export now follows the existing extensionless convention. No Next.js framework behavior or storefront routes were edited.

Reference documentation consulted: [Express production security](https://expressjs.com/en/advanced/best-practice-security/), [Express 5 API](https://expressjs.com/en/5x/api/application/), [MongoDB indexed text queries](https://www.mongodb.com/docs/drivers/node/current/crud/query/text/), [MongoDB find/projection/time limits](https://www.mongodb.com/docs/manual/reference/command/find/), [express-rate-limit configuration](https://express-rate-limit.mintlify.app/reference/configuration).
