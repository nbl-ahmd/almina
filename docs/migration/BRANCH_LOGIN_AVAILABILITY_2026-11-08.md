# Branch login availability and alert activation

## Production verification

The owner merged and deployed PR #90. Both the persistent API and verified storefront deployment serve merge `a8b3ba195959c5a119a4e0a58fac7bc9144b68c6`.

On 8 November, the production notification endpoint returned `enabled: true`, a public application-server key, and one registered receiving device for the signed-in administrator. Render stores `ADMIN_PUSH_ENABLED=true` and the supplied contact `mailto:info@alminapharmacy.com`. The existing key pair was preserved; no new keys were generated or rotated. The service remains ready. Existing protected Render fields load their saved values asynchronously: finish that load before editing, then confirm the non-secret activation flag and contact before saving. Private key values were not logged. Device registration is verified; delivery of a real future order notification has not been claimed or simulated with a production order.

The operator has now created the real `almina` branch with store login `almina-admin`. That branch and its credentials were not changed. All four pending orders remained visible. No real orders, prices or stock were changed during verification.

## Reported creation failure

The creation form generated a login directly from the branch name, then waited until submission to discover that the login was already reserved. The server correctly refused to overwrite an existing identity. Only disabled, orphaned managed store identities are eligible for the existing audited username release; legacy/person identities remain protected. The active-person list did not contain `almina`; no assumption about the retained record's exact role was used to rename or delete it.

The supplied screenshot also exposed a password. If it is used by a real account, its owner must change it. Its value is not recorded here or in fixtures.

## Fix

- Administrator-only `GET /api/auth/branch-login-availability?username=…` validates a strict input and checks at most 21 deterministic candidate names. It returns only the requested name, availability and a free suggestion. It does not expose account details, credentials or ownership metadata.
- Generated names can move to a free suggestion automatically, with a visible explanation. A manually entered name requires an explicit suggestion choice. The branch's name remains unchanged.
- Availability is advisory: the existing serialized creation transaction still enforces uniqueness and preserves all protected accounts. It does not adopt a person account or treat a disabled current store as reusable. Shared retired-store eligibility now also requires the stored fulfilment role.
- A submit-time race refreshes the check and preserves the form. If it occurs during delivery setup, the form returns to the login step; **Continue to delivery** restores the existing pin, polygon, fee, estimate and password. Back navigation also keeps that draft instead of silently creating a branch without its intended area.
- An unavailable check does not weaken the server guard or permanently block submission. Stale responses are ignored. Requests are debounced, and no password is sent in the availability check.

No database migration, new index, credential reset or dependency is required. Deploy the API before the frontend so the new check is available. Older clients remain supported by the unchanged creation request and atomic conflict guard. The login fix is a new candidate, separate from the already-active production alerts.

## Verification

Regression coverage includes reserved disabled administrators, manual choices, orphaned store reuse, tombstone collisions, admin-only access, strict/duplicate query rejection, uniqueness races and unchanged legacy identities. Browser cases also verify full delivery-draft recovery and the ability to sign in with the newly chosen login. Synthetic credentials and disposable loopback databases are used throughout. Final test and review results are attached to the candidate pull request.

## UI verification

This narrow extension preserves the incumbent neutral Working paper console, Geist typography, existing field/action styles and semantic feedback. No CSS, design tokens, PRODUCT, DESIGN or sidecar changes were introduced for login availability. The original operations workflow's detector pass was not repeated.

Generated logins can accept an available suggestion with a visible explanation; manually edited logins require an explicit suggestion action. A submit-time conflict returns focus to the login field and preserves the password, contacts and delivery draft. **Continue to delivery** restores the saved location, polygon, fees and estimate instead of silently submitting without the intended coverage. The fresh independent review returned **ship for its scored delivery-recovery finding**; this is a scoped UI conclusion, not a production-deployment or notification-delivery verdict.

Current local evidence is `.verification-results/branch-login-available-{390,1280}.png` and `branch-login-recovery-{390,1280}.png`, with masked synthetic passwords. Seven branch/routing browser cases passed across (360px), (390px), (768px) and (1280px), followed by one focused recovery recapture. Reported final checks passed: 272 unit tests, 157 API tests, 205 disposable-database integration tests, typecheck, lint, production build and seven release checks; the dependency audit reported zero high/critical findings.

An isolated Next.js 16.4.2 development run also kept the requested branch name `almina`, suggested `almina-store` against a retained administrator, displayed availability and created the synthetic branch through the UI. Browser errors were absent; Next diagnostics returned no compilation, configuration or session errors. This candidate remains separate from the production alert activation and existing real branch described above. No inherited design drift was canonized or repaired in this pass.
