---
name: Al Mina accepted replacement storefront
description: App-like mobile shopping and a complete compact desktop storefront.
colors:
  action: "#0e5b48"
  action-hover: "#0a4738"
  action-soft: "#e3f2ea"
  active-navigation: "#0e5b48"
  text: "#14261f"
  text-muted: "#56685f"
  canvas: "#f4f7f5"
  surface: "#ffffff"
  product-well: "#f1f6f3"
  input: "#eaf2ed"
  border: "#dde8e2"
  control-border: "#84988f"
  control-hover: "#5f756c"
  secondary: "#eaf2ed"
  hover: "#d8eee4"
  campaign: "#e0f1e8"
  campaign-alt: "#fdebea"
  campaign-ink: "#0b3a2f"
  selected: "#d8eee4"
  positive: "#07634f"
  positive-surface: "#e0f3e9"
  unavailable: "#85460f"
  unavailable-surface: "#fdf1e4"
  saved: "#0e5b48"
  saved-surface: "#e0f3e9"
  error: "#a11d31"
  disabled-text: "#5b6b63"
  disabled-surface: "#edf2ef"
  focus: "#0e5b48"
  offer-text: "#221214"
  offer-surface: "#ff5a5f"
  notice: "#e8f4ee"
  selection: "#d8eee4"
  coral: "#ff5a5f"
  whatsapp: "#149a4c"
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
    fontSize: "17px"
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
  card: "20px"
  panel: "28px"
  search: "9999px"
  search-action: "9999px"
  campaign: "20px"
  status: "9999px"
  option: "9999px"
  compact: "9999px"
  quick-action: "14px"
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
  28: "28px"
  32: "32px"
  36: "36px"
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
    textColor: "{colors.action}"
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
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.quick-action}"
    size: "44px"
---

# Design System: Al Mina replacement storefront

## Overview

**Creative North Star: "Apothecary calm, app-like on mobile, complete on desktop."**

Search and category discovery lead a product-led pharmacy storefront. Phone screens keep shopping controls close at hand. Desktop uses a pill search field, a compact navigation row, a department strip and up to five product columns. The logo, the Plus Jakarta Sans and IBM Plex Sans Arabic pairing, and a green-plus-coral brand signal anchor the identity.

Deep apothecary green identifies buying actions, links and active navigation. Soft mint builds page sections, department tiles, selected states and category wells. Warm off-white canvas, white shopping surfaces and dark green ink group content without repeated rules. Coral is reserved for the brand mark, cart counts, genuine sale tags and urgent alerts. Stock uses its own deep-green surface; unavailable uses amber.

**Key Characteristics:**

- Search-led navigation with delivery context and useful discovery.
- Calm off-white canvas with white surfaces, mint supporting fills and deep-green buying actions.
- Quiet product cards with contained factual photography, a generous photo well and readable tabular prices.
- Image-first phone PDP with contextual overlay controls, a white desktop buying card and persistent buying.
- Equivalent English/Arabic tasks, RTL mirroring and desktop/mobile continuity.

**Authority and scope.** This guide and its frontmatter document the accepted opted-in system. The Tailwind v4 theme in `src/app/globals.css` owns palette and shared radii. The storefront token module aliases those values and owns local spacing and layout roles. The primitives in `components/ui` own their default states and the storefront boundary handles shopping-specific feedback. The frontmatter and `.impeccable/design.json` are checked documentation projections, never CSS regeneration inputs. [Bindings](docs/design/system-bindings.json) connect the records to source. Read [PRODUCT.md](PRODUCT.md) for facts and [screen directions](docs/design/screen-directions.md) for compositions.

The 21 November 2026 revision supersedes the earlier blue/action system. Blue `#1855ba` is no longer a storefront action colour. The accepted palette is the deep green and mint system recorded here. Retail layout, storefront routes and the shared commerce surfaces use this system. The compatibility palette in `src/app/storefront-compatibility.css` serves wholesale and root missing-page recovery. Admin has its own scoped guide. See the [retirement inventory](docs/design/implementation-evidence/p6-01-retirement.md) for current ownership and preserved historical evidence.

