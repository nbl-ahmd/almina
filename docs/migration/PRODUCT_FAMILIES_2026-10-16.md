# Product families and SKU SEO — 2026-10-16

## Decision and scope

Sizes, flavours and pack sizes can share a verified product family. Different medicine strengths remain separate listings/families. Every purchasable combination remains an existing-style product document with its own MongoDB ID, public product_id, price, stock, media and URL. There is no parent inventory record or combined stock. No production catalog rows have been grouped or imported by this change.

The change is additive: ungrouped products, legacy IDs/URLs and historical orders remain readable. The ERP workbook and previously prepared 7,137-row active-stock review CSV/XLSX are unchanged. This is the variant foundation before a reviewed import, not a claim that the legacy batch/recovery import now accepts the ERP file.

## Product/admin fields

The create/edit product form, maintained create/inventory adapters, public catalog reads and product contract accept these optional fields:

| Field | Meaning |
| --- | --- |
| familyKey | Stable lowercase key, 3–80 characters, letters/numbers/underscore/hyphen; unique to a verified family |
| familyName | Shared display name, up to 200 characters |
| familyBrand | Verified shared brand, up to 120 characters |
| familyForm | Shared form/model, up to 120 characters |
| familyStrength | Shared verified strength identity; `not-applicable` for non-medicines |
| variantSize | Actual saleable size, e.g. Small or 150 ml |
| variantFlavour | Actual flavour |
| variantPackSize | Actual pack sold, e.g. 30 tablets or 2 bottles |

Family display names for medicines should include their verified strength; SKU names must retain their actual saleable specification. A family requires all five shared fields and at least one option. Members must use the same option axes and category. No Cartesian combinations are manufactured. Duplicate option tuples are rejected even when barcodes are shared. Family writes serialize with catalog changes inside transactions to prevent duplicate concurrent creation; the family maximum is 60 SKUs.

Shared identity and recognized strengths in product names must match. Numeric mg/mcg/µg/μg/IU/percentage and supported concentration signatures are additional conservative guards, not a drug classifier. Pharmacy review remains necessary; names and barcode alone cannot establish medical equivalence. Ambiguous products should stay standalone. The implementation never infers OTC status.

When editing option metadata, submit the complete family profile. Stock/price-only updates need no family fields. To remove membership, clear all eight family/option fields together. Changing shared identity across a whole family is deliberately not an implicit mass edit: detach/review/reassign or use a separately reviewed future family-wide workflow. A dedicated family conflict response asks staff to review shared identity and unique option combinations. Dedicated family management and bulk editing remain future admin improvements.

## Shopper flow and commerce

- Storefront public lists request `groupFamilies=true`, grouping before pagination. Existing ungrouped/staff API reads keep individual SKU rows.
- Cards show family name, option count, the representative SKU's option label and a Choose options link. Price varies labels use From; the representative is the lowest advertised price among available matching SKUs, or the lowest matching SKU when all are out of stock. Search/offer/featured filters apply before grouping, so counts refer to matching options.
- Option anchors link directly to existing canonical SKU pages. The selected price, gallery and stock come from that SKU. Sold-out options can be viewed but not bought. Invalid combinations are disabled; an all-combinations disclosure makes sparse combinations directly reachable.
- Purchase controls remount when SKU changes, resetting quantity and stale status. Cart and quote display the exact option label. Server price/stock verification remains authoritative.
- New order lines optionally snapshot familyKey and variantLabel. Existing order lines need no backfill. Later product edits cannot rewrite that label; staff views read the recorded snapshot.

## SEO and performance

Individual variant URLs remain self-canonical, server-rendered and directly crawlable, preserving existing product-ID routing and redirect policy. Metadata titles/descriptions include the selected option; social imagery uses the selected SKU. Existing product sitemaps still enumerate public SKUs rather than collapsing them into a nonexistent family URL. Preview/noindex and query-duplicate policies remain intact.

