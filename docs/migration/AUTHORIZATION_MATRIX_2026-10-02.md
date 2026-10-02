# Route authorization matrix — 2026-10-02

Inventory of all application HTTP handlers, Next actions, media mounts and realtime delivery after authentication hardening. This supersedes the unauthenticated baseline in the production audit. No deployed route was probed or changed.

## Shared rules

- A staff identity comes from an opaque, digest-backed MongoDB session in a host-only HTTP-only cookie. Current database roles are `admin` or `user`; unknown roles, disabled/deleted accounts, password changes, missing/expired/revoked sessions fail closed. Bearer/JWT headers and caller-supplied roles never authenticate.
- **Admin**: current database role `admin`. **Staff**: either approved role. **Orders**: admins access all orders; staff access only current assigned cities. Empty staff assignments grant no access.
- Browser POST/PUT/DELETE requires exact configured Origin and `X-CSRF-Protection: 1`; cross-site Fetch Metadata is rejected. Login and guest checkout also require this provenance. Only provider webhook POST is exempt, with its own signature boundary.
- GET handlers also support HEAD; neither mutates business state. OPTIONS checks an exact origin, allowed route/method and header list, and performs no domain action.
- Legacy routing is default-deny: missing policies, encoded/ambiguous paths and unlisted methods cannot reach handlers. A test compares the full real Express router inventory with this policy table. Authorization runs before uploads, body parsing or route handlers.

## Legacy service

| Method | Route | Effective authorization |
|---|---|---|
| POST | `/api/auth/login` | Public; Origin/CSRF header; IP and shared account/IP quotas |
| POST | `/api/auth/logout` | Staff; subscription writes/deletes are self-owned |
| POST | `/api/auth/logout-all` | Staff; subscription writes/deletes are self-owned |
| GET | `/api/auth/me` | Staff; subscription writes/deletes are self-owned |
| POST | `/api/auth/signup` | Admin |
| GET | `/api/auth/users` | Admin |
| DELETE | `/api/auth/users/:id` | Admin |
| POST | `/api/products` | Admin |
| GET | `/api/products` | Public; state changes require Origin/CSRF header |
| GET | `/api/products/search` | Public; state changes require Origin/CSRF header |
| GET | `/api/products/images/:filename` | Public; state changes require Origin/CSRF header |
| GET | `/api/products/category/:categoryId` | Public; state changes require Origin/CSRF header |
| GET | `/api/products/details/:productId` | Public; state changes require Origin/CSRF header |
| GET | `/api/products/:id` | Public; state changes require Origin/CSRF header |
| DELETE | `/api/products/:id` | Admin |
| PUT | `/api/products/publish/:productId` | Admin |
| PUT | `/api/products/:id` | Admin |
| POST | `/api/category` | Admin |
| GET | `/api/category` | Public; state changes require Origin/CSRF header |
| GET | `/api/category/images/:filename` | Public; state changes require Origin/CSRF header |
| GET | `/api/category/:id` | Public; state changes require Origin/CSRF header |
| PUT | `/api/category/disable/:id` | Admin |
| PUT | `/api/category/:id` | Admin |
| DELETE | `/api/category/:id` | Admin |
| POST | `/api/banners` | Admin |
| GET | `/api/banners` | Public; state changes require Origin/CSRF header |
| GET | `/api/banners/images/:filename` | Public; state changes require Origin/CSRF header |
| DELETE | `/api/banners/:id` | Admin |
| POST | `/api/batch` | Admin |
| PUT | `/api/store/status` | Admin |
| GET | `/api/store/status` | Public; state changes require Origin/CSRF header |
| POST | `/api/store/cart/add` | Public; state changes require Origin/CSRF header |
| POST | `/api/orders` | Public; state changes require Origin/CSRF header |
| POST | `/api/orders/email` | Admin |
| POST | `/api/orders/subscribe` | Staff; subscription writes/deletes are self-owned |
| DELETE | `/api/orders/subscribe` | Staff; subscription writes/deletes are self-owned |
| GET | `/api/orders` | Admin or staff in assigned cities |
| GET | `/api/orders/:id` | Admin or staff in assigned cities |
| PUT | `/api/orders/edit/:orderId` | Admin |
| PUT | `/api/orders/:orderId` | Admin or staff in assigned cities |
| PUT | `/api/orders/cancel/:orderId` | Admin or staff in assigned cities |
| POST | `/api/whatsapp/image` | Admin |
| GET | `/api/whatsapp/image` | Admin |
| GET | `/api/whatsapp/image/:filename` | Public published poster media; management/listing remains admin-only |
| DELETE | `/api/whatsapp/image/:id` | Admin |
| POST | `/api/whatsapp/s` | Admin |
| POST | `/api/whatsapp/sr` | Admin |
| POST | `/api/whatsapp` | Admin |
| POST | `/api/whatsapp/text` | Admin |
| GET | `/api/whatsapp/recipients` | Admin |
| GET | `/api/whatsapp/messages/:recipient` | Admin |
| POST | `/api/whatsapp/webhook` | Meta HMAC-SHA256 over raw body; durable replay receipt |
| GET | `/api/whatsapp/webhook` | Provider verification token; no business mutation |

