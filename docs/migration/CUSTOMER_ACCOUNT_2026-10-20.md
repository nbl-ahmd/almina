# Customer account completion — 20 October 2026

## Experience

Google Identity Services is the primary social sign-in option when configured. Email
six-digit codes are the passwordless alternative. The first successful verification
creates an account; later visits find that account. There is no separate registration
form or password store. Guest checkout is unchanged. No SMS provider, subscription or
additional authentication library was introduced.

The account entry is now beside the header cart. The mobile delivery selector is constrained to its grid column so the additional action cannot overlap the logo. `/account` preserves the existing
saved products, addresses, preferences, rewards, reminders and purchase-history features.
The sign-in screen explains account benefits, separates email/code steps, focuses the
code field, supports change-email/resend (60-second UI cooldown), and displays errors
without clearing the entered address. The server still enforces rate limits, expiry,
attempt limits and single use. A history outage no longer signs the customer out or
pretends their account has no purchases. Generation guards prevent delayed purchase-history responses from repopulating state after sign-out or the next sign-in; preference responses cannot resurrect a signed-out/different account. Session-load failures have a retry screen.

The official Google button loads only on the account page and only when a client ID is
configured. `next/script` uses `onReady`, so logout/remount works with the cached script;
loading failure leaves email/guest paths available. Automatic account selection/One Tap
is not enabled. Duplicate callbacks and overlapping form submissions are locked while
an action is pending. Tokens are exchanged with the same-origin gateway, never stored
in browser storage. Google popup support is scoped to `/account` with
`Cross-Origin-Opener-Policy: same-origin-allow-popups`; existing nonce/CSP controls remain.

`/privacy` provides a factual notice for these account features, including sign-in,
essential cookies, purchases, addresses, preferences and pharmacy contact requests. It
is not a legal-compliance certification or a full review of every pharmacy data system.
Pharmacy approval and additional required business/privacy disclosures remain operational
release work. Existing English shopping/checkout dictionary values were not changed.
Full account/dashboard Arabic localization is outside this slice.

## Identity and session safeguards

- Google JWTs require valid Google keys, RS256, correct issuer/audience, issued/expiry
  times, nonempty bounded subject and verified valid email. Provider keys are cached
  by the existing `jose` remote key resolver.
- Google is authoritative for Gmail and verified Workspace identities. Third-party
  mailboxes without a Workspace claim are directed to email-code sign-in, following
  Google's ownership guidance. A Google `email_verified` claim alone is insufficient
  for those mailboxes.
- Verified email remains the existing commerce-account identity. A matching authoritative
  Google identity may bind to that account. Existing Google subjects cannot be overwritten
  or moved between mailboxes. Email changes require email-code access/pharmacy review;
  no automatic purchase-history reassignment occurs.
- Added planned unique partial `customer_google_identity` index on string `googleSub`.
  Google login fails closed until both email identity and Google subject uniqueness
  indexes exist. Duplicate-key races reject; disabled accounts cannot receive sessions
  via either sign-in method. Existing disabled sessions fail identity reads as before.
- Sessions retain random opaque tokens, hashed database storage, HttpOnly SameSite=Lax
  cookies and production Secure/__Host- scope. Customer and staff sessions stay separate.
- Logout is idempotent, clears expired/missing sessions and validates empty request bodies
  while retaining browser-origin/CSRF checks. Email addresses normalize whitespace/case.
- Marketing choices default false. Existing pricing, checkout, inventory and reward
  eligibility/issuance authority is unchanged.

## Required setup — not performed

The owner confirmed Google OAuth is **not configured**. No client ID, credentials,
production index, production account, publication or deployment was created in this task.

1. In the pharmacy-owned Google Cloud project, configure Google Auth Platform branding,
   audience and support contacts. Use only basic identity scopes (openid, email, profile).
   Supply the actual homepage and reviewed privacy-notice URL. For restricted testing,
   add intended test accounts; complete Google's applicable publishing/verification steps
   before opening the feature to all customers.
