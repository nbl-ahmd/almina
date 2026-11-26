# Catalogue quality and enrichment — 26 November 2026

Branch `claude/catalogue-quality`. Not deployed. No database migration, no schema change, no change to existing records on deploy.
Admin-only reads, two admin-confirmed write actions, one new admin page, one dashboard card, one storefront structured-data field.

## Why

The SEO audit of 26 November (the crawl of 836 storefront URLs; see [SEO action plan](SEO_ACTION_PLAN_2026-11-26.md)) found the
technical base sound and the catalogue data thin:

| Live storefront finding (crawl) | Count |
|---|---|
| Live products in the product sitemap | 784 |
| Product pages with no product photo (JSON-LD has no image, `og:image` is the logo) | 574 (73%) |
| Product JSON-LD without a brand | 449 (57%) |
| Product JSON-LD without a GTIN | 713 (91%) |

The audit could only see live pages. Production also holds about 6,300 products, most hidden and many without a type
([admin workflows](ADMIN_WORKFLOWS_2026-11-25.md)). The real counts for the whole catalogue are shown on the new page after deploy;
they were not read from production for this change.

## What already existed (reused, not duplicated)

- Product model with brand, manufacturer, GTIN (check-digit validated on write), MPN, identifier status, pack label, sale unit,
  description, condition, Google product category, image rights, content/stock review stamps and Google/Meta approval.
- Products list with views, filters, counts, bulk actions, photo drop, bulk photo upload matched by PD number or barcode, and the
  editor's Save & next queue.
- Per-product Google/Meta readiness in the editor (`feedIssues`) and the Merchant API sync (`merchantInput`, Cloudinary images only).
- Image review and publication for supplier and brand photos; Catalog import for ERP files (creation, not updates).

## What changed

### Products list: five gap filters
`No brand`, `No GTIN`, `No pack size`, `No manufacturer`, `No description`, with counts, in the existing filter bar. They work with
every view, search, category, bulk action and Save & next. `No GTIN` excludes products whose identifier status is "not assigned".

### Catalogue → Catalogue quality (administrators)
- **Completeness** for live products, in-stock products or the whole catalogue: the share of products with each detail, a link to
  the ranked work list for that gap and a link to the matching Products filter.
- **Google Merchant readiness**: live products the UAE feed would accept today, computed with the feed's own code path
  (`merchantInput`). Blockers are split into *missing details* (brand, pack, description, photo…) and *review steps* (Google approval,
  content review, identifier decision, condition). Live medicines are counted separately: they are excluded from Google in the UAE by
  policy. Live products whose only photo is a legacy file (not a published Cloudinary image) are counted, because the feed cannot use them.
- **Barcodes and identifiers**: barcodes that can be confirmed as GTINs, in-store/coupon codes (valid check digit, never a GTIN),
  barcodes that are not GTINs, and products sharing a code (UPC-A and EAN-13 spellings compare equal).
- **Unreadable live products**: a stored value that fails validation (often an invalid GTIN or an over-long field) makes the
  storefront treat the product as missing (404) while it stays in the sitemap. Listed with links to fix them.
- **What to enrich next**: incomplete products ranked by units sold in the last 90 days (current order system, cancelled orders
  excluded), then stock on hand, live status, featured and sale flags; each row says why. Ties keep catalogue order.
- **Use barcode as GTIN** for selected rows: only rows whose stored barcode is a valid trade GTIN that no other product carries. A
  dialog lists each product and requires the administrator to confirm the barcode is the one on the manufacturer's pack.
- **Enrichment sheet**: download (up to 2,000 rows, highest priority first) and upload. See the workflow below.

### Dashboard
"Live catalogue completeness" card: photo, brand, GTIN, pack size and description for live products, from the existing Products list
counts (one bounded read, no catalogue scan on the dashboard).

### Storefront
Product structured data adds `manufacturer` when staff recorded one. Brand, GTIN and MPN were already emitted from stored values.

## Metrics: exact definitions

All counts exclude archived products. "Live" means `published != false`, `disabled != true`, `active != false`.

| Metric | A product counts as **having** it when |
|---|---|
| Photo | any stored photo that is not the placeholder (`image`, `images`, `cloudinaryImages`) |
| Brand | `brand` or `familyBrand` has non-blank text |
| GTIN | `gtin` is a valid GTIN-8/12/13/14 (check digit), or identifier status is "not assigned" |
| Manufacturer | `manufacturer` has non-blank text |
| Pack size | `packLabel`, `variantPackSize` or `variantSize` has text |
| Description | `description` has text |
| Product type | General, Pharmacy medicine or Prescription chosen |
| Specific category | its category is not named General, Other(s), Misc(ellaneous) or Uncategorised (quality page only) |
| Merchant ready | live, General type, and the Google feed builder accepts it (all of `feedIssues` pass, Cloudinary image) |

The Products list `No GTIN` filter checks the GTIN's shape (8, 12, 13 or 14 digits); the quality page also checks the check digit.
A stored GTIN with a wrong check digit cannot normally exist (the editor refuses it) and makes the product unreadable, so it is
reported in "unreadable live products" as well.

**Priority score** (pure function `enrichmentPriority`): `10 × min(units sold in 90 days, 50)` + 50 if in stock + 40 if live
+ 15 if featured + 10 if on sale + number of gaps (max 8). There is no product-view or search data in the system, so the ranking does
not claim popularity beyond orders.

## Workflow for hundreds or thousands of products

