# Reviewed retail publication — 25 October 2026

Reviewed all 293 products that remained unpublished/disabled after image association. Every record still had the original import flags: productType=unreviewed, contentReviewed=false and imageRights=unreviewed. They were not all incomplete names.

## Completed

- **75 clearly identified non-medicine retail products published** through the existing reviewed-catalogue publication function.
- Added reviewed factual descriptions, pack/sale-unit details, brand, category, usage/cautions and SEO metadata. No unsupported efficacy, ingredient, certification or delivery claims were added.
- Existing-image usage permission was marked authorized using the owner's prior approval. Advertising-feed flags remain false; store publication is not advertising approval.
- All 75 products passed public API checks. The live ACM Depiwhite S page rendered its branded-CDN image, product details and purchase controls.
- All 293 database records were verified. Prices, stock and VAT remained unchanged. A repeat application made zero new publication changes and replayed 75 receipts.
- Temporary Atlas IP 117.205.203.84/32 was added with a six-hour fallback expiry, then explicitly removed and absence verified after completion. Existing Render ranges retained.

## Still needs pharmacy review: 218

- **150 medicines or therapeutic products**: dispensing category/formulation and reviewed product directions/cautions are not verified. This does not mean all 150 are prescription medicines; no blanket non-prescription assumption was made.
- **47 supplements/vitamins**: formula, suitability and classification require pharmacy confirmation; no unsupported health claims were generated.
- **21 other identity, presentation, formulation, feeding-age or pack questions**.

`needs-pharmacy-review.csv` lists each held SKU and its specific reason. These records remain drafts in the existing admin needs-action queue. Publication safety gates were not bypassed or relaxed.

The existing application rejects unreviewed/prescription classifications for ordinary checkout. The review kept that boundary. UAE guidance distinguishes dispensing categories; see the official [DHA dispensing-mode circular](https://services.dha.gov.ae/sheryan/wps/portal/home/circular-details?circularRefNo=CIR-2017-SHN0719). This review does not determine an individual medicine's legal category from its name.

## Two photo approvals withdrawn

Original-image publication checks caught a 400 g Aptamil image incorrectly approved for the 900 g listing PD0370. The earlier reading was wrong. The exact lash-style code on PD3375's image could not be confidently verified. Both image links were removed transactionally from still-draft products. Provider assets were not deleted or modified. Their previous contents and reasons are retained in media_history and media_recovery_corrections. The image pipeline ledger now records 330 approvals, 420 holds, 49 rejected proposals and 201 unmatched assets. The earlier export/archive remains a historical pre-import manifest; these two withdrawn associations supersede it.

## Evidence and rollback

- `reviewed-retail-plan.json`: individually selected retail products and reviewed content.
- `reviewed-manifest.ejson` and checksum: immutable fresh-record publication manifest.
- `before-publication.ejson`: private local before-state, mode 0600; do not commit.
- `publication-verification.json`, `public-api-verification.json`, `review-summary.json`: completion evidence.
- `storefront-published-proof.png`: live page screenshot.

Publication used the existing server-authoritative reviewed backfill: administrator check, fresh full-document revision, atomic batches of 25, validated content, category lookup, receipts and catalog_audit history. No application code/deployment was changed. Product IDs and URLs were preserved. The two image corrections used their own conditional media revisions and audit receipts.

For rollback, use the recorded before-state and receipt afterRevision, rejecting later staff edits. Restore only the publication/content fields and retain an audit record. Never restore an entire stale product over current price/stock/order data.

Verification also included the seven passing catalogue-preparation regression tests. Needs-action CSV rows are findings, not permission to sell or inferred prescription decisions.
