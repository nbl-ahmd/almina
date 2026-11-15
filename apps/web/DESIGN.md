---
name: Al Mina Customer Storefront
description: Implemented search-led bilingual pharmacy storefront candidate.
colors:
  brand: "#FF5A5F"
  brand-hover: "#FF7478"
  ink: "#24272B"
  muted: "#5D6269"
  page: "#FFFFFF"
  surface: "#FFFFFF"
  subtle: "#F5F5F4"
  border: "#D8DADD"
  accent: "#FCE8E8"
  teal: "#175B5A"
  ocean: "#454C53"
  sale: "#B4232D"
  sale-surface: "#FFF0F1"
  warning: "#80530D"
  warning-surface: "#FFF4DC"
  success: "#196443"
  success-surface: "#EDF5F0"
  logo-aqua: "#66BFBF"
  focus: "#24272B"
  control-border: "#8B8F96"
  control-hover: "#454C53"
  control-disabled: "#ECEEED"
typography:
  display:
    fontFamily: "Figtree, sans-serif"
    fontSize: "clamp(28px,3.3vw,44px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Figtree, sans-serif"
    fontSize: "clamp(26px,3vw,34px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  title:
    fontSize: "clamp(20px,2vw,24px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  product-title:
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Figtree, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-arabic:
    fontFamily: "Alexandria, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  price:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  category: "8px"
  control: "10px"
  card: "12px"
  panel: "16px"
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
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.control-disabled}"
    textColor: "{colors.muted}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  navigation-link:
    textColor: "{colors.ink}"
    height: "48px"
  catalog-chip:
    backgroundColor: "{colors.surface}"
  category-control:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.category}"
    padding: "10px 12px"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  checkout-field:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    height: "64px"
---
# Design System: Al Mina Customer Storefront

## Overview

**Creative North Star: "The searchable pharmacy"**

Al Mina puts useful search before browsing and keeps real packs, prices and buying controls easy to compare. Coral emphasis, white product ground and charcoal typography form a compact retail identity; category rectangles and contained photography connect discovery to the catalogue.

This records the implemented customer storefront candidate on 15 November 2026, replacing the earlier forward specification under the owner’s explicit redesign instruction. Implementation does not establish owner visual approval or production deployment. The exact coral accent and search priority are owner requirements; supporting tokens are extracted from the build. Admin and wholesale retain independent systems.

**Key Characteristics:**
- Search leads the shared header on phone and desktop.
- Flat white product cards keep pack, availability, name, price and action together.
- Compact categories use links, images and wrapping labels.
- English Figtree and Arabic Alexandria carry equivalent task hierarchy.
- Mobile purchase access stays above bottom navigation and safe areas.

Evidence: `src/app/(storefront)/storefront-tokens.css`, `storefront.css`, `storefront-checkout.css`, `layout.tsx`, `src/lib/storefront-fonts.ts`, and the navigation, search, menu, category, product-card and product-information components. Inspected captures: home English at 390/768/1440px, listing English at 1440px and product Arabic at 390px in `.verification-results/identity-overhaul/` at repository root. These are development previews with sample price/stock notices, not production-data evidence. [PRODUCT.md](PRODUCT.md) owns product truth; [surface contract](.impeccable/surfaces/apps-web-src-components-homepage-tsx.md) records the direction. Earlier brief/direction proposals do not override observed tokens here.

## Colors

A single coral identity sits on white and warm-neutral reading surfaces. Frontmatter keys match customer CSS custom-property suffixes; their values are the exact source palette. The CSS scopes them to the storefront shell/footer, rather than replacing root/shared defaults.

### Primary

**Al Mina Coral** (`brand`) identifies primary buying actions, search submit, selected mobile navigation and the main authored campaign. `brand-hover` lightens enabled purchase actions. Labels on coral use **Charcoal Ink**, including the search arrow; ordinary white labels on coral are not the implemented buying treatment.

**The Coral Legibility Rule.** Use ink labels on coral buying actions and reserve deep teal or ink for ordinary links on white.

### Secondary

**Logo Aqua** (`logo-aqua`) supports one discovery destination and the unchanged logo identity. **Deep Teal** (`teal`) carries readable browse links and supporting actions. These are subordinate to coral, not separate department palettes.

### Neutral

**Charcoal Ink** (`ink`, also `focus`) anchors reading and focus. **Muted Grey** (`muted`) carries metadata; **Slate** (`ocean`, also `control-hover`) supports descriptive copy and boundaries. **White** (`page`, `surface`) carries photography and catalogue content. **Soft Neutral** (`subtle`) groups fields, categories and footer. `border` separates content; `control-border` supplies stronger input boundaries; `control-disabled` is an opaque unavailable fill. **Pale Coral** (`accent`) supports selection and navigation context.

