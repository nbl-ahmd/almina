# Customer sign-in design refinement — 20 October 2026

## Direction and references

Operate mode: make sign-in feel like a focused ecommerce task. Retain Al Mina's Outfit,
cobalt/neutral tokens, Heroicons and Tailwind utilities. Emil Kowalski guidance informed
control feedback, stable button geometry, focus and restrained motion; Impeccable informed
hierarchy, compactness, copy and bounded review. The Impeccable context launcher was
unavailable (permission denied); PRODUCT.md, DESIGN.md and the skill's Operate/craft
references were read directly. No skill files, permissions or design-system globals changed.

Inspected Shop's public sign-in screen in the browser, without entering details or
creating an account: one narrow column, clear sign-in/create-account relationship, email
then verification. Its [account setup guide](https://help.shop.app/en/shop/getting-started/account-setup/create-shop-account)
confirms that sequence. This is a pattern reference, not copied branding or assets. Nike's
sign-in URL could not be inspected by the web reader and is not claimed as visual evidence.

## Before / after review

| Before | After | Why |
| --- | --- | --- |
| Large two-column card and prominent benefits panel | One centered card, capped at 440 px, with a real back-to-shopping link | Keeps the task clear and scales consistently to small screens |
| Generic introduction and a separate marketing block | Sign in or create your account, plus a short first-visit explanation | Explains automatic registration without redundant tabs |
| Provider and email actions lacked a consistent hierarchy | Official Google button first when configured, labelled email divider, full-width primary action | Familiar ecommerce choices, without inventing unavailable providers |
| Verification was another input below the same introduction | Dedicated code step, destination-email strip with edit control, expiry hint and resend row | Makes the step and recovery actions visible |
| Change-email removed the focused control | Focus returns to the email field; code step focuses the code field | Supports keyboard and autofill flows |
| Helper copy could become part of the code field's accessible name | Explicit label association and separate described hint/error | Screen readers announce the correct field name |
| Tall decorative verification icon | Removed after the first batched visual review | Keeps useful controls higher on mobile |
| Busy/disabled actions depended on generic defaults | Stable-size loading indicator, explicit disabled treatment and small press feedback | Clear states without layout jumps or excessive motion |

No actual modal/dialog was introduced: `/account` remains directly addressable and the
compact card supplies the requested focused presentation. There is no fake close button,
no duplicate signup flow, no extra personal-data collection and no new dependency.

## Behaviour and boundaries

Existing email/Google verification, account creation, customer session cookies, rate
limits, consent defaults, signup data, server RBAC, pricing, checkout and guest ordering
are unchanged. Google remains unconfigured and email-provider activation remains pending
as recorded in [the account setup guide](CUSTOMER_ACCOUNT_2026-10-20.md).

The Google control is still rendered by the official GIS library. Shape/size are passed
through its supported button options; no custom Google logo/button implementation is
shipped. The screenshots use a deliberately simplified synthetic provider adapter and
do not certify the appearance of Google's live hosted button or consent popup.

Google sign-in uses an OAuth web client ID and a signed ID token for authentication;
it does not request Gmail/Drive access tokens or implement a Google API authorization-code
exchange. Google's [integration guidance](https://developers.google.com/identity/gsi/web/guides/integrate)
distinguishes those identity and authorization flows.

Motion is limited to brief colour/press feedback and pending/loading indicators. Animated
indicators and press transforms honour reduced-motion preferences. There is no carousel,
page entrance, focus delay, new motion library or animation that gates authentication.

## Verification

Final checks passed: root/workspace typecheck, repository lint, the isolated foundation
production build (database disabled), and all 12 scoped browser cases (eight account
journeys plus four responsive navigation cases). Coverage includes real local HttpOnly
session verification, logout/reload, stale history isolation, provider failure/remount,
code errors, change-email focus restoration, privacy navigation, card width and header
geometry. Both states are covered at 360/390/768/1280 px. Live Next.js Turbopack reports
no compilation issues. The earlier 108-case broad suite belongs to the previous account
checkpoint; it was not repeated or claimed as a fresh result for this presentation slice.

One batched visual review and one confirmation round were performed. The confirmation
shows the shortened verification screen fits the mobile task better. Authentication was
not reimplemented. Build-only next-env.d.ts changes were restored and diff checks pass.

Screenshots live in
`outputs/customer-sign-in-polish-2026-10-20/`: entry and verification states at
360/390/768/1280 px, with synthetic identities and provider rendering. These are test
fixtures, not live customer screenshots. No production account, database, provider,
publication, credential or deployment action occurred.
