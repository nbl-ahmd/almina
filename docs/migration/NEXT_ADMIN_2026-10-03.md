# Dedicated Next.js administration

Implemented locally on `codex/next-admin`, 2026-10-03. This is an additive frontend migration against the hardened persistent legacy API. No deployment, production database/provider operation, account provisioning, credential rotation or media migration occurred.

## Routes and ownership

`apps/web/src/app/(admin)/admin` has its own noindex metadata, CSS, server layout and navigation. Login is outside the protected layout. The protected layout verifies the current server session before rendering; each page independently verifies its required permissions before reading data. The loading boundary sits below authentication so an anonymous direct request receives an HTTP redirect before streaming starts. The storefront moved into `(storefront)` to keep its navigation, footer and structured organization data out of administration; its URLs are unchanged.

| Next route | Existing functions |
| --- | --- |
| `/admin/login` | Cookie-based staff login, invalid-login feedback |
| `/admin` | Recent authorized orders, dedicated dashboard/navigation |
| `/admin/products` | Search, sale/disabled/out-of-stock views, bounded pagination; staff read-only inventory |
| `/admin/products/new`, `/admin/products/:id` | Product create, supported legacy edits (name, price, stock, description, images); admin publishing and deletion |
| `/admin/categories`, `/admin/categories/:id` | Category create/edit/availability/delete |
| `/admin/banners` | Upload/list/preview/delete with existing destination/media contract |
| `/admin/orders`, `/admin/orders/:id` | City-scoped orders, pending/dispatched/cancelled views, snapshots/historical caveats, dispatch billing, cancellation, existing lifecycle commands |
| `/admin/whatsapp`, `/admin/whatsapp/:recipient` | Recipient list, conversation/reply, approved templates, selected-recipient/CSV broadcasts, posters, persisted delivery reports |
| `/admin/users` | Staff provisioning, roles/city assignment at creation, account deletion and session invalidation |
| `/admin/notifications` | Foreground order-update health, own push subscribe/unsubscribe, revoke own sessions |
| `/admin/settings` | Existing store availability control |
| `/admin/batch` | Existing CSV product creation, explicit import confirmation and limits |

The audit included all active admin routes in `frontend/src/App.js`, their components and mounted backend policies. Duplicate/unmounted temporary dashboards and demo WhatsApp `/sr`/root send handlers are not reproduced. Ad-hoc order email has no active admin UI consumer; its existing admin-only backend route remains. Product update previously ignored category/sale/featured/VAT controls; the new edit form shows the fields that the handler actually persists. No new pricing, tax, inventory, lifecycle or import policy is introduced. Existing transaction-backed order commands remain authoritative; commercial order snapshots cannot be edited. Staff can view inventory but cannot create/edit/publish/delete products, manage accounts/media/messaging or change store availability.

`proxy.ts` maps `/admindash`, its active children and legacy `/admin/productlist`, `/admin/order`, sales/stock/disabled, category/product update and dispatch/cancellation links to explicit 307 destinations. Safe current query parameters are retained. Temporary redirects permit routing rollback; no production ingress cutover has occurred.

## Independent access boundaries

Browser requests use `/api/admin/*`. The gateway uses an explicit method/path allowlist, strict explicit list queries, duplicate-query rejection and bounded request bodies. It reads only the expected HTTP-only session cookie, verifies it against legacy `/api/auth/me`, enforces current-role permissions, and forwards only approved paths to configured `LEGACY_API_ORIGIN`. It forwards a controlled Origin and CSRF header only after checking the browser's exact Origin/custom header. It never forwards caller authorization roles, arbitrary upstream URLs or browser-selected forwarding headers. Upstream redirects are not followed. Responses use a recursive projection and redacted errors; password hashes, provider file IDs and push subscription keys are excluded. Cookies are issued with controlled host/path/Secure/HttpOnly/SameSite attributes. Authenticated data is never persistently cached.

The backend independently retains its default-deny policy, database-backed current session/role checks, city scoping, CSRF and upload boundaries. New WhatsApp report reads are admin-only there as well. New explicit order pagination/status predicates are validated server-side; old clients without pagination retain their existing list contract. Categories/banners/posters/recipients support additive bounded pagination; recipient lists omit embedded conversation histories. Category deletion also fixes an undefined local-media directory that previously caused a failure response after the database deletion; a synthetic handler regression covers categories without media. Product mutations additionally reject invalid negative/fractional stock and nonnumeric/negative prices before provider or database work. WhatsApp text/template fields have strict recipient/type/length/URL validation. No client-only route protection or localStorage auth is imported into Next.

Admin HTML and APIs have noindex/no-follow and no-store headers; admin metadata also excludes Googlebot. They are absent from public sitemap generation. No development diagnostic endpoint is exposed by the production build.

## Order updates and scaling

The Next client connects to authenticated `/api/admin/events`. The SSE handler samples committed, city-authorized recent orders through the backend every five seconds and emits **only invalidation/health events**, with no customer/order payload in the event data. Every sample independently checks the backend session/role/city scope. Initial connection also invalidates the view, covering an order committed between HTML rendering and stream startup. Session revocation closes the stream and redirects the client. Network/provider failures expose a retry status; EventSource reconnects, with streams bounded to 20 seconds. Abort/cancel tears down timers and active fetches, including requests disconnected before authorization finishes. A hard lifetime also aborts stalled upstream work. Navigation closes the browser stream; page restoration activates recovery polling. Dedicated regressions cover those server resource lifecycles.

