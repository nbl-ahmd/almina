# Public launch and growth remaining — 22 October 2026

Document/report review of the current workspace. This is not a fresh production,
provider-account, inventory or security audit, and does not authorize deployment,
production writes, messages or advertising. “Unverified” means the reviewed evidence
does not establish completion, not that the live service necessarily fails.

## Reconciled state

- Storefront/admin redesign, search/filtering, campaign editing, customer accounts,
  saved lists, addresses, reorder, reviews, rewards foundations, consented reminder
  workers, curated bundles and branch/serviceability controls are implemented.
- Arabic shopping/checkout interface code is complete for its documented scope;
  native-language review and translated product/editorial content remain. Account,
  admin and new wholesale interfaces are not claimed fully Arabic.
- Google sign-in, canonical apex origin and customer identity/session indexes were
  verified live on 22 October. Older “OAuth not configured” statements are superseded.
- Email sending domains/templates and provider test-address delivery are verified;
  live review still finds email-code login disabled and inspected webhook attempts
  returning 404. Production activation and controlled-inbox acceptance remain.
  See `EMAIL_MEDIA_STATUS_2026-10-22.md`.
- Wholesale store/account/audience additions are locally implemented and tested;
  release, index application and real business onboarding remain separate.
- Catalogue status prose is stale: the later applied verification reports establish
  678 published / 6,458 drafts from 7,136 products, 15 live with photos and 663 live
  without photos at 18 October 07:13 UTC. The earlier 13-published checkpoint is not
  the latest evidence. None of these numbers is a current live inventory.

## Before public commerce launch

1. Prepare one reviewed committed release candidate containing the intended web/API
   changes. Complete exact-commit CI, security audit and representative hosted tests;
   confirm deployed component versions, origins and required additive indexes.
2. Close documented credential rotation/revocation items with provider evidence;
   verify current admin/staff permissions. Record a usable backup, isolated restore
   rehearsal, rollback owner and monitoring/alerts. Prior local tests are not evidence
   of production backup or secret revocation.
3. Audit the launch assortment: actual available stock, correct gross prices/VAT,
   customer-readable names, exact packs, classifications and photo rights. The
   competitor plan prioritizes 50–100 photo-ready commercial products; enriching all
   7,136 is not required for a controlled curated launch. Keep uncertain/unreviewed
   and prescription products held. Obtain a fresh catalogue/photo count.
4. Approve and publish actual branch contacts/hours, service areas, delivery fees,
   minimum/free-delivery rules, fulfilment expectations and returns/cancellation
   terms. Account privacy exists; it is not evidence of a complete store-policy set.
   Align admin policy, checkout calculations and customer-facing wording.
5. Deploy/configure the email integration and verify code delivery, order email,
   invitation delivery when launching wholesale, signed delivery/bounce webhooks,
   suppression and recovery with controlled recipients. Verify operational staff
   notifications, WhatsApp/webhooks and intended push/realtime paths.
6. Complete representative media checks. The 22 October live probe now verifies
   the custom CDN hostname and one legacy category image return 200; direct and
   responsive Cloudinary product delivery also work. The compatibility code still
   depends on a personal-account Worker: inventory mappings and move the upstream
   to pharmacy ownership before retiring that dependency. Preserve old assets.
7. Execute the cutover checklist on the approved release: browse/search/product/cart,
   designated order and idempotent retry, once-only stock deduction/cancellation,
   authorized admin fulfilment and real notifications. Verify canonical/robots/
   sitemap/redirect behaviour on the public host. Record at least 24 hours of actual
   observation with zero unexplained stock/order differences before completion.

If wholesale launches simultaneously, configure verified business types/accounts,
assignments, audience rules, explicit prices and case quantities, then pilot an
approved business through invitation, acceptance, ordering and staff fulfilment.
Otherwise keep wholesale unconfigured/private while retail launches.

## Growth work that can follow a controlled launch

- Finish canonical brands/taxonomy and useful product attributes; populate dedicated
  brand/category/editorial destinations. CMS/brand templates already exist.
- Build compatibility-aware recommendations; add evidence-backed new arrivals,
  bestsellers and pharmacist selections only when their underlying facts exist.
- Approve and publish real campaigns, complementary bundles, branch content and
  Arabic content; activate reviewed rewards/reminders only when desired.
- Establish Search Console/Business Profile baselines and verify ownership/content.
  These are acquisition tasks, not substitutes for commerce acceptance.
- Complete privacy-reviewed funnel/search-success/campaign attribution, contribution
  costs, fulfilled-order economics and useful repeat cohorts. Current reporting is
  order value/counts, not profit; technical telemetry is not full growth attribution.
- Perform the plan's exact-pack 20–30-item landed-price basket comparison before
  making competitive-price claims or setting acquisition economics.
- Review eligible product/creative subsets and relevant account permissions before
  Merchant Center/Meta feeds or capped ad pilots. Feeds/ads/rewards do not need to
  launch with basic retail checkout. No advertising eligibility is certified here.

## Source precedence

- `outputs/commerce-direction-2026-10-18/RAK_COMPETITOR_GROWTH_PLAN.md`: proposal,
  assortment priorities, measurement and phased acquisition programme.
- `GROWTH_FOUNDATION_2026-10-19.md`, `GROWTH_COMPLETION_2026-10-19.md`,
  `ARABIC_PHASE_FOUR_2026-10-20.md`: implemented features versus activation/review.
- `GOOGLE_AUTH_ACTIVATION_2026-10-22.md`, `RESEND_EMAIL_2026-10-22.md`,
  `WHOLESALE_COMPLETION_2026-10-22.md`: newest provider/feature checkpoints.
- `outputs/storefront-review-2026-10-18/final-catalogue-counts.json` and
  `retail-publication-verification.json`: later applied catalogue evidence.
- `CLOUDFLARE_RETIREMENT_2026-10-21.md`: media hostname and ownership gaps.
- `PRODUCTION_CUTOVER_2026-10-03.md`: acceptance/evidence procedure; older hosted
  state descriptions in that file must not override newer deployment reports.
