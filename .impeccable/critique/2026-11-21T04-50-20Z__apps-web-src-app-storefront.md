---
target: Al Mina storefront across home, PDP, cart, checkout, categories and supporting routes
total_score: 27
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
target_identity: "file:/Users/administrator/Nabeel/dev/almina-storefront-p3/apps/web/src/app/(storefront)"
timestamp: 2026-11-21T04-50-20Z
slug: apps-web-src-app-storefront
---
# Al Mina storefront critique — 21 November 2026

Two independent assessments reviewed the local working tree. The design assessment scored 27/40 (Acceptable). The automated scan returned zero primary findings and 28 advisories. The storefront has a recognizable pharmacy identity through location, pack sizes, availability and AED pricing. Its category imagery and purchase emphasis vary too much across pages.

## Priorities

1. **P1 · Mobile checkout** — Put a compact total and delivery summary above the payment options, with the full breakdown one tap away. The fixed order action is visible before the complete cost breakdown at 390px, and the address form has a long scroll underneath its fixed bar. Verify focus clearance while tabbing and using the on-screen keyboard. Reconcile the checkout field-radius assertion with the approved token. The fixture reached a quoted review and verified the 48px field height, then stopped at the old 10px expectation because the field renders at 12px.
2. **P1 · Homepage** — Bring a useful product interaction higher. At 390×844, the hero, its controls and the category section leave room for only the tops of the first product cards above the dock. At 1440×844, the category strip uses part of its row and the first product prices sit below the fold. Reduce title/campaign height or tighten the transition from categories to the shelf. Keep the visible search and delivery controls.
3. **P1 · Product detail** — Place explicit delivery-area context with stock and price. The phone dock repeats the price while the delivery row sits farther down, and the desktop delivery row sits below Add to cart and Save. Make the selected area or prompt clear near the buy action. Keep gallery scale appropriate for the available images and provide verified pack and usage facts when available. The sampled cleanser has no supplied description.
4. **P2 · Categories, catalogue and search** — Five of six category tiles show the same grid icon on /categories while home uses distinct symbols. Share the category artwork mapping and use the available desktop row more evenly. Make Filter and Sort read as a pair, and reduce the visual jump between studio product photos and handheld photos. The two-column phone results already make prices and quick-add easy to find.
5. **P2 · Cart, Offers, Account and Checkout recovery** — The disabled cart shows an ordering-information dock, repeated Continue shopping, and an ordering-unavailable notice. Unavailable checkout repeats the notice across panels. Account error offers guest checkout even with ordering disabled in the preview. Give each state a single actionable recovery. Group the category alternatives with the empty Offers panel to avoid a disconnected rail.

## Heuristic scores

| Heuristic | Score |
|---|---:|
| Visibility of system status | 3 |
| Match to the real world | 3 |
| User control and freedom | 3 |
| Consistency and standards | 2 |
| Error prevention | 3 |
| Recognition over recall | 2 |
| Flexibility and efficiency | 3 |
| Aesthetic and minimalist design | 2 |
| Error recovery | 3 |
| Help and documentation | 3 |

## Shopper impact

A repeat buyer can search, compare pack prices and add quickly from results, but has to scroll farther from the homepage. A delivery-sensitive shopper can choose an area, but its significance is easier to miss on a product page than during checkout. An Arabic shopper gets mirrored layout and controls at phone width, with localized metadata around catalogue names.

The strongest moment was the explicit add-to-cart confirmation. The weak point is the transition from an estimated subtotal to the final quote, especially on a phone.

## Detector and browser notes

Of the 28 detector advisories, 26 were type-scale candidates, one was an inline shadow color, and one misread radius arithmetic. Consolidate font sizes only when they represent the same role. The browser review used 390px and 1440px, added an item locally, and verified the enabled checkout quote with a disposable fixture. The 4880 preview explicitly disables ordering and shows an account recovery state. No production payment, account authentication, or fulfillment was tested.
