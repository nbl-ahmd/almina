# Media canonicalization

Updated: 2026-10-03

## Decision

The canonical **delivery contract** for storefront product, category, and banner images is the existing CDN hostname and path layout:

| Resource | Canonical URL |
| --- | --- |
| Product | `https://cdn.alminapharmacy.com/cdn/products/{filename}` |
| Category | `https://cdn.alminapharmacy.com/cdn/categories/{filename}` |
| Banner | `https://cdn.alminapharmacy.com/cdn/banners/{filename}` |

This is supported by active CRA storefront components and the migrated Next catalog adapter. A prior audit records that a historical commit described a Cloudinary migration, but current configuration does not establish the CDN's origin, object-store vendor, transformation behavior, cache policy, or current file inventory. Therefore Cloudinary is **not** declared the storage provider. The repository establishes the CDN URL contract only. The CDN hostname is the source of truth for new storefront reads; legacy database fields and API image endpoints remain compatibility sources during migration.

## Reference inventory

| Data / reference | Current fields or code path | Current behavior | Migration handling |
| --- | --- | --- | --- |
| Product documents | `image`, `images[]`, `gdriveFileId`, `gdriveFileIds[]`; `backend/models/Product.js` | Cards use scalar `image` on CDN. Details can use `images[]` via `/api/products/images/:filename`; create/update routes use Drive IDs. Schema does not model legacy scalar `image`. | Preserve all fields. Migrate each distinct referenced image and add canonical filename/URL additively; do not infer array-to-ID pairing or delete old assets. |
| Category documents | `image`, `gdriveFileId`; `backend/models/Category.js` | Storefront category tiles construct the CDN category URL. Legacy category upload/update uses Google Drive. | Preserve Drive field and image string until every document is reconciled and live rendering is confirmed. |
| Banner documents | `image`, `gdriveFileId`; `backend/models/Banner.js` | Next and CRA construct the CDN banner URL. Legacy banner writes and API image endpoint still use Drive. | Preserve existing names and IDs; validate CDN availability before switching any reference. |
| WhatsApp posters | `image`, `gdriveFileId`; `backend/models/WhatsappPoster.js` | API streams Drive media and deletes it on poster removal. Not part of storefront canonicalization. | Keep the Drive integration until this separate workflow has a replacement and compatibility verification. |
| Legacy email/order rendering | `frontend/src/email/OrderConfirmation.jsx`, admin order views | Includes API image paths, historical filename references, and embedded data URLs. | Inventory historical references separately; do not rewrite immutable order snapshots or externally used URLs as part of catalog cutover. |
| Local/static assets | `frontend/src/client/assets/*`, `apps/web/public/*`, backend public upload directories | Bundled/static files and temporary upload paths; not all are catalog assets. | Retain. Classify usages before any cleanup. |

Relevant writers/readers are `backend/routes/products.js`, `categories.js`, `banners.js`, and `whatsapp.js`, plus `apps/web/src/lib/server/catalog.ts`, `frontend/src/client/components/{ProductCard,BannerCard,CategorySlide}.js*`, and email/admin renderers. Google Drive dependency and `GOOGLE_APPLICATION_CREDENTIALS` references remain because mounted production workflows still instantiate it. The source audit says source credential literals were removed; repository/provider credential rotation or revocation has not been confirmed. Do not place service-account material in this repository.

## Changes made

- Configured Next Image for the observed CDN paths and the configured legacy API host used by the read-only fallback. AVIF/WebP output is enabled, SVG optimization is disabled, and the optimizer has a one-hour minimum cache TTL.
- Removed `unoptimized` from Next storefront image components and supplied responsive `sizes` for product cards, product galleries, categories, banners, thumbnails, and cart rows.
- No redirect, database write, asset deletion, provider change, production URL change, or credential revocation was performed.

## Read-only production URL probes

On 2026-10-03, a GET to the configured legacy product-list endpoint returned HTTP 500. The category-list request timed out. Therefore no complete production filename inventory could be assembled from the live API in this pass. Direct CDN checks (response bodies discarded) found the known model/default category asset `305dd291-e32e-4d7f-9abb-aae212c434a4.webp` returned `200 image/webp`; the CRA card fallback `fb634ad3-7062-4baf-a08d-4f8f04abb459.webp` returned `404 application/octet-stream`. These are individual URL observations, not proof of catalog-wide parity or rendering. The failed product default must not be used as evidence that all product URLs are invalid. Investigate the API failure and inventory records from an approved snapshot before changing any records or aliases.

## Migration gates

The actual record inventory, copies, DB updates, per-image validation, production rendering verification, Drive retirement, and direct upload rollout are **not complete**. No database or provider administrative credentials were available; the production checks above were limited to anonymous read-only URL requests. Do not represent an empty local inventory as proof there are no references.

Before each reference can move:

1. Take a read-only, paginated inventory from an approved production snapshot; include products, categories, banners, posters, order/history references, scalar and array fields, and missing/duplicate/default values. Record stable document identity, source provider/key, destination key, byte size, detected MIME, pixel dimensions, content checksum, and status in an access-controlled manifest.
2. Confirm the CDN origin/object provider, credentials and least-privilege scopes, supported direct-upload/signing API, filename/overwrite rules, origin cache headers, and rollback/retention behavior with the provider owner.
3. Copy only referenced eligible catalog files to deterministic, immutable keys (for example collection + stable document ID + content digest). Decode and re-encode with a patched image library; allow JPEG/PNG/WebP/AVIF inputs only, cap bytes and decoded pixels, strip metadata, and validate resulting MIME/dimensions/checksum. Never trust client MIME or a file extension.
4. Verify the destination object with an origin/CDN read and image decode, then verify representative real storefront/admin/email production rendering for every URL family and legacy alias. A successful HTTP status alone is insufficient.
5. Apply an idempotent additive DB backfill guarded by expected old values and destination validation status. Keep old fields and source objects. Re-read and compare every updated document; monitor missing-image/error rates and retain a rollback mapping.
6. Only after complete reference reconciliation and an agreed observation window may writes switch to signed/direct object-storage upload. Enforce server-issued, short-lived, one-object upload intents; random/deterministic server keys; size/content/dimension limits; post-upload verification; and authenticated admin authorization. Do not issue public credentials or permit arbitrary key/path selection.
7. Remove Drive API code/dependency, environment wiring, and service-account grants only after every Drive-backed workflow (including posters and category/banner management) has a verified replacement and no retained record needs Drive. Revoke/rotate old credentials with the provider owner and preserve rollback/retention evidence.

No redirects are introduced here. Production CDN and legacy API image URLs must be probed and rendered from an approved production/staging environment before a future redirect or alias change.

## Current upload validation

`backend/security/uploads.cjs` currently caps files at 5 MiB and filters declared MIME types. Product and banner code uses Sharp with a 20-million-pixel decode limit, but repository review has not established equivalent content-sniffing, dimension checks, deterministic names, cache headers, or post-upload validation across every route. Existing random UUID naming is not treated as content validation. Replace these paths as part of the authenticated provider adapter migration; do not expose a new direct-upload endpoint without the server authorization and post-upload verification described above.

## Rollback

Because this change made no data/provider writes, rollback consists of reverting the Next image configuration/component changes. Future backfills must leave source values and assets untouched and record prior values so reads can switch back by configuration or an additive pointer update without reconstructing identifiers.
