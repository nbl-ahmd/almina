> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Storefront fidelity to supplied PNG references — 2026-10-14

The owner rejected the earlier interpretation and supplied eight desktop/mobile
PNG screenshots as the visual target. This pass follows their actual navigation,
section order, border treatment, density, gallery geometry and subsection layout.
It supersedes the earlier large-radius, elevated-card interpretation.

## Reference mapping

| Surface | Reference files | Implementation |
| --- | --- | --- |
| Home | Homepage & Hero (RAK, UAE); Mobile Homepage & Dispensary (RAK) | Compact header/category strip, discovery hero with blue bordered media/note panel, pale-blue featured band, category rail, offer treatment and pharmacy support panel; mobile quick actions, pharmacy notice, offer card, category rail and product cards. |
| Catalog | Products Catalog & Filters (RAK, UAE); Mobile Products Catalog & Filters | Breadcrumb/title/location treatment, white filter sidebar, thin blue dividers and three desktop product columns; mobile compact header/title, category chips, filter disclosure and square-media two-column cards. |
| Product | Product Detail Page (PDP) (RAK, UAE); Mobile Product Detail Page (PDP) | Desktop 6:5 media panel/mobile square media, selectable thumbnails/dots and photo navigation, identity/description, actual sale price/saving, one-time purchase panel, delivery enquiry panel, contact/cart actions, product-information subsections, support sidebar and real related-category products. |
| Cart | Shopping Cart & Order Summary (RAK, UAE); Mobile Cart & Order Summary (RAK) | Compact saved-cart notice, separated item rows/cards, thumbnail/title/availability/quantity/unit price, remove action, order-review subsections, actual catalog recommendations, summary aside and mobile checkout bar above bottom navigation. |

The originals remain in the owner's Downloads directory. No reference product
image, sample customer/doctor identity or fabricated commerce information is
imported into the application.

## Fidelity choices and supported content

- Pale-blue page/subtle surfaces, thin blue borders, 8px controls and 10–12px
  cards replace the earlier neutral page, pastel quick cards and 24px card radius.
- Desktop primary navigation is integrated into the header; home category links
  form the secondary strip. The desktop search field is compact and the mobile
  home search stays prominent. Product detail and catalog use focused mobile
  header compositions. All links lead to supported routes.
- Heroicons and the approved optimized Plus Jakarta Sans family remain. The
  screenshots are not perfectly uniform (the desktop cart differs from the
  other seven); the majority blue/coral visual language is applied consistently.
- Coral #ca3344 is used for white-text actions so small labels retain readable
  contrast. Reference-only bright colors do not override accessibility checks.
- Unsupported insurance, prescription upload, subscriptions/auto-refill,
  customer reviews/ratings, wishlist, profile, medical certifications, staff
  portraits, licence numbers, cold-chain/dispatch promises, vouchers and free
  shipping progress are omitted. Their applicable layout regions use actual
  shopping, category, contact, order-review and delivery-enquiry content.
- Product descriptions, prices, stock, category labels, banners, contact details
  and media remain application-owned. Percentage savings are presentation of an
  actual active catalog sale; checkout still calculates authoritative amounts.
- Cart shows server-loaded unit prices, never a fabricated client subtotal or
  final quote. Delivery/VAT/final total continue to be reviewed at checkout.
- Cart recommendations read existing featured products and fail independently
  of cart loading; a catalog outage does not replace the existing cart recovery
  path. Product-ID/quantity storage and stock/race validation are unchanged.

## Implementation boundaries

Component styling remains Tailwind-based with the existing small token/browser-
exception stylesheet. No additional UI library, global reset, provider, database
change, integration replacement or production deployment is introduced.

`apps/web/DESIGN.md` now records the supplied screenshots as visual authority.
The metadata/canonical/JSON-LD and redirect logic are preserved. Existing admin
styles and its font behavior remain separate.

## Verification

Evidence is under `/tmp/almina-reference-verification` for the compiled app,
including responsive screenshots and the final verification report. Initial
desktop/mobile visual inspection covered all four primary surfaces. The batch
correction fixed a mobile PDP header grid slot, gallery aspect ratio, navigation
text colors, compact spacing, footer contrast, the tablet featured-band gutter
and the saved-cart badge layout. Photo selection retains its
keyboard focus indication.

The isolated production build and focused lint/typecheck pass. The 21 catalog,
SEO, commerce and policy unit regressions pass. The full storefront/checkout
browser suite passes all 29 cases. All 54 route/viewport checks pass at
360, 390, 768, 1024, 1280 and 1440px, with no overflow, broken visible images
or axe violations. The responsive verifier
also checks search/filter/clear, gallery, stock-disabled controls, skip/focus,
200% text, reduced motion, loading/empty/error recovery and direct reload.
Final visual review identified a four-column grid inside the two-item cart
recommendation panel; it now uses two desktop columns. A focused six-width
cart audit and fresh production build verify that final scoped correction.
Next runtime diagnostics report no config/session errors.

Impeccable's detector was run once over the changed targets and reports no
findings in `/tmp/almina-reference-design-scan.json`. It does not prove visual
equivalence; rendered screenshots were inspected against the supplied references.

All verification uses synthetic local fixtures/disposable test databases.
Different real catalog names, image proportions and content lengths naturally
change wrapping and page height, so literal image pixel equivalence is not
claimed. Hosted verification with actual production media remains acceptance.
