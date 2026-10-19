# Homepage redesign — 18 October 2026

## Scope and direction

Homepage and homepage components only. Product-led hero replaces the former lifestyle image and separate mobile quick-action wall. Real product packs, names, sizes, AED prices and product links anchor the hero. Warm neutral/sage surfaces, deep green shopping actions, generous but bounded spacing, photo-led shelves and category discovery replace the previous blue-bordered appearance. Homepage-scoped tokens also recolour its existing header/footer; other routes retain their theme.

Direction references: the existing Life Pharmacy, myAster and BinSina assessment in `outputs/commerce-direction-2026-10-18/`. Inspiration is search-led navigation, product recognition, category discovery and promotion hierarchy, not copied competitor assets. Impeccable composition and manual review, scoped gpt-taste direction, Emil interaction restraint and project constraints applied. The Impeccable executable scanner was unavailable; no automated visual score is claimed.

## Data, API gaps and dummy content

- **No dummy products, prices, discounts, ratings or services added.** Preview uses public catalogue reads, including approved catalogue image URLs.
- Hero selection: available featured products, then a code-defined CeraVe search, then general catalogue products. Prefer in-stock products with photos. At most two hero products.
- The CeraVe query is a temporary editorial merchandising choice, **not** a recommendation or popularity ranking. A campaign-management API with hero product IDs, ordering, scheduling and optional editorial copy is a future improvement. This release does not pretend that such an API exists.
- Shelf uses current catalogue prices and existing server-validated AddToCart. Family products with multiple options link to their product page. No checkout/pricing/inventory logic changed.
- Offers shelf renders only when the real offers API returns products. No invented sale banner. Legacy image-only banners are not used in this composition; campaign controls should eventually replace that old presentation.
- Category shortcuts use real category URLs, prioritizing skincare, vitamins, baby care, oral care, hair care and first aid where those names exist. They use a matching catalogue photo when available and Heroicons otherwise.
- Editorial skincare/baby links use existing search. A richer category/collection merchandising API is not required for them, but mapping these directly to maintained collections would improve precision.
- Missing photos explicitly say “Photo coming soon.” No generated pack substitutes. Product imagery preserves aspect ratio on white surfaces.
- Each catalogue request settles independently. A failed or empty catalogue retains hero copy/support and a retry state, with no fake purchase data. No error detail/secrets exposed.
- Existing APIs provide no bestseller/personalization/reorder evidence for these sections; none is fabricated.

## Verification

- Next.js 16.3.8 bundled Image documentation consulted.
- TypeScript and focused ESLint passed.
- 13 focused storefront, SEO and stylesheet-policy tests passed.
- Production Next.js build passed. Final subsequent changes limited to tracking and shared arrow icons; typecheck/lint rerun.
- Next.js local MCP `get_errors`: no configuration/session errors.
- Browser checks at 360, 390, 768 and 1440px: no horizontal overflow. Desktop and mobile full-page screenshots captured; all loaded product images had nonzero natural dimensions.
- Hero product link navigated to the correct CeraVe product detail route; direct reload rendered the homepage.
- Existing cart action is reused unchanged. No production order was submitted, stock mutated or customer data changed.
- One Next.js development LCP warning was observed for a reused product image URL; primary hero photo already uses eager loading. No production performance score or Core Web Vitals improvement claimed.
- Independent manual finish review requested two fixes: looser hero tracking and consistent shared CTA arrows. Both resolved; reviewer disposition `ship` applies to those two fixes.

Screenshots: `outputs/homepage-redesign-2026-10-18/desktop-final.png`, `mobile-final.png`, `hero-final.png`.

## Deployment / rollback

Local implementation only, not deployed. Revert homepage route, homepage component and homepage-scoped CSS token block to restore the prior composition. No schema migration or production data rollback is needed.
