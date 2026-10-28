# Additive Stripe test payments — 27 October 2026

## Scope and activation boundary

Cash and card on delivery retain their existing paths. A separately enabled
Stripe-hosted Checkout option uses **test keys only**. This change does not enable
live payments. Production web hides the test option and production API
configuration rejects test activation, including `DATABASE_ENV=production`.
Testing against real production stock is intentionally unsupported.

The owner selected test mode first. Assumptions: retail, AED, immediate card
payments, no vouchers/wholesale/delayed payment methods. Test orders cannot enter
fulfilment, send order notifications, or count as search purchases. The test
basket is preserved after payment so testing does not change the shopping basket.
Live payment operations and a production rollout need a separate reviewed change;
switching the key alone cannot enable them.

## Local sandbox

1. Put a Stripe **test** secret key in the ignored root `.env.stripe-test.local`:
   `STRIPE_SECRET_KEY=...`. The file is owner-readable/writable only. Never paste
   credentials into chat or put them in a `NEXT_PUBLIC_*` setting.
2. In one terminal, run `npm run stripe:test:listen`. This invokes the official
   pinned `@stripe/cli` 1.55.2 without adding it to application dependencies. It
   uses the test key through the child environment, subscribes only to this
   account's Checkout completed/expired events, and forwards to loopback port
   4891. It saves the listener's `STRIPE_WEBHOOK_SECRET` privately in the same
   ignored file; raw CLI output and credentials are not printed.
3. In another terminal, run `npm run stripe:test:dev`. It creates a fresh local
   replica set/database, seeds one synthetic product and the approved commerce
   policy, and serves the isolated Next dev storefront on
   `http://127.0.0.1:4890/products`. The API is loopback-only port 4891. No
   application database URI or backend dotenv file is loaded. Notification
   workers are not started. The browser receives neither secret.
4. Add the synthetic product, enter synthetic contact/address details, choose
   **Card via Stripe — test mode**, review the authoritative AED quote, and
   continue to hosted Checkout. Use Stripe's documented test payment details.
5. Exercise success, decline, authentication, cancellation, expiry, reload and
   retry. Full refunds made in Stripe test mode reconcile on the return page or
   within the bounded background polling loop. No refund endpoint accepts a
   client-reported refund as truth.
6. Stop both terminal commands with Ctrl+C. The sandbox database is disposable:
   restarting creates new data and invalidates local order references. It does
   not affect application/production data. Never use this launcher as hosting.

`npm run stripe:test:dev -- --fixture` uses an explicitly synthetic provider,
without credentials or Stripe API requests, for UI review. The Playwright suite
uses this same transport against an isolated database and blocks external
requests. That is distinct from verification against Stripe's real test API.

A local listener secret belongs to the Stripe CLI listener. It is not the signing
secret for a future deployed webhook destination. A persistent staging rollout
must create its own HTTPS test destination at
`/api/v1/payments/stripe/webhook`, store that destination's signing secret in the
API service, use an isolated staging database, and set `STRIPE_TEST_ENABLED=true`
on both staging API and web. Keep production disabled. Environment examples
contain only empty secret fields and a disabled flag.

## Integrity and recovery

- A strict request contains product IDs/quantities, delivery details, the reviewed
  quote hash and a UUID idempotency key. Prices, VAT, delivery and total are
  computed by the existing domain. Adaptive currency pricing is explicitly disabled
  so the account default cannot add a conversion fee or change AED presentation.
  Stripe receives the authoritative total as
  one AED line, without sending medicine/product names or customer details.
- The `stripe_test_attempts` document uses a hashed UUID as its unique `_id` and
  persists the request fingerprint, immutable quote and fixed one-hour expiry
  before calling Stripe. Provider creation uses stable parameters and a stable
  idempotency key. A provider timeout reserves no inventory; retry recovers the
  same session rather than creating a second payment.
- Once the session ID is recorded, the existing Mongo transaction reserves stock,
  writes the immutable order/checkout receipt and assigns a unique order number.
  A competing purchase or price change still fails the normal domain checks.
  Sessions for rejected, never-exposed orders expire without stock effects.
- All Stripe orders carry `payment.provider`, `testMode`, `attemptId`, `sessionId`,
  `expiresAt`, and an explicit state. Generic/legacy checkout cannot create these
  orders, and staff status transitions are blocked for them.
