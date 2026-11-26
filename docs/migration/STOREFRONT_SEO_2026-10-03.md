# Storefront SEO — 2026-10-03

## Scope and indexing

Implemented on `codex/storefront-seo`, using installed Next.js 16.3.8 and its bundled metadata, robots, JSON-LD, not-found and sitemap documentation. npm's stable 16.x version list still ends at 16.3.8; no framework/dependency upgrade was necessary. This changes the additive storefront and public modular API only. No deployment, production database/provider access, schema migration, price/stock write or legacy route cutover occurred.

The root layout sets `metadataBase` from validated `WEB_ORIGIN` and a reusable title template. Home, products, categories, category detail and offers have explicit descriptions, canonical URLs, Open Graph and Twitter cards. Product `generateMetadata` and page rendering share a React request-scoped catalog read. Canonicals use current readable slugs and immutable legacy identifiers, stripping tracking and filter queries. The existing logo supplies fallback social imagery; real product media is used when available.

`APP_ENV=production` permits indexing public catalog routes: `/`, `/products`, `/products/[slug]`, `/categories`, `/categories/[slug]` and the existing genuine sale-catalog route `/offers`. Arbitrary offer/filter/search query states are not SEO landing pages. Every non-tracking query parameter (including pagination) is noindex, with a canonical pointing to the unfiltered page; only `utm_*`, `gclid` and `fbclid` preserve indexability. Product discovery beyond the first catalog page is supplied by database sitemaps. Cart, checkout, search, foundation diagnostics, auth, admin and unmatched routes remain excluded through default-deny `X-Robots-Tag` policy and route metadata. All non-production environments retain global header noindex/nofollow, disallow-all robots and empty sitemaps.

Production robots allows crawling HTML so crawlers can observe `noindex`; robots disallow alone is not an indexing exclusion. It blocks API/framework paths and advertises the sitemap index. No crawler-user-agent bypass changes access control.