A ten-second recovery poll runs when the stream is unhealthy; healthy streams do not duplicate those reads. New orders remain in the durable database and the list provides pagination, so process restarts/reconnects/load balancing do not depend on recovering an in-memory event. Notification latency is normally up to five seconds, or up to the recovery interval when streaming is unavailable. The notification is a contextual live region rather than an unannounced badge. The monitor does not guarantee a separate alert for every intermediate order during a long offline interval: the durable order list is the recovery source. External edits to records outside the latest 25-order sample require opening/reloading the relevant order; own commands refresh immediately.

Retained Socket.IO connections still authenticate exact-origin cookie sessions and reauthorize each individual socket immediately before delivering legacy events. The facade now accepts an optional `eventBus` with `subscribe(deliver) -> unsubscribe` and `publish(event, payload)`. A shared deployment bus can fan out to instances while preserving **local recipient authorization**; raw global `io.emit` is not used. The interface has a two-instance regression including role revocation. A bus is not installed/configured by this task; legacy Socket.IO clients require it before multi-instance deployment. New Next order notifications use database reconciliation and work without a shared socket adapter or sticky sessions.

Push management preserves staff-owned subscriptions and accepts an optional public `ADMIN_PUSH_PUBLIC_KEY` matching the existing sender. The dedicated admin-scoped service worker uses generic lock-screen text and opens authorized order pages. No provider sender, durable background push service, keys or browser permissions were provisioned here. Foreground updates work with push unconfigured.

## Configuration, rollout and remaining checks

- Point `LEGACY_API_ORIGIN` at the hardened legacy service. The modular API still does not own these admin mutations. `WEB_ORIGIN` must exactly match the browser origin and be present in upstream `AUTH_ALLOWED_ORIGINS`; both services must use matching APP_ENV cookie modes and the same current users/session database.
- Keep root legacy build/start deployment contracts. Apply the previously documented authentication/commerce rollout and credential rotation gates first; this change is not authorization to deploy.
- Verify staging account permissions/city names, all real media/provider workflows, notifications, historical orders and CSV mappings with sanitized data. Product/category image replacement and deletion keep the existing provider lifecycle; its non-atomic replacement and retention limitations remain from the media audit. Batch import keeps existing partial-failure/ID allocation behavior and requires staged acceptance before activation; this task does not redesign it.
- Validate load/query plans and indexes for the actual catalog/order counts. Admin pages are bounded (25 rows; 100 category choices). Offset pagination is capped at 10,000; account pagination uses the existing cursor. Confirm larger-catalog operational needs before cutover.
- The gateway deliberately does not trust/spoof forwarded client IP headers. The legacy ingress quota sees the gateway's source IP, so aggregate staff login/read quotas require staging load validation and a reviewed trusted-ingress strategy. Keep distributed account login quotas intact. Verify proxy streaming/no buffering, connection duration and quotas; recovery polling handles unavailable SSE, but does not replace capacity planning.
- CSV WhatsApp broadcasts accept up to 25 numbers per batch and show individual acceptance/failure/uncertain results. No automatic send retry occurs. Review provider consent/template/delivery reports before resending. Image uploads keep backend 5-MB-per-image/five-file limits; product CSV retains its 2-MB limit.
- Roll back by reverting frontend ingress ownership to CRA and reverting temporary redirects. Keep hardened API policies and commerce correctness fixes. There is no schema migration/backfill to reverse.

## Reproducible verification

- `npm run typecheck`, `npm run lint`, `npm test`: full workspace checks and 131 passing tests, two connection-gated database suites skipped in the ordinary run.
- `node scripts/tooling/test-commerce-integration.mjs /path/to/mongod`: 11 real disposable replica-set regressions, including new order pagination/status validation, transaction rollback, races, both real HTTP stacks and notification-job retry. No application URI or dotenv is read; only the random fixture database is removed.
- `APP_ENV=development AL_MINA_ISOLATED_BUILD=1 npm run build:foundation`: isolated Turbopack production build and API bundle. `AL_MINA_ISOLATED_DEV=1` uses `.next-admin-dev` for a second local dev server without disturbing an existing `.next` session; build output stays in `.next-verification`.
- Run `node scripts/tooling/admin-fixture.mjs` on loopback 4600; run isolated Next dev on 4601 with `WEB_ORIGIN=http://localhost:4601`, both API origins set to the fixture and APP_ENV=development. `node scripts/tooling/verify-admin-browser.mjs` covers 15 direct routes, 60 viewport checks (360/390/768/1280), axe audits, real forms/requests, login/logout/reload, staff denial, CSRF/query/path bypass, order arrival and outage recovery. `ADMIN_VERIFY_FUNCTIONAL_ONLY=1` reruns behavior without repeating the visual matrix. These scripts use synthetic staff/customer/product data only.
- `node scripts/tooling/smoke-admin.mjs`: compiled SSR/redirect, noindex/no-store, authorization/query/CSRF negatives, PII-free authenticated SSE and absent production MCP. `AL_MINA_ISOLATED_BUILD=1 npm run smoke:storefront` confirms the moved storefront URLs, SSR, 404s/redirects and outage behavior remain intact.
- Version-matched Next 16.3.8 bundled route-group/auth/route-handler docs were read. Live Turbopack `/_next/mcp` compilation/routes/error tools and browser/React inspection were exercised.
