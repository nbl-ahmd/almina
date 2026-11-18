# Phase 4 storefront catalogue and product detail

Verified locally on `codex/storefront-pharmacy-app-reference` on 18 November 2026. P4-05 starts from `5088b98`.

| Task | Evidence |
| --- | --- |
| P4-01 | [Listing, search, filters and recovery](p4-01-listing.md) |
| P4-02 | [Standard and compact cards, rails and exact SKU pricing](p4-02-cards.md) |
| P4-03 | [Image-first product page, gallery, options and purchase dock](p4-03-detail.md) |
| P4-04 | [Product facts, help, reviews and alternatives](p4-04-information.md) |
| P4-05 | [English phone return](p4-05-return/en-returned-390.png), [Arabic phone return](p4-05-return/ar-returned-390.png), [English desktop product](p4-05-return/en-desktop-return.png), [Arabic desktop product](p4-05-return/ar-desktop-return.png), [browser measurements](p4-05-return/matrix.json) |

## Return to the originating results

Opening a supported product link from search, catalogue, category or a browse rail records the actual source URL, scroll position and link in the current document. The phone gallery's localized Back control and desktop Back to results link use native history to restore that source, including the query, filters, sort, page and keyboard focus. Product variant links keep regular browser Back and Forward behavior. The product-page control can return across consecutive variant entries to the original source. If the original product link has disappeared, focus returns to the main content.

Context applies to the latest eight recorded journeys within the current document. A direct product visit, new tab, full reload or product link without tracked browse context uses the product's category as the phone fallback and keeps desktop breadcrumbs. Product URLs, canonical metadata and shareable listing URLs are unchanged. Return destinations come from the actual same-origin navigation history and are never read from URL parameters.

## Verification

- The isolated Next.js 16.4.2 production build, web typecheck, repository lint and 49 unit tests passed. Unit coverage included search/provider behavior, product family/pricing, SEO, image delivery, saved account and stylesheet policy.
- The browser regression suites passed 76 Chromium cases and 36 WebKit cases. Together they covered listing, filtering, search, catalogue discovery, product variants, cards, product details, reviews, recovery, responsiveness, shell and cart. The run omitted the existing order-submission test to keep this checkpoint within browsing and cart scope.
- New browser tests exercise exact filtered EN and AR returns, resize during a visit, native Back and Forward across variants, direct-entry and reload fallback, and the filtered-search path through save, quantity selection, add to cart and cart reload.
- The running local fixture completed 12 return cycles across Chromium and WebKit in English and Arabic. Each restored the exact scroll position and focused SKU link. No page exceptions occurred. Unauthenticated saved and unavailable reminder-options requests returned the existing fixture 404 responses. Next's development diagnostics reported no compilation, configuration or session errors.
- Across those browsers and locales, 24 product viewport measurements from 320px to 1440px had no document-level horizontal overflow. The dock stayed fixed for portrait phones and in flow at 667×375 and for the larger sizes tested. Listing and product passed the 200% CSS zoom reflow check in all four browser/locale combinations. Both scoped Chromium axe scans returned zero violations in the tested product state.
- Fixture SKU PD1205 used the original 700px exact-pack WebP with HTTP 200 at every sampled width. Its displayed width ranged from 320px to 667px in the sampled layouts. SEO and image-delivery unit checks cover canonical and structured-data contracts and delivery URL selection. The local image served directly from the fixture and does not establish production CDN performance.
- The offline search-provider benchmark passed 23 seeded cases. Its MRR and nDCG scores of 1 reflect fixture ordering. Representative live relevance, Arabic matching and provider latency remain open under O06.

## Phase exit and remaining work

Phase 4 is verified for the local storefront. The listing and product pages preserve product identity, route compatibility, the approved gallery and buying layout, server-checked stock and pricing, and recovery states. P5-01 covers the cart.

PD0826 retains its handheld image because the [exact-pack media register](../../../../../docs/design/storefront/UI_REPAIR_REGISTER_2026-11-16.md) has no verified replacement for that SKU. Sparse fixture copy is documented in P4-04. Production catalogue completeness and image suitability remain open. The longer-session Arabic loading stall tracked as NEW-006 did not reproduce in these bounded checks. Physical devices, assistive technology, live providers and release verification remain open.

Keep compatibility CSS used by checkout, wholesale, the root fallback and shared/admin consumers until their usage has been migrated or verified. P4-02 and P4-04 record the safe card and product-information rule removals. P6 owns wider retirement. No deployment, provider access or production data operations occurred.
