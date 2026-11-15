---
name: Al Mina Customer Storefront
description: Familiar pharmacy shopping in coral and aqua, from mobile app rhythm to wide retail layouts.
colors:
  ink: "#192f3a"
  muted: "#586973"
  brand: "#ff6363"
  brand-hover: "#f35353"
  page: "#f7f9fa"
  surface: "#ffffff"
  subtle: "#f0f4f5"
  border: "#dce5e8"
  accent: "#e4f5f4"
  teal: "#126c70"
  ocean: "#395865"
  sale: "#a62e43"
  sale-surface: "#fff0f1"
  warning: "#805213"
  warning-surface: "#fff5e2"
  control-border: "#889aa4"
  control-hover: "#47636f"
  control-disabled: "#e9eef0"
  focus: "#126c70"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(32px,4.2vw,54px)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(1.75rem,3vw,2.5rem)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-.025em"
  section:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(1.25rem,2vw,1.75rem)"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-.025em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: ".9375rem"
    fontWeight: 750
    lineHeight: 1.4
    letterSpacing: "-.01em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: ".8125rem"
    fontWeight: 700
  body-arabic:
    fontFamily: "Noto Sans Arabic, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  control: "12px"
  card: "16px"
  panel: "24px"
  category: "14px"
  support: "20px"
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
  button-accent:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-accent-hover:
    backgroundColor: "{colors.brand-hover}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-disabled:
    backgroundColor: "{colors.control-disabled}"
    textColor: "{colors.muted}"
  quick-add:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
    width: "44px"
    padding: "10px"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  stock-tag:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.teal}"
    padding: "4px 7px"
  purchase-button:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "52px"
---

# Design System: Al Mina Customer Storefront

## Overview

**Creative North Star: "A familiar pharmacy app"**

A familiar pharmacy app becomes a spacious retail website on desktop. Al Mina’s unchanged logo supplies the coral/aqua colour family; dark blue-gray text, white product surfaces and a quiet cool-gray canvas keep the catalogue readable. Rounded controls and contained product photography support quick comparison and purchase.

This guide covers customer storefront surfaces under `.storefront-shell` and the matching `.storefront-footer`. Admin, wholesale and their guides remain independent. `PRODUCT.md` owns product truth; the surface direction contract owns page strategy. The source of truth for these tokens is `src/app/(storefront)/storefront-tokens.css`, with applied rules in `storefront.css`, `storefront-checkout.css` and sampled components. Shared global styles remain a compatibility dependency, not permission to restore their retired identity.

**Key Characteristics:**
- Coral purchase actions and aqua support surfaces.
- Contained catalogue photography with factual product/status labels.
- Compact mobile discovery and deliberate desktop grids.
- Locale-specific local type, logical spacing and mirrored directional icons.

## Colors

Coral brings purchase emphasis; aqua carries calm grouping and status, with cool neutrals doing most of the structural work. Exact values are normative in the frontmatter.

### Primary
- **Logo Coral** (`brand`): add-to-cart, campaign and contact actions, paired with ink text. `brand-hover` is the darker interactive state.
- **Blue-gray Ink** (`ink`): headings, prices, primary task buttons and search submission. White text belongs on the dark buttons, not on coral purchase controls.

### Secondary
- **Quiet Aqua** (`accent`): hero/support fields, category media, stock tags and selected filter backgrounds.
- **Deep Teal** (`teal`, also `focus`): links, available-stock text and keyboard focus.
- **Ocean Slate** (`ocean`): supporting navigation and descriptions.

### Neutral
- **Cool Canvas** (`page`): shopping background. **White Surface** (`surface`): cards, header, gallery and footer.
- **Mist** (`subtle`): search, quantity and form grouping. **Divider** (`border`): card edges and section separators.
- **Muted Slate** (`muted`): supporting metadata; `control-border` and `control-hover` give form boundaries more definition than decorative dividers. `control-disabled` distinguishes unavailable actions.
- **Berry Status** (`sale`, `sale-surface`): actual savings, invalid fields and selected saved/navigation treatments. **Amber Status** (`warning`, `warning-surface`): warnings.

