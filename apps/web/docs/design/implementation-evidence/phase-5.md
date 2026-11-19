# Phase 5 customer journey and shared-route verification

Verified on `codex/storefront-pharmacy-app-reference` on 19 November 2026. P5-05 starts from `b74b46d` and uses an isolated production build with disposable loopback catalogue, commerce and payment fixtures.

| Task | Evidence |
| --- | --- |
| P5-01 | [Cart quantities, estimates, disabled/checkout continuation and responsive dock](p5-01-cart.md) |
| P5-02 | [English and Arabic checkout details, review, disabled state and results](p5-02-checkout.md) |
| P5-03 | [Quote, stock, order, retry, payment and auth regressions](p5-03-commerce.md) |
| P5-04 | [R01–R18 route disposition, account, saved items and information routes](p5-04-information.md) |
| P5-05 | [Category directory phone](p5-05-exit/ar-categories-390.png), [desktop](p5-05-exit/en-categories-1440.png), [live viewport matrix](p5-05-exit/matrix.json) |

## P5-05 scope

- Retail navigation and forms were exercised in English and Arabic, including keyboard search, delivery-area selection, saved-product error and retry, account code entry, checkout validation and cart/reload. Local review and payment tests preserve the P5-03 server contracts and published feature gates.
- Same-tab tests traverse retail account, wholesale, contact and staff sign-in. They verify retail scope is reapplied on return, wholesale stays invite-only and noindex, and private staff routes keep their distinct shell. Dedicated staff and wholesale tests cover credential, access, approval and transaction behavior using synthetic accounts.
- The broader assertions recorded in P5-04 now follow the current interface. The delivery-area check starts from a browsing route, the carousel tests activate a seeded promotion, the empty cart assertion uses the accepted heading, and the retained worker assertion checks the existing notifications destination.
- Category tiles now own their media, fallback and label styles. The homepage and the two category directories are the active consumers and supply their existing placement dimensions. The unused default and rail layouts in the directory component and the old mobile cart padding override were removed. Shared navigation, root recovery, wholesale, admin and product-detail fallback rules retain their active compatibility owners. P6-01 covers their wider retirement review.

## Executed checks

The isolated Next.js 16.4.2 build, lint and web typecheck passed. The 83-case Chromium suite passed, including all nine previously failing cases from P5-04. Nineteen WebKit cases passed across the scoped suite and targeted keyboard rerun. The 49 unit checks passed when run after browser teardown so the fixture ownership test could bind its reserved port.

The live matrix measured 100 configurations across the home, category directory, cart, contact and wholesale routes in Chromium and WebKit. It covered both locales, 320px to 1440px and short landscape. The matrix found no document-width overflow and both scoped category axe scans returned zero violations. Next reported no compilation or session errors. Same-tab boundary and reload checks use the isolated browser suite.

The navigation assertions use Option+Tab for macOS WebKit and await the fixture’s guest saved-state lookup before reload or leaving the page. An optional Firefox run could not launch because the local Playwright Firefox binary was unavailable. Broader browser and physical-device acceptance remains in P6-02.

## Exit

Phase 5 verifies the local customer journey and shared transitions. Remaining release evidence includes physical devices, native software keyboards, assistive technologies, native language review, live provider readiness and the independent final review. No deployment, production data or live provider operation occurred.
