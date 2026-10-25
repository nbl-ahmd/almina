---
name: Al Mina administration console
description: Working paper — a neutral staff workbench with ink actions, white panels and truthful operational readings.
colors:
  canvas: "#fafafa"
  paper: "#f5f5f5"
  paper-strong: "#ebebeb"
  surface: "#ffffff"
  border: "#e5e5e5"
  border-strong: "#d4d4d4"
  control-border: "#d4d4d4"
  control-hover: "#a3a3a3"
  hairline: "#f0f0f0"
  ink: "#171717"
  ink-soft: "#404040"
  steel: "#525252"
  muted: "#666666"
  fog: "#737373"
  faint: "#a3a3a3"
  action-hover: "#000000"
  success: "#166f30"
  success-soft: "#e4f3e8"
  warning: "#96540c"
  warning-soft: "#fdefdd"
  danger: "#b3261e"
  danger-soft: "#fbe9e7"
  info: "#0f6b6b"
  info-soft: "#e2f2f1"
  violet: "#6b4ea8"
  violet-soft: "#efe9f8"
  chart: "#2563eb"
  chart-soft: "#eff6ff"
  chart-active: "#173e8c"
typography:
  headline:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.5
  table-cell:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.8125rem"
    lineHeight: 1.5
  label:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  caption:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.5
  metric:
    fontFamily: "Geist, Arial, sans-serif"
    fontSize: "clamp(22px, 2vw, 29px)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.03em"
rounded:
  xs: "6px"
  sm: "8px"
  base: "12px"
  lg: "16px"
  pill: "9999px"
spacing:
  compact: "6px"
  action-gap: "8px"
  field-gap: "12px"
  mobile-panel: "14px"
  grid: "16px"
  panel: "18px"
  section: "20px"
  tablet-gutter: "24px"
  desktop-gutter: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.surface}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
    height: "34px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    padding: "7px 9px"
    height: "34px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
    height: "34px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xs}"
    padding: "7px 10px"
    height: "36px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "18px"
  navigation-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "7px 9px"
    height: "36px"
  commerce-metric:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.metric}"
    rounded: "{rounded.base}"
    padding: "18px 14px"
  chart-toggle:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
    rounded: "{rounded.xs}"
    padding: "2px"
  badge-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
---
# Design System: Al Mina Administration

## Overview

**Creative North Star: "Working paper"**

Nexadash supplies the legible workbench structure; Dub supplies the neutral, minimal, utilitarian language. White working panels sit on a pale neutral canvas, with a quiet sidebar and precise ink typography. Density supports staff scanning catalogue, orders and reports throughout a shift.

This system applies only to the administration route and admin components. The storefront retains its own design system. It records the implemented interface, including the final CSS overrides, rather than the superseded warm-paper direction. The dashboard now composes a compact 2×2 metric block, dominant daily chart and fulfilment panel, followed by two working lists. Product editing starts with sales-channel switches and the corresponding prices; sections use persistent tabs. Product identity, permissions and server-authoritative commerce remain application constraints; this document records the built interface, not a deployment.

**Key Characteristics:**

- Neutral chrome and white, border-defined working surfaces.
- One optimized Geist family; compact labels and aligned numbers.
- Ink actions, blue data marks and semantic status color.
- Channel-first product pricing and persistent task tabs.

## Colors

The palette is achromatic for the workspace, with restrained color carrying data and operational meaning. Frontmatter is the normative value list; aliases in the stylesheet may resolve to the same primitive.

### Primary

- **Ink:** titles, primary actions, selected navigation and focus boundaries. The logo's final override is ink on its white context, with a white symbol in the dark mark.
- **Action hover:** the deepest ink for pointer and press feedback.

### Secondary

- **Chart blue / chart soft / chart active:** resting bars and line strokes, pale line-area fill and the table's focus-within wash, with a deeper blue for the inspected bar. Resting bars use chart blue rather than a translucent pale fill.
- **Success / success soft:** completed or live state.
- **Warning / warning soft:** waiting, attention or unresolved review.
- **Danger / danger soft:** failed, unavailable or destructive state where named by the component.
- **Info / info soft:** confirmed or informational state; teal is distinct from data blue.
- **Violet / violet soft:** secondary operational accents already present in specialist surfaces.

### Neutral

