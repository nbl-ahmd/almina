# P5-03 checkout and authentication regressions

Verified on `codex/storefront-pharmacy-app-reference` from `9d6d13a` on 18 November 2026.

## Verification boundaries

The browser harness used the isolated P5-02 production build, a synthetic storefront catalogue and an owned loopback-only MongoDB replica set with disposable records. The database integration runner started its own replica set and required database tests to run. Both runners used a stripped environment. Payment transport, provider responses and test email delivery remained simulated. Browser runs blocked external traffic or fulfilled it locally through existing mocks. The live-mode payment test names identify code paths under simulation.

## Coverage

| Concern | Verified evidence |
| --- | --- |
| Product identity and pricing | Browser checks preserve exact variant and immutable order-line data, import legacy cart identifiers and use server prices and stock. The quote and checkout tests validate server-owned discounts, delivery, tax and final amounts. |
| Changed quote and stock | Browser checks cover repricing after review, explicit fresh review and exhausted stock without a partial order. The transaction suite validates concurrent stock depletion and rollback after a later item or persistence failure. |
| Pending and retry | Cash retry keeps the original intent key through reload and yields a single order and receipt. Stripe exercises the pending status, reserved order reuse and preserved key on rejected requests. Concurrent database checks verify one commit per request and rejection of changed inputs under the same key. |
| Cancellation and payment return | Simulated payment tests exercise cancellation, verification, refund, failed or uncertain refunds, mode checks and stock restoration. The browser covers return without local context, one-time reconciliation of purchased quantities and preservation of later additions. |
| Authentication and authorization | Browser and database tests cover guest checkout, customer identity verification and logout, staff order visibility and branch scope. Security and gateway contracts cover session ownership, input validation and privileged writes. |
| Stage presentation | Review-only browser checks verify bilingual validation, quote display, action continuity and no order or stock writes before confirmation. |

## Executed checks

- Unit and security suite passed 162 checks.
- Seven database integration suites passed 53 checks with zero skips. The suites covered commerce, Stripe test and simulated live states, customer identity, branch routing, historical order reads and rewards.
- The Chromium run passed 63 of 69 cases on its first pass. All six affected cases passed on targeted reruns against the same production build. The supplemental WebKit run passed six cases, including real-gateway customer sign-in and bilingual checkout.
- Repository lint and the staged diff check passed.

## Browser assertions

The legacy-cart test now checks the actual accessible name of the dirham amount and its visible per-item caption. It also seeds the legacy record before the first cart navigation and verifies that the converted cart survives reload. The email-code test checks that an incomplete verification code keeps the action disabled and that hover preserves the disabled treatment. The exact-SKU order test checks the cash radio and scopes the selected option to the visible order summary. It also verifies that the confirmed total and one persisted receipt match the selected pack before inspecting the staff order line.

## Runtime disposition

P5-03 is a verification checkpoint. Server pricing, tax, delivery, stock, payments, authentication and order logic remain in their existing owners. No production order, data, provider or deployment operation occurred. Physical devices, assistive technology and actual provider availability are release-level checks. P5-04 covers remaining customer and public information surfaces.
