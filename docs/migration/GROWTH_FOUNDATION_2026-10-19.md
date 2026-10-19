# Growth, customer accounts and points vouchers — 19 October 2026

## Scope and current release state

Local implementation of the website foundations requested in the pasted pharmacy growth plan. This document supersedes the earlier homepage-only checkpoint where it lists a feature below. The broader acquisition/retention programme is **not complete**. No production database migration, deployment, paid campaign, customer email or WhatsApp message was performed in this task.

The user selected **points exchanged for discount vouchers**. No unapproved earning rate, referral reward, discount or delivery fee was activated in production. The local screenshot fixture uses explicitly synthetic rules and a synthetic customer.

## Implemented

| Area | Behaviour |
| --- | --- |
| Editorial CMS | Admin-only pages for brands, categories, guides, campaigns and collections. English/Arabic editorial variants; original text, FAQs, internal links, selected product IDs, image, dates, terms and reviewer. Revision checks prevent stale edits. Published health guidance requires a named reviewer. Campaign URLs survive expiry and show ended/upcoming state. |
| Search | Debounced accessible suggestions, brand/name/quantity token matching and bounded one-edit matching on a staff-rebuilt search index. Every suggestion rechecks live product and category visibility. Optional local search history can be cleared. Existing search submission remains available. |
| SEO | Server-rendered editorial and brand destinations, canonical links, reciprocal hreflang for published translations, sitemap entries, breadcrumbs, WebSite data and existing Product/ProductGroup/Offer data. Empty guide index avoids indexing. Approved genuine purchase reviews add visible AggregateRating data. No synthetic ratings or product reviews copied from Google. |
| Local RAK page | Four user-supplied branch phone numbers. Google-listed Al Jazeera Al Hamra address and daily 8am–2am hours / 9am–11:30pm delivery hours are identified only for that branch. Link to current Google directions/hours. Neighbourhood estimate is qualified; no invented licence or universal delivery promise. Staff profile editor with verification gate. |
| Customer identity | Separate HttpOnly customer cookies, Google ID-token verification (issuer/audience/signature/age/verified email) and one-time emailed codes (HMAC, expiry, attempt limit, one-time consumption). Authenticated customer actions have per-account quotas. Staff sessions/RBAC are separate. No account is required for guest checkout. |
| Order history / reorder | Verified email owns matching guest purchases, including case-insensitive historical addresses. New orders get an additive normalized ownership key. Account response excludes addresses/phone. Buy Again rechecks current stock and retains current checkout prices. |
| Customer address book | Up to ten addresses per authenticated customer, with add/edit/remove/default controls. Checkout can select and prefill a saved address; a guest can still check out without an account. Address records remain owner-scoped and do not enter order history responses. |
| Saved / recent | Signed-in saved lists are server-backed; guest lists stay local and separate. In-flight responses cannot repopulate lists after an account switch/sign-out. Recently viewed products are device-local, bounded and clearable. Hidden products are withheld from rendered lists. |
| Reviews | Signed-in purchase owner submits a bounded plain-text review. Confirmed/packed/dispatched purchases qualify; cancelled/refunded do not. Pending reviews require administrator moderation. Public totals aggregate all eligible approved reviews; only ten recent bodies are returned. |
| Delivery incentives | Admin edits existing server policy with version checks and an audit snapshot. Optional free-delivery threshold is checked in authoritative checkout and the cart preview. No existing fee changed automatically. Threshold and minimum-order qualification use the pre-voucher merchandise amount. |
| Order reporting | Admin-only 7/30/90-day order-value and count report, previous-period comparison, daily series and top product snapshots. It is not a profit report and does not expose customer PII. |
| CMS product/category selectors | Search active products by name/brand and choose active categories by label. IDs remain internal; hidden/archived products and disabled categories are excluded. |
| Points / referrals | Admin configures earning, redemption cost, fixed AED voucher value, validity, eligible categories, minimum eligible spend, referral/welcome points and terms. Defaults inactive. Only reviewed general-sale products qualify; medicines and unclassified products are excluded. Referrals attach once before the first order; no self-referral or sign-up award. |
| Fulfilment rewards | Admin explicitly confirms receipt for a dispatched order. Purchase and first eligible referral credits are recorded once in an integer ledger inside a transaction. This additive receipt record does not invent a new legacy order status. |
| Voucher checkout | Signed-in owner exchanges points using an idempotency key. High-entropy single-use vouchers retain their issuance terms, eligible categories and expiry. Server allocates the fixed discount in integer fils over eligible lines, recalculates VAT and hashes the final quote. Voucher consumption, stock decrement, order, numbering and checkout receipt commit in one transaction. Existing checkout requests remain compatible when no voucher is present. |
| Reversals | Cancellation restores a consumed voucher (its original expiry still applies). Refund/cancellation reverses earned/referral ledger credits once. A refunded redeemed purchase can leave a points deficit, blocking further redemptions until earned back. No cash credit or cash-out exists. |