- **Canvas:** the page ground and final table-header fill.
- **Paper / paper strong:** sidebar, quiet utility fills and stronger neutral grouping.
- **Surface:** white panels, controls, topbar and active desktop navigation.
- **Border / border strong / hairline:** panel boundaries, stronger separators and inner rules.
- **Control border / control hover:** controls remain distinguishable from quiet panel boundaries.
- **Ink soft / steel / muted / fog / faint:** body copy, table headings, support copy, placeholders and disabled content respectively. Faint is not a general body-text color.

**The State and Data Rule.** Use chromatic color for data and named status. Primary actions and active navigation remain ink-led.

## Typography

**Display and body font:** locally optimized variable Geist (weights 400–700), loaded by the admin layout with swap and without preload. The font is independent of the storefront instance.

### Hierarchy

- **Headline:** compact medium-weight page titles, reduced to (24px) on phones.
- **Title:** semibold card titles; generic section headings also use (16px).
- **Body:** regular working copy with a comfortable (1.5) line height; paragraphs cap at (78ch), page descriptions at (68ch).
- **Table cell:** compact body for dense lists and actions.
- **Label:** medium sentence-case labels, metric headers and table headings. Sidebar group labels use (11px), regular tracking and sentence case.
- **Caption:** supporting notes and timestamps. Numeric readings and right-aligned numeric columns use tabular figures.
- **Metric:** responsive medium-weight bento readings, with the phone override at (26px). Currency prefixes use (10px), and metric explanations/delta badges use (10px). The sales-summary reading is (30px) at (1.2) line height with a (12px) currency prefix. Dashboard recent-order rows use (11px) desktop and (12px) phone text; ranked product names use (12px).

**The Reading Rule.** A figure names its scope beside the value. Missing data remains unavailable; it does not become a healthy zero or a fabricated comparison.

## Layout

Desktop uses a sticky full-height sidebar (232px) and a flexible main column. At widths up to (1180px), the sidebar becomes (224px) and content gutters shrink to (24px). Main content caps at (1600px), with desktop padding (28px 32px 72px). The sticky white topbar is (60px) tall. Its inventory search is hidden at widths up to (1100px); user detail reduces at (900px).

The dashboard bento uses three tracks: a two-by-two KPI block, a dominant daily chart and a fulfilment panel. Track proportions are (.95fr / 1.75fr / .8fr), with minimum widths of (230px) for the metrics block and (200px) for fulfilment, and (16px) gaps. KPI cards use (12px) internal grid gaps and (18px 14px) padding. Recent orders and most ordered products follow in a (1.65fr / 1fr) pair, with the product panel at least (280px) wide. At widths up to (1180px), the chart and KPI block occupy two tracks, fulfilment spans the next row, and the lower lists stack. At widths up to (1000px), the bento becomes one column. Phone KPI cards retain two columns, use (14px) padding, (10px) gaps and a (140px) minimum height. The chart plot is (180px) tall, reduced to (175px) on phones.

At widths up to (959px), data rows become stacked definition-style cards with visible field labels, while semantic column headers remain available to assistive technology. At widths up to (767px), the sidebar disappears, the app bar becomes (52px), and content uses (16px 14px) top/side padding. A fixed bottom navigation and an all-sections sheet replace desktop navigation. Safe-area-aware bottom clearance protects the last content. At widths up to (380px), generic metric grids and sheet entries become a single column; the new bento KPI block keeps its two-column rule.

Reusable grids use (16px) gaps, reduced to (10px) on phones. Panels use (18px) padding and (14px) on phones. The product editor caps its width at (1160px) and uses one active tab panel. Sales channels and corresponding price inputs lead Overview. Care & usage, Organisation, Variants, Photos and Publishing have their own tabs; switching does not unmount field controls. Photos have their own independent save. Product Save stays in normal flow below the active form section.

## Elevation & Depth

Panels use hairline borders and no resting shadow. Controls retain a tight contact shadow; older generic stat tiles can gain a small shadow on fine-pointer hover; the new bento metric cards remain flat. The desktop active navigation has no shadow after the final override. Mobile bottom navigation uses translucency, blur and a soft shadow; the topbar's final override is opaque white without blur.

### Shadow Vocabulary

