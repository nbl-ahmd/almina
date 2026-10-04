# Retained API ownership and retirement inventory

Inspected at master `d912a269`, 2026-10-04. Every mounted route is independently governed by the default-deny server boundary. GET/HEAD media and webhook paths may perform provider reads/signed-event writes. This first extraction moves store behavior behind retained URLs.

| Method | Retained URL | Boundary | Current owner/effects |
| --- | --- | --- | --- |
| GET | /api/recovery/template | admin | maintained recovery/csv.ts; no provider effects |
| POST | /api/recovery/preview | admin | maintained recovery/catalog.ts; actor-bound preview |
| POST | /api/recovery/commit | admin | maintained recovery/catalog.ts; closed-store transaction/ledger |
| POST | /api/auth/login | login | Login.js → shared sessions/RBAC; staff CRUD adapter |
| POST | /api/auth/logout | staff | Login.js → shared sessions/RBAC; staff CRUD adapter |
| POST | /api/auth/logout-all | staff | Login.js → shared sessions/RBAC; staff CRUD adapter |
| GET | /api/auth/me | staff | Login.js → shared sessions/RBAC; staff CRUD adapter |
| POST | /api/auth/signup | admin | Login.js → shared sessions/RBAC; staff CRUD adapter |
| GET | /api/auth/users | admin | Login.js → shared sessions/RBAC; staff CRUD adapter |
| DELETE | /api/auth/users/:id | admin | Login.js → shared sessions/RBAC; staff CRUD adapter |
| POST | /api/products | admin | products.js → Mongoose catalog and Drive; extraction pending |
| GET | /api/products | public | products.js → Mongoose catalog and Drive; extraction pending |
| GET | /api/products/search | public | products.js → Mongoose catalog and Drive; extraction pending |
| GET | /api/products/images/:filename | public | products.js → Mongoose catalog and Drive; extraction pending |
| GET | /api/products/category/:categoryId | public | products.js → Mongoose catalog and Drive; extraction pending |
| GET | /api/products/details/:productId | public | products.js → Mongoose catalog and Drive; extraction pending |
| GET | /api/products/:id | public | products.js → Mongoose catalog and Drive; extraction pending |
| DELETE | /api/products/:id | admin | products.js → Mongoose catalog and Drive; extraction pending |
| PUT | /api/products/publish/:productId | admin | products.js → Mongoose catalog and Drive; extraction pending |
| PUT | /api/products/:id | admin | products.js → Mongoose catalog and Drive; extraction pending |
| POST | /api/category | admin | categories.js → Mongoose categories and Drive |
| GET | /api/category | public | categories.js → Mongoose categories and Drive |
| GET | /api/category/images/:filename | public | categories.js → Mongoose categories and Drive |
| GET | /api/category/:id | public | categories.js → Mongoose categories and Drive |
| PUT | /api/category/disable/:id | admin | categories.js → Mongoose categories and Drive |
| PUT | /api/category/:id | admin | categories.js → Mongoose categories and Drive |
| DELETE | /api/category/:id | admin | categories.js → Mongoose categories and Drive |
| POST | /api/banners | admin | banners.js → Mongoose banners and Drive |
| GET | /api/banners | public | banners.js → Mongoose banners and Drive |
| GET | /api/banners/images/:filename | public | banners.js → Mongoose banners and Drive |
| DELETE | /api/banners/:id | admin | banners.js → Mongoose banners and Drive |
| POST | /api/batch | admin | batchProductRouter.js → legacy CSV writer; recovery replacement pending |
| PUT | /api/store/status | admin | storeRouter.js → maintained store/service.ts |
| GET | /api/store/status | public | storeRouter.js → maintained store/service.ts |
| POST | /api/store/cart/add | public | storeRouter.js → maintained store/service.ts |
| POST | /api/orders | public | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| POST | /api/orders/quote | public | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| POST | /api/orders/email | admin | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| POST | /api/orders/subscribe | staff | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| DELETE | /api/orders/subscribe | staff | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| GET | /api/orders | orders | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| GET | /api/orders/:id | orders | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| PUT | /api/orders/edit/:orderId | admin | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| PUT | /api/orders/:orderId | orders | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| PUT | /api/orders/cancel/:orderId | orders | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| POST | /api/whatsapp/image | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| GET | /api/whatsapp/image | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| GET | /api/whatsapp/image/:filename | public | whatsapp.js → Meta/Drive/conversation/report adapters |
| DELETE | /api/whatsapp/image/:id | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| POST | /api/whatsapp/s | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| POST | /api/whatsapp/sr | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| POST | /api/whatsapp | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| POST | /api/whatsapp/text | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| GET | /api/whatsapp/reports | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| GET | /api/whatsapp/recipients | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| GET | /api/whatsapp/messages/:recipient | admin | whatsapp.js → Meta/Drive/conversation/report adapters |
| POST | /api/whatsapp/webhook | webhook | whatsapp.js → Meta/Drive/conversation/report adapters |
| GET | /api/whatsapp/webhook | verification | whatsapp.js → Meta/Drive/conversation/report adapters |

