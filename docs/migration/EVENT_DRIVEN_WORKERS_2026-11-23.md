# Event-driven background work: nothing runs on a clock (2026-11-23)

Goal: when nobody is using the site, the API makes no database requests, runs no timers and sends no bytes. Before this change the
API polled Atlas from a dozen loops (1 s to 5 min). Measured on the demo stack, idle application commands went from about 16 a
minute to **0** over three idle minutes (what remains is the measuring client and the database's own housekeeping).

## How work is triggered now

All order, product, notification and job writes go through the single API process, and the MongoDB driver reports every committed
write as a command event (`monitorCommands`, no extra traffic). `createLocalWriteSignal` turns those into per-collection signals,
only for writes that really changed something (a lease attempt that matched nothing must not wake anyone; an earlier draft did
and the integration test caught it as a tight loop). Writes inside a transaction fire at commit.

A worker runs only when:
1. the process starts (one recovery pass for anything a restart interrupted),
2. a committed write to a collection it cares about happens (debounced where bursts are normal),
3. its previous run reported more work (draining a backlog), or
4. a deferred item becomes due: a retry time, a lease expiry or a reminder's exact due time. One timer is armed for the earliest
   such time (`earliestDue`, `nextDue`) and no timer exists when nothing is pending.

| Work | Trigger | Deferred timer |
|---|---|---|
| Customer order confirmation e-mail (order outbox) | order / outbox write | retry time, lease expiry |
| Staff web push | order / outbox write | retry time, lease expiry |
| Staff order e-mail to the shop inbox | order / outbox write | retry time; each reminder's exact 5 / 15 minute moment (orders older than 6 h are not reminded about) |
| In-app order alerts | order / outbox write | none |
| Stock, payment and rule alerts sweep | products, orders or the alert rules changed (30 s debounce, drains its cursors) | none |
| Google Merchant sync | catalogue (products, categories, store state) edited, 2 minute debounce; start-up only if the last sync is older than 24 h or failed | 5 min retry after a failure; one run a day to refresh listings (a single timer, no polling) |
| Stripe payment re-checks | an order changed | each unsettled payment's due time (1 min after checkout, then 10 min, 1 h, 24 h as it ages); settled payments are no longer swept (webhook is the signal) |
| Search embeddings | catalogue edited (30 s debounce), drains a backlog | none |
| Retention reminders | reminder written | each reminder's `nextCheckAt` |
| Marketing campaigns | campaign job written, drains while sending | none |
| Image publication | publication job written / resumed, drains while queued | none |
| Live order feed in the console | while a browser is connected, listens to order and alert writes; nobody connected = listens to nothing | none |

The change stream used earlier by the wake is no longer opened when the local signal exists (a change stream keeps a long poll
open and costs requests all day). It remains only as the fallback for runtimes without the signal (tests, the v1 server).

## What is still non-zero, and why
- MongoDB driver monitoring: one `hello` per replica-set member every 2 minutes (`serverMonitoringMode: poll`, 120 s).
- An open admin tab: the live stream's keep-alive comment every 25 s and the stream reconnect every 5 minutes. Nobody connected = none.
- Render itself: a free instance sleeps after 15 minutes without inbound requests. Any external uptime monitor that pings
  `/api/ping` keeps it awake (compute, not bandwidth); remove it if sleeping is acceptable. The first request after sleep
  (a customer checkout) pays a cold start of up to about a minute, and start-up runs one recovery pass per worker.

## Why no external notification service
Notifications are triggered by the order request itself: it commits the order, the committed write wakes the outbox, push and
e-mail workers in the same process within milliseconds, and the providers (SMTP/Resend, Web Push) are called directly. Atlas
Triggers, Vercel cron or a queue service would add a second place to deploy and fail without removing any work. If the API is
ever scaled to more than one instance, the local signal must be replaced by a shared one (change stream or a queue); the
fallback path stays in place for that.

## Trade-offs
- A write made outside this process (a shell, a migration script) does not wake workers until the next event, deferred time or restart.
- If the process dies between committing an order and sending its notifications, the start-up pass sends them on the next start.
- Low-stock alerts are evaluated within about 30 seconds of a change instead of on a minute cycle.
- Browser timers: the alert refresh interval is gone; the console refreshes on live-stream events, Web Push messages, returning to the tab and reconnecting.

## Verification
`tests/event-driven-integration.test.ts` (real MongoDB, production wiring): an order is e-mailed immediately, the reminder fires at
its due time, and no command reaches the database before or after. `tests/idle-load*.test.ts` cover the signal, the event worker
and the event-only wake loop. Full unit, integration (238 + new) and end-to-end suites pass.
