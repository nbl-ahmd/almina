> **SUPERSEDED — historical record only.** Archived on 18 November 2026 by P2-05. Excluded from current design guidance. Read `apps/web/DESIGN.md`, the active brief and decision register. Do not regenerate tokens or restore instructions from this record.

---
name: Al Mina Customer Storefront
description: Reference-led pharmacy app storefront with compact purchase cards.
colors:
  brand: "#ff5a5f"
  brand-hover: "#ff7478"
  ink: "#24272b"
  muted: "#5d6269"
  page: "#f6f6fe"
  surface: "#ffffff"
  subtle: "#efeff8"
  border: "#e2e3ec"
  accent: "#ffe7e9"
  teal: "#175b5a"
  ocean: "#454c53"
  sale: "#b4232d"
  sale-surface: "#fff0f1"
  warning: "#80530d"
  warning-surface: "#fff4dc"
  success: "#196443"
  success-surface: "#edf5f0"
  ad-surface: "#ffb9bc"
  logo-aqua: "#66bfbf"
  focus: "#24272b"
  control-border: "#8b8f96"
  control-hover: "#454c53"
  control-disabled: "#eceeed"
typography:
  display:
    fontFamily: "Figtree, sans-serif"
    fontSize: "clamp(28px,3.3vw,44px)"
    fontWeight: 600
    lineHeight: 1.15
  headline:
    fontSize: "clamp(24px,3vw,32px)"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontSize: "clamp(20px,2vw,24px)"
    fontWeight: 600
    lineHeight: 1.3
  product-title:
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Figtree, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-arabic:
    fontFamily: "Alexandria, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  supporting:
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  price:
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  label: "5px"
  quick-add: "13px"
  control: "16px"
  card: "18px"
  mobile-ad: "22px"
  panel: "24px"
  pill: "999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-6: "24px"
  space-8: "32px"
  space-12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "12px 20px"
  quick-add:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.quick-add}"
    width: "44px"
    height: "44px"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "10px"
  category-chip:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ocean}"
    rounded: "{rounded.label}"
    padding: "2px 5px"
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---
# Design System: Al Mina Customer Storefront

## Overview

**A pharmacy app, ready to shop.** Reference 02 establishes the home and product-detail composition; the owner's latest close-up product-card image establishes card anatomy. This records the implemented local candidate on 15 November 2026, replacing the rejected category-first/packshot-campaign guide. Owner visual acceptance remains pending. No deployment is authorized.

PRODUCT.md owns product truth. DESIGN-BRIEF.md and docs/design/decisions.md record precedence. Primary #FF5A5F is confirmed by the owner; supporting choices are implemented proposals. Admin and wholesale retain independent systems. The customer-scoped storefront-tokens.css is the runtime source; this guide and .impeccable/design.json describe it, rather than generating it from a retired palette.

Evidence: storefront.css, storefront-tokens.css, storefront-checkout.css, storefront-fonts.ts, homepage, navigation, category-tile, product-card, currency-amount, cart-controls and PDP source. Current images and checks are under repository-root .verification-results/pharmacy-app-reference and .verification-results/product-card-polish. Development preview prices/stock are visibly sample data.

## Colors

Cool pale lavender `page`, white `surface` and dark `ink` reproduce the reference's light app ground. `subtle` supports compact information chips and fields; `border` outlines cards and boundaries. The courier ad uses `ad-surface`, a pale coral field. Exact `brand` marks primary search/purchase; use ink labels for readable contrast. Do not replace the confirmed coral with the close-up reference's green.

`teal` supports ordinary readable links; `logo-aqua` preserves the existing logo family. Sale, warning and success are semantic roles, accompanied by real words/data. Never infer popularity, discount, review, medical or delivery claims from color. Hover and disabled roles remain explicit. The customer palette is scoped to storefront shell/footer, not shared root defaults.

## Typography

Self-hosted Figtree and Alexandria remain deliberate choices for a rounded, restrained sans hierarchy, with retained OFL files and next/font/local. Section headings are 600 weight; normal text is 400. Arabic has 1.75 body line height and normal tracking; script-specific headings retain their observed local rules.

