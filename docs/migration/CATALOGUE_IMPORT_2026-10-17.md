# ERP catalogue recovery — 17 October 2026

## Approved scope and target

The owner authorized the initial catalogue import into the new Singapore Atlas
project `almina-production`, database `almina`, and creation of the main
administrator (`admin`, display name `Al Mina Administrator`). OD5050 is reserved
as the order high-water mark; the next order is OD5051. This does not recreate
historical orders, customers or the two former branch accounts.

The database was verified empty before `bootstrapRecovery` ran. The bootstrap
created one administrator, a closed store, indexes, VAT policy, order counter and
an idempotency marker. Its password is in a local owner-only ignored file; no
password or database credential belongs in this document or Git.

The owner approved a single current-computer IP for six hours, in addition to the
previously approved restricted Render outbound ranges. Atlas automatically
expires that entry. The owner also approved adding the exact preview origin
`https://almina-storefront.onrender.com` alongside the existing pharmacy domain.

## Source and import rules

- Namespace: `erp-2026-10-15`.
- Source: the immutable prepared `Al_Mina_Draft_Import.csv` in ignored outputs.
- Source CSV SHA-256: `c8dca344db2baf1d90773bd31f5c54bd8318c591732cc42845be14fc8b55541a`.
- 7,136 positive-stock rows; 44 ERP categories mapped to 25 readable website categories.
- Stock is `max(1, min(10, floor(ERP stock)))`, a proposed website quantity rather
  than an inferred carton-to-piece conversion.
- Gross price is source price plus its stated 0% or 5% VAT, rounded once to fils.
- VITKID SYRUP 150 ML, source key `erp-v1-row-031872`, remains held for missing VAT.
- Source row keys are permanent identity within this namespace. Barcodes are
  preserved literally and are not used to merge records or infer verified GTINs.
- Medicine strengths remain independent. No unverified variant families are created.

Prepared JSON, category mapping, row-level provenance, import preview IDs and
verification reports are retained under ignored
`outputs/catalog-enrichment-2026-10-17/`. ERP data is not committed.

## Content and visibility

The initial products and categories remain disabled; products are unpublished,
with content/stock/channel approvals false. Short descriptions and SEO fields
use only explicit ERP product facts. Five CeraVe descriptions were enriched from
regional manufacturer pages with provenance, still awaiting pharmacy review.
Unknown brands, retail sale units, regulatory classification, usage and warnings
are not fabricated. ERP bulk packaging is not treated as a verified retail pack.

Four exact-size CeraVe manufacturer packshots have been checked locally. The
manufacturer's 236 ml hydrating cleanser image was rejected for the ERP 473 ml
item. The existing Cloudinary library contains 6,169 assets, but sampled UUID
filenames and empty contextual metadata do not supply reliable product mapping.
Image attachment and publication status must be reported from the verification
output, not assumed from local file preparation.

## Importer corrections discovered during execution

1. Blank optional CSV enum fields became BSON `null` during preview persistence,
   causing commit validation failures. Preview persistence now omits undefined
   values. A real MongoDB regression covers blank choices through commit/rollback.
2. Sequential round trips exceeded practical remote transaction limits. Initial
   independent drafts now validate category existence and family fields before
   batched inserts of products, opening inventory ledger entries, source mappings
   and rollback snapshots in the same transaction. Family imports and updates keep
   their existing membership checks. Store serialization, baseline conflict checks,
   server-side ID allocation and source uniqueness remain in force.
3. A bounded internal chunk-size parameter allows smaller maintenance transactions;
   it is not a new public API parameter. Resume offsets and replay behavior remain
   unchanged.

## Verification and rollback

Run the focused catalogue import integration test on a disposable replica set;
never point integration tests at Atlas. Recovery, VAT, inventory, concurrency,
publication gates, replay and rollback tests are required. Verify every imported
source key against its gross price, VAT flag and capped stock, confirm unique
business IDs, held-row absence and unchanged zero-order count.

Use the maintained `rollbackCatalogImport` with the recorded preview IDs and actor
for an untouched batch. Rollback archives newly created drafts and preserves
inventory/audit history; it refuses to overwrite later staff edits or verified
stock. Do not delete collections or reset the database. Do not re-import the
same export under a new namespace. Once pharmacy staff edit a draft, use the
product editor rather than overwriting it with the original import.

The store, checkout and advertising feed publication stay closed pending review.

## Execution result

All 15 import batches completed with 7,136 unique product IDs and source mappings.
The full verification found zero price/VAT/stock/visibility mismatches and no held
VITKID row. There are 25 categories, one admin, zero orders and a closed store;
the order counter remains 5050. The exact existing Vichy Stress Resist image was
attached to draft PD6615 through the maintained importer with its original price
and stock preserved. Its 50 ml identity and GTIN were checked against Vichy
manufacturer sources. Administrator sign-in, product search and opening the
product editor were verified on the hosted Next preview.

Cloudinary account name `drvxmb0vq` is configured for the API and storefront. The
API origin list includes only the existing pharmacy domain and the specifically
approved preview origin. Four additional exact-size CeraVe packshots remain local
because the Cloudinary upload widget did not open in the automated session.

## Image upload follow-up

The owner opened the Cloudinary upload widget. Its Web Address source uploaded
four previously reviewed manufacturer packshots: CeraVe Moisturising Lotion
236 ml (PD1199), Intensive Moisturising Lotion 236 ml (PD1196), SA Smoothing
Cream 340 g (PD1207), and Blemish Control Cleanser 236 ml (PD1186). Every CDN file
matched its reviewed original SHA-256 exactly. All four were attached through a
recorded maintained-import preview, preserving product names, prices, stock and
unpublished/disabled state. There are now five image-bearing catalogue drafts
including Vichy; usage permissions and pharmacy publication review remain pending.

The browser origin permission gate subsequently declined storefront access, so
the final four-image browser rendering check was not completed. Database linkage
and exact CDN file verification passed; do not describe that as visual QA.
