# Recovered catalog publication and URL compatibility — 2026-10-04

Branch: `codex/recovered-product-compatibility`, stacked on `codex/operations-dashboard`.

Recovery accepts reviewed IDs of 1–80 ASCII letters/digits/underscore/hyphen. The versioned business-ID detail route still required `PD` followed by digits, and storefront slug parsing truncated IDs containing `--`. A shared identity schema now preserves the full reviewed ID. Slugs split at the first generated separator: normalized readable prefixes cannot contain `--`, but the stable ID can. MongoDB and business identities use their explicit existing routes; a reviewed ID resembling an ObjectId is never reinterpreted. No stored ID or shared legacy URL is changed.

## Publication boundary and retained ownership

The real recovery browser test found that anonymous retained detail reads returned disabled drafts. Next filtered them, but the API was not a sufficient publication boundary. Retained product/category list/search/detail/category reads now execute maintained TypeScript modules with bounded validated fields, explicit projections and three-second query bounds. Anonymous reads exclude disabled/unpublished/inactive products and missing/hidden/archived categories; archives remain excluded. The modular API/sitemap also honor explicit unpublished/inactive flags. Missing legacy flags retain their compatible visible default.

Catalog URLs remain public, with optional **server-verified** staff sessions for existing editors. Only verified `admin`/`user` identities may read drafts. An invalid/expired session falls back to the anonymous publication rules; database failures do not silently downgrade. A role header or caller filter cannot grant draft access. Ordinary Next storefront reads do not forward staff cookies. Media delivery/history adapters remain separate and retain surviving references; no image is deleted or made dependent on current product visibility.

Compatibility response shapes remain arrays, populated list/business-detail categories, raw category ID for MongoDB detail, and `{ product, relatedProducts }`. Missing detail now returns 404 instead of the old erroneous 500/double response. Related products are capped at 30; product collection default is 30, maximum 100, offset maximum 10000. Category reads default/cap at 1000 and support explicit pagination. Next admin already supplies bounded pagination. The retained Vite category caller previously expected an unbounded array: it now requests 30 rows and supports keyboard load-more, cancellation on navigation, loading, empty, error and same-page retry. Other mounted consumers were inspected for explicit limits. This is a deliberate bounded-read compatibility change requiring hosted parity, not authorization to retire the adapter or Vite client.

## Advertised prices and redirects

Next cards, details, cart presentation and Product JSON-LD now follow the authoritative active-sale rule: a stale sale price with `sale=false` does not discount; an active zero-price sale remains zero. Strike-through appears only for an active reduction. Checkout still independently calculates and validates money/stock; this PR changes no persisted price, tax, stock or order policy.

Legacy product redirects preserve repeated query values and use validated `WEB_ORIGIN`, preventing a normalized/request host from selecting a different destination. Reviewed replacement/redirect gates remain. No ratings, medicine claims, availability schema or lost customer/order history is created.

## Verification

Local: 64 unit, 100 API/security, 34 mandatory disposable replica-set/load, 7 release-gate and 28 Chromium scenarios pass. Lint/workspace typecheck, Next foundation and retained Vite production builds pass; all three lockfile audits have zero high/critical findings. Real tests import reviewed drafts through preview/hash-bound commit, prove they remain hidden, publish through the maintained visibility domain without opening the store, distinguish colliding business/MongoDB namespaces, preserve exact 80-character IDs, and reject malicious/oversized queries. Separate real retained HTTP tests verify all anonymous read paths, related products, forged roles/filters, archives/orphans and staff draft access.

`smoke:seo` is now required in CI's browser job and correctly selects the isolated build. Raw HTML is checked for ordinary browsers/Googlebot/Facebook/Twitter: visible content, AED price including zero/stale sales, nonce-safe schema, canonicals/OG/Twitter, recovered raster URL metadata, legacy/name redirects, robots/sitemaps, true 404s, private/search exclusion and outage 503s. Admin intentionally uses `noindex,nofollow`; public duplicate variants use `noindex,follow`.

Synthetic recovered-product budgets are 5000 ms warm SSR p95 and 512 KiB raw HTML. `.verification-results/recovery-seo.json` records five samples each for listing/search/two recovered details: local p95 8–12 ms, largest raw HTML 44,726 bytes. These coarse CI budgets are not production SLOs, browser Web Vitals or Cloudinary delivery acceptance; representative owner-reviewed products/images and hosted measurements remain required.

Compiled Chromium verifies import/review/detail redirects, reload, zero-stock disabled add-to-cart and closed-store status at 360/390/768/1280 px. Running isolated Turbopack at port 4760 renders an actually imported synthetic `RECOVERY--0001` with AED 0.00, out-of-stock and disabled cart controls; `get_errors`/`get_compilation_issues` are empty. Scoped axe 4.12.1 has zero violations/incomplete checks. External media/provider delivery is not represented by browser network stubs.

Operations PR #12 required hosted `verify` passed in runs `37183771015` and `37183774007`. This candidate's hosted CI is pending push. No production database/provider operation, master merge, auto-deploy or contraction occurred. Hosted backups/restore/rotation, exact deployed SHAs, private/static headers, actual media/SEO and business/provider acceptance remain release blockers.

Rollback must retain the hardened anonymous publication boundary and safe commerce writer. Do not roll back to a draft-leaking API or an unsafe writer. Preserve imported data, reference history, receipts and all legacy fields. A reviewed compatible forward-fix/routing rollback is preferable to restoring old data over committed commerce.