## Configuration and activation

1. Deploy reviewed additive API/contracts/web together. Keep current application URLs and existing order/inventory snapshots. Do not enable customer sign-in before the new customer ownership index exists.
2. Review the new index plan with `node --import tsx scripts/migrations/growth-indexes.ts` (no URI read, connection or writes by default). The explicit `--apply` mode uses the existing API environment, rejects malformed/duplicate customer hash keys without printing data and adds only the new growth indexes. Existing catalogue/order collections are not rewritten. The general API index migration also includes this plan.
3. Set a server-only `CUSTOMER_AUTH_SECRET` (at least 32 random characters), `CUSTOMER_EMAIL_USER` and `CUSTOMER_EMAIL_PASSWORD` for the existing Microsoft 365 SMTP transport. The account screen honestly shows email sign-in disconnected until configured. Never paste these values in chat or commit them.
4. Configure Google Identity with the exact authorized website origins, then set server-only `CUSTOMER_GOOGLE_CLIENT_ID`. It is the public client identifier exposed to the account screen; no Google client secret is sent to the browser. Google sign-in is shown only when configured. CSP permits the Google sign-in resources on `/account` only.
5. In Admin → Website & growth, verify profile/licence details, publish useful editorial content and rebuild search suggestions. Only approved Cloudinary/CDN images can be saved by the CMS.
6. Confirm actual delivery areas and fees in the delivery policy editor. The user's proposed AED30 for other emirates is recorded as pending pharmacy policy confirmation rather than silently overwriting existing production rules.
7. Set complete reward terms and eligible categories, then explicitly enable the programme. Sample UI defaults do not constitute approved pharmacy rules. Existing vouchers continue to be honoured under their issuance terms if the programme is subsequently disabled.

## Storage, rollback and compatibility

New collections: `customers`, `customer_sessions`, `customer_auth_codes`, `customer_auth_limits`, `customer_saved`, `catalog_search_terms`, `growth_pages`, `growth_settings`, `commerce_policy_history`, `reward_policy_history`, `reward_wallets`, `reward_ledger`, `reward_vouchers`, `product_reviews`.

Customer session/code/quota expiry indexes are TTL; availability also checks expiry directly. Financial vouchers and ledgers are not deleted on expiry. Existing orders gain optional `customerEmailKey`, `customerId`, `rewardDelivery` and optional voucher line/totals snapshots. Existing policies gain optional `freeAboveMinor`; old policies have identical fee behaviour when absent.

Before activation, rollback is a code rollback leaving additive data intact. After any voucher/reward has been issued or used, retain the updated transaction/rollback logic until all obligations and snapshots are reconciled; do not blindly deploy an older API that cannot read voucher totals. Disabling new earning is safer than deleting ledgers or customer data. Do not remove new fields or indexes as part of rollback without a separate review.

## Verification

