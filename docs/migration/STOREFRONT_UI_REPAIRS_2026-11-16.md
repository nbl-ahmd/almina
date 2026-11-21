# Storefront UI repairs — 16 November 2026

Owner authorized fixing all verified findings from the dual-agent storefront review and conflicting style definitions. Branch: `codex/storefront-pharmacy-app-reference`. No deployment or production-data changes.

## Result

Customer controls now have one scoped styling owner in `storefront-controls.css`; cart composition lives in `storefront-cart.css`. Removed competing component utilities/page overrides for search, text cart, compact wishlist and quantity controls. Explicit shared Button variants preserve secondary/ghost actions and independent admin styling. Updated active guide, sidecar and agent instructions to preserve this ownership.

Restored a fixed mobile cart action above bottom navigation and one desktop summary action. Clarified quantity/distinct-product counts, catalogue line estimates and merchandise subtotal. Estimates use server-loaded prices and safe integer minor units; unknown values remain unavailable. These are display estimates, not checkout quotes. Existing checkout pricing, tax, stock, idempotency, payment and authorization contracts remain authoritative and unchanged.

Unified displayed dirham amounts, expanded mobile search suggestions, corrected control geometry/touch targets, improved stock/chip readability, removed redundant pack text and empty-result explanations, filtered basket recommendations, clarified unavailable checkout/review states, and condensed mobile secondary navigation/footer groups. Desktop links remain visible.

Full finding-by-finding disposition: [repair register](../design/storefront/UI_REPAIR_REGISTER_2026-11-16.md).

## Verification

- Workspace typecheck, lint and isolated production foundation build passed.
- 32 focused unit tests passed, including integer estimates and unknown/unsafe price handling.
- 29 checkout/UI regression cases passed after correcting inherited text-button contrast: 24 enabled-checkout scenarios and 5 new bilingual/responsive UI cases.
- Final compiled regression run: 40 passed across storefront, navigation/menu, responsive layout, shared controls, new UI cases and Stripe flows. These runs overlap; they are not 69 unique tests.
- Browser matrix: 48 English/Arabic route/viewport combinations at 320, 390, 900 and 1440 pixels; no horizontal overflow or page errors. 24 accessibility scans reported no violations.
- Final focused browser pass: 12 English/Arabic home/cart/PDP views at 390/1440; no overflow or accessibility violations. Reviewed rendered desktop home and phone cart captures.
- Local Next runtime diagnostics: no compilation, configuration or session errors. Scoped Impeccable detector returned no findings. No new independent design score claimed.
- Existing commerce tests cover server price authority, stock limits, persistence, quote changes, retries and payment-state recovery. New UI tests verify forged stored price hints cannot change server-derived merchandise estimates.

Ignored local evidence lives in `.verification-results/ui-repairs/`. Admin/shared Button source, wholesale, APIs, production data, integrations and routes were not redesigned or deployed.

## Remaining source-content inputs

The reference fixture deliberately lacks reviewed descriptions, and its verified exact-pack photos vary in quality. In particular PD0826 has a handheld background. No verified alternative exact-pack source was available. Real supplied descriptions/summaries and honest contact fallback remain; no medical text, reviews, product images or claims were invented. See the repair register for the content boundary.