- **Contact:** `0 1px 2px rgb(26 24 21 / 6%)` for small controls.
- **Hover:** `0 1px 3px rgb(26 24 21 / 7%), 0 1px 1px rgb(26 24 21 / 4%)` for metric hover.
- **Overlay:** `0 24px 48px -24px rgb(26 24 21 / 30%)` for sheets and row popovers.
- **Focus:** `0 0 0 3px rgb(26 24 21 / 10%)` around focused fields.
- **Bottom navigation:** `0 12px 32px -16px rgb(0 0 0 / 28%)` for the floating mobile navigation.

**The Working Surface Rule.** Working panels are flat at rest. Reserve stronger elevation for transient sheets and popovers.

State transitions generally use (150ms) with the implemented ease-out curves. Press feedback scales controls to (0.97) over (120ms). The secondary action popover opens from its trigger origin with opacity and scale over (160ms); visible keyboard focus disables that transition. Sheet entry uses (280ms), sheet exit (180ms); overlay fade uses (180ms) in and (120ms) out. Task tabs switch instantly, including keyboard activation. Chart bar inspection changes fill over (120ms) with CSS ease. Reduced motion removes movement and pulsing skeleton animation. There is no page-entry choreography.

## Shapes

The implemented radius hierarchy is compact: extra-small for inputs and utility rows, small for buttons/navigation/popovers, base for panels, large for sheets and mobile navigation, pill for badges and generic segmented controls. Chart toolbar containers use the extra-small radius, with compact (4px) button corners. Although the direction shorthand says “8px controls,” actual text fields use the extra-small (6px) radius. Keep that distinction. Borders are generally (1px); inventory selection uses a (2px) underline. Heroicons provide outline pictograms; use SVG rather than text glyph substitutes.

## Components

### Buttons

Primary actions use ink fill, white text and small corners, with (7px 12px) padding and (34px) desktop minimum height. Outline/secondary actions use white with a neutral border; ghost actions use transparent fill and muted ink; destructive actions use danger-soft fill and danger text. Hover darkens or introduces paper fill, focus remains visible, and disabled controls use paper fill, faint text and no shadow. Standard phone actions reach (44px); compact table utilities and ellipsis triggers retain smaller implemented targets.

### Chips

Status chips pair readable text with their semantic foreground and pale background, optionally adding a dot. Neutral chips remain gray; a legacy brand badge still carries a warm fill and is excluded from the normative palette. Capsule shapes belong to statuses and segmented filters. Final metric headers and ordinary navigation labels use sentence case.

### Cards / Containers

White, base-radius panels use one neutral boundary and flat resting elevation. Flush table cards remove inner padding and clip the table; their heading owns its padding and separator. Bento metric cards have a plain white face: label and outline icon above the value, comparison or unavailable-baseline explanation below. They use (20px) vertical gaps rather than a separate tinted header strip. Fulfilment pairs a ring reading with divider-separated status links. Ranked products use compact rows with neutral product pictograms and right-aligned amounts.

### Inputs / Fields

Fields use a white background, extra-small corners, control-border stroke, (7px 10px) padding and (36px) minimum height. Hover strengthens the boundary; keyboard focus uses ink stroke plus the focus ring. Invalid fields use danger borders. Textareas resize vertically. Phone inputs use (16px) type and (44px) minimum height to support touch and avoid viewport zoom; generic textareas reach (112px), while the compact product workspace overrides description textareas to (88px) desktop and (96px) phone. Native selects remain native for classification, condition and rights. Boolean choices, tags and checklists preserve their existing field semantics.

### Navigation

Desktop groups use compact sentence-case labels. Navigation links are (36px) high, with white fill, a neutral border and medium ink when current. The black brand mark follows the final override; the earlier coral token/comment is not the shipped logo treatment. Mobile navigation uses icon-plus-text destinations and opens remaining sections in a focus-managed sheet.

Inventory tabs use a dark underline for the current view and keep the current search query. Filtering preserves the active inventory view; Reset clears to the base product list.

### Product channels and tabs

Sales-channel switches lead Overview. Retail shows the retail price and sale fields. Wholesale shows explicit AED unit prices per selected business type and case/minimum/maximum quantities. Both enabled shows both sets. An inactive channel preserves its previously saved prices; it never copies a retail rate into wholesale. Existing products load revisioned wholesale terms before Save becomes available. One configured active business type gets a price field immediately when wholesale is enabled.

