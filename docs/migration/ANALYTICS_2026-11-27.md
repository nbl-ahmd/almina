# Storefront analytics (PostHog) — 27 November 2026

Branch `claude/analytics-posthog`. Not deployed. No database, API, checkout calculation or order change.

## What it is for

Seeing where shoppers come from, which general products draw interest, where the purchase funnel loses people, what refuses a
checkout, and how fast pages feel. Orders in MongoDB remain the authoritative record of sales; browser analytics undercounts
(blockers, privacy settings, closed tabs).

## Consent behaviour

| Visitor | `POSTHOG_COOKIELESS_ENABLED=false` | `=true` |
|---|---|---|
| Has not chosen | Nothing sent | Anonymous counts, nothing stored on the device |
| Declined | Nothing sent | Anonymous counts, nothing stored on the device |
| Allowed | Events with a random identifier in local storage | Same |
| Do Not Track or Global Privacy Control | Nothing sent, SDK not downloaded | Same |

- A first-visit bar (English and Arabic) offers equally weighted **Allow** and **Decline**. It is hidden on checkout and while the
  delivery sheet or another dialog is open, and steps aside for the phone purchase docks. The footer usage preferences change the
  choice later.
- With anonymous counting on, visitors who have not answered are counted from their first page, before they may have read the bar.
- Withdrawing permission opts out, resets the SDK and removes its stored keys.
- The consent record moved to `almina.optional-usage.v2`: permission given before covered only first-party counts, so it is asked
  again. An earlier refusal is still honoured.
- Staff (`/admin`) and wholesale screens are never measured; their content security policy does not allow the provider.
- The privacy page gains a "Shop analytics" section only when a project key is configured.

**Owner decision to confirm:** the owner chose anonymous counting for visitors who have not allowed analytics, including those who
decline, subject to a legal check (UAE personal-data and health-data rules). It stays off until the variable is `true`. This is not
legal advice and no legal review has been recorded.

## What is sent

All filtering is in `apps/web/src/lib/analytics/policy.ts`, which drops any event or property it does not list.

| Event | Extra properties |
|---|---|
| `$pageview`, `$pageleave` | page type, language, scroll depth |
| `$web_vitals` | LCP, INP, CLS, FCP or TTFB value |
| `product_viewed` | general-sale products only: ID, name, category, brand, price |
| `product_added_to_cart` | quantity, plus the same product fields for general-sale products |
| `cart_updated`, `checkout_reviewed` | none |
| `checkout_confirmed` | order value, item count, payment method (test card payments excluded) |
| `checkout_failed` | refusal code |
| `search_performed`, `search_matched` | none (never the search words) |
| `campaign_viewed`, `campaign_clicked` | published, non-health campaign slug |
| `contact_clicked` | `phone`, `whatsapp` or `email` |
| `client_error` | none; only where the footer usage controls are mounted |

Common to all: device and browser description, time zone, referring site (origin only), `utm_source`, `utm_medium`,
`utm_campaign`, `utm_content`.

Never sent: medicine, pharmacy-only or unclassified product details; search words; `utm_term` and other query strings; slugs
(addresses become page types such as `/products/:product`); names, phone numbers, emails, addresses; order numbers; screen text.
Autocapture, session recording, heatmaps, surveys, feature-flag requests and remote scripts are disabled.

Because addresses are reduced to page types, per-page SEO analysis comes from Search Console, not PostHog.

## Connection

The browser posts straight to `https://eu.i.posthog.com`; PostHog therefore receives the visitor's network address. A Next.js
rewrite proxy was not used because it forwards cookies, including shop sessions, and needs a site-wide trailing-slash change. If
blockers hide too much, set up PostHog's managed reverse proxy on a subdomain and set `POSTHOG_HOST` to it.

The SDK (`posthog-js` 1.453.2, slim build without external scripts, about 55 KB gzipped) is a separate chunk downloaded after the
page is idle, and only when something may be sent.

## Owner setup

1. Create a PostHog **EU Cloud** project.
2. In the project settings: enable **Cookieless tracking** (needed before anonymous counting; otherwise those events are discarded),
   enable **Discard client IP data**, and leave autocapture, session recording and heatmaps off.
3. In Vercel (web project), set `POSTHOG_PROJECT_KEY` to the **project** API key (`phc_…`, public by design; never a personal
   `phx_` key). After the legal check, set `POSTHOG_COOKIELESS_ENABLED=true`. Deploy.
4. Open the site, choose **Allow**, and confirm events arrive in PostHog's activity view. Repeat after **Decline**. If no bar
   appears after deploying, the key was not accepted: check that it starts with `phc_` and has no spaces or quotes.
5. Search Console: add a URL-prefix property for the site, copy the HTML-tag token into `GOOGLE_SITE_VERIFICATION`, deploy, verify,
   then submit `/sitemap.xml`. The code for this already existed.

A mistyped analytics variable switches analytics off; it does not stop the site.

## Volume and cost

PostHog bills per event above its free allowance. Each web vital is its own event (up to five per full page load), and anonymous
counting makes every visitor contribute. Watch the billing page in the first week and set a spending limit; web vitals are the first
thing to sample if volume is high.

## Dashboards to create first

- Funnel: `product_viewed` → `product_added_to_cart` → `checkout_reviewed` → `checkout_confirmed`, split by device and `utm_source`.
- Revenue: sum of `value_aed`, count and average per `checkout_confirmed`, by referring domain and campaign.
- Lost sales: `checkout_failed` by `error_code`.
- Products: views against cart additions by `product_name` (many views, few additions: price, photo or stock problem).
- Contact demand: `contact_clicked` by channel and page type.
- Speed: 75th percentile of each web vital by page type.

Name campaign links with lowercase `utm_source`, `utm_medium` and `utm_campaign`; never put a medicine or a person in them.

## Not included

- Google Analytics 4, Meta Pixel and Google Ads tags (not requested; health-related advertising rules apply).
- Server-side purchase events, and storing campaign attribution on orders. Both touch order creation and need regression tests.
- Session recording and feature flags.

## Verification

Unit tests: `tests/analytics.test.ts`. Browser tests: `tests/e2e/analytics.spec.ts`, which intercepts the provider; delivery to a
real PostHog project, including cookieless ingestion, has **not** been verified.

## Rollback

Unset `POSTHOG_PROJECT_KEY` and redeploy: no SDK download, connection, banner or privacy section. The consent key stays at v2.