Success, warning and sale/error roles each have their own foreground and pale surface. Available stock pairs success colour with words; unavailable stock pairs muted text with a neutral ground. Sale savings require actual data. Search browse tiles also reuse existing pale accent/status surfaces as discovery backgrounds; those fills alone do not assert a semantic state.

**The State Is Content Rule.** Keep availability, savings, errors and pending outcomes explicit in words; colour alone does not establish a commerce fact.

## Typography

**English display and body:** locally hosted variable Figtree. **Arabic display and body:** locally hosted variable Alexandria. The source loads weights 400–800 with swap and no font preload through `next/font/local`; retained OFL files sit beside the assets. Files are approximately 23 KiB and 89 KiB respectively. Family names in the frontmatter describe these local assets; generated framework family names are not portable tokens.

The sans-serif hierarchy keeps product labels compact and complete. Frontmatter records desktop/base roles, not an invented modular scale. Page/PDP headings use the headline clamp; section headings use the title clamp. Campaign display is the larger, tighter exception. Product-card names use normal tracking, with price in semibold tabular numerals. Supporting metadata is usually 12–14px; description copy uses 14px with a 28px line height and a prose-width column.

Below 768px, product titles become 14px/1.4 and prices 18px/1.3; the card title has a 40px minimum height but remains wrapping. Mobile campaign display is 28px/1.05. Arabic shell body uses 1.75 line height and normal heading tracking; generic headings use 1.5, campaign headings 1.4. More specific PDP rules still set 1.25/negative tracking and card rules 1.4/normal tracking: the Arabic shell rule is not a universal override. Mixed Latin product names remain literal catalogue names. Native Arabic/pharmacy review remains necessary.

**The Exact Pack Rule.** Let identifying names and pack details wrap rather than clipping them to manufacture equal card heights.

## Layout

The fluid shell has a 1360px maximum width. Header/footer gutters are 32px on desktop and 16px below 768px. Main uses the same horizontal gutters; vertical spacing combines stylesheet rules and layout utilities, so it is not a universal padding token. The recurring spacing primitives are a 4px-based set; home passages use 40px gaps on wide screens and 24px on mobile, with 20px/12px product gaps.

Desktop groups logo, flexible search, delivery, account and cart, followed by department/language navigation. At 1100px and below the account shortcut disappears and the header tightens. Department links wrap at intermediate widths. Below 768px the header is sticky: logo/address/cart share the first row, full-width search the second; department navigation yields to fixed bottom navigation. Search is 54px minimum on wide screens and 52px on phones, with 44px submit/clear targets. Tablet is a deliberate intermediate layout, not a mobile breakpoint alias.

Home categories use six columns, four at widths through 1100px, then a horizontally scrollable mobile strip of 158px-wide links. Home products use four columns through tablet and two below 768px. Desktop listing uses a filter column and three product columns at 1024px and above; narrower results retain the responsive base grid. Desktop PDP pairs gallery and information with a 48px gap. Mobile stacks the gallery first and fixes the purchase row above the 64px bottom-navigation allowance plus safe area. Checkout hides competing navigation below 1024px and supplies its own bottom action; wide checkout pairs the form with a 380px order panel inside 1160px.

Logical margins, padding and directional arrows support RTL; logo and product photography retain their original orientation. Fixed-action clearances, footer bottom padding and input scroll margins belong to the relevant flow, not to all surfaces.

## Elevation & Depth

Catalogue cards, campaign panels, categories and the mobile PDP dock use flat fills, borders and whitespace. Cards clarify their border on hover without translating the whole card. Raised shadow is reserved for temporary search/menu overlays: `0 10px 32px -12px rgb(36 39 43 / 25%)`. Overlays can use an ink scrim. Checkout’s faint top action shadow is an inherited local treatment, not the global card style.

**The Flat Comparison Rule.** Preserve the stable card plane; distinguish active boundaries and floating overlays without lifting every product surface.

Feedback uses 150ms colour/border changes. Menu directional affordances use 150–200ms transitions; product images retain a motion-safe 300ms scale to 1.035 on group hover. Checkout retains pointer-gated 200–280ms local settling effects and loading feedback. Reduced motion suppresses nonessential transitions/animations. These observations do not authorize new entrance choreography.

## Shapes

Softly squared geometry uses category/media corners (8px), controls (10px), product/campaign surfaces (12px) and overlays (16px). Stock labels use 4px corners; search submit uses 7px. Listing category chips and the all-categories menu trigger retain fully rounded geometry, and small status marks/quantity controls use their observed local forms. Pills are not prohibited: they exist for these navigation/filter contexts. Contained pack photography, restrained borders and square image proportions carry catalogue recognition.

