# Expanded local visual catalogue — 22 November 2026

The isolated preview at `http://127.0.0.1:4890/` now contains 24 sample products across six categories. Twenty items have photographs, including skincare, personal care, cosmetics, fragrance and home-health examples. Prices and availability are illustrative; new product titles and descriptions explicitly identify demo content. Sale, full-price, low-stock, unavailable, long-name and multi-photo states can be inspected.

Only the marked `almina_local_demo` database on the dedicated loopback replica at port 4892 was modified. The additive seed preserves the original four demo products, accounts, carts and orders. It refuses any different database/replica target. No production database or customer data was accessed.

Sample photographs were downloaded from DummyJSON's skincare, beauty and fragrance demonstration catalogue. Two existing repository photographs were reused. Source URLs are recorded locally in `.local-demo/catalog-media-sources.json`. Local images under `apps/web/public/demo-catalog/` and the idempotent `.local-demo/expand-catalog.mts` helper are excluded from Git; they are preview material, not approved production catalogue media or real offers.

The sole application adjustment permits sanitized `demo-catalog-` filenames to resolve to local images when `ALMINA_LOCAL_DEMO=1`. Production image resolution remains unchanged. The sample records exercise the existing catalogue, gallery, stock and price presentation without changing commerce logic.

Verified photographed shelves at 1440px and 390px, no horizontal overflow, product detail/gallery rendering, and no uncaught browser errors. Component lint and web typecheck pass; Next.js reports no compilation or session errors. Category presentation follows its existing 60-second content cache; reload after refresh if an older category set is initially shown.
