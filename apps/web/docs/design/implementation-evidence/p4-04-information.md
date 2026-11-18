# P4-04 — Product information before alternatives

18 November 2026 · `codex/storefront-pharmacy-app-reference` · starting point `ce1a0b7`

[Phase plan](../implementation-phases.md) · [Coverage C35 and C57](../implementation-coverage.md) · [Accepted screen directions](../screen-directions.md)

## Implementation

- The product summary and description lead the information area. Existing warnings are open by default, with native disclosures for supplied directions, materials and storage. The copy stays in its source language and imported markup displays as plain text.
- Specifications, pharmacy contact, delivery and returns, and customer reviews come before similar products. Product ID appears once in the specifications. Pack extraction shares the same rule as the card and preserves concentration text such as `500mg / 5 ml`. The help and policy links use the existing phone number and destinations.
- A product without a summary or description says the description is unavailable and shows the facts that exist. Empty fields and empty disclosures take no space. On a wide screen the sparse state groups specifications, help and policies across one row.
- Reviews distinguish published, empty and unavailable states. The form uses its existing verified-purchase and sign-in flow, and reports submission status. Prices, stock, gallery, product options, structured data and policy facts retain their existing sources.

## Captures

- Complete synthetic record at 390px [English](p4-04-information/complete-en-390.png) · [Arabic](p4-04-information/complete-ar-390.png)
- Complete synthetic record at 1440px [English](p4-04-information/complete-en-1440.png) · [Arabic](p4-04-information/complete-ar-1440.png)
- Sparse reference record at 390px [English](p4-04-information/sparse-en-390.png) · [Arabic](p4-04-information/sparse-ar-390.png)
- Sparse reference record at 1440px [English](p4-04-information/sparse-en-1440.png) · [Arabic](p4-04-information/sparse-ar-1440.png)

The complete record and its review are labelled local fixtures. The sparse reference preview intentionally lacks descriptions. Neither fixture establishes production catalogue completeness. The [viewport matrix](p4-04-information/viewport-matrix.json) covers both states from 320px to 1440px and short landscape, in English and Arabic in Chromium and WebKit.

## Verification

The isolated production build, typecheck, lint, 28 unit checks, 39 Chromium regressions, the focused Arabic flow and 18 WebKit checks passed. The 40 viewport cases recorded no horizontal page overflow. Four scoped axe scans with the review form open reported no violations. Live Next.js diagnostics were clean. Native device and assistive-technology checks remain open.

Browser checks include reading order, keyboard disclosures, real contact and policy links, legacy plain-text descriptions, published/empty/unavailable review states, native form validation and the sign-in response. The review request was intercepted on the local page before submission. No production data or provider access and no deployment.
