# P4-02 — Public product cards and rails

18 November 2026 · `codex/storefront-pharmacy-app-reference` · starting point `6371b7b`

[Phase plan](../implementation-phases.md) · [Coverage C18, C27, C31–C32, C36, C42 and C47](../implementation-coverage.md) · [Approved card reference](../../../../../docs/design/storefront/references/05-product-card.png)

## Implementation

- Standard cards share one scoped component across home, catalogue, category, search, offers, collections, editorial grids and cart recommendations. Related rows and browsing history share the compact card treatment. Home and listing keep their own responsive column counts. Removed superseded card-specific global and home overrides.
- The image, stock and save controls come first, followed by brand/category and verified pack details, a wrapping product name, and a dirham amount next to quick add. A repeated brand or literal terminal size can move to metadata while the link retains the exact product name. A strength such as `500mg / 5 ml` stays intact. Brand/category destinations remain available.
- Grouped cards show the displayed SKU's exact price and availability and link to that SKU's existing options. The search provider can return a representative SKU that is not the cheapest, so the card reports when option prices vary. Active sale prices, including zero, are shown with the previous amount. The existing catalogue reader rejects missing prices, so those records keep their current exclusion policy.
- Quick add retains server stock validation and actual browser cart quantities. Both quick add and save have 44px targets. Saved state, pending state, transaction feedback and the full accessible cart quantity use the existing controls and account mechanisms. A successful quick add keeps the card height stable. Saved-page and main PDP purchase styling remain separate upcoming stages.

## Images and previews

Comparison stays static on hover and contains the original pack. Missing sources and failed card requests use localized “Photo coming soon”. The six exact-pack reference assets retain their recorded SKU associations. PD0826 still uses its existing handheld photo. The [local media review](../../../../../docs/design/storefront/UI_REPAIR_REGISTER_2026-11-16.md) found no verified alternate packshot in that asset set. Production media completeness is outside this check.

- Catalogue at 390px [English](p4-02-cards/en-390.png) · [Arabic](p4-02-cards/ar-390.png)
- Catalogue at 1440px [English](p4-02-cards/en-1440.png) · [Arabic](p4-02-cards/ar-1440.png)
- [Related rows](p4-02-cards/related-en-390.png) · [Recently viewed rail](p4-02-cards/recent-en-390.png)
- [32-case live viewport matrix](p4-02-cards/viewport-matrix.json) covers resize from 320px through 1440px, a 375px-high landscape view, English and Arabic, Chromium and WebKit. No page overflow, zero axe findings on the two scanned listing views, 14px card corners and 44px quick add. Standard prices and quick add share a row at 320px in both locales. Long amounts are allowed to wrap within the card. The local fixture records expected 404s for the guest saved-list and optional reminder endpoints.

## Verification boundaries

The isolated production build, workspace typecheck, repository lint, 21 focused unit checks, 40 Chromium suite cases plus the focused admin family recheck, and 24 WebKit cases passed. Live Next.js compilation and runtime diagnostics were clean. The admin test now enters the existing Variants tab and edits the variant without supplying a stock adjustment reason. The WebKit reload checks wait for the guest saved-list response before leaving the document.

Browser scenarios cover sale/no sale, zero price, unavailable stock, internationalized counts, save/reload/remove, long mixed-script names, failed/missing images, exact variant destinations, stock limits and cart persistence. Responsive and retained admin checks exercise actual local application routes. Device and assistive technology checks remain open. No production access or deployment.
