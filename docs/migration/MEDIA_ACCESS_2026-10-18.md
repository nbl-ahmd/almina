# Product media access — 18 October 2026

The owner requested images across the ERP catalogue and removal of unused
Cloudinary assets. Google verification initially prevented pharmacy Cloudinary
console sign-in. The owner later completed sign-in. No attempt was made to bypass account verification or the browser's
saved origin denial. Existing media must be retained until current, archived,
media-history, order and legacy references can be inventoried together.

## Verified configuration and upload result

The owner privately configured Render upload credentials. The existing
staff-authenticated signed media route now returns HTTP 200. Three reviewed
manufacturer packshots were attached and verified by a subsequent authenticated
product read and successful CDN image retrieval:

| Product | ERP source key | Product ID |
| --- | --- | --- |
| CeraVe Blemish Control Gel 40 ml | erp-v1-row-005107 | PD1187 |
| CeraVe Moisturising Cream 340 g | erp-v1-row-005135 | PD1197 |
| CeraVe Moisturising Cream 454 g | erp-v1-row-005137 | PD1198 |

Uploaded files were visually inspected after CDN retrieval. Prices, stock,
published=false and disabled=true were compared before and after and remained
unchanged. Stable per-product upload keys and saved receipts support safe
reconciliation. The staff sessions were logged out afterwards. No credentials
were read from the browser or recorded for this upload.

At that checkpoint there were eight verified product image attachments across the 7,136-product
draft catalogue; 7,128 still require exact image matches. Image usage rights and
pharmacy publication review remain pending. A serum candidate remains held
because its photographed barcode differs from the ERP entries.

The Cloudinary console origin is still denied by the browser permission gate
following the owner's renewed sign-in. No bypass was attempted. Signed app
uploads are available independently, but a full provider inventory and old-store
reference reconciliation remain incomplete. No Cloudinary assets were deleted;
no legacy asset is considered unused merely because it is absent from the new
database. Ignored local media manifests contain provenance, receipts, CDN hashes,
verification results and the updated image queue.

## Credential exposure requiring owner action

The Render environment page was already displaying revealed secrets when the
existing user tab was selected. Its automatically returned initial UI snapshot
included the current Atlas database credential and WhatsApp access token.
Both credential types require private rotation/revocation and corresponding
Render updates. No values are recorded here. The revealed fields were
immediately hidden; this does not revoke the exposed credentials. Rotation has
not been performed and must not be reported complete.

## Owner-approved catalogue enrichment and rollback

The owner subsequently approved the proposed 1–10 stock counts and use of
existing pharmacy images, and requested factual descriptions/SEO for the full
catalogue plus publication. This is approval of opening estimates, not evidence
of a new physical count. New manufacturer images still have unconfirmed rights.

The checked plan targets exactly 7,136 source-mapped, unpublished recovery drafts.
It records the stock review approval without changing quantities or prices,
preserves curated descriptions, updates only facts from known product names and
specifications, and retains ten ambiguous identities for review. Five products
previously updated through the importer have string category references; the
importer now preserves ObjectId references, with a disposable MongoDB regression
covering the category join after an update.

Before application, a private EJSON snapshot and checked plan are saved under
ignored `outputs/media-audit-2026-10-18/`. Each 100-product transaction rechecks
identity, price, stock, current description/SEO and unpublished state, writes an
append-only before/applied receipt to `catalog_enrichment_changes`, and records
an audit entry. Stable run/product receipt IDs allow safe reconciliation and
resume; a conflicting edit aborts the batch. Prices, stock quantities, VAT,
identifiers and galleries are compared after application. This does not approve
Google/Meta exports or enable checkout.

Rollback strategy: use each receipt's `before` snapshot to restore only the fields
listed in `applied`, plus prior review timestamps/actor and updatedAt. Match the
current applied values and unpublished state first; preserve all other fields,
media and audit records. Missing previous fields must be unset, not set to null.
Abort on later staff edits or publication; reverse publication separately through
the maintained audited visibility operation before any rollback. No database or
provider deletion is part of this change.

The subsequent owner-approved publication and richer-content pass supersedes the earlier counts and approval state above. See `CATALOGUE_CONTENT_2026-10-18.md` for the final 13 published products, 15 source-enriched records and remaining scope. The original 13 attached images were covered by the owner’s confirmation; future image additions still need an appropriate permission basis.
