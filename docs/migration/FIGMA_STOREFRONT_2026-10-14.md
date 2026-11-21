> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Full storefront redesign from Figma — 2026-10-14

This replaces the initial visual refresh recorded in
[STITCH_STOREFRONT_2026-10-14.md](STITCH_STOREFRONT_2026-10-14.md).
The owner rejected retaining the previous page/component structure and requested
a complete desktop/mobile redesign from the imported Figma screens.

## Design source

Connected Figma file: [llmDMdaminn2wcCIAZQ9U7](https://www.figma.com/design/llmDMdaminn2wcCIAZQ9U7/Untitled).
High-fidelity design context and screenshots were read for all eight frames:

| Screen | Desktop | Mobile |
| --- | --- | --- |
| Homepage | `1:1926` | `1:2` |
| Catalog | `1:1300` | `1:308` |
| Product detail | `1:2549` | `1:666` |
| Cart | `1:3112` | `1:920` |

## Implementation

- Rebuilt the header and navigation: compact brand/location/search/actions,
  mobile location bar and search, five supported bottom destinations, real saved
  cart count and compact footer.
- Rebuilt the homepage composition: desktop image/search hero; a separate mobile
  quick-action bento and promotional treatment; compact featured cards; horizontal
  mobile categories; offers and pharmacy contact sections.
- Rebuilt product cards with badges, landscape media, smaller metadata and
  mobile icon purchase actions. Product names remain fully readable rather than
  being cut off. Desktop actions remain labeled.
- Rebuilt catalog navigation and filters: actual category chips/links, desktop
  sidebar and a native mobile disclosure. Search remains expanded after clearing
  filters on the search route. Existing GET parameters/pagination are preserved.
- Rebuilt product details: landscape desktop gallery, native image selection,
  identity and price panel, bounded quantity stepper, a single mobile purchase
  bar with a focused back/brand/cart header, description/information disclosures
  and contact section. Mobile product detail uses its dedicated purchase bar in
  place of the general bottom navigation; the header cart remains accessible.
- Rebuilt cart rows and summary: desktop list/aside and individual mobile cards,
  saved quantities and existing stock checks. The summary does not fabricate a
  quote: delivery, VAT and final total are still reviewed at checkout.

The stylesheet is scoped to `.storefront-shell`, including its generic classes,
to prevent cross-route CSS from changing administration. Server pages and data
reads remain server-side; the new cart badge is a small client component. No new
dependencies were introduced. Next.js 16.3.8 bundled CSS/image/font documentation
was reviewed; the existing self-hosted Plus Jakarta Sans is retained.

## Content and assets

All products, categories, prices, stock, descriptions and promotional banners are
read through the existing catalog. Existing contacts and public identifiers/URLs
remain intact. Unsupported sample features were omitted or adapted to supported
navigation: prescriptions, insurance billing, subscriptions, reviews, clinical
claims, license numbers, cold-chain services, free-delivery thresholds, promo
codes and fixed dispatch promises are not introduced.

Figma hero artwork and the original icon exports remain retained locally under
`apps/web/public/design/figma`; no temporary Figma URL is used at runtime. The
hero is decorative, never treated as a catalog product. Dynamic catalog imagery
and the matching existing Al Mina logo are preserved. The later visual-language
refinement replaces runtime icon images with one project-owned inline stroke
family; original reference assets remain intact.

## Visual-language refinement

The owner requested a livelier theme after reviewing the full structural
redesign. The foundation remains custom React components, Tailwind 4 utilities
and scoped CSS, rather than a third-party template or component suite. The
`@almina/ui` package currently contains a small page primitive, not a complete
component library.

- Palette: ink `#203e46`, page `#f8faf9`, aqua `#d8f3ef`, teal `#087775`,
  coral `#c53248`, muted text `#52676d`. Coral identifies primary purchase
  actions; teal/aqua groups browsing and pharmacy support.
- Typography: keep self-hosted Plus Jakarta Sans; increase supporting text,
  use weight 800 for the hero, loosen body leading and remove repetitive
  homepage marketing eyebrows.
- Surfaces: replace product and quick-action outlines with restrained elevation,
  differentiate pastel quick actions/category thumbnails, and give the hero
  image an asymmetric crop with an inset floating note.
- Icons: DesignIcon maps onto the existing project-owned Icon family; all
  navigation, shopping and contact icons now share currentColor, a 24-unit
  viewBox and rounded stroke geometry. No additional icon dependency.
- Motion: small pointer hover lifts, with no animation when reduced motion is
  requested. Semantics, keyboard focus, responsive compositions and underlying
  catalog/commerce behavior are preserved.


## Verification and rollback

Web typecheck, focused ESLint and isolated Turbopack production build pass.
Twenty-one existing storefront, SEO and commerce unit regressions pass.
Focused regressions cover the new stock-bounded purchase stepper, live saved-cart
badge and on-demand mobile filters/search persistence.

The final responsive suite passes 54 route/viewport combinations across 360,
390, 768, 1024, 1280 and 1440px, including visible media, overflow, keyboard focus,
200% text, reduced motion, search/filter/clear, gallery, loading, empty states and
outage/retry recovery. All 29 production-mode Playwright storefront/checkout
regressions pass, including current totals, price-change rejection, saved-intent
retries, stock limits, legacy URLs and existing delivery-location behavior.

Visual/browser evidence is generated under `/tmp/almina-figma-verification`.
The visual verifier checks visible images in the independent desktop/mobile
layouts. Axe cannot determine contrast for partially clipped horizontal-rail
labels; the verifier requires measured foreground/background contrast of at
least 4.5:1 for those exact labels. All unrelated incomplete findings still fail.

All verification uses synthetic loopback fixtures or a disposable local replica
set. No production DB, provider, Figma design mutation, deployment or data
migration occurs. Hosted rendering with the real catalog/media remains operator
acceptance. Revert only the storefront/component/asset/test changes for rollback;
preserve the workspace's pre-existing unrelated work. No commercial-policy or
data rollback is required.
