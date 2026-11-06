# Vercel compute efficiency — 2026-11-06

## Incident and scope

Spmb Vercel dashboard reported almina-storefront at 4h13m Active CPU against its 4h Hobby allowance, 287,867 function invocations and 71.3 GB-hours of memory for the displayed last 30 days. Deployment pause: November 4–December 4. The persistent business API runs on Render; the Next.js application, dynamic rendering and gateway routes still run on Vercel. Historical route-level attribution was not available in the retained dashboard window; these changes do not claim a measured monthly CPU reduction or a bot diagnosis.

## Changes

- Storefront and admin links use one navigation-only wrapper with prefetch disabled. This covers product cards, header/footer, menus, private admin tables and account/checkout links; clicking still uses Next client navigation. The tradeoff is that a destination's server render starts on click, rather than consuming function calls merely because links become visible or hovered.
- Environment parsing, locale reads and product-by-ID reads are memoized only within the current React request. This does not persist customer or stock data across requests and does not cache server-authoritative order validation.
- JSON/XML routes use a restrictive, constant `default-src 'none'` policy rather than building the HTML nonce/security policy. API responses remain private/no-store/noindex and their authorization/CSRF checks remain in their handlers. All HTML retains its per-request nonce and private/no-store policy. Explicit public design assets, icons and workers bypass document middleware.
- Only successful public sitemap XML gets a five-minute shared CDN cache. Its bodies contain public URLs, not user data, prices or inventory. Errors remain no-store. Query strings are rejected rather than creating unlimited cache variants. Product visibility can therefore take up to five minutes to disappear from a previously cached sitemap, while actual product reads and checkout remain fresh.
- Order SSE reconnects carry an opaque SHA-256 event ID using standard Last-Event-ID. An unchanged first sample on reconnect emits connected without forcing router.refresh. New/changed state still emits reconcile/orders; each sample is independently authorized, revocation still closes the stream, and no customer/order payload is included in the event. No longer-lived streams or weaker session checks are introduced.

## Why HTML is not cached wholesale

Next.js 16.4.2's bundled CSP documentation requires dynamic rendering for per-request nonces and notes that static optimization/ISR/PPR are incompatible with this policy without a different deliberate CSP design. Sharing nonce-bearing HTML, removing strict-dynamic or allowing inline scripts would weaken the existing protection. Customer pages, live commerce data and request-local language decisions also require explicit isolation. This pass therefore removes unnecessary renders rather than changing that security contract.

## Evidence

A production-build synthetic catalogue visit, hover and scroll recorded 56 Next route prefetch requests in the previous checkoutux build. The identical optimized-build regression recorded zero, then navigated successfully on click; a separate admin navigation check also recorded zero speculative private-route requests. This is an isolated request-count comparison, not a production CPU or conversion measurement.

Focused regressions cover data-route classification, bounded sitemap policy and unchanged/changed/revoked/malformed-cursor order reconnects. Final verification passed: 256 unit tests, 137 API/security tests, 65 isolated production-build browser cases, web typecheck, lint and the production build. Next.js development MCP compilation and runtime diagnostics reported no issues, and a separate live browser check confirmed catalogue-to-product navigation with no browser errors. Four stale assertions in existing Arabic/mobile tests were updated to the already-shipped UI (category link, campaign indicator, radio payment/seeded cart and mobile cart tab); no corresponding product copy or behaviour was changed. Browser checks cover nonce uniqueness, private HTML/API caching, sitemap caching, no-cookie XML, query rejection, public-asset middleware bypass, admin access/revocation, catalogue, Arabic and checkout/payment flows. Production cache HIT behaviour can only be confirmed after release on Vercel.

## Release and rollback

No hosting, billing, DNS, database or production security configuration is changed by this branch. The current Vercel pause prevents activating new deployments until the team is unpaused or hosting is deliberately moved. This optimization does not reset the exceeded allowance. A paid plan or a Render frontend hosting change requires an explicit hosting/billing decision.

Rollback is a frontend commit revert. No database migration is needed. Server-side pricing, stock, order idempotency, roles, CSP nonce generation for HTML and existing media compatibility remain intact. For a complete removal of Vercel function usage, the Next server must also be hosted elsewhere; merely using Render as its API origin does not accomplish that.

References: installed Next.js 16.4.2 docs `01-app/03-api-reference/02-components/link.md` and `01-app/02-guides/content-security-policy.md`; Vercel [Fluid pricing](https://vercel.com/docs/functions/usage-and-pricing) and [Hobby limits](https://vercel.com/docs/plans/hobby).

## Release-gate dependency correction

The required dependency audit identified existing follow-redirects 1.16.1 affected by [GHSA-mrwp-f3q8-3g9p](https://github.com/follow-redirects/follow-redirects/security/advisories/GHSA-mrwp-f3q8-3g9p). Updated only that transitive lock entry to 1.16.2. A loopback-only regression verifies that a sensitive-header list created in another JavaScript realm is honoured across a cross-origin redirect. The installed artifact and both root/backend audits were checked; no high or critical advisories remain in those audit reports. Unit and API/security suites pass after the patch. No production credential disclosure was observed or inferred.
