# Google Merchant API and Search Console — 28 October 2026

## Account audit and changes

Merchant Center account `5884188879` belongs to Al Mina Pharmacy. Its website
`alminapharmacy.com` was already verified and claimed. It contained zero products
and two empty Merchant API sources, both named `almina-catalogue`.

Source `10786798631` is now named **Al Mina UAE — reviewed products (API)**,
targets the United Arab Emirates, and uses free listings only. The unused source
`10786999221` was preserved; no source or account was deleted and no ad campaign
was created.

The existing account shipping service charged AED 20 and promised 0–1 days.
It now uses AED 21, a minimum order of AED 10, handling of 0–1 days and transit
of 0–5 days, matching the published site estimates and the maximum actual
checkout fee. The UI does not offer a UAE regional cost dimension. The national
rate is therefore conservative; actual Ras Al Khaimah checkout delivery remains
free. No checkout fee, price, stock or commerce policy document was changed.

The existing verified return policy accepted only defective products, with no
normal return window. It now matches `/returns`: unopened/new products, seven
days, exchanges accepted, in-store return, no restocking fee. Google showed the
saved policy as Verified. The linked website retains its medicine, opened
hygiene, temperature-control and other exclusions. The API launch excludes
medicines entirely and still requires explicit per-product channel review.

## Search Console findings

The domain property already had successful sitemaps: index 786 discovered URLs,
products 753, categories 17, static 16, last read 27 October. No duplicate sitemap
submission or URL removal was necessary.

- Server-error report: nine examples. Current requests returned 200 or genuine
  404; none returned 5xx. Started Google's fix validation on 28 October.
- Merchant listings: nine valid items, zero critical issues. The image-required
  issue was already marked Passed. Four historical return-policy/shipping
  warnings point at CeraVe pages; all four now include both properties in their
  production HTML. Started both fix validations on 28 October.
- 69 noindex URLs: sampled examples are internal search/query pages. These
  exclusions are intentional and were preserved.
- Product snippets: nine valid, zero critical issues. Missing review and
  aggregateRating warnings cannot be truthfully removed without real approved
  reviews; none were invented.
- HTTPS: zero non-HTTPS URLs, no issues detected.
- Manual actions and security issues: no issues detected.
- Core Web Vitals: insufficient usage data on both devices, not a reported
  performance failure. No passing field-performance claim is made.
- Historical missing, redirected, alternate canonical and crawled-not-indexed
  pages require their actual URL/content context. They are not all errors to
  erase, and no blanket homepage redirects or noindex removal were applied.

Google's validation/indexing is asynchronous. Starting validation is not proof
that Google has completed it or that a listing/ranking is guaranteed.

## Catalogue readiness

`npm run merchant:prepare` performs a read-only public catalogue scan and writes
ignored `outputs/merchant-preparation-2026-10-28/` reports. It does not approve or
change products and never calls Merchant API. A broken feedProduct argument
mapping was corrected and the preparation script is now included in typecheck.

Current scan: 753 public products, zero invalid, **zero ready**, 90 close to ready.
All 753 need condition and Google channel review, 750 need manufacturer
identifier review, 663 lack authorized image rights, 643 lack a product image,
and 503 lack brand metadata. The 90 close candidates need only condition,
channel approval and/or identifier review. Most have no verified GTIN/MPN.

Staff must verify exact products/pack sizes, new condition, manufacturer GTINs
or MPNs and Google eligibility. Missing identifiers must not automatically be
marked as not assigned, and local SKUs must not be substituted for manufacturer
identifiers. Review controls already exist in the admin product editor.

## Additive production worker

Both maintained and retained API runtimes start the worker only when explicitly
enabled. It runs a leased snapshot at most every 15 minutes while the service is
awake, updates changed products and refreshes unchanged data daily. Render's
free service sleeping can delay sync; no paid service was purchased.

The worker reads only the existing approved public catalogue export projection.
It reuses the storefront's pure mapping/review modules, without a Next.js runtime
or browser dependency. Mongo ObjectIds are normalized at the database boundary.
It does not change product metadata, stock, prices, orders, or customers.

