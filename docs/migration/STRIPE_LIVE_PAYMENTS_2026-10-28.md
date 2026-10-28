# Stripe production rollout — 28 October 2026

## Scope

Adds live Stripe card payments alongside cash/card on delivery. The owner
requested activation after sandbox verification, then chose to enter live secrets
directly in Render **after deployment**, rather than storing them locally.
Deploy the code with the provider disabled first. No live transaction is created
by builds/tests/deployment or by the readiness endpoint.

The existing test provider remains isolated: test keys and test sessions cannot
be used with the live provider, and test activation remains prohibited against a
production-labelled database. Test collections, orders, scripts and historical
receipts remain readable without a backfill. Live attempts use a separate
`stripe_payment_attempts` collection and explicit `payment.testMode=false`.

## Render configuration and activation

Service: `almina` (`srv-cv1dn5lds78s73doqjm0`). Existing database, delivery policy,
store state, pricing, email, WhatsApp and media settings remain unchanged.

After the verified release is deployed, configure these server-only variables in
Render's Environment page as **one batch**, initially keeping acceptance paused:

| Variable | Value |
| --- | --- |
| `DATABASE_ENV` | `production` (explicit Stripe target guard) |
| `STRIPE_ACCOUNT_ID` | `acct_1QNMdFH7JMEtCPMq` |
| `STRIPE_SECRET_KEY` | Live restricted/secret key, entered privately in Render |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the live destination below |
| `STRIPE_TEST_ENABLED` | `false` |
| `STRIPE_LIVE_ENABLED` | `true` |
| `STRIPE_LIVE_ACCEPTING_PAYMENTS` | `false` initially |

`APP_ENV=production`, `NODE_ENV=production`, and the canonical
`GROWTH_WEB_ORIGIN=https://alminapharmacy.com` already belong to the retained
runtime. Stripe uses `WEB_ORIGIN` if explicitly configured, otherwise that
canonical growth origin. Neither secret belongs in Vercel, Git, chat or a
`NEXT_PUBLIC_*` variable. A publishable key is not needed for the hosted redirect.

Use a restricted live key where practical, with permissions to read the owning
account, create/read/expire Checkout Sessions, read PaymentIntents/charges, read
and create refunds, and read disputes. Account readiness must match the configured
account ID and have both charges and payouts enabled. Incorrect or incomplete
Stripe configuration disables this provider and logs `configuration_invalid`,
while the existing delivery-payment application remains available.

Readiness: `GET /api/v1/payments/stripe/availability` returns only booleans:
`ready`, `available`, `testMode`; it exposes no key/account/customer data. With
valid live credentials and acceptance paused, expect `ready:true`,
`available:false`, `testMode:false`. After this is verified, set
`STRIPE_LIVE_ACCEPTING_PAYMENTS=true` in Render and deploy that configuration.
Expect `available:true`, `ready:true`, `testMode:false`.

The production Next checkout discovers live availability from this API on every
request using a bounded, uncached server fetch. No separate frontend secret or
Vercel activation setting is needed. An unavailable/malformed/timed-out response
keeps Stripe hidden. Existing Stripe status, browser cancellation, paid-order
retries, signed webhooks and reconciliation remain available when only new
payment acceptance is paused.

## Live webhook destination

Owner approved creating a new live destination for the selected financial events.
Created through the authenticated Spmb Stripe dashboard:

- Name: **Al Mina production checkout**
- Destination: `we_1UVLfhH7JMEtCPMqyrLcenfy`
- URL: `https://almina-of4b.onrender.com/api/v1/payments/stripe/webhook`
- Scope: own account; Snapshot payload; API `2026-09-30.endive`
- Events: `checkout.session.completed`, `checkout.session.expired`,
  `charge.refunded`, `refund.updated`, `refund.failed`,
  `charge.dispute.created`, `charge.dispute.closed`.

The live destination's signing secret must be copied directly into Render.
The local CLI listener secret belongs only to the sandbox listener. The webhook
receiver rejects test-mode events in live mode, verifies the raw-body signature
with the official SDK and timestamp tolerance, then retrieves current Stripe
state instead of trusting event payload status. Unrelated account sessions/events
are acknowledged without altering application records. No event body is logged.

## Payment, fulfilment and notification integrity

Creation retains the authoritative quote, AED minor units, fixed expiry and
stable provider idempotency parameters. Adaptive currency pricing and automatic
Stripe tax are disabled: the existing commerce policy supplies VAT/delivery.
The card page uses a generic pharmacy order description, without sending medicine
names or the merchant's delivery/contact snapshot to Stripe.

