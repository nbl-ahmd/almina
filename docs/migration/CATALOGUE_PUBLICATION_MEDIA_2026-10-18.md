# Catalogue publication and missing-photo operations

## Policy

The owner approved the proposed 1–10 opening inventory counts and explicitly allowed an honest missing-photo placeholder. Store publication now separates required identity/classification/content/stock checks from merchandising improvements. Brand and a photo are not mandatory for a verified general-retail store listing. Actual images still require authorized use. Google/Meta feeds retain stricter brand, real-photo, rights and channel approval checks.

Prescription and unclassified medicines remain blocked. The eight clearly incomplete names and VITKID SYRUP 150 ML's missing-VAT source row remain held. Removing an image requirement does not convert a medicine into an OTC product.

The admin Needs action page can filter drafts, published or all products, and missing photos independently. Empty image arrays, whitespace entries and the supplied placeholder do not count as a product photo. Published products can receive details later without an image requirement blocking staff updates.

## Reviewed retail publication set

A private read-only preflight prepared 665 individually reviewed non-medicine retail records from the ERP catalogue: grooming/cosmetics, oral-care accessories, baby feeding/diapers and straightforward non-medicated care supplies. It excludes medicine false positives, uncertain reading-glass powers, malformed specifications and products requiring clinical classification. The broader remaining catalogue is not declared reviewed merely because it has a name.

The immutable local manifest is fingerprinted SHA-256 `6ccc9376e769e6a387c164e472cb432d7febc0f82d6da75b01946c5c661c4a89`. It contains existing IDs, expected full-document revisions, reviewed category IDs and editorial content only. No commercial fields are accepted in the update schema. ERP names and known pack specifications are preserved; unverified ingredients, doses, clinical benefits and certifications are not generated. Existing source-rich CeraVe content is retained.

`scripts/backfill/reviewed-catalogue.ts` is an operator-only transaction helper, not a public API. It requires an existing administrator, checks every reviewed revision, restricts the set to approved active drafts with positive integer stock, validates publication checks and money, and writes content/category/visibility with audit records. Each receipt stores the full prior document and exact payload fingerprint. Transactions contain at most 25 products. Replaying the same manifest skips completed records without overwriting subsequent staff changes; changed payloads or stale documents fail. Categories are enabled only when referenced by a reviewed product and are audited.

Before applying, require the code checks and release to pass. Keep the private catalogue snapshot and immutable manifest outside Git. Verify resulting public counts and public DTO parsing, the eight incomplete/Rx holds, and unchanged price/stock/VAT/media on each changed record. Save the applied/replayed counts in the operational record; a prepared manifest is not proof of publication.

## Rollback strategy

Use `catalog_publication_changes` receipts and `catalog_audit` to identify exactly this run. Unpublish its listings first through the authenticated visibility operation if rollback is needed. Restore only this run's content/category fields after comparing their recorded post-publication revision against the current document. If staff edits or orders have changed a product, stop for reconciliation; never replace a full product document or restore historical stock/price from the backup. Re-disable a category only if this run enabled it and no live product requires it. Preserve receipts/audits and all orders. No destructive deletion or automatic full-document restore is authorized.

## Images and delivery

Fourteen exact photos existed before this pass; most catalogue rows lack one. A first Open Beauty Facts GTIN search checked 35 candidates with no image hits and stopped after repeated provider failures. It is not an exhaustive search of the catalogue. Further manufacturer/GTIN research must confirm exact pack, strength, size and model and usable image rights before association. Retailer search results alone are insufficient evidence. No Cloudinary assets were deleted: historical references have not been fully recovered.

Configured Cloudinary product photos now use width-specific CDN delivery through a small Next Image wrapper. Local/legacy images keep their prior policy. See [storefront comparison and measured tradeoffs](STOREFRONT_REVIEW_2026-10-18.md). Four real public photo records were copied into an isolated local preview for browser checks; no customer/order data was copied.

## Verification

Regression checks cover atomic rollback, replay after staff stock edits, admin authorization, rejected price/stock fields, Rx/core review holds, missing-photo publication versus stricter advertising feeds, and admin filtering. The isolated production build uses checkout enabled. Hosted frontend browser checks remain limited by saved browser access denial; the public API and Render deployment dashboard are independently verifiable. Do not claim production Core Web Vitals from local measurements.
