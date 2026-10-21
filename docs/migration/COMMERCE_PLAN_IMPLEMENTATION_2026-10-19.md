# Commerce plan implementation — 19 October 2026

This checkpoint implements the homepage/discovery portion of `outputs/commerce-direction-2026-10-18/ALMINA_NEW_COMMERCE_DIRECTION.md` and `RAK_COMPETITOR_GROWTH_PLAN.md`. It is not a claim that their complete 90-day growth programme is finished.

## Implemented locally

| Plan requirement | Implementation |
|---|---|
| Compact location/search/cart navigation | Logo, search, compact delivery choice and cart. Location no longer occupies a mobile row. Header contact moved to a floating bottom-right contact link, above mobile navigation. Existing delivery dialog/save flow retained. |
| Dense first shopping view | 255px mobile / 290px desktop hero minimum; tighter navigation, 20/28px section gaps, smaller category wells, mobile category rail. Removed redundant reassurance strip and duplicate mobile contact panel. |
| Available, photo-ready merchandising | Hero prefers approved live offers/featured and real photo-ready products. First shelf mixes recognizable brands before filling remaining positions. Stock quantity is never labelled popularity. |
| Different merchandising formats | Product cards, compact horizontal product rails, category rail, single/multi collection banners, individual skincare routine products, editorial category panels, brand text links, conditional offers and API banner artwork. |
| Campaign destinations | Restored saved banner links through the public data adapter; relative storefront and HTTPS destinations validated. Unsafe schemes/credentials/protocol-relative destinations rejected. Missing/invalid link leaves artwork non-interactive. |
| Useful collections | `/collections/skin-essentials`, `/collections/baby-care`, `/collections/daily-care`, `/collections/under-50`; bounded API queries with explicit eligibility rules. Collections represent selected assortments, not a claim of exhaustive catalogue coverage. |
| Genuine budget discovery | AED 50-and-under uses current active-sale price, available stock and minimum assortment threshold. Homepage requires at least four eligible products across two categories and varies the first category positions. |
| Brand discovery | Canonical brand fields where available, otherwise a short explicit recognizable-brand prefix list. Text links search the live assortment; no unauthorized logos. |
| Search-friendly collection destinations | Server-rendered products, canonical metadata, BreadcrumbList and ItemList JSON-LD, loading UI, unknown-slug 404. Nonempty collections enter the existing static sitemap shard. Empty collections avoid thin indexing; transient API failures remain failures rather than false empty data. |
| Truthful missing-photo treatment | Large photo-led merchandising prioritizes real photos. Small personal-care/budget cards use a generic bag icon when a photo is missing; no fabricated pack images. |
| Commerce integrity | Existing AddToCart, stock/price validation, family options, checkout and identifiers preserved. No production data writes or order submission. |

## Still needed to complete the broader plans

| Work | Current status / dependency |
|---|---|
| Full campaign CMS: live copy, product pins, dates, terms, eligibility, mobile/desktop previews | Implemented structured campaign editor, desktop/mobile artwork selection and shared preview, hero/supporting placements and priorities, ordered product pins, scheduling and advisory readiness. Eligibility/exclusions are staff-authored terms; no automatic discount. See [20 October campaign checkpoint](CAMPAIGN_MERCHANDISING_2026-10-20.md). Homepage collection definitions remain code-managed. |
| Canonical shopper taxonomy, clean ERP display names, verified pack facts, broad image coverage | Existing ERP/admin content retained. Pharmacy/merchandiser must verify product facts and authorize source images; no bulk inferred clinical claims or identity changes made here. |
| Full listing/PDP redesign, richer facets, typo-tolerant autocomplete, compatibility-aware recommendations | Listing/PDP/cart redesign and bounded search suggestions are implemented. This follow-up adds server-applied in-stock, AED price range and stable sort filters; active sale prices drive filtering and sorting. Compatibility-aware recommendations remain open. |
| Brand landing pages | Brand discovery links currently use search; dedicated canonical brand pages require reliable canonical brand coverage. |
| New arrivals / bestsellers / pharmacist picks | Omitted: no reliable arrival/ranking/endorsement evidence supplied by current homepage data contract. |
| Recently viewed, saved lists, secure order status/reorder, restock reminders, verified reviews | Device-local recent products, customer-owned saved lists, verified email order ownership/reorder, and moderated purchase reviews are implemented. Restock reminders still need customer consent, delivery workers and provider configuration. |
| Local RAK/branch landing pages and Google Business Profile consistency | Local RAK page and four supplied branch phone contacts are implemented. Per-branch address, hours, service area and profile consistency still need pharmacy verification. |
| Google Search Console / Merchant Center / Meta verification and compliant ad pilots | Existing product SEO/feed foundation preserved. Account configuration, eligible approved product subsets, commercial permission, budget and reporting are separate operational work. No campaigns launched or money spent. |
| Funnel measurement, search success, campaign attribution and fulfilled margin | A bounded 90-day repeat-purchase cohort and order report are implemented. Search-to-order attribution and fulfilled margin require a privacy-reviewed event contract and reliable product cost/fulfilment data; raw health searches, customer PII and health-related profiles must not be sent to ad analytics by default. |
| Fulfilment/serviceability/ETA promises, returns and economics | Need pharmacy-approved policies and actual area/item rules; current UI does not invent instant-delivery promises. |

