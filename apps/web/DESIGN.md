---
name: Al Mina accepted replacement storefront
description: App-like mobile shopping and a complete compact desktop storefront.
colors:
  action: "#ff5a5f"
  action-hover: "#fb565c"
  active-navigation: "#9c2e3b"
  text: "#1c2925"
  text-muted: "#50635e"
  canvas: "#f7faf8"
  surface: "#ffffff"
  input: "#edf4f1"
  border: "#e2ebe7"
  control-border: "#7c898f"
  secondary: "#eef5f1"
  hover: "#e8f2ed"
  campaign: "#ffe4df"
  selected: "#e0eee8"
  positive: "#26604d"
  positive-surface: "#eaf3ef"
  unavailable: "#685941"
  unavailable-surface: "#f2eee6"
  saved: "#a72d42"
  saved-surface: "#fff2f3"
  error: "#a11d31"
  disabled-text: "#6c757a"
  disabled-surface: "#e7ebed"
  focus: "#125d87"
  offer-text: "#1c2925"
  offer-surface: "#ffe4df"
  notice: "#e9edef"
  selection: "#ffd2d2"
typography:
  campaign:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "32px"
    fontWeight: "650"
    lineHeight: "1.1"
    letterSpacing: "-0.025em"
  page-title:
    fontSize: "28px"
    fontWeight: "650"
    lineHeight: "1.2"
    letterSpacing: "-0.025em"
  product-title:
    fontSize: "28px"
    fontWeight: "650"
    lineHeight: "1.2"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.5"
  body-arabic:
    fontFamily: "Noto Sans Arabic, DM Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.5"
    letterSpacing: "normal"
  card-name:
    fontSize: "15px"
    fontWeight: "500"
    lineHeight: "1.4"
  card-price:
    fontSize: "21px"
    fontWeight: "650"
    letterSpacing: "-0.03em"
  supporting:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.5"
  stock:
    fontSize: "11px"
    fontWeight: "500"
    lineHeight: "1.5"
  count:
    fontSize: "10px"
rounded:
  control: "14px"
  card: "14px"
  search: "18px"
  search-action: "12px"
  campaign: "18px"
  status: "999px"
  option: "999px"
  compact: "999px"
  field: "14px"
spacing:
  2: "2px"
  3: "3px"
  4: "4px"
  6: "6px"
  8: "8px"
  10: "10px"
  12: "12px"
  14: "14px"
  16: "16px"
  18: "18px"
  20: "20px"
  24: "24px"
  32: "32px"
  40: "40px"
  64: "64px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.control}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  field:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
  navigation:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
  stock:
    backgroundColor: "{colors.positive-surface}"
    textColor: "{colors.positive}"
    rounded: "{rounded.status}"
    typography: "{typography.stock}"
    padding: "3px 8px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
  option:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.option}"
  quick-add:
    backgroundColor: "{colors.saved-surface}"
    textColor: "{colors.saved}"
    rounded: "{rounded.compact}"
    size: "44px"
---

# Design System: Al Mina replacement storefront

## Overview

**Creative North Star: "App-like on mobile, complete on desktop."**

This guide documents the implemented Al Mina storefront as of 19 November 2026. The owner selected the full-width campaign, five wide home columns, and the image-first N03 phone product detail. The current review revision uses DM Sans and Noto Sans Arabic, pale mint control surfaces and a quieter type hierarchy. The final local screens and release boundaries are recorded in the [Phase 6 review packet](docs/design/implementation-evidence/phase-6.md).

Shopping controls stay compact and legible. Product photography, exact identity, stock, money and purchase actions carry the hierarchy. Coral identifies action; quiet grounds and restrained borders keep comparison clear. The actual logo remains unchanged.

**Key Characteristics:**

- Search-led navigation with delivery context and useful discovery.
- Quiet near-white ground, dark type and dark labels on coral.
- Quiet product cards with contained factual photography and readable prices.
- Image-first phone PDP with contextual overlay controls and persistent buying.
- Equivalent English/Arabic tasks and desktop/mobile continuity.

**Authority and scope.** This guide and its frontmatter document the accepted opted-in system. Runtime values are owned by `src/components/storefront-system/tokens.module.css`; `boundary.module.css` owns shared/native control states and compatibility aliases. The frontmatter and `.impeccable/design.json` are checked documentation projections, never CSS regeneration inputs. [Bindings](docs/design/system-bindings.json) connect the records to source. Read [PRODUCT.md](PRODUCT.md) for facts and [screen directions](docs/design/screen-directions.md) for compositions.