Overview, Care & usage, Organisation, Variants, Photos and Publishing use accessible tabs with an overflow rail on narrow screens. Arrow keys, Home and End move between tabs instantly. Field panels stay mounted; invalid fields reveal their tab before focus. Stock reason appears only when the stock quantity changes. Expected-stock and receipt controls remain submitted. Photos use their existing independent upload save in the Photos tab. Readiness checks sit with Publishing.

Save validates both channel configurations first, then uses the existing product and wholesale APIs. A partial wholesale failure explicitly identifies the product as saved, locks the completed form and offers pricing-only recovery. Recovery reads current terms before replay and refuses a revision conflict. It does not repeat stock adjustments or create another product.

Website management uses task tabs for content, profile, delivery, branches, rewards, retention, reviews and reports; maintenance is secondary. Categories, banners and staff lists lead their pages; creation forms open on request. Contribution costs follow order fulfillment work. Wholesale pricing links to the unified product editor instead of maintaining a second price form.

### Tables and secondary row actions

Desktop tables use pale sentence-case headings, compact body text, tabular right-aligned numbers, subtle fine-pointer hover and a blue focus-within wash. Mobile rows show labels beside values and keep primary actions reachable. Edit remains visible. Publishing and archival actions sit in an explicitly labeled ellipsis popover, portaled inside the admin theme using Radix. The overlay aligns to the end of its trigger, has a (6px) offset, (12px) collision padding, (180px) minimum width and viewport-constrained maximum width. Existing confirmations and command semantics remain intact.

### Dashboard reporting and chart inspection

Administrators receive real authenticated aggregate reporting for (7), (30) or (90) days through the existing growth-metrics contract. The default period is (30) days. The native period select changes the route, announces updating state and disables controls during the transition. Export report downloads the loaded daily rows as CSV, with UTC date, orders and gross order value in AED; it is disabled when the report is unavailable.

The four readings are gross order value, orders placed, average order and dispatched count. Comparison badges derive from the previous period; a missing or zero baseline displays “No previous-period baseline” instead of inventing growth. Period reporting covers online orders in the current order system, before cancellation/refund adjustments, with UTC dates. Recent orders are a separate latest-order list across all dates (read limit 25; six rows displayed for administrators). Legacy orders remain there. Staff see role/city-scoped queue counts over their latest accessible orders and eight recent rows, without the administrator aggregate report.

The daily chart switches between Order value and Orders and between Bar and Line. Toggle buttons expose their state with aria-pressed. Bars use full chart blue at rest and deeper blue when inspected; line mode uses a blue stroke and pale area. Axis labels are ordinary text in the chart component. Order-count ticks avoid fractional midpoints. Pointer inspection reveals an ink tooltip and cursor; keyboard focus supports Left/Right, Home and End, with the selected date/value announced in a status region. Blur or pointer leave clears inspection. The tooltip stays within the central (22%–78%) plot range. Empty periods display a clear no-orders message.

Fulfilment shows dispatched, cancelled and other stages, with text counts and destination links alongside the ring. Most ordered products ranks up to five products by units placed and names order-snapshot scope; cancellations/refunds remain included. Unavailable reporting displays dashes, an explicit warning and Reload report, while recent orders stay visible. Empty product rankings distinguish no orders from an unavailable report. No prior 25-order sample is reused as period analytics.

## Do's and Don'ts

### Do:

- **Do** scope admin styling and portals inside the admin theme.
- **Do** keep numeric columns aligned and status meaning in readable text.
- **Do** preserve unsaved inputs when switching task tabs.
- **Do** retain search terms when changing inventory views.
- **Do** respect reduced motion and keep keyboard focus visible.

### Don't:

- **Don't** import the storefront palette or restore the superseded warm admin palette.
- **Don't** add decorative brand color to neutral navigation or primary actions.
- **Don't** confuse the all-date recent-order list with period reporting, or invent a comparison without a baseline.
- **Don't** hide primary Edit behind the secondary actions popover.
- **Don't** promote legacy kickers, tiny tracked uppercase labels or stale comments into reusable system rules.

Not canonized or repaired: the legacy warm brand-badge fill, remaining tracked uppercase micro-labels/kickers and stale warm/coral CSS comments are inherited implementation drift, not guidance. The actual ink logo and neutral overrides win. Small table utilities remain an observed touch-target limitation, not a recommendation for new mobile controls. This documentation pass does not modify source behavior, backend data or deployment state.
