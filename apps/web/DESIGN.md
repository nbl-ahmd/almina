---
name: Al Mina accepted replacement storefront
description: App-like mobile shopping and a complete compact desktop storefront.
colors:
  action: "#086657"
  action-hover: "#064f44"
  active-navigation: "#086657"
  text: "#232d29"
  text-muted: "#4f5a54"
  canvas: "#faf9f6"
  surface: "#ffffff"
  product-well: "#f4f4f1"
  input: "#f1f1eb"
  border: "#e0e1d9"
  control-border: "#c4d0cb"
  control-hover: "#8fa39b"
  secondary: "#f1f1eb"
  hover: "#e0eee6"
  campaign: "#f1f1eb"
  selected: "#e0eee6"
  positive: "#086657"
  positive-surface: "#e7f5ef"
  unavailable: "#8a4b14"
  unavailable-surface: "#fdf3e7"
  saved: "#086657"
  saved-surface: "#e7f5ef"
  error: "#a11d31"
  disabled-text: "#66736d"
  disabled-surface: "#edf1ec"
  focus: "#086657"
  offer-text: "#221214"
  offer-surface: "#e14d5a"
  notice: "#edf1ed"
  selection: "#e0eee6"
  coral: "#e14d5a"
typography:
  campaign:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "32px"
    fontWeight: "700"
    lineHeight: "1.1"
    letterSpacing: "-0.025em"
  page-title:
    fontSize: "28px"
    fontWeight: "700"
    lineHeight: "1.2"
    letterSpacing: "-0.025em"
  product-title:
    fontSize: "28px"
    fontWeight: "700"
    lineHeight: "1.2"
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.5"
  body-arabic:
    fontFamily: "IBM Plex Sans Arabic, Plus Jakarta Sans, sans-serif"
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
    fontWeight: "700"
    letterSpacing: "-0.03em"
  supporting:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.5"
  stock:
    fontSize: "12px"
    fontWeight: "500"
    lineHeight: "1.5"
  count:
    fontSize: "10px"
rounded:
  control: "12px"
  action: "12px"
  card: "16px"
  search: "12px"
  search-action: "8px"
  campaign: "16px"
  status: "9999px"
  option: "9999px"
  compact: "9999px"
  quick-action: "12px"
  field: "12px"
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
    textColor: "{colors.surface}"
    rounded: "{rounded.action}"
    padding: "12px 24px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.positive}"
    rounded: "{rounded.action}"
    padding: "12px 24px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.action}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.surface}"
    rounded: "{rounded.action}"
  field:
    backgroundColor: "{colors.input}"
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
    backgroundColor: "{colors.positive-surface}"
    textColor: "{colors.positive}"
    rounded: "{rounded.quick-action}"
    size: "44px"
---

# Design System: Al Mina replacement storefront

## Overview

**Creative North Star: "App-like on mobile, complete on desktop."**

This guide documents the implemented Al Mina storefront as of 20 November 2026. The owner selected the full-width campaign, five wide home columns, and the image-first N03 phone product detail. The current review revision uses Plus Jakarta Sans and IBM Plex Sans Arabic, a warm mineral canvas and deep apothecary green actions and a quieter type hierarchy. The final local screens and release boundaries are recorded in the [Phase 6 review packet](docs/design/implementation-evidence/phase-6.md).

Shopping controls stay compact and legible. Product photography, exact identity, stock, money and purchase actions carry the hierarchy. Apothecary green identifies primary actions. Use coral for cart count badges, sale tags, urgent alerts and the filled saved-product heart. The actual logo remains unchanged.

**Key Characteristics:**

- Search-led navigation with delivery context and useful discovery.
- Quiet near-white ground, dark type and white labels on green actions and dark labels on coral badges.
- Quiet product cards with contained factual photography and readable prices.
- Image-first phone PDP with contextual overlay controls and persistent buying.
- Equivalent English/Arabic tasks and desktop/mobile continuity.

**Authority and scope.** This guide and its frontmatter document the accepted opted-in system. The Tailwind v4 theme in `src/app/globals.css` owns palette and shared radii. The storefront module retains layout and semantic aliases. The primitives in `components/ui` own their default states and the storefront boundary handles shopping-specific feedback. The frontmatter and `.impeccable/design.json` are checked documentation projections, never CSS regeneration inputs. [Bindings](docs/design/system-bindings.json) connect the records to source. Read [PRODUCT.md](PRODUCT.md) for facts and [screen directions](docs/design/screen-directions.md) for compositions.

