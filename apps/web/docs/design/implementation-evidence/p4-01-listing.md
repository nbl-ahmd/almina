# P4-01 — Public listing and search

18 November 2026 · `codex/storefront-pharmacy-app-reference` · starting point `0f83855`

[Phase plan](../implementation-phases.md) · [Coverage C19 and C28–C29](../implementation-coverage.md) · [Accepted screen directions](../screen-directions.md)

## Implementation

- Applied the existing Figtree/Alexandria, near-white canvas and control roles to the public catalogue, category listing, offers and search. Removed the old listing-specific theme and grid overrides. Brand detail and curated collection pages use separate components. Their existing shared product-card dependencies carry forward to P4-02.
- Replaced the decorative listing intro with a breadcrumb, concise heading and count for the current page. Mobile keeps Filter beside Sort, opens one native disclosure in place and shows two product columns. Tablet uses three columns from 600px. Desktop opens the same filter form as a left rail from 1024px. Applied filters share the sort row and the results use three columns, then four from 1280px.
- Retained native GET forms and links, search correction and literal mode, category and advanced facets, sort, visible price bounds, stock filter and known query parameters. Clearing filters preserves the search term and sort. Clearing search separately removes the term and literal mode. Both reset to the first page. A single-page result has no paginator. The legacy catalogue API infers a next page from a full batch, so an empty following page offers Previous page.
- Loading, no matches, no current offers, a partial result and service failure have distinct feedback. Exact identifier matches remain available during a partial outage, with a retry for the same query. Stock and availability continue to come from the existing card data. Category guidance stays below the results; its existing English body and FAQs are identified as English in Arabic mode.

## Live fixture review

- Search at 390px [English](p4-01-listing/en-search-390.png) · [Arabic](p4-01-listing/ar-search-390.png)
- Search at 1440px [English](p4-01-listing/en-search-1440.png) · [Arabic](p4-01-listing/ar-search-1440.png)
- [Arabic filters open at 390px](p4-01-listing/ar-filters-390.png) · [English catalogue at 390px](p4-01-listing/en-products-390.png)
- [32-case viewport matrix](p4-01-listing/viewport-matrix.json). The same search page was resized from 320px through 1440px in English and Arabic in Chromium and WebKit, including 667×375. No document overflow. The grid began at y342/y373 in English/Arabic at 390px and y293/y301 at 1440px, including the fixture notice. Sort kept the 10px control radius. The local fixture lacks the guest saved-products endpoint and returned the recorded 404 for that request. No catalogue requests failed in this resize matrix.

## Verification and boundaries

- The isolated production build, workspace typecheck, repository lint, 46 focused unit checks, 53 compiled Chromium regressions and 22 compiled WebKit regressions passed. The regressions cover search, catalogue redirects, SEO noindex, filters, query reload, pagination, shell, home, cart presentation, admin search and keyboard behavior.
- Live Next.js compilation and runtime diagnostics were clean. One initial WebKit run found an open phone filter could close when client scripts arrived. Fixed the initial disclosure sync and added a test that holds the scripts until the filter has been opened.
- Scoped axe checks on the English and Arabic search results at 320px and 1440px reported zero violations under the tested WCAG A/AA rules. Native devices, screen readers and Arabic language review remain open.
- Search relevance and Arabic matching still need representative catalogue evaluation. Fixture product media includes an existing handheld image. P4-02 owns card anatomy and exact-pack media treatment. Product routes, search algorithms and server commerce contracts retain their existing behavior. No deployment or production service access.
