# Development completion pass — 23 October 2026

This pass implements the five agreed development areas. Production acceptance is separate from local verification. No production orders, stock, provider settings or database records were changed by this pass.

## Product photos

New products save their details once, then open the same photo editor used by existing products. The former competing image field is removed. Browser processing accepts one to five raster originals, up to 20 MB and 20 megapixels each, applies orientation, preserves aspect ratio, caps the longest side at 2000 pixels without enlargement, and generates a WebP gallery below the gateway's combined 3 MB file limit. Detailed photos progressively reduce quality/dimensions or receive an actionable error. The API independently decodes and normalizes pixels. Its signed Cloudinary workflow retains durable retry receipts, revision checks and previous assets. Legacy product upload contracts retain support and now share orientation and proportional resizing instead of square cropping.

## Arabic

Account sign-in, address book, preferences, rewards, reminders and wholesale store/account controls use a scoped interface dictionary. Wholesale includes its own RTL shell and localized header, currency and dates. Canonical form values, business names, product names and user input remain unchanged. Header/cart counts cover all Arabic plural categories. Account metadata and reminder cancellation support the chosen locale. Native Arabic editorial and pharmacy review remains a publication acceptance step; this does not invent Arabic clinical or product content.

## Reporting

The shared metrics response now retains repeat-purchase cohorts that the former HTTP schema stripped. Cohorts describe first observed dispatched purchases in a rolling 90-day window, not lifetime acquisition. The daily graph includes the current partial UTC day. Product totals read actual immutable root order lines, retaining a compatibility fallback.

Administrators can enter actual product, fulfilment and other costs on v2 order details. Costs live in separate versioned records with an append-only audit history. Concurrent stale edits fail; no order prices, totals or stock change. Missing costs/tax remain unknown. Contribution reports cover only dispatched orders with complete costs and tax, show their coverage, exclude VAT, and explicitly exclude overhead/refund accounting. They are not net profit or advertising attribution.

Optional telemetry adds coarse page/product-view, search/match and campaign view/click counters. Consent, DNT/GPC, origin/CSRF checks, feature switches, payload limits and client rate/concurrency limits remain. No search text, product identity, URL, customer identity or order detail is stored. Campaign slugs must identify a published active non-health campaign; health-content campaigns are excluded. Counters aggregate by UTC day and expire after 90 days. Counts represent events, not unique visitors or conversion rates; partial consent prevents population-level attribution. Deploy API before web, and apply the additive `growth-indexes.ts --apply` migration to establish TTL and query indexes before enabling persistent reports. Tracking remains off unless existing telemetry switches are enabled.

## Recommendations

PDP recommendations now use the API's bounded, deterministic selection rather than a second category-list fetch. Only reviewed general-sale source products receive automatic recommendations. Candidates must be reviewed, available, retail-visible products in an active category; medicines, unpublished/archived/private products and source-family options are excluded. Same brand/form ranks first, with at most eight candidates returned and four rendered. This is merchandising, not a treatment suggestion, clinical substitution or claimed co-purchase/bestseller model. Existing editorial complementary bundles remain available separately.

## Legacy media migration and rollback

The additive migration inventories current and archived products/categories/banners, WhatsApp posters, retained media history and order image references. It never rewrites original references or deletes source assets. Outputs contain paths and targets, not customer data. Run with separately supplied protected database/provider environment, never a committed dotenv file:

```
npx tsx scripts/migrations/legacy-media.ts inventory /private/path/inventory.json
npx tsx scripts/migrations/legacy-media.ts copy /private/path/copied.json
npx tsx scripts/migrations/legacy-media.ts verify /private/path/copied.json
npx tsx scripts/migrations/legacy-media.ts apply /private/path/copied.json
```

Use new output filenames: inventory/copy do not overwrite existing files. Copy uses deterministic SHA-256 asset identities in `almina/legacy`, provider reconciliation, and `overwrite=false`. An interrupted copy can be rerun with a new manifest filename; existing provider assets are reconciled. Verify/apply require full inventory coverage and a matching fingerprint, compare source/target original bytes, and reject foreign clouds, transformed URLs, changed inventory and unequal assets. Apply is idempotent; a partial application retains valid mappings without implying cutover success. Review non-resolvable historical filenames instead of deleting or silently dropping them. Retained old URLs resolve to verified versioned Cloudinary originals.

After API-first deployment, a quiet writer window, successful full verify/apply, new inventory verification, and public image checks, set web `LEGACY_MEDIA_FALLBACK_ENABLED=false` to stop using the personal Worker compatibility origin. Unmapped subsequent legacy uploads continue through the pharmacy's existing image API, preserving category/banner workflows. A resolver outage fails closed in retirement mode. This retires that host; it does not delete Drive originals or remove the retained Drive compatibility API. Retirement of those originals requires a separate proven reference inventory and verified replacement upload workflows for every remaining entity.

Rollback: restore the web fallback setting to `true`; keep verified mappings and both sets of originals. Reverting this application release ignores the new additive collections. Do not drop history/mappings or destroy provider assets. The source Worker remains available until production acceptance is recorded.

Provider contracts were checked against [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference), [signature generation](https://cloudinary.com/documentation/authentication_signatures), and [Admin resource lookup](https://cloudinary.com/documentation/admin_api). Provider credentials are server-only and never printed.

## Verification and release acceptance

Local validation includes typecheck, lint, production build, unit/API/release tests, disposable-replica tests for cost concurrency/unknown values/no order mutations, aggregate privacy, recommendation exclusions and retained references; focused browser checks cover photo replacement, account sign-in, Arabic account/wholesale at 360/390/768/1280 pixels, and order cost save/reload. Browser checks stay local/manual; CI is not expanded to the full browser suite.

Still operational: merge/deploy this release, establish additive indexes, review Arabic copy, supply actual costs, enable consented reporting if desired, and execute/verify the production media manifest before retiring any host. No live cache-hit, provider migration, delivery, or production cutover is claimed from synthetic tests.