2. Create an OAuth **Web application** client. Add each exact storefront origin that
   should sign in (scheme + host + port, no path), including the actual production domain
   and any intended preview origin. Local Google tests should use `http://localhost` and
   `http://localhost:<actual-port>` as documented by Google; do not assume 127.0.0.1 origins
   are interchangeable. The callback flow needs no redirect URI or Google client secret.
3. Privately configure API runtime `CUSTOMER_GOOGLE_CLIENT_ID` with the public client ID.
   It is intentionally returned to the browser via `/customers/options`. No Google client
   secret belongs in the browser or is needed by this ID-token flow.
4. For email fallback, privately configure `CUSTOMER_AUTH_SECRET` (independent random
   32+ characters), `CUSTOMER_EMAIL_USER` and `CUSTOMER_EMAIL_PASSWORD`. The existing
   email-code transport uses Microsoft 365 SMTP with TLS; ensure the mailbox and tenant
   permit the configured authentication method. Do not reuse the admin password. No
   live mailbox delivery was tested or credentials inspected.
5. Review the index plan and existing `customers.googleSub` data for duplicates before
   applying `customer_google_identity` through the established migration workflow.
   Resolve conflicting records through reviewed ownership recovery; never delete or
   merge customer/order data to make index creation pass. Deploy API before frontend.
6. Verify a first-time Google customer, a returning customer, email fallback, real email
   receipt, cookie persistence/reload/logout, disabled-account rejection and guest checkout
   on the approved HTTPS host. Check actual popup/cancellation behaviour with a human
   Google account. Local synthetic tests cannot certify Google's hosted consent UI.

Environment examples document the variable names only, with empty values. No secrets
were added. Core implementation references:

- `apps/api/src/modules/growth/customers.ts`
- `apps/web/src/components/customer-sign-in.tsx`
- `apps/web/src/components/customer-account.tsx`
- `apps/web/src/app/api/customer/[action]/route.ts`

## Verification

Final checks passed:

- Root/workspace typecheck and repository lint.
- 168 unit tests, including Google signature/issuer/audience/expiry/subject verification,
  provider configuration and mailbox-authority rules.
- 16 focused disposable-replica integration cases, including first/repeat customer
  identity, email/Google matching, subject uniqueness, blocked accounts and logout CSRF.
- API build and isolated foundation production build with database access disabled.
- Eight focused account browser cases at 360/390/768/1280 px; account loading, email
  code/change-email/resend state, invalid code, Google callback/remount/failure, missing
  provider configuration, privacy link, real session cookie/reload/logout and delayed
  history isolation.
- Full `AL_MINA_ISOLATED_BUILD=1 npm run test:e2e:smoke` — 108 passed on the final code.
- Seven release tests and foundation/storefront/SEO smoke checks.
- Live Next.js dev verification: no compilation issues or reported configuration/session
  errors. Mobile/desktop visual review preserved the shared storefront design; focused
  header geometry tests prevent location/logo overlap. Build-only next-env changes restored.

The browser suite uses a synthetic GIS
adapter for callback/script-remount/error paths, plus a separate email case using the
real local API/gateway/session cookie. Its only delivery substitute is a code generated
for a hardcoded synthetic mailbox by the disposable loopback fixture. No production
email, Google identity, live database or provider call is used.

## Rollback

Frontend-only rollback preserves account/session data. The unique Google identity index
is additive and can remain. Do not roll back to the earlier account-binding code after
activation without assessing its disabled-account and provider-linking behaviour. No
customer or order backfill is needed. Existing account IDs, URLs, sessions and order
ownership are retained; no destructive migration or credential rotation occurred.

## Primary documentation

- [Google Identity Services setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Server-side ID-token verification and email ownership](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- Installed Next.js 16.3.8 bundled Script/onReady and CSP documentation.