Product names are 15px/1.35, 600; mobile names are 14px with wrapping rather than truncation. Main card prices are 20px/1.2, 700; mobile prices are 18px. Compact related rows use smaller 14px amounts. Chips and stock labels are 12px; supporting search/navigation labels use the documented 13px role. Mobile PDP title is 23px/1.35, 500; campaign title 24px/1.15. Header/supporting metadata uses 10–14px according to role. These role sizes are observed implementation, not a universal modular scale.

Brand and trailing pack may be removed from the visible title only when they exactly repeat the adjacent factual chips. The full original name remains the product-link accessible name. Never shorten distinct variant/strength information or invent a replacement product title.

## Layout

The customer shell uses a 1280px maximum. Desktop/tablet gutters are 32px, mobile 18px and narrow-phone gutters below 360px are 12px. Compact related groups use 8–16px gaps; major home passages use 24–28px. Search is visible in the global shell alongside logo, delivery context and cart. Desktop adds department/language navigation. At 768–1023px logo, area and cart occupy one row, with full-width search beneath; department links scroll within their own row when needed. Mobile places a compact menu/search/cart row below logo/area and retains bottom navigation outside PDP/checkout.

Phone/tablet home order: search → photographic courier ad → circular category media and labels → image-led product discovery. Below 768px the home rail keeps cards between 156px and 220px, with continuation visible; at 768–1023px it uses 240px scrolling cards and a 240px minimum campaign height. From 1024px, campaign and a three-column circular category directory share a row, with four product columns underneath. Equal-height campaign/category panels bring products into the initial desktop view. A missing category directory lets the campaign use the full row. Listing uses two columns on phones, three from 600px, and four with a 240px filter sidebar from 1280px; 1024–1279px retains three result columns beside filters. Existing filters/GET URLs remain unchanged. Closed desktop filters retain a visible disclosure until the responsive effect opens them. Rails scroll locally; cards establish a positioning context so hidden labels cannot escape their scroll bounds.

Desktop/tablet PDP pairs a 320–430px unframed gallery with title/brand, price, real options, stock and quantity/purchase, separated by 32px. Related rows become a single column below 1024px. Mobile uses a back/search/save/cart toolbar and fixed bottom purchase dock, replacing competing global header/bottom navigation. Compact related rows follow the buying sequence, then actual summary, delivery/policy/SKU, description/specifications/reviews. Safe-area padding and footer clearance keep the last content reachable. Short landscape phones place quantity and purchase on one dock row to protect reading space. No fabricated options or carousel dots appear for missing options/single-image products.

RTL mirrors layout and directional navigation. Product photos/logo retain orientation; the decorative courier faces the campaign copy. Latin pack chips keep LTR text order. Currency symbol/number stay together in an LTR isolated run, with the symbol before the number in both locales.

## Elevation & Depth

Product cards use a fine border and white fill. Wishlist controls use a restrained 0 2px 4px black-at-6% shadow; product cards do not lift on hover. Search uses a faint shadow; floating overlays retain the scoped raised shadow. PDP photography has no gray mat or enclosing panel. Retained checkout-local shadows, payment colors and geometry are compatibility implementation, not new general-purpose tokens.

Feedback uses short color/border transitions. Existing motion-safe image scaling and checkout-specific effects remain; reduced-motion support suppresses nonessential animation. Do not add entrance choreography or decorative effects that delay shopping.

## Shapes

Cards use 18px corners and 10px padding. Media areas are capped at 156px on desktop and 120px on mobile, with contained photography. Chips use compact 2px 5px padding, and names have an 8px gap before the purchase row; full names may wrap beyond two lines. Quick add uses a 44px square with 13px corners. Search uses a 24px field frame with a 16px labelled action. Desktop cart uses a 16px labelled control; phone icon cart and wishlist controls are equal-sided circles. Category photographs remain circular. Category photos are 68px on mobile, 72px on tablet and 60px in the desktop category directory, with labels beneath. Chips use 5px corners, stock labels 4px. Ad uses 22px mobile/24px desktop corners. Radius tokens are not a mandate to give every element the same form.

