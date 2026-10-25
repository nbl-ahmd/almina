# Category-first discovery and listing ranking — 25 October 2026

Local implementation only. No deployment or production catalogue mutation.

## Audit: previous behaviour

- Retail product/search reads use maintained compatibility aggregation, not the separate cursor repository.
- Default product/search order was stock quantity descending, then ID. Offers used creation date descending, then ID. The UI called this Recommended although it was not relevance/personalisation/popularity.
- Explicit price ascending, price descending and name sorts existed. Price sorting and filtering use valid sale prices where applicable.
- Listing/search uses 30 records per page, filters visibility/audience/category first and groups product families before pagination. A family representative is an available low-price option; strengths remain separate by existing family policy.
- Full-result search was escaped, case-insensitive literal text in name/description, not a full-text or fuzzy engine.
- Autocomplete is a separate indexed path: normalized token scoring, prefix matching and limited edit-distance tolerance over an up-to-120-candidate search-term index. Its maintenance/freshness matters. It is not the full-result search engine.
- Homepage combines offers, staff-featured products, themed collections and the default list. It prioritizes available products/images, deduplicates shelves and gives categories a small editorial ordering. No sales-based best-seller or individual preference model was found in these paths.

## Shipped changes

1. Desktop main nav promotes category mega-menu, everyday care, offers, brands and guides. The mobile Shop tab already opens categories. Broad homepage discovery/empty-state links lead to categories or the relevant collection. Footer prioritizes categories, offers and brands.
2. Category hub exposes real category tiles first, followed by four existing collections (skin, family, daily care, under AED50), offers and brands. Full catalogue stays a secondary link; /products, existing product URLs, filtered URLs, pagination and sitemap behaviour are preserved.
3. Sort is directly above listing results, not buried in the filter form. Native selection submits and retains query/category/availability/price bounds while resetting the page. A non-JavaScript submit fallback is supplied.
4. Mobile filters start collapsed. Desktop retains the existing expanded presentation. Applied filters are visible, removable chips; sort persists when removing a chip. All-category navigation remains reachable beyond the short category rail.
5. Default retail ranking is deterministic:
   - On search: exact name/barcode/GTIN/public SKU, then name prefix, name substring, brand, description-only match.
   - Within match tier: available first, staff-featured first, photo-reference presence first, then name and ID.
   - On browse: availability, staff-featured, photo-reference presence, name and ID.
   - Stock quantity above zero is not a popularity signal. Explicit price/name sorting overrides default merchandising. Existing staff ordering is retained.
6. Full-result literal matching now includes brand/barcode/GTIN/public SKU as well as name/description. User regex syntax is escaped. Legacy malformed ranking fields are converted safely. No medical substitutes or diagnosis-based recommendations are inferred.

Availability-first is within the search relevance tier: an exact out-of-stock product may precede a weaker in-stock match. It remains visibly unavailable under existing card/purchase rules. This avoids presenting a different medicine as if it were the exact search result.

## UX reasoning and sources

- Hick-Hyman: reduce competing next actions through meaningful groups, not arbitrary catalogue deletion. It does not establish that most pharmacy customers search, or guarantee conversion lift.
  https://assets.interaction-design.org/literature/article/the-hick-hyman-law-an-argument-against-complexity-in-user-interface-design
- Recognition over recall: visible categories and collections let shoppers recognise options without memorising product names.
  https://www.nngroup.com/articles/recognition-and-recall/
- Progressive disclosure: secondary filters are collapsed on phones while sorting and applied state stay visible. Native controls, touch targets, keyboard focus and contextual removal preserve control and predictability.
- Category navigation and product lists are complementary: browsing, search and contextual lists all matter.
  https://baymard.com/research/homepage-and-category-usability
  https://baymard.com/research-articles/main-navigation-product-categories
  https://baymard.com/learn/ecommerce-category-page
- Competitor evidence: Life exposes a category index; myAster exposes a category explorer and filtered category listings. This supports category-first discovery, not a claim that neither has any full-catalogue route.
  https://www.lifepharmacy.com/categories
  https://www.myaster.com/en/online-pharmacy/categoryexplorer
  https://www.myaster.com/en/online-pharmacy/c/2077

## Verification

- Isolated Next production build, API TypeScript and scoped ESLint passed.
- Seven real, disposable MongoDB catalogue integration tests passed, including visibility, catalogue mutation/inventory regressions, family grouping and new relevance/sort regression.
- Ten Playwright tests passed: category paths, live sorting with preserved query, removable filters, search/keyboard interaction, mobile/desktop navigation, axe audits, Arabic RTL and delivery persistence.
- Desktop and phone screenshots under outputs/catalog-discovery-2026-10-25/. No page errors or horizontal overflow in the visual pass. Local demo content is synthetic.
- New ranking regression is included in the standard disposable integration runner.

## Limits and next measurement

This is a deterministic merchandising improvement, not personalised AI or proof of higher sales. No fake best-seller counts, reviews, urgency or discounts were introduced. Product metadata/category coverage still determine collection quality. Photo presence is a reference-presence signal, not a new image verification decision.

Literal matching remains bounded by the existing query timeout and pagination; it is not a scalable search index redesign. Full-result typo/synonym support should use a deliberately managed search index, evaluated on real queries; medicine strengths/formulations must not be conflated. Autocomplete index freshness should be monitored.

Measure consent-respecting search usage, zero-result rate, category/collection-to-product clicks, add-to-cart rate and checkout completion before choosing sales-derived ranking or more navigation changes. Do not label a shelf best sellers without verified fulfilled-sales data. No claim that search is the dominant Al Mina journey is supported yet.

Rollback: revert the scoped UI edits and listing-rank invocation; there is no data migration or schema change.