1. **Fix what customers cannot see.** Clear the "unreadable live products" list first (open, correct, save).
2. **GTINs from barcodes.** Catalogue quality → GTIN / barcode → scope *Whole catalogue*. Tick products whose pack shows the same number,
   Use barcode as GTIN, confirm. Up to 100 per action; each is audited.
3. **Photos.** Filter the work list to Photo, download the sheet and send it to the supplier or brand. Ask for **authorised** pack shots
   named as the `photo_file_name` column (`PD1234.jpg`, extra views `PD1234_2.jpg`). Add them with Products → Upload many photos
   (matched by PD number or barcode), or through Image review. Images found on other websites need the owner's permission first;
   nothing is fetched automatically.
4. **Text details.** Fill the same sheet's brand, manufacturer, gtin, identifierStatus, packLabel, saleUnit and description from the pack,
   the manufacturer's data or an authorised supplier. Upload it on Catalogue quality, read the preview, tick the confirmation, save.
5. **Finish in the editor.** Google approval, content review and the identifier decision remain per product (editor → catalogue
   readiness). Then Products → Hidden → Ready to go live for hidden products.

Work in priority order: Live → In stock → Whole catalogue. The spreadsheet and the bulk GTIN action cover the repetitive fields;
the editor's Save & next covers the per-product decisions.

### Enrichment file rules
- Columns: `product_id` (required) plus any of `brand`, `manufacturer`, `gtin`, `mpn`, `identifierStatus`, `packLabel`, `saleUnit`,
  `description`. The reference columns of the downloaded sheet (`name`, `barcode`, `category`, `priority`, `gaps`, `photo_file_name`) are
  ignored. Any other column refuses the file, so a misspelt heading cannot drop a column silently.
- At most 4,000 rows and 1 MB per file. Empty cells change nothing; the file never clears a value.
- **Fills blanks by default.** Replacing a filled-in value needs "Replace filled-in values", and the preview shows before and after.
- Refused per value: invalid GTIN, in-store or coupon codes, a GTIN another product already has (also within the file), over-long text,
  and any **description change for a Pharmacy medicine or Prescription product** (edited in the product editor only).
- A row whose `product_id` matches no product, or more than one, is reported and skipped.
- Apply re-validates everything and **skips any value changed since the preview**. It never publishes, hides, prices, stocks or marks
  anything reviewed, and writes one `catalog_audit` row per product ("Enrichment file, values confirmed by administrator").
- Spreadsheet formula protection: cells starting with `= + @ -` are written with a leading apostrophe and restored on import.

## API (retained routes, additive, administrators only)

| Route | Notes |
|---|---|
| `GET /api/products/quality` | Report above. No query. |
| `GET /api/products/enrichment` | `scope` live/instock/all, `gap`, `limit` ≤100, `offset`. |
| `GET /api/products/enrichment/export` | Same filters, CSV, up to 2,000 rows. |
| `POST /api/products/enrichment/preview` | `{ content, overwrite }`. Writes nothing. 4 MB body limit on this route only. |
| `POST /api/products/enrichment/apply` | `{ changes, confirmed: true }`. Audited; cache purge. |
| `POST /api/products/gtin-from-barcode` | `{ ids ≤100, confirmed: true }`. Audited; cache purge. |

Every read is bounded (20,000-row cap, `maxTimeMS`), runs only when an administrator opens the page, and keeps nothing to recompute:
no timers, workers or stored scores. The dashboard card reuses the Products list count read.

## Remaining manual work (cannot be automated safely)

- **Photos for roughly three quarters of live products** (574 at the audit). Needs supplier or brand pack shots with permission, or
  in-store photography. This is the largest single gap for Google product results.
- **GTINs** beyond the barcodes that can be confirmed: from packs or supplier data. Products without a manufacturer GTIN should be set
  to "not assigned" in the editor so they stop counting as missing.
- **Brands** (449 live at the audit) and **manufacturers**: from packs or supplier sheets.
- **Google approval, content review and identifier decisions** per product; **medicine classification** stays a pharmacist's decision.
- Shared barcodes: decide which product is right, then correct the other in its editor.

## Risks

- Bulk GTIN and the enrichment file change live product data at once (storefront and structured data). Both require an explicit
  administrator confirmation and are audited; neither changes visibility.
- The quality page reads the whole non-archived catalogue (projected fields) on each visit: about 6,300 small records today. It is
  admin-only and never runs from the dashboard.

## Rollback

Revert the two commits. No data migration; records written by the new actions are ordinary catalogue values with audit rows and
stay valid.

## Verification

- Unit: `tests/catalogue-quality.test.ts` (GTIN normalisation and restricted ranges, gaps, priority, CSV escaping, gateway access,
  validation, projections and cache tags, manufacturer in structured data).
- Database (disposable replica set): `tests/catalogue-quality-integration.test.ts` (report counts through the real feed path,
  demand ranking excluding cancelled and old orders, barcode GTIN refusals and audit, enrichment preview/apply including stale rows,
  fill-blanks, medicine descriptions, untouched visibility and review stamps).
- API security: `npm run test:api`, where every admin route is exercised with unauthenticated and staff callers (181 pass).
- Browser: `tests/e2e/catalogue-quality.spec.ts` against the built app (dashboard card, page, bulk GTIN dialog, enrichment preview and
  apply, CSV download, phone width without horizontal overflow), plus the existing admin, admin-design, admin-workflows and
  admin-product-channels specs (32 pass).
