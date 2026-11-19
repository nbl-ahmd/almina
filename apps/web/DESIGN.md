---
name: Al Mina accepted replacement storefront
description: App-like mobile shopping and a complete compact desktop storefront.
colors:
  action: "#ff5a5f"
  action-hover: "#fb565c"
  active-navigation: "#a52b38"
  text: "#202a30"
  text-muted: "#58636b"
  canvas: "#fafbfb"
  surface: "#ffffff"
  input: "#f7f9f9"
  border: "#dce1e3"
  control-border: "#7c898f"
  secondary: "#f0f3f3"
  hover: "#f0f3f4"
  campaign: "#ffe5e2"
  selected: "#e6edef"
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
  offer-text: "#202a30"
  offer-surface: "#ffe5e2"
  notice: "#e9edef"
  selection: "#ffd2d2"
typography:
  campaign:
    fontFamily: "Figtree, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  page-title:
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  product-title:
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Figtree, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-arabic:
    fontFamily: "Alexandria, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  card-name:
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  card-price:
    fontSize: "21px"
    fontWeight: 700
    letterSpacing: "-0.03em"
  supporting:
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  stock:
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
  count:
    fontSize: "10px"
rounded:
  control: "10px"
  card: "14px"
  search: "12px"
  search-action: "8px"
  campaign: "18px"
  status: "4px"
  option: "8px"
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
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "48px"
  button-outline:
    backgroundColor: "{colors.surface}"
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
    backgroundColor: "{colors.action}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    size: "44px"
---

# Design System: Al Mina replacement storefront

## Overview

**Creative North Star: "App-like on mobile, complete on desktop."**

Status: accepted local direction, documented 18 November 2026 from the P1 screen decisions and P2-01–P2-04 implementation. The owner selected the full campaign desktop lead and five wide-screen home columns, retained the shown near-white/Figtree/Alexandria system, then continued after the revised image-first N03 phone PDP. This closes the local direction gate; it does not establish production readiness or deployment approval.

Shopping controls stay compact and legible. Product photography, exact identity, stock, money and purchase actions carry the hierarchy. Coral identifies action; quiet grounds and restrained borders keep comparison clear. The actual logo remains unchanged.

**Key Characteristics:**

- Search-led navigation with delivery context and useful discovery.
- Quiet near-white ground, dark type and dark labels on coral.
- Compact bordered cards and contained factual product photography.
- Image-first phone PDP with contextual overlay controls and persistent buying.
- Equivalent English/Arabic tasks and desktop/mobile continuity.

**Authority and scope.** This guide and its frontmatter document the accepted opted-in system. Runtime values are owned by `src/components/storefront-system/tokens.module.css`; `boundary.module.css` owns shared/native control states and compatibility aliases. The frontmatter and `.impeccable/design.json` are checked documentation projections, never CSS regeneration inputs. [Bindings](docs/design/system-bindings.json) connect the records to source. Read [PRODUCT.md](PRODUCT.md) for facts and [screen directions](docs/design/screen-directions.md) for compositions.

The retail layout and its public routes use the accepted system. The compatibility palette in `storefront-tokens.css` serves wholesale and root missing-page recovery. Shared shell geometry and fallback controls still have live consumers. Admin has its own scoped guide. See the [retirement inventory](docs/design/implementation-evidence/p6-01-retirement.md) for current ownership and preserved historical evidence.

## Colors

The primary action and restrained campaign tint sit within neutral shopping surfaces. Use the frontmatter's semantic names rather than extracting a new palette from reference images, screenshots, legacy CSS or generic generators.

**The action-foreground rule.** Normal labels use text on action, including hover/pressed and pending. Measured contrast is 4.79:1 at rest and 4.59:1 on hover/pressed. White on action is only 3.05:1 and is unsuitable for normal text. Focus uses a separated visible outline, not a low-contrast coral halo.

**The state-meaning rule.** Selected options use their quiet neutral surface plus current/pressed semantics. Bottom navigation retains its observed active-navigation text with aria-current; it does not use the option surface. Added/success uses positive treatment and a real count/status; saved uses its heart/pressed state; error uses explicit invalid/alert treatment. Offer text/surface is separate from error and cannot imply an actual promotion without verified data. Stock/unavailable retain literal status text. Inactive controls use disabled roles; their 3.92:1 text pairing is an inactive-control exemption, not a normal-text pass.

Page canvas, product surfaces, input surfaces, selected surfaces and campaign surfaces have separate purposes. Keep actual logo artwork; its aqua is an identity asset, not another action theme. [Measured pairings and limits](docs/design/implementation-evidence/p2-04-refinement.md) cover the tested states, not all future pages/providers.

## Typography

Self-hosted Figtree and Alexandria serve Latin and Arabic respectively; `src/lib/storefront-fonts.ts` supplies scoped font variables with retained licences. Body is 15px/1.5. Arabic retains its actual body scale and normal heading tracking, rather than a separate invented type system. Product/brand strings remain factual mixed-script identities; use isolation and wrapping rather than invented translation.