## Components

### Buttons

Coral purchase buttons use ink labels, 10px corners and enabled hover lightening. Standard `.button` geometry is a 48px minimum with 12px 20px padding; PDP add uses a 52px minimum. Ink buttons with white labels serve campaign/filter actions. Secondary buttons use white/ink and the stronger control boundary. Compact card add is a 44px square with a plus SVG and accessible name. Disabled purchase buttons replace fill with opaque disabled neutral, muted text and divider boundary; do not generalize inherited primitive opacity into a colour token. Shared primitives still carry their own variant details.

Keyboard focus uses a visible 2px ink outline with a 3px shell offset; search/checkout field wrappers use 2px offsets. Retain per-control focus ownership rather than adding a second outline to every nested input. No new pressed transform is specified for general buttons; the retained checkout payment choice alone scales to .99 in its pointer motion rule.

### Inputs / Fields

Search is a white, strongly outlined form with a 16px entry, coral submit and context panel. Focus-within makes the form boundary/outline explicit. Its input remains borderless; suggestions keep keyboard active state, loading, empty and failure feedback, with normal GET search available on failure. Local device search history has a clear action.

Checkout uses persistent inset labels: 64px fields on desktop, 60px below 1024px, 12px corners, subtle ground and white focused ground. Invalid fields use the sale/error boundary and associated messages. Ordinary inputs elsewhere use their current scoped/shared variants; the checkout inset label is not a mandatory form pattern everywhere.

### Navigation

Desktop uses a pale-coral all-categories trigger, plain department links with coral hover/current underlines, and a language control. Category popover and mobile side sheet retain focus/Escape handling. Mobile bottom navigation marks current destinations through coral behind the icon plus text. The header location is a saved area context, not a delivery-fee or ETA promise. Footer uses real service/policy links in a compact multi-column close, with two-column mobile groups.

### Chips / Categories

Listing chips are outlined rounded route links, using ink at 75% opacity when unselected and white on ink for the current route. Home categories are softly squared subtle links with an image or inline SVG fallback and wrapping labels, not tabs. Their boundary darkens on hover. Preserve a discoverable all-categories route and scrollable mobile overflow.

### Product Cards / Gallery

Cards have a 1px divider border, 12px corners and 12px padding (10px on mobile). A square contained-media area leads, with textual availability and save control above metadata, wrapping name and price/action. Selected save state uses sale foreground/pale sale ground. Family products show choose-options instead of quick-adding an arbitrary variant. Missing media retains the shopping-bag SVG and “Photo coming soon” message. The sidecar card preview deliberately represents that real fallback, not invented product photography.

The PDP gallery uses a subtle ground, 12px corners and 32px padding (20px mobile); thumbnails have 8px corners. Information stays unboxed. Buying context and status remain together; the same purchase controls move into the mobile dock. Product details use anchor navigation, optional fact rows and expandable authored information rather than invented claims.

### Checkout

Checkout retains server-confirmed review and feature-gated methods. Selected payment choice is white with an ink boundary/inset stroke and radio mark; errors, disabled methods and submission states remain explicit. Its blue confirmation mark/ring and cool order-panel fill are inherited exceptions, not additions to the customer palette.

## Do's and Don'ts

### Do:
- Do use coral with ink foreground for primary buying emphasis.
- Do preserve complete pack identity, factual stock, actual imagery and locale-aware prices.
- Do keep visible focus, textual states, keyboard search and reduced-motion behaviour.
- Do compose RTL with logical geometry while retaining literal product and logo orientation.
- Do keep customer tokens scoped and preserve independent admin/wholesale consumers.

### Don't:
- Don't turn implementation evidence into owner visual approval or production release acceptance.
- Don't use ordinary white labels on coral buying actions or small coral text on white.
- Don't invent ratings, certifications, delivery promises or sale states from reference imagery.
- Don't promote retained checkout blue/grey exceptions or legacy care-colour families into this palette.
- Don't introduce decorative kickers, card-lift choreography or duplicate fixed buying controls.

The sidecar’s eight-step colour ramps are synthesized OKLCH inspection aids, not runtime shades or additional approved tokens. CSS previews resolve the scoped variables with literal source-value fallbacks; they do not load application fonts or execute search/commerce behaviour.

Not canonized or repaired: inherited checkout confirmation blue/order-panel hardcoded fills, more specific Arabic PDP typography, shared baseline consumption, and the search panel’s uppercase tracked English heading. They remain source exceptions/defects rather than future system rules; this documentation pass changes no runtime code. Native Arabic review and owner screen acceptance remain outstanding.