The next coherent package is consented retention messaging and provider-backed alert delivery, plus product naming/photo coverage. Acquisition work should use verified operational facts and measured fulfilled-order economics.

## Verification and evidence

- 20 focused merchandising/storefront/SEO/media/stylesheet tests passed. Added regression coverage for active sale price eligibility, unavailable/hidden products, category membership, duplicate IDs, safe banner destinations and real brand extraction.
- Focused TypeScript and ESLint passed; production Next.js build passed. Final singleton layout fix subsequently typechecked.
- Impeccable 4.6 static detect with `--no-config`: zero findings. No global detector ignores added.
- Local Next MCP: no configuration or session errors.
- Browser: 360/390/768/1440 widths checked, no document overflow; compact delivery control verified and dialog opened/closed; new collection navigated and reloaded; canonical URL and ItemList/BreadcrumbList verified; product images checked for load failures.
- Independent finish reviewer requested fixing a singleton collection half-row. Fixed with a full-width compact composition; scoped verdict `ship`.
- Screenshots under `outputs/homepage-v3-2026-10-19/`. Banner-link behaviour has pure regression tests; no new production banner was uploaded just to test it.

## Delivery boundaries

Local preview: `http://127.0.0.1:4765/` uses the public real catalogue. `http://127.0.0.1:4760/` remains the local admin/demo environment. No production push, deployment, database backfill or paid campaign launched. Existing unrelated fixture/admin test edits were preserved.

## Follow-up completion checkpoint — 19 October 2026

Since the original homepage checkpoint, the storefront extension and growth foundation documents record broader implementation of category/PDP/cart/checkout/offers, customer identity, saved products, purchase reviews, points vouchers, SEO/editorial destinations, and local pharmacy pages. This follow-up adds a customer-owned address book with checkout prefill, a PII-free 7/30/90-day admin order report, and readable active-product/category selectors for CMS content. These are local code changes only; no customer data has been backfilled and rewards or policy changes remain inactive until reviewed.

The checkout address picker is optional; saved addresses are only available to signed-in customers. Guest checkout remains supported. The report measures order value and counts, not margin or recognized net revenue. Product/category selectors expose active catalogue entries only. Product, search, category and offer listings now accept bounded in-stock, current-price range and sort filters; API applies these before pagination using active sale prices. The admin report also groups 90-day first-dispatched-order cohorts and repeat dispatched purchases using email only inside the server aggregation; only cohort counts leave the API.

The growth programme is not fully operational end to end. Remaining code work includes consented abandoned-cart recovery, customer-controlled restock/price/replenishment alerts with reliable delivery workers, full Arabic shopping/checkout translations, and pharmacy-reviewed complementary bundles. Verified branch/serviceability rules and deeper acquisition attribution depend on current pharmacy operational data. Outbound customer messaging, price/stock policies, offers and delivery promises need pharmacy-approved rules and provider configuration. Google Business Profile, Search Console, Merchant Center, Meta catalogue/ad setup, creative approvals, budgets and campaign operation require pharmacy account access and are not represented as implemented.

Verification for this checkpoint: root and workspace TypeScript checks and repository lint pass; the focused disposable-replica integration suite passes all nine cases including address ownership/limits, reporting aggregation/privacy, and visible-only selectors. API build and isolated Next.js 16.3.8 production build pass. In an isolated browser preview connected to the matching API, the report loaded real demo aggregates and the product selector returned and selected a readable product. The original preview remains connected to its older API and will need the new API deployment to expose reporting there.
