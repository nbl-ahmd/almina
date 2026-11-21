# Storefront reference-02 rebuild and product-card correction

15 November 2026. Branch: `codex/storefront-pharmacy-app-reference`. Local candidate; owner visual acceptance pending. No deployment or production data access.

## Scope and precedence

The owner rejected the prior `9d2d39b` composition and pinned `02-pharmacy-app.png`, requesting an actual ad banner and Impeccable analysis/fixes. A subsequent close-up reference now controls product-card anatomy. Earlier 03-category geometry and the category-first/packshot-campaign guide are superseded. Product/architecture/accessibility/commerce safeguards remain active.

## Implementation

- Home follows search → photographic courier campaign → circular category imagery → image-led product rail. Removed the dark browse aside. Mobile rail continues into tablet with 240px cards at 768–1023px; desktop uses four columns.
- Added generated transparent courier artwork and six generic category still lifes, with exact prompts embedded and saved under `docs/design/storefront/campaigns`. They are illustrations, not actual staff, inventory or delivery claims. Live translated campaign copy and catalogue CTA sit in HTML. Existing managed campaigns/banners remain reachable.
- Rebuilt PDP around an unframed gallery and identity/price/options/quantity/action. Mobile toolbar provides real back/search/save/cart controls; persistent buying dock replaces competing global navigation. Related products become compact rows. Actual summary/delivery/policy/SKU/detail/review content remains after the buying sequence.
- Latest card correction adds fine borders, white wishlist circles, factual brand/pack chips, semibold names, stronger symbol prices and a rounded-square coral quick add. Exact repeated brand/trailing pack text moves out of visible title into adjacent chips; full names remain accessible. Literal sizes can be copied from existing names, never invented. Unknown ratings are omitted; no per-card review requests were added.
- Compact add controls display actual local basket quantity, synchronize existing cart/storage events and survive reload. The existing server stock-check path runs on every addition. Pending/error states remain; rejected adds do not increment the count. Success does not change card height. No cart calculation, API, pricing, inventory or checkout authority changed.
- `CurrencyAmount` uses an inline monochrome dirham SVG and locale-formatted digits, with an accessible full currency label and LTR symbol/number run in either locale. Internal money, structured data and ISO currency remain unchanged. Symbol structure/placement follows [UAE design-system guidance](https://designsystem.gov.ae/docs/patterns/currency-symbol); the SVG is a local vector implementation, not a downloaded official SVG file.
- Replaced active DESIGN.md and scoped sidecar with documentation extracted from current source, and synchronized PRODUCT, brief, reference analysis, decision register, screen directions and project styling bindings. Prior documents remain historical where marked superseded; they cannot restore the rejected layout.

## Verification

Evidence lives in ignored `.verification-results/pharmacy-app-reference/` and `.verification-results/product-card-polish/`.

- Typecheck and lint passed; isolated database-disabled foundation production build passed after final card source changes.
- 33 focused storefront/i18n/stylesheet/product-family/search unit tests passed for the reference rebuild.
- Initial 57-case compiled regression run: 52 passed; five assertions expected the retired menu/PDP navigation. Updated those assertions to exercise menu/focus and real PDP toolbar actions. Corrected 19-case subset passed; unchanged remaining 38 cases had passed, including admin, checkout/location and controls. No behavioral commerce assertion was removed.
- After the latest card changes, 17 existing storefront/filter/control cases passed. New basket-count test initially selected the saving amount instead of current price; selector corrected to the final price row. The new regression passed: current amount/currency semantics, count1–4, stable height after each success, stock-limit rejection, reload, accessible count and cart quantity.
- Reference rebuild: 42 bilingual route/viewport cases, no page overflow, broken media or browser errors; six core axe scans had zero violations. Eight intermediate navigation cases plus cart persistence/dock checks passed. Four English/Arabic tablet checks confirmed 240px cards and single-line prices at768/990px.
- Latest card phase: eight listing cases at360/390/768/1440px across English/Arabic had no overflow, browser errors or axe violations. Four final core confirmations also had zero violations; real-reference preview confirms restored basket count and stable card height. This does not certify every assistive technology or native Arabic copy.
- Next runtime reported no compilation issues and no configuration/session errors. Agent-browser checked live navigation/React view during rebuild. Browser preview remains available on loopback4860 with visibly sample stock/prices.
- Impeccable detector: zero anti-pattern failures. Advisory notes concern documented role-specific type/shape values and retained checkout-local colors/geometry; no broad checkout restyle was performed to silence them.
- Generated-raster provenance scan: two rasters, zero missing prompt records.
- Shared globals/UI package, admin and wholesale source remain unchanged. Admin runtime regression cases passed in the compiled suite.

## Review and limits

[Independent reference-02 review](../design/storefront/pharmacy-app-reference/finish-review.md) records `ship` after the tablet correction, with no material visual fixes remaining. It is a file-based review of supplied captures/source, not independent runtime repetition or owner approval. It predates the latest card close-up request; those subsequent changes have targeted browser/accessibility/commerce verification above. The reviewer wrote the report before its terminal notification hit an account usage limit; a separate fresh post-card review/documenter handoff was unavailable, so the main agent documented current source directly rather than claiming an additional review.

Existing actual pack-photo quality varies; a poor Bioderma fixture photo was not replaced with a fabricated product image. Sample stock/prices, small catalogue coverage, unverified operational promises and native Arabic/pharmacy review remain explicit limits. Checkout-local retained styles are compatibility implementation; admin/wholesale systems remain independent. Future references belong under `docs/design/storefront/references`; update decisions and the current DESIGN.md after owner revisions. No deployment.

## Follow-up — compact card spacing

Owner requested tighter, polished cards. Scoped CSS now uses10px card padding,156px desktop/120px mobile media areas, smaller chip padding and controlled title/purchase gaps. Titles retain full wrapping, prices remain strong, and wishlist/add controls retain44px targets. Updated DESIGN.md's observed measurements; no behavior or token palette changed.

Verification for this follow-up:16 home/listing cases at360/390/768/1440px in English/Arabic, with no overflow or browser errors; four listing axe scans with zero violations; three existing stylesheet-policy tests passed; Next compilation issues empty. Live add/reload/cart and stable-height checks passed, including keyboard-visible focus. Evidence: `.verification-results/card-spacing/`. The initial focus probe followed a pointer click (where focus-visible is intentionally absent); the corrected keyboard navigation check passed. Prior broad suite outcomes above are historical and were not re-run for this CSS-only polish. No deployment.