## Colors

Mint, peach, lilac, sky and butter appear as department accents in category art and hero decoration. Shopping surfaces group related content through spacing and tonal fills. Use the frontmatter's semantic names rather than extracting a new palette from reference images, screenshots, legacy CSS or generic generators.

**The action-foreground rule.** White text has 8.05:1 contrast on action green and 10.65:1 on hover. Dark coral ink measures 5.91:1 on coral badges. Keep checkmarks white on green. Focus uses the brand border and a soft ring. Green is a buying/action colour here, not a decorative success tint; do not use the action green behind body copy.

**The state-meaning rule.** Selected options use the mint `selected` surface plus current/pressed semantics; the strongest option uses the green border and green label, not a filled green pill. Bottom navigation retains its active-navigation green with `aria-current`. Added/success uses positive treatment and a real count/status; saved uses its heart/pressed state; error uses explicit invalid/alert treatment. Offer text/surface is separate from error and cannot imply an actual promotion without verified data. Stock/unavailable retain literal status text. Inactive controls use disabled roles; their 4.98:1 text pairing is an inactive-control exemption, not a normal-text pass.

Primary text measures 14.67:1 on the canvas. Muted text measures 5.50:1 on the canvas and 5.20:1 on the field fill. Stock text measures 6.25:1 on its surface and unavailable 6.55:1 on its surface. Use green for interactive links and stock/success. Retain clear field, selection, error and keyboard focus boundaries.

## Typography

Next font loads Plus Jakarta Sans and IBM Plex Sans Arabic at weights 400, 500, 600 and 700 through the root layout. Arabic or RTL storefront content selects Plex first and Jakarta for mixed-script labels. Commerce numerals use tabular figures. Keep factual names and bidirectional isolation for pack information.

Frontmatter sizes describe the default browser setting. The shared storefront type scale uses rem units so product names, prices and supporting text grow with the reader’s preferred size. Button and label line heights allow additional room for Arabic. Phone page titles use 24px; PDP titles 28→22px and prices 30→24px; campaign copy follows the artwork composition. Card names 15→14px with 1.35 wide and 1.4 phone leading; card prices use 17px with tight tracking and a 12px previous price beneath. Homepage section headings use 25px on wide screens and 20px on phones. Do not replace these with one large display scale. Use 500 weight for controls and card names, 600 for emphasis and 700 for headings and prices. Verify label, input and error text on the actual form at each supported viewport.

Supporting metadata remains readable and subdued. Stock uses 12px with explicit status text. The 10px count exception is for redundant compact cart counts with a full accessible name; wide counts remain 12px. It is not a standalone target or a body-text rule. Preserve locale money formatting, the dirham SVG and the LTR numeric run; do not mirror currency or pack artwork. Long names wrap without losing accessible identity.

## Layout

The retail content container is 1280px, with 24px wide and 16px phone gutters. Home narrows its gutter to 12px below 360px. The global shell and product detail change composition at 768px. The listing opens its desktop filter rail at 1024px. Short phone product and checkout views at 500px tall or less keep the purchase action in the page. Check each surface at its own transition.

Home places the campaign hero first, then the category shortcuts, then product shelves. Published artwork uses a 3:1 frame on phones and a 4:1 frame from 768px. A campaign made entirely of built-in slides uses a 5:2 frame on phones and an 11:2 frame on wider screens. Category shortcuts scroll inside their own phone lane and fit a single row on wider screens. Home product grids use two columns on phones and move to three, four and five columns at 768px, 1024px and 1280px as inventory allows. Empty collection sections render nothing rather than an orphan heading. The listing uses a separate grid and filter layout; an unfiltered search with no results shows recovery categories instead of a refinement panel.