**The One Palette Rule.** Customer `care-blue` and `care-mint` aliases resolve to aqua; `care-peach` resolves to the sale surface and `care-sun` to the warning surface. They are temporary compatibility names, not four independent pastel systems.

## Typography

**Display Font:** Manrope, with sans-serif fallback, for English.
**Body Font:** Manrope for English; Noto Sans Arabic, with sans-serif fallback, for Arabic. Each locale selects its own `next/font/local` class for the whole storefront.

**Character:** Rounded, compact sans-serif type keeps retail labels clear while weight separates headings and prices. `storefront-fonts.ts` loads local variable faces (400–800), `display: swap`, `preload: false`; the Latin subset is approximately 28 KiB and Arabic approximately 335 KiB, with licences beside the files. These implementation facts make no Core Web Vitals claim.

### Hierarchy
- **Display:** the frontmatter display role is the fallback campaign headline. Mobile uses a smaller size (1.6875rem); configured campaign artwork can have its own composition.
- **Headline / Section:** fluid page and section headings use the frontmatter ramps. PDP names use `clamp(24px,3vw,36px)` with a mobile override (1.5625rem).
- **Title:** product card names use the title role; mobile reduces to (.875rem) and reserves a minimum name height (40px). Labels wrap, including long category names.
- **Body:** the body role is the storefront base; descriptions commonly use (.8125–.9375rem). Intro copy has an observed maximum measure (65ch).
- **Label:** section links and category names use the label role. Stock text is smaller (.6875rem) with a compact line-height (1.35). Prices use tabular numerals, typically (1.125rem) or mobile (1.0625rem).

**The Script First Rule.** Arabic uses normal letter spacing and base heading line-height (1.5), while component-specific heading rules may override it. Do not transplant English tracking or uppercase styling into Arabic.

## Layout

The centered content boundary is (1280px), including desktop inline gutters (24px); mobile gutters are (16px). Main bottom padding is (48px), reduced to (40px) on mobile. The spacing scale is inherited from global `--space-*` values and reinforced by the storefront’s repeated gaps and padding. Home sections use (32px) gaps, reduced to (28px) on mobile.

Mobile treatment ends at (767px): sticky integrated header, logo/address/cart row, full-width search beneath, horizontal department rail and two-column shelves. The final department tile is a horizontal white outlined link (164px basis), with an aqua icon/photo area and wrapping name. Desktop uses a single logo/search/address/account/cart row and separate department navigation; home shelves become four columns at (768px). Categories use six columns on wide screens and three below (1024px).

Listings use a native filter disclosure, initially collapsed on mobile and opened after hydration at (1024px) by the small media-query island. The desktop sidebar is (272px); the results grid has three columns beside it, rather than the homepage’s four. Keep GET filter/search forms and query URLs. Product details become two equal columns at (768px), with gallery first and an unboxed reading/purchase column.

**Clear dock geometry.** Below (768px), PDP purchase controls sit above bottom navigation at `calc(78px + env(safe-area-inset-bottom))`, inset (12px). Preserve safe-area spacing and page-bottom clearance. Checkout hides regular mobile navigation/contact below (1024px), replaces it with its own fixed action, and uses a persistent desktop review column (380px) inside a narrower boundary (1160px).

## Elevation & Depth

White surfaces, pale fields and borders carry most separation. Cards change border colour on hover; they do not lift with a hard shadow. The raised shadow token (`0 12px 36px -14px rgb(32 53 65 / 22%)`) supports floating contact, search suggestions and the mobile purchase dock. Mobile navigation uses a softer upward shadow (`0 -8px 28px -20px rgb(32 53 65 / 28%)`); checkout’s fixed action uses (`0 -4px 20px rgb(0 0 0 / 3%)`).

**The Product Surface Rule.** Keep cards and product reading areas quiet; use elevation to separate overlays and fixed actions from the browsing plane.

## Shapes

Controls use the control radius, product cards the card radius and gallery/purchase panels the panel radius from frontmatter. Category tiles use the category radius; support panels use the support radius. Search, quantity controls and the full PDP purchase action use pill geometry. Stock tags are compact rounded rectangles (5px); secondary product metadata uses (4px). Functional SVG icons accompany text or accessible names; source photography is contained rather than cropped into decorative silhouettes.

