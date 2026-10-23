# Branded product image delivery — 21 October 2026

## Decision and scope

Use `https://cdn.alminapharmacy.com/media/w{width}/v{version}/{publicId}.webp`, backed by the pharmacy's existing Cloudinary account and Vercel CDN. Authoritative DNS stays on Vercel. No Cloudflare Worker, DNS migration, new image provider, credential, database rewrite or media deletion is needed.

The owner clarified that only new uploads need this system. The existing legacy `/cdn/` compatibility bridge is retained because it is now deployed and referenced. This work neither migrates nor deletes old media; its separate upstream retirement remains pending.

The hostname was attached to the existing pharmacy-owned Vercel storefront project, production environment, and shows **Valid Configuration**. This prepares DNS/TLS; the new `/media/` implementation must be released before the storefront uses those URLs. Before release, the hostname still serves the previous deployment. Proof: `outputs/branded-media-2026-10-21/vercel-cdn-domain.png`.

## Delivery and performance

1. Existing authenticated admin uploads continue to create unique, signed, versioned WebP assets, with `overwrite=false`. Store provider source URLs in MongoDB as before.
2. Storefront adapters emit the branded 1200px canonical image for production product metadata, Product/ProductGroup JSON-LD, sharing metadata and approved Google/Meta catalogue feeds.
3. `ProductImage` uses responsive `srcset` variants at approved widths. Cloudinary performs `c_limit`, `q_auto` and explicit WebP delivery. No second Next/Vercel image encoding step runs for these photos. Local artwork and missing-photo placeholders retain their existing handling. Development metadata retains the original source URL while the image loader uses the local `/media/` route.
4. Vercel's media handler runs on a CDN cache miss. It fetches only the configured public Cloudinary image account, accepts a successful WebP response, bounds the body to 5MB and applies an 8-second timeout. It forwards no application cookies, authentication headers or arbitrary caller headers; redirects are rejected.
5. Only validated successful image responses receive one-year immutable browser/CDN caching. Unique asset IDs and versions provide cache busting when a photo changes. Errors, oversized files, invalid paths and non-image responses are not cached. The CDN image host blocks storefront/account/admin pages after release, with media-specific robots rules.

### Why a small cache-fill handler rather than a plain external rewrite?

A real Cloudinary response returned `Cache-Control: private, no-transform, immutable, max-age=2592000`. A rewrite that honors upstream cache headers would not achieve shared Vercel CDN caching. A handler permits success-only cache policy and rejects malformed/error bodies without force-caching failures. It does not resize images or connect to the API/database. Cache hits should be served by Vercel without running the handler; confirm `x-vercel-cache: HIT` after release. Cold misses still consume Vercel function execution/bandwidth and Cloudinary delivery/transformation allowance.

The format is explicit WebP so a URL always represents the same format; caller `Accept` and `Save-Data` do not multiply transformations. AVIF negotiation is intentionally not introduced into this cache key.

## Verification

- Focused regression tests cover account/host/path validation, finite sizes, encoded traversal, source version changes, credential isolation, HEAD, cached successes and uncached errors/timeouts/oversized bodies.
- Full unit suite (174 passing), lint, typecheck and isolated Next.js 16.3.8 production build passed. Running Turbopack diagnostics report no compilation issues.
- Isolated production server with public catalogue reads: real image returns HTTP 200, `image/webp`, 11,920 bytes, public immutable cache headers and no provider cookies. The original file is 24,350 bytes; this one 384px derivative is approximately 51% smaller. This is a file-size observation, not a general latency benchmark.
- Browser homepage and CeraVe product detail gallery load photos through local `/media/` URLs with no browser errors. Production canonical generation is covered by the helper regression.
- Final deployed CDN cache-hit, live product metadata/feed URLs, mobile rendition and replacement-photo checks remain release acceptance steps; do not claim them verified from a local server.

## Release and rollback

Merge the focused image PR through normal verification; the existing master deployment workflow releases it. No additional secrets or backend upload setting changes are required if the current signed uploader is already configured.

After deployment, request a known image twice on `cdn.alminapharmacy.com` and confirm valid TLS, HTTP 200, WebP content, no redirect to Cloudinary, public cache headers and eventual `x-vercel-cache: HIT`. Check a product page's image/srcset, JSON-LD, OG image and approved feed. Check invalid paths/error responses are uncached and `/account` on the CDN hostname returns 404. Do not create a real order or alter stock for this acceptance.

Rollback: redeploy the previous frontend; provider URLs and uploads are unchanged in the database. Keep the domain and stored assets until references have been checked. To urgently revoke a mistakenly published public photo, remove its product reference and purge its Vercel/Cloudinary cached variants; immutable URLs cannot be recalled from browser caches.

Official references: [Vercel CDN cache](https://vercel.com/docs/caching/cdn-cache), [Cloudinary image optimization](https://cloudinary.com/documentation/image_optimization).

## Recovered release — 23 October 2026

PR #57 was closed after the SEO smoke assertion still expected a Cloudinary URL.
The replacement updates the expectation to the branded production metadata URL,
retains the now-deployed legacy `/cdn/` handler and its tests, and incorporates
the latest wholesale/email/security/CI changes. No legacy asset is deleted.
The earlier removal description is superseded: both old and new image paths
remain available until a separately verified migration permits retirement.