Legacy `POST /api/auth/signup` is **admin provisioning**, not public registration. It allows only the two known roles after server admin authorization. New passwords use bcrypt cost 12; duplicate usernames return the same generic provisioning response. User listing projects only identity fields and is bounded/keyset-paginated; deletion cannot delete the requesting administrator and invalidates sessions.

Public `POST /api/orders` remains guest checkout. It cannot choose order IDs, dispatch/cancel flags or billing fields. Its existing **client-authoritative pricing, unsafe inventory decrement, numbering and lack of idempotency remain critical commerce findings**; authentication hardening does not repair those algorithms. General admin order editing rejects unknown fields/Mongo operators and cannot rewrite customer/city/pricing/cart data.

Published WhatsApp poster image URLs remain public for Meta/template fetching and copied external links; filename validation and database-backed asset lookup prevent source-file access. Cross-Origin-Resource-Policy permits embedding only these deliberate public media surfaces.

Email relay is admin-only. Guest confirmation is generated internally from a persisted order with a stored recipient; browsers no longer submit HTML or destinations. Push registration/deletion stores only the current staff user's validated subscription. External push callback hosts are restricted to known HTTPS push providers.

## Versioned API

All routes below are prefixed `/api/v1` except health paths. No product/category/banner/WhatsApp/order mutations are implemented here; unsupported methods return 405, unknown endpoints 404, with no legacy forwarding.

| Method | Route | Effective authorization |
|---|---|---|
| GET | `/health/live` | Public |
| GET | `/health/ready` | Public |
| GET | `/status` | Public |
| GET | `/catalog/products` | Public; visibility enforced |
| GET | `/catalog/products/by-business-id/:productId` | Public; visibility enforced |
| GET | `/catalog/products/:id` | Public; visibility enforced |
| GET | `/catalog/categories` | Public; visibility enforced |
| GET | `/catalog/categories/:id` | Public; visibility enforced |
| GET | `/catalog/banners` | Public |
| GET | `/catalog/store` | Public |
| POST | `/auth/login` | Public; exact Origin/CSRF header; login quotas |
| GET | `/auth/me` | Staff |
| POST | `/auth/logout` | Staff; Origin/CSRF header |
| POST | `/auth/logout-all` | Staff; Origin/CSRF header; revokes all user sessions |
| GET | `/admin/products` | Admin |
| GET | `/admin/products/:id` | Admin |
| GET | `/admin/orders` | Admin or assigned-city staff |
| GET | `/admin/orders/:id` | Admin or assigned-city staff |
| GET | `/admin/users` | Admin |

## Next storefront, static assets and realtime

| Surface | Authorization / behavior |
|---|---|
| GET/HEAD `/`, `/products`, `/products/[slug]`, `/categories`, `/categories/[slug]`, `/offers`, `/search` | Public catalog reads; no credentials forwarded to upstream |
| GET/HEAD `/cart`, `/checkout` | Public saved-cart review; no order submission |
| POST Server Actions `loadCart`, `checkAddition` on storefront routes | Public, validated catalog/store reads only; no DB writes; framework Origin/Host protection |
| GET/HEAD `/productdetails/[id]` | Public compatibility redirect, resolves public product |
| GET/HEAD `/foundation/status` | Public sanitized upstream health view |
| GET/HEAD `/favicon.ico`, public web assets, `/_next/static/*` | Public static assets; no source secrets |
| `/_next/image` | No remote image patterns configured; current media uses explicit unoptimized URLs and CSP host allowlist |
| `/_next/mcp` | Development only, loopback; absent from production |
| Legacy `/public/products/*`, `/public/category/*`, `/public/banner/*` | Public catalog files only; dotfiles and directory indexes denied. CSV/WhatsApp poster/source mounts removed |
| Socket.IO `/socket.io/*` handshake | Exact Origin, current admin session. Staff/anonymous connections denied because payloads are not city scoped |
| Socket.IO `newOrder`, `newMessage`, `newPoster`, `newBroadcast` | Current admin session checked immediately before each delivery; expired/revoked/demoted connections disconnect |
| Legacy CRA UI document routes | Client guard verifies server `/api/auth/me`; API permissions remain the security boundary. Static document host must apply provided security-header configuration |
| Unknown/unimplemented application routes | 404/405, no privileged business action |

The route table contains 53 legacy handlers. Anonymous denial tests cover every privileged legacy handler (including reads, JSON/multipart mutations, dispatch/cancel, signup, push management and WhatsApp). Authenticated staff denial tests cover every admin-only policy. Positive/scoping tests ensure authorization does not merely disable all handlers. See [hardening decisions, risks and rollout](AUTH_HARDENING_2026-10-02.md).