Required product gates include reviewed content, stock verification, general-sale
classification, authorized owned Cloudinary photography, brand, condition,
manufacturer identifier review and explicit Google approval. Medicines and
prescription products are excluded for this UAE launch. Legacy CDN files are
held until migrated/reviewed through the owned image publication pipeline.
Before upload and daily refresh, actual raster files are checked: trusted host,
no redirects, bounded 20-second requests, at most 16 MB, JPEG/PNG/WebP, one frame,
at least 500 by 500 pixels and at most 64 megapixels. No upscaling is performed.

The official Google Auth Library uses a dedicated service-account credential
and only the Merchant content scope. Credentials and SDK error payloads are never
logged. The selected data source must be API, online, AE only and compatible with
English/AE. Another source's product ownership is never taken over.

`merchant_jobs` stores the lease and aggregate counters; `merchant_products`
stores stable offer IDs, hashes, refresh times and pending/synced state. Only
these additive collections are written. Both have the default unique `_id`
index; a unique `(dataSource, offerId)` index supports scoped reads. Intent is
persisted before inserts, making uncertain inserts retryable with the same ID.
Incomplete catalogue reads, malformed projections, provider failures and
transient photo failures prevent removal. Offers that are no longer eligible
are withdrawn only from this integration's previously managed source. The source
parameter scopes each removal. Local tracking is removed only after API success.

## Activation configuration

Created dedicated identity:
`almina-merchant-sync@al-mina-ba5a8.iam.gserviceaccount.com` in project
`al-mina-ba5a8`. No Google Cloud IAM roles were granted. The owner approved persistent API access
and the Google APIs Terms of Service, and completed Google phone verification.
Merchant API is enabled. Cloud project number `181730454094` was registered to
this Merchant account with `pharmacy.spmb@gmail.com` as developer contact. The
service identity was then reduced from temporary Admin to **Standard only**;
a subsequent API read of the selected source succeeded with HTTP 200. Its JSON
credential is protected in an ignored mode-600 local file and was saved directly
in the existing Render environment. No credential was printed or committed.

Saved in the existing Render API service for the release deployment:

```env
DATABASE_ENV=production
GOOGLE_MERCHANT_SYNC_ENABLED=true
GOOGLE_MERCHANT_ACCOUNT_ID=5884188879
GOOGLE_MERCHANT_DATA_SOURCE_ID=10786798631
GOOGLE_MERCHANT_SERVICE_ACCOUNT_JSON=<protected service-account JSON>
```

Existing `APP_ENV=production`, canonical `GROWTH_WEB_ORIGIN` and
`CLOUDINARY_CLOUD_NAME` are also required. Do not put the JSON in Vercel,
NEXT_PUBLIC variables, source files, chat, logs or Git. Any protected temporary
local copy must remain ignored and permission-restricted. API enablement and developer registration are complete. After the release
deploys, verify a successful zero-eligible job through the aggregate-only
`merchant_sync_completed` event in Render logs. Then review the first
eligible product and confirm its processed Google status before expanding.

The XML feed remains independently disabled unless deliberately enabled; the
API worker does not enable it. Avoid creating a second upload owner for the same
IDs. The prepared API connection must not be described as active before the
credential, registration and production job verification are complete.

## SEO correctness changes

Product JSON-LD no longer submits `/product-placeholder.svg` as a product photo.
The visible missing-photo UI remains; Google may report missing images until
real photos exist, which is the accurate state. Real photo markup is preserved.
Country-level structured data and XML feeds now use the highest actual delivery
fee instead of advertising a local minimum nationwide. Exact regional costs
remain visible on `/shipping` and authoritative at checkout. Google UAE feed
eligibility also excludes medicines, consistent with the API worker.

## Verification and rollback

Typecheck, lint, 245 unit tests and the disposable Mongo replica-set Merchant
integration test passed during development. The isolated production foundation
build and SEO smoke passed. Next.js 16.4.2 bundled JSON-LD documentation was read;
local Turbopack compilation/runtime diagnostics reported no errors, and browser
inspection confirmed rendered Product JSON-LD and a working product page.
Release/CI/deployment verification must additionally confirm the running commit,
the aggregate Merchant completion event and the production structured data.