The spacing scale groups each product's photo, identity and buying facts tightly; passage between shopping decisions is wider. The card frame uses 10px internal padding. Each route controls its grid gap. Stock inset is 3/8px wide and 2/6px on phones. Show brand and pack as quiet metadata instead of boxed tags. Do not increase global padding, make each section a raised panel or shrink touch areas to achieve density.

Phone PDP imagery occupies the full top gallery with Back/Save/Cart overlays; desktop uses the global search shell and a gallery/buying pair, with the buying card top-aligned rather than stretched to gallery height. The purchase dock measures its own content clearance, respects safe areas and replaces global bottom navigation in this task mode. Preserve final-content reachability, short landscape, keyboard, focus and scroll return.

## Elevation & Depth

Product cards use a white surface, an inset hairline and a mint-tinted photo well. On pointer hover, add a small surface shadow and strengthen the hairline. Reserve `--shadow-raised` for suggestions and overlays. The fixed phone purchase dock uses a solid surface with a shallow dock shadow. The desktop buying card is a white panel with a hairline; the in-flow desktop purchase row sits directly on the page surface. Cards on the mint canvas must remain distinguishable without heavy borders.

## Shapes

Use 12px for actions and fields, 20px for cards and campaign framing, 28px for full-page panels and the pill radius for status, compact selections, search and filter chips. The header search is a 48px pill with an embedded 40px green submit circle. Catalogue quick add retains its 44px target, 14px radius and soft green shadow, and becomes a quantity stepper once the cart contains the item.

Text fields use a mint-tinted surface, a 12px radius and a visible field border. The minimum height is 44px for desktop controls and 48px on small or coarse-pointer screens. Keyboard focus uses the white surface, brand border and a three-pixel tinted ring. Invalid controls use the alert roles and accompanying text. Desktop filters remain a rail. On phones, Filter and Sort remain in the listing toolbar with filters in a sheet.

## Components

Review the working patterns on the retail routes. The sidecar documents the shipped styles with standalone examples. The development comparison and component specimen were retired in P6-01.

- **Header/search/location/navigation:** the sticky header keeps a white surface and a hairline bottom edge. The search is a mint pill on phones and desktop, with a circular green submit button. Departments sit in a mint strip whose active item is a white pill. Mirror directional arrows and breadcrumb chevrons in RTL. On phones, place menu and logo at the start, with delivery beside cart at the end. Cart, checkout and the image-first product layout keep their task headers. Keep delivery context and cart reachable. Preserve suggestions, Enter/Escape, manual/GPS fallback and query URLs. Expanded location and menus must retain names, focus return, portal scope and RTL. No scanning/voice/chat affordance without a real capability.
- **Actions and fields:** The primitives own default and accent (green with white text), soft (mint selected surface), and secondary, outline, ghost, link and destructive variants. The boundary owns storefront-specific confirmation and quantity feedback. Busy retains action treatment; unavailable is disabled. Invalid fields use error independently of the offer alias. The product review uses a native radio group with five star targets, a visible verification cue and grouped identity fields. Focus remains visible; shared component APIs continue outside this scope.
- **Product cards:** contained original photo in a rounded mint well, stock and saved controls, factual brand and pack separated by a middle dot, a two-line product name, tabular dirham pricing with the current price above the previous price, and a green quick-add control. The save control is a quiet white circle over the photo; a saved item shows the green heart. Do not invent chips, ratings, discounts or data missing from the catalogue. Actual in-cart quantity and stock checks persist. Offer/unknown-price/unavailable/placeholder cases stay honest; a layout sample is not saleable stock. Out-of-stock cards use the unavailable pill and a disabled buying control.
- **Gallery/options/quantity:** one-image products have no fake pagination; real thumbnails select real images. The desktop gallery sits on a soft radial mint stage with glass overlay controls. Only real family members get option links/current state. Options are outlined chips; the current variant uses green text and weight rather than a filled pill. Preserve exact selected pack/price/availability, native quantity limits and server validation. Use the same bordered, tinted quantity group on the product page and in the cart. Disabled steps mute the icon without painting a separate tile. Category, thumbnail and product rails keep swipe and keyboard scrolling with hidden native rails. Product comparison imagery stays static under hover. P4-02 retired the earlier card image zoom.
- **Campaign/categories:** published artwork uses the responsive carousel artboards and an equivalent accessible link name or description. The built-in slides use live English and Arabic text and a soft radial hero wash. The lead links to the catalogue and shows actual in-stock catalogue photography. Category tiles pair a short name with catalogue photography where available or a category symbol in a mint well. The category page uses white tiles with a circular image well and the same department symbols as the homepage. Store shelves use a visible section heading, a mint “View all” chip and matching products when available. Brand names and help links stand on their own.
- **Disclosures/sheets/feedback:** preserve semantic summary, real dialogs/popovers and focus management. Loading, status, empty, error and success semantics carry meaning. Use a visible keyboard focus outline, with underlines for links embedded in prose. Confirmed Add uses the success tint and check icon. Empty states use a mint icon circle, a plain-language recovery line and one primary action; the cart empty state may show up to four real in-stock recommendations.
- **Cart/checkout/customer:** preserve existing contracts and task modes. Device cart stores identifiers/quantities; server-loaded estimates are not final quotes. Checkout, auth, payments, idempotency, inventory and immutable order snapshots are not design concerns to rewrite. The checkout keeps one responsive action, visible field labels, a server-quoted review and explicit payment recovery states. See the screen directions for dock and keyboard behavior.