A live payment is eligible for fulfilment only after retrieving a matching live
session, AED total and succeeded PaymentIntent with the full captured amount and
matching charge currency/amount. Unpaid, pending-refund, partial-refund and disputed
payments cannot advance through confirmation/packing/dispatch. All maintained
and legacy administrative mutation paths use this guard. Tests remain blocked
from real fulfilment and customer notifications.

Verified live payment queues one durable confirmation job transactionally.
The existing mail/staff-push workers consume that job; realtime notification runs
after commit. SMTP remains at-least-once delivery, not a claimed exactly-once
external side effect. Workers recheck payment state before sending, and queued
notifications are suppressed if the order is stopped/refunded. A provider or
notification outage cannot roll back a committed payment/order.

The live browser return clears only purchased quantities after server-verified
payment. A bounded per-order receipt and Web Locks prevent repeated receipt
reloads from removing products added later. Test-mode receipts keep the basket.
Unknown/authorization/rate-limit payment failures retain the original key rather
than creating a second checkout attempt.

## Cancellation, refunds and disputes

- An unpaid cancellation expires the provider session first and restores its
  reservation once. A race with completed payment cannot release paid stock.
- Only an administrator can request a refund for a paid order. Paid cancellation
  writes a durable refund request and fences dispatch before any provider call.
  The background reconciler submits the idempotent full remaining refund.
  The staff view includes the provider reference for Stripe lookups.
  The HTTP/admin response can retain the current order status while the payment
  banner says `refund_pending`: this is a request, not a refund acknowledgement.
- A full confirmed refund from an application cancellation can complete the
  cancellation and restore stock only if the snapshotted cancellation policy
  permits it and the order had not been dispatched when cancellation was fenced.
- Post-dispatch refunds never infer that goods returned. Direct Dashboard refunds
  also do not automatically restock live goods. Use the existing audited inventory
  adjustment workflow only after an actual return/physical check.
- Partial, pending and failed refunds are distinguished using bounded canonical
  refund records. They cannot be treated as completed full refunds. Failed or
  old uncertain refund requests require operator review; automatic request
  retries stop before Stripe's idempotency retention window expires.
- A dispute stops fulfilment and automatic refunds. A canonically won/closed
  warning can clear a dispute hold; lost/open disputes remain blocked. A dispute
  opening after an application cancellation was queued stops its refund for
  manual review, avoiding an automatic double reimbursement.
- A late refund failure preserves an operational hold and visible refund issue;
  it does not reopen a cancelled/refunded order or pretend goods shipped again.
- Genuine financial actions in the Stripe Dashboard (including a first live
  payment/refund) are performed by the owner. No live-money smoke purchase is
  initiated by the implementation agent.

The minute reconciler prioritizes ten unsettled orders and ten paid orders per
batch. Canonical state changes and stock restoration are transactional/replay-safe
across multiple workers. Refund submission uses a stable provider key; provider
calls occur outside Mongo transactions. The existing free Render service can
sleep: jobs persist, but cold starts/restarts can delay reconciliation and
notifications. No paid hosting upgrade is made by this change.

## Rollback and operations

Set **only** `STRIPE_LIVE_ACCEPTING_PAYMENTS=false` to hide new online checkout and
stop new Stripe reservations. Keep the live key, webhook, provider flag and
reconciler running until existing sessions/refunds settle. Cash/card on delivery
remain available. Do not disable the full provider, delete attempts/orders or
restore stock from a local timeout/redirect alone. Reverting application code
while live reservations remain requires a settlement plan first.

Index preparation is additive/idempotent, with a separate live-attempt unique
partial index, the retained test index, the reconciliation index and a payment
intent lookup index. No historical pricing, customer data, inventory or order
number is backfilled/reset. Live provider activation prepares these indexes before
serving new requests.

## Verification

Coverage uses disposable loopback replica sets and simulated live-mode provider
responses: live readiness/mode mismatch, full capture, unpaid fulfilment blocking,
normal paid dispatch, unique notification jobs, paused acceptance/retries,
refund queue fencing, pending/failed/uncertain refunds, post-dispatch and Dashboard
refunds, disputes and signed events. The real Stripe sandbox flow from the prior
phase separately verified hosted payment, cancellation and full refund. Browser
coverage includes delivery methods, mobile/tablet/desktop, pending retries,
live receipt cart reconciliation and authorization failures.

Final command/CI and deployment results are recorded in the pull request and
migration status. Live credentials and genuine live webhook delivery cannot be
verified until the owner has saved the live values in Render.
