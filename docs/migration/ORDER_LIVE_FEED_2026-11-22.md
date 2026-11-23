# Order live feed — 22 November 2026

Receiving screens used to be kept fresh by polling: each open tab made the Next route sample `orders/receiving` (six queries) every 5–10 seconds, the worker polled the alert queue every 5 seconds, and every planned stream end showed "Reconnecting".

## Now
- `apps/api/src/modules/orders/live.ts` holds one `orders` change stream per API process (inserts, updates, replaces, projected to the operation type only). It opens when the first staff stream connects and closes 30 seconds after the last one leaves, so an idle system issues no timed reads.
- `GET /api/orders/events` (policy `orders`, also allowed for branch store accounts) streams `id: <revision>` + `event: orders|ready` with an empty body, a heartbeat comment every 25 seconds, and `retry: 1000`. Bursts coalesce to one message per 500 ms. Limits: 6 streams per user, 200 per process.
- `/api/admin/events` (Next) authenticates and relays that stream for at most 25 seconds. The browser reconnects with `Last-Event-ID`; the same revision answers `ready` (no read), a different one answers `orders`.
- The browser reads `orders/receiving` only on `orders`, closes the stream while the tab is hidden, and falls back to a 15 second read only after a 7 second outage.

## Failure behaviour
- Change streams unsupported (standalone MongoDB): invalidate every 15 seconds while someone is connected.
- Stream error: one invalidation (changes may have been missed), reopen with backoff 2 s to 30 s.
- API restart: the revision changes, so every browser refetches once.

## Background workers
The staff alert worker (5 s), staff push worker (1 s) and order email worker (5 s) used to poll an idle database. `apps/api/src/modules/notifications/wake.ts` adds one database-level change stream (orders and `order_outbox`) that wakes them. While it is healthy each worker keeps only a 30 s safety interval (retries, lease recovery and the 60 s reconciliation sweep); a wake during a running tick schedules exactly one more tick. When change streams are unsupported or the stream is down, `healthy()` is false and every worker returns to its previous cadence. Wired in `backend/server.js` and `apps/api/src/server.ts`; covered by `tests/worker-wake.test.ts` and the existing disposable-database worker tests.

## Follow-up: change-stream timing, staff e-mail safety net, push/PWA (2026-11-22)

- **Root cause of the demo API `503` on `/health/ready` and the admin "The request failed" error:** the change streams
  waited up to 30 s per `getMore` while the API's MongoDB `socketTimeoutMS` is 15 s, so the streams timed out and
  churned connections until readiness (2 s bound) failed. Streams now use `maxAwaitTimeMS: 10000`, below the socket
  timeout. Keep any future long-poll below `socketTimeoutMS`.
- **Gateway hardening:** `currentIdentity` retries `auth/me` once after 400 ms on a 5xx/network failure, and the
  sign-in page renders the form instead of an error page when the API is unreachable.
- **Staff order e-mail** (`notifications/staff-email.ts`): one e-mail per new order to `ORDER_ALERT_EMAIL`
  (default `alminapharmacyrak@gmail.com`; `off` disables). Independent fields (`staffEmail*`) on the `order_outbox` job so it
  never blocks push or customer e-mail; only orders created after first start are announced
  (`notification_controls/staff-order-email-v1`); retries with backoff up to 8 attempts; carries no phone/e-mail of the
  customer. Uses Resend when `EMAIL_PROVIDER=resend` (plain message, budget counted, idempotency key per order), else
  the existing SMTP account. Rollback: set `ORDER_ALERT_EMAIL=off` (extra job fields are inert).
- **Push/PWA:** the admin service worker still receives payload-less pushes, but now reads the pending-order count with
  the staff session to show "N orders to confirm", sets the app badge, keeps order alerts on screen
  (`requireInteraction`), vibrates, offers an "Open orders" action, and focuses an existing console window on click.
  The console also updates the badge from the live feed. Manifest gained description and an Orders shortcut.
- Verification: `tsc` (web, api), eslint, `npm run test:unit` (281 pass), live-feed and staff e-mail integration tests
  against a disposable MongoDB, `build:foundation` with placeholder env. Not verified: Atlas change-stream support and
  real Resend/SMTP delivery (need production credentials), Playwright e2e (specs stale; need a production build).

## Design review: direct stream, escalation, install guidance (2026-11-23)

Compared with how large order platforms notify merchants (an event published when the order is committed; a native-push
wake-up for closed devices; a live connection for open ones; acknowledgement with escalation; a slow safety net), this system
now has each piece at the right size for one pharmacy, without a message broker.

- **Direct stream.** The staff browser no longer depends on the Vercel relay (which the 25 s function limit forced to reconnect
  about twice a minute). `POST /api/admin/events/ticket` (web gateway, session cookie, same-origin only) asks the API for a
  one-time ticket (`POST /api/orders/events/ticket`, 30 s, stored as a SHA-256 hash in `stream_tickets` with a TTL index). The page
  then opens `GET {API}/api/orders/events/stream` with `X-Stream-Ticket`. The cookie is never sent to the API origin. The API ends
  each stream after 5 minutes, which makes the page mint a fresh ticket, so a deactivated account loses the live signal within
  5 minutes; it carries no order data in any case. After 3 failed direct attempts the page falls back to the relay route.
  SSE was chosen over WebSocket on purpose: the signal is one-way, SSE needs no upgrade handling or extra library, passes proxies
  and reuses the tested feed. WebSocket would add nothing here.
  CSP `connect-src` allows the API origin on `/admin` pages only; CORS allows the two extra request headers on that route only.
- **One signal for orders and alerts.** The live feed watches `orders` and `staff_alerts` (stock, payment). The alert poll is now a
  5-minute safety net that only runs in a visible tab.
- **Escalation.** After the first order e-mail, unconfirmed orders are reminded about at 5 and 15 minutes
  (`ORDER_ALERT_ESCALATION_MINUTES`, comma list or `off`). Each stage is leased, sent once and idempotent; confirmed, cancelled or
  unpaid-online orders are never reminded about. Rollback: set it to `off`.
- **Install guidance.** Notification settings now show an Install app button where the browser offers one (desktop Chrome/Edge,
  Android), steps for iPhone/iPad (Web Push there only works from the installed app) and an "Installed" state.
- **Not changed / still open.** No native FCM/APNs app; no re-push of unacknowledged orders (escalation is e-mail); Atlas
  change-stream support and the Render plan (free plan sleeps) still need checking on production.
