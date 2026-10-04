# Retained API ownership and retirement inventory

Inspected at master `d912a269`, 2026-10-04. Every mounted route is independently governed by the default-deny server boundary. GET/HEAD media and webhook paths may perform provider reads/signed-event writes. This first extraction moves store behavior behind retained URLs.

| Method | Retained URL | Boundary | Current owner/effects |
| --- | --- | --- | --- |
| GET | /api/operations | admin | Maintained process metrics and bounded read-only integrity/queue snapshot |
| GET | /api/recovery/template | admin | maintained recovery/csv.ts; no provider effects |
| POST | /api/media/products/:id | admin | Maintained signed Cloudinary upload/reference ledger; bounded authenticated adapter |
| POST | /api/recovery/preview | admin | maintained recovery/catalog.ts; actor-bound preview |
| POST | /api/recovery/commit | admin | maintained recovery/catalog.ts; closed-store transaction/ledger |
| POST | /api/auth/login | login | Login.js → shared sessions/RBAC; staff CRUD adapter |
| POST | /api/auth/logout | staff | Login.js → shared sessions/RBAC; staff CRUD adapter |
| POST | /api/auth/logout-all | staff | Login.js → shared sessions/RBAC; staff CRUD adapter |
| GET | /api/auth/me | staff | Login.js → shared sessions/RBAC; staff CRUD adapter |
| POST | /api/auth/signup | admin | Maintained serialized staff provisioning and actor audit; retained URL adapter |
| GET | /api/auth/users | admin | Maintained bounded active staff projection; retained URL adapter |
| DELETE | /api/auth/users/:id | admin | Maintained transactional deactivation/session revocation and actor audit; no deletion |
| POST | /api/products | admin | Maintained catalog creation/ID/initial-stock ledger transaction; retained Drive upload adapter |
| GET | /api/products | public | Maintained bounded compatibility catalog reads; anonymous publication enforced, verified staff drafts |
| GET | /api/products/search | public | Maintained bounded compatibility catalog reads; anonymous publication enforced, verified staff drafts |
| GET | /api/products/images/:filename | public | products.js → Mongoose catalog and Drive; extraction pending |
| GET | /api/products/category/:categoryId | public | Maintained bounded compatibility catalog reads; anonymous publication enforced, verified staff drafts |
| GET | /api/products/details/:productId | public | Maintained bounded compatibility catalog reads; anonymous publication enforced, verified staff drafts |
| GET | /api/products/:id | public | Maintained bounded compatibility catalog reads; anonymous publication enforced, verified staff drafts |
| DELETE | /api/products/:id | admin | maintained media/retention.ts archive; references retained |
| PUT | /api/products/publish/:productId | admin | Maintained transactional visibility/money validation and actor audit |
| PUT | /api/products/:id | admin | maintained inventory transaction/ledger; retained Drive upload adapter |
| POST | /api/category | admin | Maintained media metadata/reference creation; retained Drive upload |
| GET | /api/category | public | Maintained bounded category reads; anonymous visibility enforced, verified staff drafts |
| GET | /api/category/images/:filename | public | categories.js → Mongoose categories and Drive |
| GET | /api/category/:id | public | Maintained bounded category reads; anonymous visibility enforced, verified staff drafts |
| PUT | /api/category/disable/:id | admin | Maintained transactional visibility and actor audit |
| PUT | /api/category/:id | admin | Maintained metadata validation and reference-preserving replacement; retained Drive upload |
| DELETE | /api/category/:id | admin | maintained media/retention.ts archive; references retained |
| POST | /api/banners | admin | Maintained metadata/destination validation/reference creation; retained Drive upload |
| GET | /api/banners | public | banners.js → Mongoose banners and Drive |
| GET | /api/banners/images/:filename | public | banners.js → Mongoose banners and Drive |
| DELETE | /api/banners/:id | admin | maintained media/retention.ts archive; references retained |
| POST | /api/batch | admin | Maintained bounded catalog batch transaction; blocked during recovery before upload |
| PUT | /api/store/status | admin | storeRouter.js → maintained store/service.ts |
| GET | /api/store/status | public | storeRouter.js → maintained store/service.ts |
| POST | /api/store/cart/add | public | storeRouter.js → maintained store/service.ts |
| POST | /api/orders | public | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| POST | /api/orders/quote | public | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| POST | /api/orders/email | admin | Maintained bounded administrative email/SMTP policy; retained Nodemailer/socket adapter |
| POST | /api/orders/subscribe | staff | Maintained strict push subscription validation; current authenticated owner only |
| DELETE | /api/orders/subscribe | staff | Retained authenticated current-owner unsubscribe adapter |
| GET | /api/orders | orders | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| GET | /api/orders/:id | orders | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| PUT | /api/orders/edit/:orderId | admin | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| PUT | /api/orders/:orderId | orders | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| PUT | /api/orders/cancel/:orderId | orders | Orderrouter.js → maintained transaction commerce; subscription/email adapters |
| POST | /api/whatsapp/image | admin | Maintained poster metadata/reference creation; retained Drive upload and realtime adapter |
| GET | /api/whatsapp/image | admin | Maintained bounded poster list/projection; archived assets hidden from lists |
| GET | /api/whatsapp/image/:filename | public | Maintained bounded raster/reference lookup; archived shared URLs retained; Drive provider adapter |
| DELETE | /api/whatsapp/image/:id | admin | maintained media/retention.ts archive; references retained |
| POST | /api/whatsapp/s | admin | Maintained bounded sender and actor/digest receipt; compatibility JSON adapter |
| POST | /api/whatsapp/sr | admin | Explicit 410 retired demo URL; no provider/database effect |
| POST | /api/whatsapp | admin | Explicit 410 retired demo URL; no provider/database effect |
| POST | /api/whatsapp/text | admin | Maintained accepted-message transaction and bounded sender; compatibility redirect adapter |
| GET | /api/whatsapp/reports | admin | Maintained bounded report pages; existing last-100 broadcast window |
| GET | /api/whatsapp/recipients | admin | Maintained bounded recipient projection; existing opt-out values retained |
| GET | /api/whatsapp/messages/:recipient | admin | Maintained validated paged conversation history; internal receipt/provider fields excluded |
| POST | /api/whatsapp/webhook | webhook | Maintained signed normalized inbox/receipt transaction; retained realtime adapter |
| GET | /api/whatsapp/webhook | verification | whatsapp.js → Meta/Drive/conversation/report adapters |