Final checks: 155 unit tests and 31 focused disposable-database integration tests passed. Workspace typecheck, focused ESLint, persistent API build and isolated Next production build passed. Next MCP returned no configuration or browser-session errors. Impeccable static detect returned no findings for the account component (that detector result is not a whole-site certificate). A real browser additionally saved a synthetic product to the signed-in list and loaded it on `/saved`.

- Disposable replica-set tests cover the existing checkout suite and new content/auth/search/reward paths. New tests cover mixed-case historical ownership, origin/RBAC/method gates, 25 account actions without an IP-shared sign-in quota, one-time concurrent code use, concurrent voucher consumption, cancellation/refund, referral replay, stock preservation, medicine exclusions, review ownership/moderation and saved-list isolation.
- Pure tests verify Google signatures/issuer/audience/expiry/email verification, cookie separation, late saved-list response invalidation, publication/URL/schedule/search rules and the legacy/free-delivery arithmetic boundary.
- UI verification: real local admin login, reward form load, synthetic customer account, exchange of 500 points into an AED10 voucher and no horizontal overflow at 390px. Both guest and signed-in desktop/mobile captures are under `outputs/growth-2026-10-19/`. The temporary loopback-only visual fixture never enters application imports or production builds.
- Independent review corrected ownership case, saved-list response races and customer quota isolation; final scoped verdict **ship**. See `GROWTH_UI_REVIEW_2026-10-19.md` for the exact visual scope. Provider-backed email delivery and a live Google account were not exercised; JWT verification was tested with an isolated signing key.

## Broader plan still outstanding

The CMS and account foundations do not make the full 90-day programme complete. The state below was updated after the completion pass recorded in `GROWTH_COMPLETION_2026-10-19.md`.

- **Consented abandoned-cart recovery; restock, price-drop and replenishment alerts with a delivery worker** — implemented (committed `81215ce`, hardened and tested in the completion pass). Requested reminders are owner-scoped, one-shot and consent-driven; the worker leases one row, never auto-resends an ambiguous send, and stays off until staff enable the policy and the email provider is connected.
- **Verified operational branch/serviceability management** — implemented. Staff maintain an admin branch directory (private until directory and branches are individually verified) and a serviceability rule that the API enforces on quotes and orders. Both default to inactive so existing emirate delivery is unchanged.
- **Genuinely complementary curated bundles** — implemented. The editorial CMS collection kind gained an explicit bundle marker and staff rationale; saving a bundle validates live, visible products across at least two categories, and the storefront offers an add-all control with no invented discount.
- **Full Arabic shopping/checkout translations** — started, not finished. A storefront locale preference (cookie), RTL shell, `t()` dictionary and a footer/header language switcher now cover the navigation and footer chrome. Cart, checkout, catalogue filters and product-detail interface copy remain English and are the next slice; product/category/health content is translated by staff through the CMS (`locale: 'ar'`), never machine-invented. The Arabic strings already added are a first pass and need native/pharmacy review before they are published copy.

Product listings support bounded server-side in-stock, current-price range and sort facets. The admin report includes a limited 90-day repeat-purchase cohort view. No fake controls or automated outbound messages were added to represent the remaining items.

Google Business Profile updates, Search Console/Merchant Center/Meta account verification, advertising budgets/creatives, stock/photo/clinical content verification and approval of offers are operational work. They cannot be inferred or certified from a successful local build. Rich-result eligibility is not a promise that Google will display a rich card.

### Address/report/selector follow-up — 2026-10-19

Added address-book ownership and checkout prefill, admin order-value/count reporting, and human-readable CMS product/category selection. Verification passed: workspace typecheck and repository lint, API build, isolated Next.js 16.3.8 production build, nine disposable-replica integration cases, and a matching-API browser preview. The browser showed demo report totals, searched and selected a demo product, and rendered the signed-out account with the guest-checkout option. The older preview server remains on its prior API until deployment; this work is local and no production data or deployment was touched.