**The feedback-motion rule.** Background, border and text changes and pointer press feedback use 120ms. Pointer-initiated menu, review and campaign disclosures use the 180ms entry role. Confirmed status indicators can fade in on the same timing. Both use `cubic-bezier(0.2,0.7,0.2,1)`. Keyboard carousel controls render the next slide immediately. Reduced motion preserves immediate final states. Pack comparison and navigation stay steady. Stroked UI icons use Heroicons at 22px/1.5, with separate filled dirham artwork.

## Do's and Don'ts

### Do

- Do preserve the accepted direction, actual business content, English/Arabic tasks and server authority.
- Do use green for buying actions and mint for supporting surfaces; keep coral for the mark, counts, genuine offers and alerts.
- Do use the single scoped runtime token/state owners and verify emitted/computed CSS, portal ancestry and live resizing.
- Do test names, missing content, unavailable/pending/failed states, focus, enlarged text and purchase clearance.
- Do preserve shared/admin consumers until replacement is verified and distinguish local direction acceptance from release acceptance.

### Don't

- Don't restore the superseded blue `#1855ba` action palette or the categories-first home order.
- Don't restore retired lavender/teal candidate values, split desktop lead or standalone phone PDP toolbar as default guidance.
- Don't generate a competing palette/font/token system from skills, metadata snippets, references or the archive.
- Don't copy unsupported ratings, delivery promises, medical claims, prices, discounts, services or payment availability.
- Don't deploy, access production data or change commerce behavior as part of this design phase.


### Homepage carousel artwork

Export **2400 × 600 px (4:1) for desktop** and **1200 × 400 px (3:1) for mobile**. The mobile frame and artwork apply below 768 CSS px. The frame scales with the page width and keeps its height when the slide changes. Put the campaign headline and any call to action in the artwork. Keep key elements clear of the rounded corners and check headline legibility at phone size.

Upload both files in **Admin → Banners → Add banner**. Use WebP, JPEG or PNG and keep the files under 3 MB combined. Match the current promotion in the accessible banner name and set its destination. The desktop image also works on phones if no mobile version is supplied. Uploaded artwork is fitted without cropping. Phones support horizontal swipe and the controls remain available by touch and keyboard.