Disable `GOOGLE_MERCHANT_SYNC_ENABLED` to stop the worker. This does not withdraw
already uploaded products: use a deliberate source-scoped withdrawal if needed,
or let unchanged data expire. Do not delete catalogue or order collections.
The new tracking collections can remain in place for safe retry/re-enablement.
Reverting the code restores the previous SEO output, but would reintroduce the
placeholder/national shipping inaccuracies. Merchant account shipping/returns
should stay aligned with the published website rather than reverting to stale
values.

References: [Merchant API authentication](https://developers.google.com/merchant/api/guides/authorization/access-your-account),
[product lifecycle](https://developers.google.com/merchant/api/guides/products/add-manage),
[API sources](https://developers.google.com/merchant/api/guides/data-sources/api-sources),
[healthcare restrictions](https://support.google.com/merchants/answer/6150151),
[image rules](https://support.google.com/merchants/answer/6324350),
[conservative shipping rates](https://support.google.com/merchants/answer/15254380),
[recrawl and indexing](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).

## Production release evidence

Runtime release `27aead53d2cfc90465207c5b24cccfe125bf1ba9` was merged through
[PR #78](https://github.com/nbl-ahmd/almina/pull/78). All five checks passed in
[CI run 40658740120](https://github.com/nbl-ahmd/almina/actions/runs/40658740120).
The [Vercel production deployment](https://github.com/nbl-ahmd/almina/actions/runs/40659662674)
succeeded, and Render `/health/ready` reported the same commit. The production
worker logged a successful zero-eligible run, confirming live credential parsing,
Standard-role API access, source verification and database/job initialization.

The owner then explicitly confirmed new condition and Google approval for
**Vichy Stress Resist Anti-Perspirant Roll-On 50 ml (`PD6615`)**. These two review
fields were saved through the authenticated production admin editor. Public
before/after reads confirmed price AED 75.60, stock 7, GTIN `3337871324001`, sale
state, identifier status and Meta approval unchanged. The editor's existing
expected-stock transaction guard protects against stale stock overwrites.

At 14:37:56 Asia/Kolkata on 28 October, Render logged:

```json
{"event":"merchant_sync_completed","eligible":1,"uploaded":1,"withdrawn":0}
```

A subsequent Merchant API `products.get` returned
`accounts/5884188879/products/en~AE~PD6615`, owned by source `10786798631`, with
price `75600000` AED micros (AED 75.60) and `IN_STOCK`. The only reporting context
is `FREE_LISTINGS`, pending for AE. Google reported `image_link_pending_crawl`
and `pending_initial_policy_review_free_listings`. These are initial processing
states; this evidence confirms submission, **not final listing approval**.
No appeal or policy override was submitted.

Search Console already showed this page indexed. Its live URL test after the
release reported available to Google, indexable, one valid Merchant listing,
one valid Product snippet (optional review/rating warnings), and valid
Breadcrumbs. Production raw Googlebot HTML confirmed genuine image markup for
the Vichy product, no placeholder photo for the Oral-B missing-photo product,
and AED 21 country-level shipping for both pages.

The Merchant customer-service fields now also match the published website:
`https://alminapharmacy.com/contact`, `info@alminapharmacy.com`,
`+971504825007`, preferred contact phone. The saved business-info screen confirmed
these values; no live-chat availability promise was added.

A read-only raster audit of all 90 initially close candidates found 88 passing
the 500px check and two needing larger originals:

| Product | Current image | Required action |
| --- | --- | --- |
| Bioderma Sebium Gel Mou 200 ml (`PD0826`) | 300 × 400 | Supply an authorized larger original |
| Bioderma Sebium Gel Mou Actif 200 ml (`PD0828`) | 181 × 400 | Supply an authorized larger original |

No image was upscaled. Ignored local review artifacts are under
`outputs/merchant-preparation-2026-10-28/`: `review.csv`, `close-to-ready.csv`,
`image-readiness.csv` and JSON equivalents. The Vichy pilot is the only product
whose Google approval was changed. Remaining products still require their own
condition, identifier and channel review; photo readiness does not imply approval.
The redundant agent-created credential download was removed after the protected
ignored local copy and Render configuration were verified.