## Background and provider operations

- Shared `orders/commerce.ts` atomically writes product stock, orders, counter, receipts/outbox and cancellation history/restock. Both HTTP stacks use it.
- `commerce/outbox.cjs` leases notification jobs and SMTP through `integrations/order-email.cjs`. At least once; acceptance/crash can duplicate delivery. Legacy persistent process owns worker.
- `security/realtime.cjs` authenticates/rechecks Socket.IO and SSE invalidations; shared deployment bus pending.
- `Login.js` provisions password hashes/deletes accounts/revokes sessions; `sessions.cjs` owns sessions and quotas.
- Drive creates/streams products/categories/banners/WhatsApp posters. Category replacement and category/banner/poster removal still delete provider files. Product deletion removes records/assets. Replace with retained references/archive.
- Meta template/text/broadcast sends persist conversations/reports. Signed webhook receipts prevent duplicates; receipt-before-processing failure requires operator recovery.
- Push subscriptions belong to current staff; real delivery configuration/parity remains hosting gate.
- Recovery/bootstrap/commerce/index CLI apply operations are explicit maintenance actions, never builds/startup. Recovery creates no lost history.

## Next admin routes and consumers

`/admin/login` and protected `/admin/{dashboard,products,categories,banners,orders,whatsapp,users,notifications,settings,batch}` use `lib/admin/policy.ts`, authenticated no-cache gateway and retained boundary. Products include create/detail/edit and sale/disabled/out-of-stock views; orders include status/billing/cancellation; WhatsApp includes conversations/templates/posters/broadcast/reports. Public Next checkout/quote gateway uses modular commerce. CHECKOUT_ENABLED gates ordering. Legacy redirects remain reversible.

## Fallback dependencies

- `frontend/` now builds with Vite/React; retains complete storefront/admin router, cookie client, compatibility checkout, media/static assets. Preserve all URLs and identities.
- `e2e-servers.mjs` builds/serves frontend/build. Commerce/admin browser regressions, verify-commerce-browser and bundle/performance fixtures depend on retained client.
- Root build/start remain retained backend contracts. Backend dependencies support Express/Mongoose, sessions/bcrypt, Google Drive/Sharp/Multer, SMTP, Socket.IO, Meta and CSV.
- Retirement requires Next route/business/provider parity, migrated tests/callers/assets, hosted acceptance, production observation/rollback and separate deletion PR. A new UI does not authorize retirement.
- CDN scalar/array filenames, Drive IDs, Cloudinary URLs, historical order lines/snapshots, cookie names, outbox/receipt/counter collections are compatibility contracts. Preserve all until replacements pass.

## Verification

Inventory regression compares mounted routers with every documented policy/route. Extraction tests verify domain and retained HTTP parity against disposable MongoDB. Provider effects require injected adapters and outage/retry tests. Security and integrity precede interface polish.