The retail layout and its public routes use the accepted system. The compatibility palette in `src/app/storefront-compatibility.css` serves wholesale and root missing-page recovery. Shared shell geometry and fallback controls still have live consumers. Admin has its own scoped guide. See the [retirement inventory](docs/design/implementation-evidence/p6-01-retirement.md) for current ownership and preserved historical evidence.

## Colors

The primary action and restrained campaign tint sit within neutral shopping surfaces. Use the frontmatter's semantic names rather than extracting a new palette from reference images, screenshots, legacy CSS or generic generators.

**The action-foreground rule.** White text has 6.89:1 contrast on the primary green and 9.50:1 on hover. Use the dark coral-ink token on coral badges for 4.65:1 contrast. Keep checkmarks white on green. Focus uses the brand border and a soft ring.

**The state-meaning rule.** Selected options use their quiet neutral surface plus current/pressed semantics. Bottom navigation retains its observed active-navigation text with aria-current; it does not use the option surface. Added/success uses positive treatment and a real count/status; saved uses its heart/pressed state; error uses explicit invalid/alert treatment. Offer text/surface is separate from error and cannot imply an actual promotion without verified data. Stock/unavailable retain literal status text. Inactive controls use disabled roles; their 3.92:1 text pairing is an inactive-control exemption, not a normal-text pass.

The warm canvas and stone input fill balance the deep green actions. Primary text on the canvas measures 13.49:1. Muted text measures 6.82:1 on the canvas and 6.34:1 on the input fill. Keep actual logo artwork; its aqua is an identity asset, not another action theme. [Measured pairings and limits](docs/design/implementation-evidence/p2-04-refinement.md) cover the tested states, not all future pages/providers.

## Typography

Next font loads Plus Jakarta Sans and IBM Plex Sans Arabic at weights 400, 500, 600 and 700 through the root layout. Arabic or RTL storefront content selects Plex first and Jakarta for mixed-script labels. Commerce numerals use tabular figures. Keep factual names and bidirectional isolation for pack information.

Frontmatter roles record wide-screen values. Phone page titles use 24px; PDP titles 28→22px and prices 30→24px; campaign copy follows the artwork composition. Card names 15→14px with 1.35 wide and 1.4 phone leading; card prices 21→19px. Section headings vary by context. Homepage headings use 23px wide and 19px phone. Do not replace these with one large display scale. Use 500 weight for controls and card names, 600 for emphasis and 650 for headings and prices. Verify label, input and error text on the actual form at each supported viewport.

Supporting metadata remains readable and subdued. Stock uses 11px with explicit status text. The 10px count exception is for redundant compact cart counts with a full accessible name; wide counts remain 12px. It is not a standalone target or a body-text rule. Preserve locale money formatting, the dirham SVG and the LTR numeric run; do not mirror currency or pack artwork. Long names wrap without losing accessible identity.

## Layout

The retail content container is 1240px, with 24px wide and 16px phone gutters. Home narrows its gutter to 12px below 360px. The global shell and product detail change composition at 768px. The listing opens its desktop filter rail at 1024px. Short phone product and checkout views at 500px tall or less keep the purchase action in the page. Check each surface at its own transition.

Home places the full-width campaign below search and above categories and products. Home uses two columns on phones and moves to three, four and five columns at 768px, 1024px and 1280px as inventory allows. Phone category links scroll inside their own lane. On wider screens the links wrap. Spacing at 390px leaves the first complete price and Add row above the navigation dock in both reviewed locales. The listing uses a separate grid and filter layout.

The spacing scale groups each product's photo, identity and buying facts tightly; passage between shopping decisions is wider. The card frame uses 10px internal padding. Each route controls its grid gap. Stock inset is 3/8px wide and 2/6px on phones. Show brand and pack as quiet metadata instead of boxed tags. Do not increase global padding, make each section a raised panel or shrink touch areas to achieve density.

Phone PDP imagery occupies the full top gallery with Back/Save/Cart overlays; desktop uses the global search shell and gallery/buying columns. The purchase dock measures its own content clearance, respects safe areas and replaces global bottom navigation in this task mode. Preserve final-content reachability, short landscape, keyboard, focus and scroll return.

## Elevation & Depth

Product cards use a white frame, a square photo well and a thin mineral edge. The product well uses `--color-product-well`. On pointer hover, strengthen the border. Reserve `--shadow-raised` for suggestions and overlays. The fixed phone purchase dock uses a solid surface and a single separator. The in-flow desktop purchase row sits directly on the page surface.

## Shapes

Use 12px for actions and fields, 16px for cards and campaign framing, and the pill radius for status and compact selections. The header keeps a 44px search pill with an embedded 32px brand-green submit circle. Catalogue quick add retains its 44px target and becomes a quantity stepper once the cart contains the item.