Product JSON-LD retains each SKU's ID, URL, actual price and trusted images, with ProductGroup/isVariantOf/hasVariant relationships and shared brand. Size/pack use size, and flavour remains an additionalProperty. Google supports only a subset of variant dimensions; flavour metadata is descriptive Schema.org data and does not guarantee a flavour-specific merchant result. No reviews, GTINs, stock promises, delivery promises or return terms are invented. Existing availability markup remains intentionally omitted until store-open/checkout availability policy is integrated. Actual licensed product images and verified descriptions are still needed for a complete production merchandising/SEO rollout.

Reference: [Google Search Central product variants](https://developers.google.com/search/docs/appearance/structured-data/product-variants), reviewed 2026-10-16. This follows the multi-page approach; search appearance and rankings are not guaranteed. A production pilot still needs Rich Results Test and Search Console URL Inspection on deployed, crawlable URLs.

The selector is a Server Component using plain links; it adds no selector state/provider or UI dependency. Detail reads are shared through request-scoped React cache. Sibling reads are bounded and use the additive nonunique `product_family_members` index `{familyKey:1, archivedAt:1, product_id:1}`. The index is in the normal reviewed index plan and has not been applied to production. Grouped listing aggregation is bounded by the existing query timeout; real catalog performance should be measured before cutover. No production Core Web Vitals improvement is claimed from local fixtures.

## Rollout/import and rollback

1. Apply the reviewed additive index plan to the intended environment before enabling large family catalogs.
2. Add proposed family/option columns to the import preparation; blank means standalone. Review actual SKU packaging, category, brand/form/strength and ambiguous matches before assignment. Never merge by repeated barcode.
3. Resolve existing ERP import gates separately: stable source-row identity/idempotency, missing barcodes without fabricated GTINs, category mapping, the single missing VAT value and VAT-inclusive website price policy. Keep the approved website stock formula `max(1,min(10,floor(ERP stock)))`.
4. Import a small reviewed pilot into the designated non-production environment, confirm SKU images/options/price/cart/order snapshots and SEO, then use an idempotent full import with report/rollback manifest. The current legacy CSV and recovery-only admin import are not that workflow.
5. Release API compatibility fields before the frontend. Older frontends ignore additive metadata. Reverting the selector/grouping UI restores individual SKU presentation; retain family fields, optional order snapshot fields and the harmless nonunique index. Never remove order snapshots or rewrite historical receipts.

## Verification

Passed:

- Root/API/web TypeScript checks, repository lint, whitespace diff validation and the isolated Next.js 16.3.8 Turbopack production build.
- 132-case existing unit regression run, followed by focused family/contract/SEO/gateway checks after final validation edits (including the additional scoped error-forwarding test).
- 22 real disposable MongoDB catalog/commerce/sitemap tests: concurrent duplicate option creation, incompatible strengths/forms/axes, publication filtering, grouping before pagination, independent SKU stock and immutable order options; existing oversell/idempotency/rollback/cancellation tests remain passing.
- The broad compiled browser run passed 37 cases; its remaining staff case exposed the gateway's generic conflict handling. After fixing that path and tightening test selectors, the final focused eight-case run passed all six family cases plus login/RBAC and stale-stock administration. Together the runs cover 40 distinct browser scenarios, with the final family flow checked at 360/390/768/1280 px, selected metadata/canonicals, raw crawler HTML, sparse combinations, out-of-stock choices, quantity reset, cart, checkout and staff snapshots.
- Desktop and mobile full-page family screenshots visually inspected; all four width snapshots are under `.verification-results/product-family-{width}.png`. No horizontal overflow or unexpected browser JavaScript errors in the final scenarios.
- Live local Next dev compilation and runtime diagnostics reported no issues/errors. The preserved demo preview runs at http://127.0.0.1:4760; its existing products remain ungrouped until explicitly assigned.

All database tests use disposable loopback MongoDB replica sets. No hosted database, provider, ERP import or deployment action occurred.
