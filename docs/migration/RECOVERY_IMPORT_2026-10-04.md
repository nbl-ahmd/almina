# Authenticated recovery import

The retained API adapters now execute `apps/api/src/modules/recovery` behind existing server-side administrator authorization and CSRF protection. Next `/admin/batch` reviews CSV/JSON rather than invoking the legacy batch importer. Hosting acceptance remains pending; no production database or provider was accessed.

## Prepare and review

Download `/api/admin/recovery/template` or `/templates/recovery-products.xlsx`. The workbook has text ID/barcode columns, decimal price columns and an Instructions sheet. Enter independently reviewed values; export **Products** as UTF-8 CSV. Conversion preserves quoted commas/newlines and barcode strings. Never derive identity, money or stock from image filenames. Only configured-account Cloudinary raster upload URLs are accepted. Separate multiple URLs with `|`.

The browser bounds files to 3 MiB; the API bounds content to 4 MiB and batches to 500 rows. Malformed headers, widths, types, money precision, duplicates and foreign images produce row/file errors. Existing product IDs and ambiguous categories block the batch. The preview displays all imported fields; no product is written during preview.

## Commit guarantees

Set `RECOVERY_CATALOG_ALLOWED=true` and the nonsecret `CLOUDINARY_CLOUD_NAME` on the retained API only after reviewing the target configuration. A closed store and the explicit recovery bootstrap marker are required at preview and commit. Commit submits an actor-bound random preview ID and canonical SHA-256 digest; rows come from the stored server preview. Uncommitted approvals expire after 30 minutes. Stored receipts remain for committed retries; no automatic TTL removes their retry binding.

A replica-set transaction serializes against store reopening, writes the batch ledger and inserts products/categories together. Product IDs/barcodes remain strings; products are disabled, unpublished and zero stock, and newly created categories are disabled. Existing products are never overwritten. An exact retry returns the committed receipt without modifying subsequent stock changes. Both legacy and modular MongoDB drivers are covered. The legacy `/api/batch` handler rejects recovery before disk upload when activation or the bootstrap marker is present.

The browser saves the preview ID/hash before sending a commit. After a lost response, reload and use **Retry interrupted import**. **Clear local review** removes only local retry state; server receipts and products remain. Check the catalog before preparing replacement input. Any new preview still rejects existing IDs. Do not delete data to make a batch pass.

CLI JSON validation remains connection-free by default. Explicit `--apply` still requires the separate paused-writer configuration. No lost customers/orders are fabricated. Stock, publishing, provider parity, backup/restore and production opening remain separate acceptance steps.

## Evidence

Local lint/typecheck, 54 unit tests, 7 release-gate tests, 98 API/security tests, zero high/critical advisories across all three lockfiles, real disposable replica-set recovery/commerce tests (24), and production foundation/Vite builds passed. Chromium passed all 24 scenarios, including recovery at 360/390/768/1280 px, row errors, keyboard commit, reload and retry after a committed response is lost. Spreadsheet Products/Instructions renders were inspected and workbook error scanning found none. Next development MCP reported no compilation/configuration/session errors; unauthenticated recovery navigation redirects to login. This is local evidence, not hosted acceptance.

Provider account ownership, recovered-product review, publishing/physical-stock verification, real notification delivery, hosted SEO and traffic acceptance, backups/restore and exact live SHAs remain unverified. Do not merge to trigger production deployment.