The retail layout and its public routes use the accepted system. The compatibility palette in `storefront-tokens.css` serves wholesale and root missing-page recovery. Shared shell geometry and fallback controls still have live consumers. Admin has its own scoped guide. See the [retirement inventory](docs/design/implementation-evidence/p6-01-retirement.md) for current ownership and preserved historical evidence.

## Colors

The primary action and restrained campaign tint sit within neutral shopping surfaces. Use the frontmatter's semantic names rather than extracting a new palette from reference images, screenshots, legacy CSS or generic generators.

**The action-foreground rule.** Normal labels use text on action, including hover/pressed and pending. Measured contrast is 4.94:1 at rest and 4.73:1 on hover/pressed. White on action is only 3.05:1 and is unsuitable for normal text. Focus uses a separated visible outline, not a low-contrast coral halo.

**The state-meaning rule.** Selected options use their quiet neutral surface plus current/pressed semantics. Bottom navigation retains its observed active-navigation text with aria-current; it does not use the option surface. Added/success uses positive treatment and a real count/status; saved uses its heart/pressed state; error uses explicit invalid/alert treatment. Offer text/surface is separate from error and cannot imply an actual promotion without verified data. Stock/unavailable retain literal status text. Inactive controls use disabled roles; their 3.92:1 text pairing is an inactive-control exemption, not a normal-text pass.

Page canvas, product surfaces, input surfaces, selected surfaces and campaign surfaces have separate purposes. Keep actual logo artwork; its aqua is an identity asset, not another action theme. [Measured pairings and limits](docs/design/implementation-evidence/p2-04-refinement.md) cover the tested states, not all future pages/providers.

## Typography

Self-hosted DM Sans serves Latin. Noto Sans Arabic serves Arabic, with DM Sans for mixed-script labels and identifiers. `src/lib/storefront-fonts.ts` supplies scoped font variables with retained licences. Body is 15px/1.5. Arabic retains its actual body scale and normal heading tracking, rather than a separate invented type system. Keep factual product and brand names intact. Use bidirectional isolation and keep number–unit pairs together in product titles.

Frontmatter roles record wide-screen values. Phone page titles use 24px; PDP titles 28→22px and prices 30→24px; campaign 32→23px. Card names 15→14px with 1.4 leading; card prices 21→19px. Section headings vary by context: page groups 22px, compact category 18px wide and section-head 19px phone. Do not replace these with one large display scale. Use 500 weight for controls and card names, 600 for emphasis and 650 for headings and prices. Verify label, input and error text on the actual form at each supported viewport.

Supporting metadata remains readable and subdued. Stock uses 11px with explicit status text. The 10px count exception is for redundant compact cart counts with a full accessible name; wide counts remain 12px. It is not a standalone target or a body-text rule. Preserve locale money formatting, the dirham SVG and the LTR numeric run; do not mirror currency or pack artwork. Long names wrap without losing accessible identity.

## Layout

The retail content container is 1240px, with 24px wide and 16px phone gutters. Home narrows its gutter to 12px below 360px. The global shell and product detail change composition at 768px. The listing opens its desktop filter rail at 1024px. Short phone product and checkout views at 500px tall or less keep the purchase action in the page. Check each surface at its own transition.

Home places the full-width campaign below search and above categories and products. Home uses two columns on phones and moves to three, four and five columns at 768px, 1024px and 1280px as inventory allows. Phone category tiles scroll inside their own lane. Spacing at 390px leaves the first complete price and Add row above the navigation dock in both reviewed locales. The listing uses a separate grid and filter layout.

The spacing scale groups each product's photo, identity and buying facts tightly; passage between shopping decisions is wider. The card frame uses 10px internal padding. Each route controls its grid gap. Stock inset is 3/8px wide and 2/6px on phones. Show brand and pack as quiet metadata instead of boxed tags. Do not increase global padding, make each section a raised panel or shrink touch areas to achieve density.

Phone PDP imagery occupies the full top gallery with Back/Save/Cart overlays; desktop uses the global search shell and gallery/buying columns. The purchase dock measures its own content clearance, respects safe areas and replaces global bottom navigation in this task mode. Preserve final-content reachability, short landscape, keyboard, focus and scroll return.

## Elevation & Depth