**26 November 2026:** `/search` is now disallowed for every crawler, and the website refuses it to clients that identify as automated.
Other excluded pages may still be crawled so their `noindex` is seen. See [crawler traffic](BANDWIDTH_OPTIMIZATION_2026-11-26.md#crawler-traffic-on-the-search-page).

## Raw HTML and structured data

`htmlLimitedBots: /.*/` deliberately disables metadata streaming for every user agent. Metadata and product/category not-found decisions resolve before HTTP headers are committed. This trades some time to first byte for reliable head metadata, HTTP 404s and HTTP 308s. Product names, categories, descriptions, displayed AED prices and images render on the server, without an effect-based catalog request. CSP nonces and uncached nonce-bearing HTML remain intact.

Organization JSON-LD describes only the evidenced organization name and deployment URL. Product JSON-LD includes real name, ID/SKU, description, category, media and an Offer containing the **advertised catalog price** in AED, matching the visible display helper. It is not an authoritative checkout total. Availability is deliberately omitted while Next checkout and store-open policy integration remain gated; no ratings, reviews, brand, GTIN, return/shipping policy or sale-expiry dates are invented. Add availability only after verified commerce integration; optional rich-result fields may otherwise be reported as missing. Product/category BreadcrumbList data matches the visible navigation hierarchy. Native JSON-LD script tags use the request CSP nonce and escape `<` to prevent catalog text from terminating a script.

Reference: [Google product snippet requirements](https://developers.google.com/search/docs/appearance/structured-data/product-snippet). Production Rich Results/Search Console inspection is still a deployment acceptance step; this implementation does not promise rich-result eligibility or ranking.

## Database-backed sitemaps

`API_ORIGIN` must point to the modular API, with its existing guarded database connection enabled against the **same catalog database** used by `LEGACY_API_ORIGIN`. Web never reads a MongoDB credential or imports legacy startup. `/api/v1/catalog/sitemap?kind=products|categories&cursor=...` validates explicit parameters, uses scoped keyset cursors, projects only names/identities and returns at most 1,000 records plus the next cursor. MongoDB work has the existing 3-second deadline. Disabled, missing-category and malformed identity/price/stock records are excluded; missing legacy disabled flags remain compatible. The default `_id` index supplies cursor ordering and category `_id` indexes supply joins; no index was created or changed. Real production query plans and catalog validity/identifier uniqueness still need inventory verification.

`/sitemap.xml` is a dynamic sitemap index. It walks bounded API pages to publish cursor-sharded product/category sitemap locations alongside a static public-route sitemap. `/sitemaps/products/<cursor|first>.xml` and the category equivalent re-read their respective database page. Each child contains at most 1,000 absolute canonical URLs. No cart, checkout, auth, admin, internal search, filter state, compatibility URL, disabled or deleted item is intentionally submitted. XML is escaped, size/entry protocol limits are enforced, repeated cursors are rejected and excessive catalogs fail rather than silently truncate. No fabricated `lastmod` is emitted because existing schemas do not reliably record content modification dates.

Database outages, invalid upstream envelopes, rate limits and timeouts produce **503 with Retry-After**; the system never substitutes an empty successful production sitemap for an outage. Everything is uncached to reflect deletion/visibility changes. Sitemap index generation performs a full bounded-page inventory each time; large production catalogs should measure that latency and shared public-API quota before cutover. If the quota or request duration becomes limiting, add an independently verified background snapshot/cache with deletion/visibility invalidation; do not introduce stock/price caching as part of that work. Individual child files stay bounded regardless of catalog size.

Reference: [Google sitemap size and URL requirements](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Compatibility, deletion and configuration

Permanent 308 compatibility redirects are now enabled **by default**, superseding the preview's previous default-false redirect gate. `/productdetails/<public ID>`, raw category ObjectIds and stale readable product/category prefixes resolve the existing immutable identifier and redirect to the current canonical target. Repeated query parameters are retained for those compatibility aliases. Explicit `STOREFRONT_REDIRECTS_VERIFIED=false` remains a temporary diagnostic/rollback option; already cached permanent redirects cannot be revoked by that flag. Actual production URL/identifier/edge-route inventory is required before deployment.

`STOREFRONT_PRODUCT_REPLACEMENTS` is a server-only JSON object of reviewed retired public IDs to equivalent live public IDs, default `{}`. For example, synthetic `{"PDRETIRED":"PD0001"}` is used only by smoke tooling. Never infer replacements from similar names/categories. Configuration rejects invalid IDs/URLs, self-references, chains, cycles and more than 1,000 entries. Existing live products take precedence. A retired detail route returns 308 only after its mapped replacement resolves to a current visible, valid product; a missing/disabled replacement returns 404. Unmapped deleted/unknown products return actual HTTP 404 and Next noindex. Upstream failure is not classified as deletion; the compatibility handler returns 503 and page errors use the existing error boundary. Database records and identifiers are never changed.

Origins now normalize trailing slashes to avoid double-slash sitemap/organization URLs. Category reads no longer request only `disabled:false` documents: the read-only adapter normalizes the public legacy list and excludes disabled categories, making missing legacy flags readable and keeping category sitemap targets compatible.

Rollback: revert this focused source change, retain the legacy host/router, and set the redirect flag false only for future requests if needed. No database rollback is necessary. Cached 308s and search-engine recrawling require separate operator consideration.

## Verification

- Full typecheck/lint and automated suite; focused metadata/query, escaping, displayed-price, replacement-validation and cursor tests.
- Disposable loopback MongoDB replica test with 1,002 visible products: all IDs covered across cursor pages without duplicates; hidden/orphan/invalid products omitted; categories filtered; cross-kind cursors rejected. No application database URI is read by this launcher.
- Turbopack foundation production build and compiled API/foundation/storefront smoke.
- `npm run smoke:seo`: compiled production-mode Next, credential-free synthetic TLS API and temporary local trust certificate. Checks raw HTTP HTML for normal browser, Googlebot, Facebook and Twitter user agents; metadata in `<head>`; canonical and indexing rules; real visible product content after stripping all script payloads; nonce-safe Organization/Product/Breadcrumb JSON-LD; 308 aliases/replacements and true 404s; robots; sitemap index/children; 503 outage behavior.
- Existing storefront browser workflow: direct navigation/reload, old shared URLs, 404s, cart/storage/server-price safeguards and upstream retry. Additional product-page checks at 360/390/768/1280 px found no overflow. Next MCP route/compilation/runtime diagnostics were clear after fixture recovery, and React inspection confirmed server pages with small interactive islands.

Reproduce database test:

```sh
node scripts/tooling/test-commerce-integration.mjs /path/to/mongod tests/seo-database.test.ts
```

The normal test suite skips database tests unless the isolated launcher supplies its own loopback replica URI. Real production inventory/query plans, replacement equivalence, staging data/media parity, edge routing and hosted crawler/Search Console validation remain deployment gates.