## Background and provider operations

- Shared `orders/commerce.ts` atomically writes product stock, orders, counter, receipts/outbox and cancellation history/restock. Both HTTP stacks use it.
- Maintained notification workers lease/drain order jobs; `notifications/email.ts` owns confirmation content and bounded SMTP delivery through retained Nodemailer/socket adapters. At least once; acceptance/crash can duplicate delivery. Legacy persistent process owns worker. Administrative email is bounded but has no durable retry receipt.
- `security/realtime.cjs` authenticates/rechecks Socket.IO and SSE invalidations; shared deployment bus pending.
- Maintained `auth/administration.ts` provisions password hashes and deactivates accounts with actor audits, serialized privilege checks and transactional session revocation; `Login.js` retains the URLs. `sessions.cjs` owns sessions and quotas. Existing identifiers/history are never deleted by account removal.
- Drive creates/streams products/categories/banners/WhatsApp posters. All four media removal adapters now archive documents/assets. Category/Drive product replacements record prior references; old product/category filenames resolve through history. Maintained Cloudinary upload/reconciliation is additive; bounded Drive transport ownership is maintained; hosted provider parity remains a gate.
- Maintained Meta sender/actor-key receipts bound acceptance, uncertain sends and local transaction retries. Signed inbox receipts commit effects and processed state together. Retained realtime/report readers preserve contracts; real delivery and uncertain-send reconciliation require operator evidence.
- Push subscriptions belong to current staff; real delivery configuration/parity remains hosting gate.
- Recovery/bootstrap/commerce/index CLI apply operations are explicit maintenance actions, never builds/startup. Recovery creates no lost history.

## Next admin routes and consumers

`/admin/login` and protected `/admin/{dashboard,products,categories,banners,orders,whatsapp,users,notifications,settings,batch}` use `lib/admin/policy.ts`, authenticated no-cache gateway and retained boundary. Products include create/detail/edit and sale/disabled/out-of-stock views; orders include status/billing/cancellation; WhatsApp includes conversations/templates/posters/broadcast/reports. Public Next checkout/quote gateway uses modular commerce. CHECKOUT_ENABLED gates ordering. Legacy redirects remain reversible.

## Fallback dependencies

- Held source-retirement candidate removes `frontend/` after route/caller/browser parity, under the renewed owner instruction. Byte-verified brand assets and public URLs remain; rollback source/artifact is `871bf4f`. This candidate cannot merge before hosted acceptance.
- Active `e2e-servers.mjs`, commerce/admin/customer browser regressions and bundle budgets now use compiled Next. No active old frontend build consumer remains.
- Root build/start remain retained backend contracts. Backend dependencies support Express/Mongoose, sessions/bcrypt, Google Drive/Sharp/Multer, SMTP, Socket.IO, Meta and CSV.
- Production retirement still requires hosted acceptance, traffic observation and rollback; source deletion is confined to a held separately reviewed candidate. Compatibility database fields and surviving media have not contracted.
- CDN scalar/array filenames, Drive IDs, Cloudinary URLs, historical order lines/snapshots, cookie names, outbox/receipt/counter collections are compatibility contracts. Preserve all until replacements pass.

## Verification

Inventory regression compares mounted routers with every documented policy/route. Extraction tests verify domain and retained HTTP parity against disposable MongoDB. Provider effects require injected adapters and outage/retry tests. Security and integrity precede interface polish.

Staff push sender/worker ownership now resides in maintained notifications/push.ts and push-outbox.ts behind integrations/push.cjs. It is explicitly disabled pending provider/key/browser acceptance. Additive committed-job fields and majority delivery receipts preserve email and commerce contracts; uncertain outcomes never auto-replay. See STAFF_PUSH_DELIVERY_2026-10-04.md.

The unreferenced Whatsapp/WhatsappPoster/whatsappBulkReport Mongoose source schemas are removed after native maintained write/read ownership. No database schema contraction/index removal or media deletion occurs. All WhatsApp reads now have maintained owners; external omitted-limit consumers and hosted history/provider parity remain acceptance gates. See WHATSAPP_READ_OWNERSHIP_2026-10-04.md.