Frontmatter roles record wide-screen values. Phone page titles use 25px; PDP titles 28→22px and prices 30→24px; campaign 32→23px. Card names 15→14px with1.4 leading; card prices 21→19px. Section headings vary by context: page groups 22px, compact category 18px wide and section-head 19px phone. Do not replace these with one large display scale. Shared Buttons inherit body typography in this scope; native campaign calls to action are bold. Verify label, input and error text on the actual form at each supported viewport.

Supporting metadata remains readable and subdued. Stock uses 11px with explicit status text. The 10px count exception is for redundant compact cart counts with a full accessible name; wide counts remain 12px. It is not a standalone target or a body-text rule. Preserve locale money formatting, the dirham SVG and the LTR numeric run; do not mirror currency or pack artwork. Long names wrap without losing accessible identity.

## Layout

The current container is 1240px with 24px wide and 16px phone gutters. The working proof changes major shell/task composition at 900px, intermediate grid behavior below 1200px and narrow ordering below 600px; a short-height adaptation applies at≤500px. Existing shared menu internals use their 768px breakpoint. These are distinct component responsibilities, not interchangeable global breakpoints. Test live resizing across their boundaries.

The selected home lead is full-width campaign followed by categories; wide home has five comparison columns. Phone proof uses compact two-column product comparison after the search/ad/category sequence. This describes the accepted working proof, not the earlier incumbent horizontal home rail. Category overflow stays local. Listings retain their own responsive columns/filter disclosure, not a universal five-column grid. Four-column/split query flags remain diagnostic comparisons only.

The spacing scale groups each product's photo, identity and buying facts tightly; passage between shopping decisions is wider. Card padding/gap use 10/14px wide, with route-specific compact phone treatment. Stock inset is 3/8px wide and 2/6px phone. Do not increase global padding, make each section a raised panel or shrink touch areas to achieve density.

Phone PDP imagery occupies the full top gallery with Back/Save/Cart overlays; desktop uses the global search shell and gallery/buying columns. The purchase dock measures its own content clearance, respects safe areas and replaces global bottom navigation in this task mode. Preserve final-content reachability, short landscape, keyboard, focus and scroll return.

## Elevation & Depth

Product cards are flat, bordered surfaces. Use tonal grouping for everyday shopping. Reserve the existing offset overlay shadow for suggestions/dialog context: `0 8px 24px #202a301c`; scrim is `#17263066`. The buying dock uses its existing white alpha surface `#ffffffeb`. These are runtime roles recorded in the sidecar, not another palette. No decorative blur, stacked card shadows or motion-only depth is required.

## Shapes

Default accepted shared/native actions use the control radius; explicit rounded/pill variants keep their existing API shapes. Equal-sided icon controls may be circular. Search outer and submit corners are separate roles, preventing an oval submit. Card, field, option/status and campaign radii have distinct frontmatter roles; do not override them with route utilities. The input example's 12px shape is distinct from default 10px actions.

Visible control boundaries/focus use the control/focus roles; the quiet card border is not an interactive affordance on its own. Minimum native action target is 44px; the standard shared Button example is 48px high with 12/24px padding. Bound long labels and allow wrapping instead of clipping or shrinking them.

## Components

Review the working patterns on the retail routes. The sidecar documents the shipped styles with standalone examples. The development comparison and component specimen were retired in P6-01.

- **Header/search/location/navigation:** keep known-item search prominent, delivery context and cart reachable; preserve suggestions, Enter/Escape, manual/GPS fallback and query URLs. Expanded location and menus must retain names, focus return, portal scope and RTL. No scanning/voice/chat affordance without a real capability.
- **Actions and fields:** `boundary.module.css` owns base/variant/meaning states. Default/accent is coral/text; secondary/outline/ghost/link/destructive have explicit meanings. Busy retains action treatment; unavailable is disabled. Invalid fields use error independently of the offer alias. Focus remains visible; shared component APIs continue outside this scope.
- **Product cards:** contained original photo, stock and saved controls, factual brand/pack where available, wrapping identity, dirham price and quick add. Do not invent chips, ratings, discounts or data missing from the catalogue. Actual in-cart quantity and stock checks persist. Offer/unknown-price/unavailable/placeholder cases stay honest; a layout sample is not saleable stock.
- **Gallery/options/quantity:** one-image products have no fake pagination; real thumbnails select real images. Only real family members get option links/current state. Preserve exact selected pack/price/availability, native quantity limits and server validation. Product comparison imagery stays static under hover. P4-02 retired the earlier card image zoom.
- **Campaign/categories:** use existing approved local art/provenance and semantic localized HTML copy, factual category links and real published content during migration. Generic art cannot impersonate staff, product packs or a delivery promise. Reference brands, device frames and watermarks are never assets.
- **Disclosures/sheets/feedback:** preserve semantic summary, real dialogs/popovers and focus management. Loading/status/empty/error/success semantics carry meaning. Demo feedback says no request/order was created; demo offer styling advertises no promotion.
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