## Components

### Buttons

Coral purchase actions use ink text; dark task actions use white text. Secondary actions are white with a stronger control border. General controls have a minimum height (44px), standard fields (48px) and full PDP add actions (52px). The compact quick-add target is (44px square), visually a plus/check/loading icon with a full accessible action name. Saved state uses berry text and its pale surface; disabled controls use the disabled fill and muted text. Keep pending, added and unavailable feedback from the existing component.

Keyboard focus uses a teal outline (2px) with an offset (3px), unless a component defines its own explicit focus treatment. Standard feedback duration is (150ms). Product photos have a motion-safe subtle hover scale (1.035 over 300ms); checkout’s small stage/confirmation animations depend on pointer modality. Reduced-motion rules disable animations and transitions. Do not introduce continuous decorative motion.

### Chips

Stock tags pair aqua and deep teal, switching to subtle/muted when unavailable. Brand/category metadata uses a quiet subtle background. Category navigation uses white outlined pills with a dark selected state; applied filters use aqua pills. These are factual labels or real destinations, not decorative claims.

### Cards / Containers

Product cards use white, a divider border, card corners and desktop padding (12px), reduced to (10px) on mobile. Square image areas contain the complete pack shot. Stock and saved controls occupy the top corners, metadata and wrapping product name follow, and price/add controls align at the bottom. Multiple-option families use the existing option link instead of pretending quick-add can choose a variant. Missing images retain the honest photo fallback.

### Inputs / Fields

Search is an integrated pale pill with dark submit action and accessible suggestion states. Standard forms retain visible labels. Checkout fields place persistent labels inside the field: desktop height (64px), mobile (60px), subtle resting fill, white focus fill and teal focus border/outline. Invalid fields use the sale colour. Selected payment methods retain the existing dark border/inset outline; do not infer a new payment capability from their styling.

### Navigation

Desktop keeps logo/search/address/account/cart together. Mobile removes the utility/department bars and account shortcut, preserving a compact header and five equal bottom destinations. Current mobile navigation has a pale berry icon field; labels remain visible. The footer is a practical contact and destination index with four link groups beside the brand on wide screens and two columns on mobile.

### Gallery and purchase dock

The white gallery leads the PDP, with contained photography and selectable thumbnails. Name, real price/stock/options and description follow. Desktop purchase controls stay in the reading column; mobile makes quantity and add-to-cart persistent above bottom navigation. Product information uses real section links/disclosures and specifications rather than invented marketing copy.

## Do's and Don'ts

### Do:
- **Do** reuse the scoped storefront tokens and preserve admin/wholesale boundaries.
- **Do** show exact catalogue media, real prices, availability, options and savings only when supported by data.
- **Do** preserve wrapping names, English/Arabic layout, accessible action names, keyboard focus and reduced motion.
- **Do** preserve GET navigation, existing URLs and server-authoritative commerce behavior.
- **Do** keep sticky purchase actions clear of bottom navigation and safe areas.

### Don't:
- **Don't** revive separate pastel palettes through compatibility alias names.
- **Don't** copy reference screenshot claims, reviews, discounts, certifications or delivery promises into Al Mina content.
- **Don't** publish reference screenshot crops or local fixture photography as new shipping assets without established rights and product fidelity.
- **Don't** extend inherited eyebrows, kickers or uppercase tracking into new storefront surfaces.

Recorded limits, not canonized: the compact legacy card/search panel retains uppercase tracked metadata; inherited eyebrow styles remain available globally. Retained checkout receipt styling contains hardcoded blue success colours and a gray order-panel fill, which are local exceptions rather than additional storefront palette tokens. No source changes or repairs are made by this record. Local preview captures use synthetic prices/stock and include an imperfect source photo and a single-pack variant limitation; the bilingual sample-data notice is development-only behind `ALMINA_REFERENCE_PREVIEW`, not production guidance. Evidence: reviewed component/styles listed above and current English mobile home, desktop listing and Arabic mobile PDP captures under `.verification-results/reference-redesign/`; the finish verdict covers the scored fixes, not universal accessibility certification. No deployment is implied.