Product cards use a flat white surface. Use tonal grouping for shopping surfaces and reserve the offset overlay shadow (`0 8px 24px #1c292520`) for suggestions and overlays that use it. The product purchase dock uses the solid surface role and a separator.

## Shapes

Default accepted shared/native actions use the control radius; explicit rounded/pill variants keep their existing API shapes. Equal-sided icon controls may be circular. Search outer and submit corners are separate roles, preventing an oval submit. Card, field, option/status and campaign radii have distinct frontmatter roles; do not override them with route utilities. Fields and standard actions use a 14px radius. Chips and compact Add buttons use a capsule. Search has separate 18px outer and 12px submit corners.

Reserve strong borders for fields that need a defined edge. Soft fills group search and filter controls. Keyboard focus uses a distinct outline. Minimum native action target is 44px; the standard shared Button example is 48px high with 12/24px padding. Bound long labels and allow wrapping instead of clipping or shrinking them.

## Components

Review the working patterns on the retail routes. The sidecar documents the shipped styles with standalone examples. The development comparison and component specimen were retired in P6-01.

- **Header/search/location/navigation:** mirror directional arrows and breadcrumb chevrons in RTL. Keep known-item search prominent, delivery context and cart reachable. Preserve suggestions, Enter/Escape, manual/GPS fallback and query URLs. Expanded location and menus must retain names, focus return, portal scope and RTL. No scanning/voice/chat affordance without a real capability.
- **Actions and fields:** `boundary.module.css` owns base/variant/meaning states. Default/accent is coral/text; secondary/outline/ghost/link/destructive have explicit meanings. Busy retains action treatment; unavailable is disabled. Invalid fields use error independently of the offer alias. Focus remains visible; shared component APIs continue outside this scope.
- **Product cards:** contained original photo, stock and saved controls, factual brand/pack where available, wrapping identity, dirham price and quick add. Do not invent chips, ratings, discounts or data missing from the catalogue. Actual in-cart quantity and stock checks persist. Offer/unknown-price/unavailable/placeholder cases stay honest; a layout sample is not saleable stock.
- **Gallery/options/quantity:** one-image products have no fake pagination; real thumbnails select real images. Only real family members get option links/current state. Preserve exact selected pack/price/availability, native quantity limits and server validation. Product comparison imagery stays static under hover. P4-02 retired the earlier card image zoom.
- **Campaign/categories:** use existing approved local art/provenance and semantic localized HTML copy, factual category links and published content from the catalogue. Generic art cannot impersonate staff, product packs or a delivery promise. Reference brands, device frames and watermarks are never assets.
- **Disclosures/sheets/feedback:** preserve semantic summary, real dialogs/popovers and focus management. Loading, status, empty, error and success semantics carry meaning. Inline policy links use a persistent underline and a separate keyboard focus outline.
- **Cart/checkout/customer:** preserve existing contracts and task modes. Device cart stores identifiers/quantities; server-loaded estimates are not final quotes. Checkout, auth, payments, idempotency, inventory and immutable order snapshots are not design concerns to rewrite. The checkout keeps one responsive action, visible field labels, a server-quoted review and explicit payment recovery states. See the screen directions for dock and keyboard behavior.

**The feedback-motion rule.** Background/border/text changes use the existing 120ms role and `cubic-bezier(0.2,0.7,0.2,1)`. Reduced motion removes scoped transitions/animations and preserves immediate final states, including portal links. Do not animate pack comparisons, add shopping delays or reset transforms needed for disclosure direction/portal placement. Stroked UI icons use the existing Heroicons family at 22px/1.5; filled dirham artwork is excluded.

## Do's and Don'ts

### Do

- Do preserve the accepted direction, actual business content, English/Arabic tasks and server authority.
- Do use the single scoped runtime token/state owners and verify emitted/computed CSS, portal ancestry and live resizing.
- Do test names, missing content, unavailable/pending/failed states, focus, enlarged text and purchase clearance.
- Do preserve shared/admin consumers until replacement is verified and distinguish local direction acceptance from release acceptance.

### Don't

- Don't restore retired lavender/teal candidate values, split desktop lead or standalone phone PDP toolbar as default guidance.
- Don't generate a competing palette/font/token system from skills, metadata snippets, references or the archive.
- Don't copy unsupported ratings, delivery promises, medical claims, prices, discounts, services or payment availability.
- Don't deploy, access production data or change commerce behavior as part of this design phase.