- The raw-body endpoint verifies the Stripe signature with the official SDK and
  five-minute timestamp tolerance before touching the database. Supported events
  trigger a fresh Stripe retrieval; event payload status and browser return
  parameters never mark an order paid. Amount, AED currency, test mode, session
  association and expiry must match the durable attempt.
- Transactional state synchronization handles duplicate/out-of-order delivery.
  Expiry and **full** test refunds release reserved stock once, independently of
  the delivery-payment cancellation policy. Full refunds are detected from the
  expanded charge, without claiming partial refunds are full refunds. Partial
  refunds remain in Stripe and do not restore stock automatically.
- A bounded 20-order, one-minute reconciler repairs lost webhooks, rotates failed
  checks, and retries uncertain observations without releasing stock by a local
  timer alone. Browser cancellation expires the provider session first; a paid
  race cannot release paid inventory. Webhooks remain active after browser exit.
- Both the standalone API and retained Express deployment use the same domain,
  raw-body handler, index preparation and reconciler lifecycle. The maintained
  TypeScript code is rebuilt into the retained commerce bundle before deployment.

## Schema and rollback

All fields/collections/indexes are additive; historical orders retain their
payment values and snapshots. Index preparation is idempotent and runs only when
Stripe is enabled. The unique partial `orders.payment.attemptId` index prevents
multiple Stripe orders for one attempt. A second index supports bounded status
reconciliation. The attempt `_id` supplies native uniqueness. No destructive
backfill or TTL deletion is used: deleting a reservation on a timer would lose
its stock-restoration record.

For staging rollback, hide the web option first. Keep the API listener and
reconciler running until all test sessions have settled/expired and stock has
been reconciled, then disable the API flag. Retain attempt/order records for
reconciliation. Never delete orders or restore stock manually based only on a
redirect, timeout, or local expiry timestamp.

## Sources

- [Stripe Checkout fulfilment](https://docs.stripe.com/checkout/fulfillment)
- [Webhook signatures and raw Express bodies](https://docs.stripe.com/events/manage-webhook-endpoints#signature-errors)
- [Limited-inventory Checkout expiry](https://docs.stripe.com/payments/checkout/managing-limited-inventory)
- [Stripe automated test guidance](https://docs.stripe.com/automated-testing)
- Installed official `stripe` SDK 23.0.1, API `2026-09-30.endive`, Node >=20
  (project Node 24). Its generated `allowed_payment_method_types` parameter
  restricts dynamically eligible methods to cards. No frontend Stripe SDK is
  needed for a hosted redirect.

## Verification

See the PR validation for the final command results. Focused coverage includes
provider uncertainty/retries, concurrent last-unit/duplicate checkout, immutable
quotes, no prepayment notifications, fulfilment blocking, canonical provider
state, cancellation/expiry/refund restoration, signature tampering/replay-age,
CSRF/disabled endpoints, preserved delivery payment behavior, browser return and
reload, absent recovery and 360/390/768/1440px layouts. Real-provider credentials
and verification artifacts remain outside Git.

Recorded local results: 236 unit tests and 137 API tests passed; the focused
commerce/Stripe replica-set run passed 23 tests, with an additional final
Stripe-only 8-test run covering unrelated signed events. The 23 existing
checkout browser cases and eight Stripe cases passed across the verification
runs; the final focused ten-case run included delivery checkout, pending-intent
recovery and every Stripe case. Workspace typechecks, lint, the foundation
production build and retained commerce build passed.

Real Stripe sandbox verification (not the synthetic transport) created hosted
sessions, completed an AED 20.00 payment with Stripe's documented test card,
accepted its signed webhook, cancelled a session, completed a full test refund,
and observed stock return to the original 20 units. A separate real test session
confirmed that explicitly disabled Adaptive Pricing preserves AED, then was
expired. No live transaction, production DB change, real customer notification,
Render/Vercel configuration change or production deployment was performed.

`npm audit --omit=dev` reports two existing moderate advisories (`ip-address` and
`nodemailer`); Stripe introduces no additional runtime dependency/advisory. No
unrelated dependency upgrade was attempted in this payment change.