Text fields use a tinted mineral surface, a 12px radius and a mineral border. The minimum height is 44px for desktop controls and 48px on small or coarse-pointer screens. Keyboard focus uses the white surface, brand border and a three-pixel tinted ring. Invalid controls use the alert roles and accompanying text. Desktop filters remain a rail. On phones, Filter and Sort remain in the listing toolbar with filters in a sheet.

## Components

Review the working patterns on the retail routes. The sidecar documents the shipped styles with standalone examples. The development comparison and component specimen were retired in P6-01.

- **Header/search/location/navigation:** mirror directional arrows and breadcrumb chevrons in RTL. On phones, place menu and logo at the start, with delivery beside cart at the end. The utility row scrolls away and search stays available. Cart, checkout and the image-first product layout keep their task headers. Keep delivery context and cart reachable. Preserve suggestions, Enter/Escape, manual/GPS fallback and query URLs. Expanded location and menus must retain names, focus return, portal scope and RTL. No scanning/voice/chat affordance without a real capability.
- **Actions and fields:** The primitives own default and accent (green with white text), soft (tinted green), and secondary, outline, ghost, link and destructive variants. The boundary owns storefront-specific confirmation and quantity feedback. Busy retains action treatment; unavailable is disabled. Invalid fields use error independently of the offer alias. The product review uses a native radio group with five star targets, a visible verification cue and grouped identity fields. Focus remains visible; shared component APIs continue outside this scope.
- **Product cards:** contained original photo, stock and saved controls, factual brand and pack separated by a middle dot, a two-line product name, tabular dirham pricing and a green quick-add control. Stock and saved controls sit over the photo well, with a coral heart for saved items. Do not invent chips, ratings, discounts or data missing from the catalogue. Actual in-cart quantity and stock checks persist. Offer/unknown-price/unavailable/placeholder cases stay honest; a layout sample is not saleable stock.
- **Gallery/options/quantity:** one-image products have no fake pagination; real thumbnails select real images. Only real family members get option links/current state. Preserve exact selected pack/price/availability, native quantity limits and server validation. Use the same borderless, tinted quantity group on the product page and in the cart. Disabled steps mute the icon without painting a separate tile. Category, thumbnail and product rails keep swipe and keyboard scrolling with hidden native rails. Product comparison imagery stays static under hover. P4-02 retired the earlier card image zoom.
- **Campaign/categories:** published artwork uses the responsive carousel artboards and an equivalent accessible link name or description. The built-in slides use live English and Arabic text for Everyday personal care and Shop by brand. Category links use text labels. The directory can show actual catalogue photography when available. Skincare and baby care use a visible section heading, a collection link and matching products when available. Brand names and help links stand on their own.
- **Disclosures/sheets/feedback:** preserve semantic summary, real dialogs/popovers and focus management. Loading, status, empty, error and success semantics carry meaning. Use a visible keyboard focus outline, with underlines for links embedded in prose. Confirmed Add uses the success tint and check icon.
- **Cart/checkout/customer:** preserve existing contracts and task modes. Device cart stores identifiers/quantities; server-loaded estimates are not final quotes. Checkout, auth, payments, idempotency, inventory and immutable order snapshots are not design concerns to rewrite. The checkout keeps one responsive action, visible field labels, a server-quoted review and explicit payment recovery states. See the screen directions for dock and keyboard behavior.

**The feedback-motion rule.** Background, border and text changes and pointer press feedback use 120ms. Pointer-initiated menu, review and campaign disclosures use the 180ms entry role. Confirmed status indicators can fade in on the same timing. Both use `cubic-bezier(0.2,0.7,0.2,1)`. Keyboard carousel controls render the next slide immediately. Reduced motion preserves immediate final states. Pack comparison and navigation stay steady. Stroked UI icons use Heroicons at 22px/1.5, with separate filled dirham artwork.

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


### Homepage carousel artwork

Export **2400 × 600 px (4:1) for desktop** and **1200 × 400 px (3:1) for mobile**. The mobile frame and artwork apply below 768 CSS px. The frame scales with the page width and keeps its height when the slide changes. Put the campaign headline and any call to action in the artwork. Keep key elements clear of the rounded corners and check headline legibility at phone size.

Upload both files in **Admin → Banners → Add banner**. Use WebP, JPEG or PNG and keep the files under 3 MB combined. Match the current promotion in the accessible banner name and set its destination. The desktop image also works on phones if no mobile version is supplied. Uploaded artwork is fitted without cropping. Phones support horizontal swipe and the controls remain available by touch and keyboard.