## Components

**Product card.** Stock label and wishlist sit around contained exact product media. Brand and pack chips precede a semibold name. Strong price and quick-add share the final row where space permits. Full names wrap, and long/missing information has an honest state. Pack chips prefer packLabel, then validated family options; a literal measurement may be copied from the existing product name without inventing pack metadata. Ratings are omitted because current catalogue cards carry no verified aggregates; do not fetch reviews per card or copy reference numbers.

**Price.** CurrencyAmount displays an inline monochrome dirham SVG with locale-formatted digits and an accessible full currency amount. It changes presentation only: calculation, server amounts, JSON-LD currency and internal money formatting remain untouched. The symbol follows UAE currency-symbol structure/guidance; source is documented with the implementation report. No mirrored mark, font-glyph fallback or decorative currency treatment.

**Purchase.** An initial plus enables one-click add for a single product; products requiring variant selection link to their existing options. The same server check validates each addition. Compact controls show actual device-cart quantity plus a small plus after adding, restore on reload and synchronize through existing storage/cart events. Accessible description announces the count. Pending, unavailable and failed additions remain explicit; rejected additions never increment the visible quantity. This is not an authoritative stock indicator. Cart/PDP retain existing quantity/removal flows.

**Campaign and category media.** Generated courier and six generic category illustrations are decorative owned assets, with exact prompts/provenance under docs/design/storefront/campaigns. Campaign text/CTA are live bilingual HTML. Actual category media wins; generated illustration never substitutes for saleable product photography or depicts actual staff.

**Control ownership.** `storefront-controls.css` is the sole customer owner for primary action colours, radius, hover/disabled states and search/cart geometry. Shared Button APIs retain admin behavior. Customer default/accent actions are coral/ink, secondary actions outlined, ghost/link actions transparent. Page CSS supplies layout; do not recreate slot styling in page overrides. Labelled buttons use the control radius; a 50% radius is reserved for equal-sided icon controls. Search submit, clear and delivery controls retain44px hit areas. The phone suggestion panel spans the header shell rather than the narrow input wrapper.

**Cart.** One mobile next-step bar sits above bottom navigation; desktop uses one summary action. Server-loaded unit prices supply integer-minor-unit line and merchandise estimates, explicitly separated from delivery/tax/final quote. Counts identify total items and distinct products. Unavailable ordering uses state-specific copy; no checkout enablement changes. Summary precedes recommendations; recommendations exclude already-saved cart product IDs. Repeated help and continuation sections are consolidated. Core currency presentation includes PDP/cart/checkout, saved/recent cards and hosted-payment return, with ISO currency retained internally.

**Secondary navigation and empty states.** Phone footer groups and secondary menu groups collapse natively; desktop links remain expanded. Single-page pagination is omitted. Empty search has one main no-results explanation and localized surrounding labels for literal search terms. Review-list failures are distinguished from verified-purchase submission requirements. Real product summaries can fill an otherwise absent description; no medical content is invented.

**Search, location and navigation.** Preserve existing suggestions, keyboard/Escape behavior, query fallback, manual/GPS area choice, errors, reload and route semantics. Do not infer scanner, camera or chat features from the reference.

**Commerce continuity.** Existing checkout styling is still imported, scoped to customer context. Admin/shared/wholesale rules and component APIs remain independent. Preserve server pricing, tax, fees, stock, auth, idempotency and order behavior; new component appearance cannot alter those contracts.

## Do's and Don'ts

- Use reference 02 for composition and reference 05 for compact product-card anatomy; preserve the owner's coral and actual logo.
- Keep names, variant identity, real prices, actions, focus and truthful status visible in English and Arabic.
- Preserve actual summaries/descriptions and existing route/query/SEO behavior while moving secondary information.
- Keep generated illustrative media separate from factual product associations; retain asset prompts.
- Do not restore the rejected category-first/dark-aside design, copy reference ratings/promises or invent neutral replacement tokens.
- Do not turn sample fixtures, passing automated tests or a design review into owner acceptance or production approval. No deployment.
