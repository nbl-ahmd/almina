> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Stitch storefront refresh — 2026-10-14

Superseded by the [full Figma storefront redesign](FIGMA_STOREFRONT_2026-10-14.md)
after owner review. This document records the initial visual refresh only.

## Reference and scope

Adapted the current desktop/mobile screens in Stitch project
`9922774523211835589` (Modern Pharmacy E-Commerce Platform): homepage
`0c8bb6a678d7455293713ee21834973d` / `075b0acfebad4d339490146555bd9325`,
catalog `c2e8815579414e19a6edba2778e52149` / `04866efe45d54d8493933c39febd607d`,
details `9453791a58484d788a427a6ef21e3559` / `825f119453f24be18afe2137c23949af`,
cart `a5ba67f19dfd41a499de8d4ea96ce957` / `dc5ae5f0087349feb2588f02edc799c2`.

The latest screen exports use coral, aqua and ocean slate rather than the older
project-level teal theme. The implementation uses a darker coral for readable
white button labels, pale blue surfaces, rounded cards and pill controls.
Plus Jakarta Sans is self-hosted through `next/font/local` with its SIL OFL
license. The font adds no external browser font request or build-time download.

Changes cover the public storefront shell, homepage, shared product/category
cards, product filters, detail layout, cart and shared checkout styling.
Desktop filters sit beside the results; smaller widths place them above results.
Mobile retains five labeled bottom-navigation destinations, safe-area spacing,
two-column product cards and native search/category controls. The theme is scoped
to `.storefront-shell`; administration retains its existing theme.

All products, categories, prices, stock, descriptions, photographs and banners
continue to come from the existing catalog. The homepage spotlight uses the
first existing featured product and falls back to category navigation when none
exists. No Stitch sample product data, ratings, reviews, credentials, clinical
claims, prescriptions, subscriptions, account features, certification badges,
free-delivery thresholds or delivery-time promises were imported. Existing
contact details and URLs remain intact.

There are no backend, schema, checkout calculation, inventory, authentication,
caching or provider changes in this refresh. Cart component edits add styling
hooks only. Existing uncommitted work in the workspace was preserved.

## Verification

Framework: installed Next.js 16.3.8 / React 19.3.0; reviewed version-matched
bundled CSS, image and font guides via `npm run docs:next`. No dependency upgrade.

- Web typecheck and focused ESLint checks pass.
- 25 existing storefront, SEO, performance and commerce unit regressions pass.
- Isolated Turbopack production build passes. The initial sandboxed build stalled;
  rerunning with build-worker permissions completed successfully.
- Existing design browser suite passes 54 combinations: nine routes at 360,
  390, 768, 1024, 1280 and 1440 CSS pixels. No overflow, broken images, axe
  violations or incomplete axe review items. Search/filter/clear, image gallery,
  unavailable controls, skip link, keyboard focus, 200% text, reduced motion,
  loading, cart empty/error/retry and reload checks pass.
- Existing storefront browser suite passes direct navigation/reload, legacy
  redirects, legacy cart import, authoritative prices, quantity/stock limits,
  removal, persistence, store closure, mobile navigation and outage recovery.
- All 27 existing Playwright storefront/enabled-checkout regressions pass against
  the isolated production build and disposable local replica set. This includes
  checkout at 360/390/768/1280px with accessibility checks, reviewed totals,
  price-change rejection, saved-intent retries, forged-total/Origin rejection,
  existing delivery-location behavior, pagination, empty results and cart limits.
- Live `/_next/mcp` reports no compilation issues, configuration errors or
  session errors after recovery. React inspection confirms server-rendered
  pages/navigation with existing small interactive islands.

Visual evidence is generated locally at `/tmp/almina-stitch-verification`.
Verification fixtures are synthetic and isolated on loopback; they are not
application data or additions to the production catalog. No production database,
provider, deployment or Stitch project mutation occurred. Real hosted catalog
and media parity remain an operator acceptance step.

## Rollback

Revert only the storefront refresh files, including the scoped stylesheet and
font addition, while preserving other workspace changes. There is no data
migration or commercial-policy rollback. Removing the storefront font class and
theme wrapper restores the prior shared theme; navigation/layout edits can be
reverted independently.
