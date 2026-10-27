---
name: Al Mina customer storefront
description: Logo-coral neighbourhood care with clear commerce and pastel bento surfaces.
colors:
  brand: "#ff6363"
  brand-hover: "#f35353"
  ink: "#192321"
  muted: "#56605d"
  ocean: "#334a46"
  teal: "#126157"
  page: "#fafbfa"
  surface: "#ffffff"
  subtle: "#f3f6f5"
  border: "#dce3e0"
  accent: "#e2f1ee"
  care-blue: "#e6f2fc"
  care-mint: "#e6f3e9"
  care-peach: "#fff0e9"
  care-sun: "#fbf6d9"
  footer-band: "#e6f2fc"
  footer-card: "#e6f3e9"
  sale: "#a32b38"
  sale-surface: "#fff0f1"
  warning: "#79501c"
  warning-surface: "#fff8e6"
  control-border: "#8b9892"
  control-hover: "#586d63"
  control-disabled: "#eef0f4"
typography:
  display:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(2.25rem, 4.5vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(1.75rem, 3.4vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  section-mobile:
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.03em"
  section-desktop:
    fontSize: "28px"
    fontWeight: 600
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontSize: "0.875rem"
    fontWeight: 600
  caption:
    fontSize: "0.8125rem"
    fontWeight: 600
  supporting:
    fontSize: "0.9375rem"
    lineHeight: 1.6
    letterSpacing: "0.005em"
  arabic:
    fontFamily: "Arial, Tahoma, sans-serif"
rounded:
  control: "12px"
  compact-media: "14px"
  card: "16px"
  panel: "20px"
  pill: "9999px"
spacing:
  one: "4px"
  two: "8px"
  three: "12px"
  four: "16px"
  six: "24px"
  eight: "32px"
  twelve: "48px"
  sixteen: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "48px"
  button-accent:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.teal}"
  button-destructive:
    backgroundColor: "{colors.sale}"
    textColor: "#ffffff"
  input:
    backgroundColor: "{colors.subtle}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "48px"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "12px"
  savings-badge:
    backgroundColor: "{colors.care-peach}"
    textColor: "{colors.sale}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
---

# Design System: Al Mina customer storefront

## Overview

**Creative North Star: "The modular care cabinet"**

Al Mina's customer storefront pairs the existing coral pharmacy identity with calm white surfaces, dark readable labels and pastel compartments. Generous product media, compact utility navigation and clear purchasing controls keep everyday shopping approachable. This record describes the implemented customer shell and shared shopping components; administration retains its separate system.

The approved composition aims for roughly 60% white, 30% pastel blue/mint/butter and 10% coral emphasis. This is a compositional intent, not a measured screen quota: uploaded artwork, real product imagery and route content naturally change the balance. Existing decorative artwork is reused; exact catalogue imagery and factual commerce content remain distinct.

**Key Characteristics:**

- Selective logo-coral emphasis with dark labels; neutral everyday controls.
- White product surfaces within selective pastel bento groups.
- Geist typography, 12–16px recurring corners and comfortable controls.
- Real catalogue content and legible price, option and availability hierarchy.
- Editorial motion with reduced-motion support and static commerce layout.

## Colors

The palette combines warm coral emphasis with green-tinted ink and cool, quiet surfaces. Frontmatter values follow `src/app/(storefront)/storefront.css`, which overrides the legacy global palette inside `.storefront-shell`.

### Primary

- **Logo coral** (`brand`): campaign CTAs, focused product purchase and selective emphasis; `brand-hover` is the darker interaction state. Ink on coral has approximately 5.54:1 contrast.

### Secondary

- **Care blue, mint, peach and butter** (`care-*`): editorial/category compartments. They support grouping rather than communicate a discount or stock state.
- **Pale-blue footer band** (`footer-band`): the closing surface on every storefront route. A white panel sits inside the band and a `footer-card` mint help card sits inside the panel, so depth comes from three stacked fills rather than a dark ground. Ink and ocean carry text, logo coral stays the CTA fill with ink labels.
- **Quiet teal** (`teal`): text links, availability and supporting commerce feedback. `accent` supplies a quiet mint interaction fill.

### Neutral

- **Care ink** (`ink`): main text, focus outlines, dark support panels and floating contact.
- **Muted / ocean**: supporting descriptions, metadata and locality text.
- **Page / surface / subtle**: off-white canvas, white cards and quiet filled fields/media wells.
- **Border / control-border / control-hover**: pale surface divisions, stronger field boundaries and hover boundaries respectively.
- **Sale / sale-surface** and **warning / warning-surface**: semantic error/savings and caution treatments. Disabled controls use `control-disabled` with muted text.

### Named Rules

**The Coral With Ink Rule.** Use dark ink labels on coral shopping actions; preserve white text for the separate destructive sale variant and dark support/contact surfaces.

## Typography

**Display and Body Font:** locally loaded Geist variable font, weights 400–700, with swap rendering. The retained PT Sans root font belongs to the base/admin layer, not the storefront identity.

**Arabic Font:** Arial, Tahoma, sans-serif overrides the storefront family for Arabic; layout uses the locale's RTL direction. Do not describe this fallback as a custom Arabic face.

**Character:** one clear sans-serif family, semibold headings and tight display tracking. Product names retain readable multi-line rhythm rather than inheriting hero scale.

### Hierarchy

- **Display:** hero promotional heading, 36–64px fluid, 600, 1.02 line-height, −0.035em tracking.
- **Headline:** route h1, 28–44px fluid, 600, 1.08 line-height, −0.025em tracking.
- **Section:** 22px mobile / 28px desktop, 600, −0.03em tracking. Other route headings retain context-specific 24/32px steps.
- **Product title:** 14px / 20px line-height mobile; 16px / 24px desktop; medium weight.
- **Body:** 16px base at 1.6; compact merchandising copy commonly 14px / 24px. Hero copy is limited to 38ch and section descriptions to 52ch.
- **Label:** 14px semibold field labels; 12–13px navigation and metadata. Prices use semibold tabular numerals, with smaller muted struck-through original prices.

## Layout

The shared content maximum is 1344px. Gutters are 16px, 24px at 768px and 32px at 1024px. Main content starts at 20px on mobile and 28px from 768px. A 4px spacing rhythm produces the repeated 8/12/16/24/32/48px gaps; ordinary sections retain 48px bottom spacing.

Product shelves use two columns on mobile and four from 768px, with 12px then 16px gaps. A five-category bento scrolls horizontally below 1024px, then becomes a four-column, two-row grid with its first tile spanning two columns and rows. Editorial stories use native details, stacked on mobile and a horizontal expanding group on desktop. Compact product cards are 272px wide in mobile scroll rails.

Desktop navigation begins at 768px. Mobile navigation floats 12px from the screen sides/bottom and includes safe-area padding. PDP/cart purchase bars sit above it at `88px + safe-area-inset-bottom`, z-index 19; navigation is z-index 20 and contact z-index 30. Contact clears these bars at `196px + safe-area-inset-bottom`; otherwise it sits at 84px on mobile and 24px on desktop. Footer bottom clearance is 172px on the storefront band, plus safe area. Native horizontal scrolling remains available where scrollbars are hidden.

The footer is a pale-blue closing band holding one white 20px-radius panel. Inside the panel, the leading zone carries the bare logo, a two-line display statement and supporting copy; a mint help card beside it holds the phone, email, both contact actions and the "Let’s talk care" heading. At 1024px those zones share one row; below that they stack, with the card inset 12px from the panel edge. A four-group link zone (shop, help, account, visit) follows, two columns on mobile with the account and visit groups full width, and four columns from 1024px. The bottom strip carries the legal line, the 44px language switch and a back-to-top control. On mobile, the footer reserves the floating-navigation clearance documented above.

## Elevation & Depth

Depth comes primarily from pastel grouping, white cards, thin borders and media wells. Product cards are explicitly flat, including hover; a stronger boundary provides feedback. Floating controls and overlays use soft ambient shadows. These are not hard offset shadows.

### Shadow Vocabulary

- **Card token:** `0 6px 18px rgb(25 35 33 / 5%)`, available for non-product surfaces.
- **Raised:** `0 16px 45px -18px rgb(25 35 33 / 24%)`, search suggestions and floating contact.
- **Mobile navigation:** `0 18px 40px -20px rgb(21 23 26 / 35%)`.
- **Plain shopping buttons:** `0 1px 1px rgb(21 23 26 / 8%)`; shared data-slot buttons use their own flat variant styles.

### Named Rules

**The Flat Product Rule.** Product card depth comes from media and borders; do not add a resting or hover shadow to override the scoped flat treatment.

## Shapes

Controls and media wells commonly use 12px corners, compact thumbnails 14px and cards/editorial groups 16px. The 20px panel token remains available for larger containers. Pills and circles are native to this system for status/savings badges, contact, utility navigation and selected route actions; the system is not pill-first for every control. Borders are generally 1px.

## Components

### Buttons

Shared primary buttons use ink fill with white text; explicit accent buttons use coral with ink text. Legacy utility buttons and product-list actions use white outlined surfaces. All use 600 weight and 12px corners. Shared default buttons are at least 48px tall with 12px 24px padding; small/icon controls use 44px and large buttons 56px. Outline is white with a border; secondary is subtle filled; ghost is transparent with muted text; links use teal; destructive uses sale red with white text. Hover darkens explicit coral emphasis or changes the neutral fill/border. Keyboard focus is a 2px ink outline with 2px offset. Disabled controls retain readable muted text and a neutral fill.

### Chips

Savings pills use peach fill and sale text with 4px 10px padding and 12px semibold type. Render savings only when an actual sale price is lower. Current navigation uses mint fill and ink text; product/category metadata remains supporting information rather than an ornamental heading prefix.

### Cards / Containers

Product cards have 16px corners, white fill, pale 1px borders and 12px padding. Square product media wells use 12px corners, subtle fill and 16px padding; images are contained to preserve the pack. The order is media, supporting brand/category, product title/options, availability, actual price and purchase action. Compact cards use 64px media and a separate 44px round exploration action. Editorial containers reuse the pastel palette and retained artwork; they do not replace exact catalogue photos.

### Inputs / Fields

Shared Input and NativeSelect use subtle fill, `control-border`, 12px corners, 48px minimum height and 12px 16px padding. Hover/focus lifts the fill to white; focus uses an ink border and 2px outline/offset. Invalid states use sale boundaries and outlines; disabled states use neutral fill and muted text. Select chevrons use Heroicons. Checkboxes use a 20px square with 6px corners; checked state uses coral border/fill with an ink check and ink focus outline. The header search is a white bordered composite with a quiet white circular submit control and keyboard-operable suggestions. Field label/error relationships remain explicit.

### Navigation

The category mega menu is a Radix Popover disclosure: two browsing columns at tablet widths and a third mint help panel at large widths. Mobile uses a Radix Dialog drawer with scrollable links, a fixed account/language footer and an explicit close action. Menus dismiss with Escape/outside interaction, restore focus, and close across the mobile breakpoint. Search is a neutral composite field with an ink submit action, useful initial suggestions, recent searches and keyboard-operable live results.

The white header combines the existing logo, search, delivery, account/cart utilities and one desktop shopping row. Desktop links are 13px medium with 44px targets, subtle hover fill and mint current-page fill. Mobile links stack icon and label in five equal flexible cells with 52px minimum height; active state uses the same mint fill. Heroicons supply actual interface icons. Contact is an ink circle with a white conversation icon, 48px mobile / 56px desktop.

### Footer

The footer band is `footer-band` (`#e6f2fc`) and holds one white panel with `shadow-raised`; the help card is `footer-card` (`#e6f3e9`) with no border or shadow, so elevation is declared once per layer. The logo sits bare on white at 140px (184px from 768px) with no plate. The display statement is `clamp(2rem, 3.6vw, 3.35rem)` at 600 weight, 1.04 line-height and −0.03em tracking, limited to 16ch so it holds two lines in English at tested widths; Arabic uses normal tracking and 1.25 leading and sets on one line at 390px. Supporting copy uses `ocean`; contact icons and the map pin use logo coral. The primary contact action is coral with ink text; the call action is a 50% ink outline on mint so its boundary reads as a control. Link rows are 44px minimum with no rules, a `subtle` hover fill and coral arrows that appear on hover above 768px; long labels wrap rather than truncate. The bottom strip is the page tint with the 44px language switch and a back-to-top control that targets the `#top` body anchor, so it returns to the document top on every route including not-found. All hover movement is gated behind `motion-safe`.

### Editorial behavior

Campaigns are manually navigated; uploaded artwork is contained rather than cropped. Manual slide entry uses 240ms `cubic-bezier(.16,1,.3,1)`, opacity .8 to 1 and 5px travel. Product imagery scales to 1.035 on hover over 300ms; direct press feedback scales to .985. Optional GSAP scroll motion is scoped to editorial markers: cards travel at most 20px with .3s scrub; supporting headline opacity goes from .75 to 1 with .25s scrub. Content is visible by default and reduced-motion removes enhancements. Product shelves and purchasing layout are not scroll-animated.

## Do's and Don'ts

### Do:

- **Do** use logo coral with ink labels, Geist and existing Heroicons.
- **Do** preserve real product photos, prices, availability, options and existing URLs.
- **Do** retain Arabic direction and the actual Arabic font fallback.
- **Do** preserve complete uploaded artwork and distinguish decorative scenes from catalogue products.
- **Do** keep focus visible, small interactive targets at least 44px and default fields/actions 48px.
- **Do** keep editorial motion optional and purchasing layout stable.

### Don't:

- **Don't** reinstate the superseded blue/Outfit or legacy green palette as the customer storefront authority.
- **Don't** use white labels on coral shopping actions.
- **Don't** invent products, savings, ratings, stock, service guarantees or brand imagery.
- **Don't** extend this storefront palette or type replacement into staff administration.
- **Don't** add hard offset shadows or ornamental heading kickers to this minimal storefront.

Button hierarchy follow-up: defaults use ink/white, product-list add actions use white outlined buttons, and explicit coral emphasis is reserved for the campaign CTA and focused PDP purchase action. Budget/personal-care shelves prefer distinct items but retain overlap rather than disappearing; a single eligible product or brand can render its section.

### Catalogue filters

The catalogue refinement panel uses a 272px desktop rail, one visible heading,
quiet mint count, 48px white controls, 12px corners and green-tinted control
boundaries. Filter/sort controls reference the scoped control-border variables
explicitly because inherited inline Tailwind aliases resolve the older slate
values. This is a local compatibility override; administration is unchanged.

Price bounds keep a semantic fieldset/legend with an explicit zero border,
padding and margin: global Preflight remains intentionally off. Two equal-width
columns hold labelled From/To numeric fields, localized placeholders and tabular
numerals. A small client form validates reversed bounds through native browser
validation; the catalogue and its data fetching stay server-rendered.

Below 1024px, a 56px inline disclosure uses a filter icon, mint count and static
state chevron. The open panel starts with fields, with Apply and Clear beside
each other; GET navigation closes the panel to reveal results, and reopening
retains applied values. Desktop has the heading/reset row and a collapsed
secondary category list. Price bounds count as one refinement; ordering is not
counted. No scroll animation or added motion dependency is used on this task UI.
