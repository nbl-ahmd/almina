# Google customer and wholesale authentication — 22 October 2026

## Live activation completed

The owner configured the pharmacy-owned Google OAuth Web application and Render's `CUSTOMER_GOOGLE_CLIENT_ID`. The existing Google Identity Services callback flow uses verified ID tokens; it does not use a Google client secret or request Gmail/Drive permissions. No credential was copied into source, a browser bundle, logs or documentation.

Two independent blockers were resolved:

1. The custom domain was live while Vercel's `WEB_ORIGIN` still pointed to the `.vercel.app` alias, and Render's `AUTH_ALLOWED_ORIGINS` lacked the apex domain. The owner explicitly approved setting the canonical origin to `https://alminapharmacy.com`, adding that exact API origin while retaining the three existing origins, and publishing Google sign-in. Vercel and Render settings were saved. Verified master `718e6cb` was redeployed through the existing Vercel workflow (run 39623493562, successful); Render's environment deployment completed. Invalid synthetic credentials now reach request validation instead of being rejected by the domain boundary. Origin/CSRF checks remain enforced.
2. The production `customers` collection did not exist. The server deliberately requires unique email/Google identities before issuing a session. Atlas inspection confirmed an empty/new collection; no old customer data or duplicates were merged/deleted. Created `customers` and applied the existing planned `customer_email_identity` unique index and `customer_google_identity` unique index with `partialFilterExpression: {googleSub: {$type: 'string'}}`. Created the empty `customer_sessions` collection and applied the planned `customer_session_expiry` TTL index (`expiresAt: 1`, `expireAfterSeconds: 0`) and `customer_session_owner` lookup index. Atlas shows all indexes Ready. No network access rule or database credential was changed. No product, order, stock, price or staff account was modified.

Google Auth Platform is **In production**, External. The existing authorized JavaScript origins include the apex, www and Vercel alias. The verification centre confirms that data-access verification is unnecessary because the app requests no sensitive/restricted scopes. Branding verification is separate and incomplete: Google's consent screen currently identifies the domain rather than showing the submitted branding. Do not claim branding has been verified.

## Live verification

- Real GIS button → Google account selection → successful customer session using the pharmacy's existing Google account. This created one ordinary customer profile; no wholesale approval or order was created.
- Reload preserved the signed-in account. Logout returned to sign-in, and navigating back to `/account` remained signed out.
- The same retail session on `/wholesale` was denied trade access, with no private catalogue/prices exposed. No production business account was fabricated to test access.
- Customer sessions remain separate from staff/admin sessions, random, hashed in MongoDB and HttpOnly/Secure/SameSite=Lax under the production `__Host-` cookie.
- Proof is in `outputs/google-auth-2026-10-22/`: live account, customer indexes, session indexes, Google production status and retail wholesale denial screenshots.

## Code follow-up

The focused authentication PR contains:

- Origin/gateway errors no longer falsely instruct every Google user to use email codes. Provider credential errors and authoritative-mailbox verification have distinct local messages.
- Google-only screens omit the email divider and do not announce that business sign-in is unavailable when Google is configured. The wholesale sign-in heading explicitly requests the invited email. Provider failures display one useful message rather than contradictory fallbacks.
- Includes the concurrently prepared GIS button surface fix: responsive button frame and a single loading/failure presentation. Its implementation and visual evidence are documented separately in `CUSTOMER_SIGNIN_2026-10-21.md`.
- Wholesale logout/refresh clears prior receipt, cart, pending-order UI and account messages. Successful invitation acceptance clears the stale access-denied message. Existing idempotency/storage, pricing and stock authority are unchanged.
- Vercel deployment validation now checks the canonical `WEB_ORIGIN` to prevent another alias/domain mismatch.

These code changes are distinct from the already-live provider/domain/database activation and await the normal PR release. Do not deploy an unreviewed local worktree or mix the separate image-delivery PR into this release.

## Business onboarding

Admin → Wholesale: configure an active business profile, verify and approve the business email, assign the allowed products/categories and reviewed trade terms, and generate its private invitation. The recipient opens the link and signs in with that exact Google-verified email, then accepts the single-use invitation. Returning users sign in at `/wholesale`. Google sign-in alone never grants trade access. Approval, accepted invitation, active business profile and product assignment are checked on the server for every private read and order.

Email-code sign-in is not configured (`emailEnabled: false`). Gmail and Google Workspace accounts can use Google; third-party Google-account email addresses without an authoritative Workspace claim still require mailbox verification and are not silently trusted for purchase ownership or business invitations. Enable the separate email provider/HMAC configuration before onboarding businesses that cannot use an authoritative Google identity. Marketing remains optional and guest retail checkout remains available.

## Verification of the code follow-up

- Unit suite: 176 passing, including account error classification and provider identity checks.
- Disposable database integration: 14 passing, including Google first/repeat sign-in, email identity linking, wrong-email invitation denial, explicit acceptance, suspension, customer/admin boundaries and wholesale commerce regressions. No application URI or production database is used by these tests.
- Focused browser suite: 18 passing across account and wholesale flows; includes Google-only business onboarding, callback failures, reload/logout, post-logout receipt/cart isolation, invitation persistence, guest separation, quantity/quote/idempotency and real local gateway/session checks.
- Root/workspace typecheck, lint and tagged isolated Next.js 16.3.8 production build passed. Next.js dev diagnostics report no compilation issues. The Next runtime verification skill uses the permitted CUA browser interface for manual checks.

## Rollback

Retain the additive account collections and indexes; reverting frontend presentation does not require deleting accounts/sessions. Revert the code commit through the ordinary PR flow if needed. Keep the corrected apex-domain configuration while the custom domain is canonical. To disable Google login operationally, remove its public client ID from the API configuration and redeploy, preserving existing account/order data. Do not delete or reset the database as a rollback.

References: [Google GIS setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [ID-token and mailbox verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
