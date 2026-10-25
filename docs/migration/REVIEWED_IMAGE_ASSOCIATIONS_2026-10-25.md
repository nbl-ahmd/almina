# Reviewed image associations — 25 October 2026

## Production image application completed — 25 October 2026

The owner authorized application. **318 image links were applied to 315 products** with per-product transactions, conditional media revisions and retained history/receipts. All 315 records passed final verification; non-image fields stayed unchanged. Repeat preflight: 315 already associated, zero pending changes or conflicts. All 22 affected public products passed API checks; live CeraVe/Pampers pages displayed branded-CDN images. The other 293 products retain unpublished/disabled status. Temporary Atlas IP 117.205.203.84/32 was removed and absence verified. Existing Render network ranges stayed intact. No Cloudinary assets changed.

Evidence: `apply-results.json`, `public-api-verification.json`, `import-status.json`, `storefront-linked-proof.png`. Private before-state: `image-associations-before-apply.ejson`; retain for rollback. The clean-export folder/archive remains the unchanged pre-import manifest. Do not regenerate it over the retained baseline.

## Integrity and recovery

313 products gained first photos; two existing galleries were extended. Fourteen approved existing associations were retained.332 approved assets cover327 products. Corrected IDs from the ledger were used, including CeraVe340 g PD1197 instead of454 g PD1198.

Fresh identity/ObjectID/media checks passed for every target. Each write used a MongoDB transaction, mediaRevision condition, media_history and media_recovery_receipts with operation IDs. Only cloudinaryImages and mediaRevision changed. Full-document comparisons verified all other fields unchanged. Repeat dry-run planned zero writes.

For rollback, match receipt next revision and current gallery first, then restore only previous media/revision while retaining rollback audit. Never overwrite later staff edits. Local evidence is under outputs/image-mapping-review-2026-10-24/ outside Git. No application deployment was needed.

Medicine sale/classification approvals were not inferred from photos. Prices, stock, publication flags, descriptions, tax, identifiers and order data were untouched.419 holds,48 wrong proposals and201 unmatched assets were excluded. SQLite proposals remain unchanged because their review mechanism cannot represent corrected associations or holds; final ledger/export authoritative.
