---
name: Al Mina administration console
description: Dub-inspired frosted operations console — rice-paper canvas, hairline borders, one electric blue accent.
scope: Admin only (`apps/web/src/app/(admin)` and `apps/web/src/components/admin`). The customer storefront has its own design system in `apps/web/DESIGN.md` and is never affected by this file.
theme: light
status: implemented
updated: 2026-10-24
colors:
  canvas: "#ffffff"
  paper: "#f5f5f5"
  ash: "#e5e5e5"
  smoke: "#d4d4d4"
  pebble: "#c8c8c8"
  midnight: "#0a0a0a"
  ink: "#171717"
  graphite: "#262626"
  slate: "#404040"
  steel: "#525252"
  muted: "#6b6b6b"
  fog: "#737373"
  silver: "#a3a3a3"
  accent: "#2563eb"
  accent-hover: "#1e40af"
  accent-soft: "#dbeaff"
  accent-wash: "#eff6ff"
  mint: "#dcfce7"
  green: "#16a34a"
  green-ink: "#166534"
  tangerine: "#ea580c"
  orange-ink: "#9a3412"
  orange-soft: "#ffedd5"
  lavender: "#7c3aed"
  violet-ink: "#6d28d9"
  violet-soft: "#ede9fe"
  danger: "#b91c1c"
  danger-soft: "#fee2e2"
  info: "#075985"
  info-soft: "#e0f2fe"
  action: "#0a0a0a"
  action-hover: "#000000"
typography:
  family: "Geist, Arial, sans-serif"
  display:
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  login-display:
    fontSize: "36px"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  heading:
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontSize: "14px"
    lineHeight: 1.5
  body-lg:
    fontSize: "16px"
    lineHeight: 1.5
  label:
    fontSize: "12px"
    fontWeight: 500
  caption:
    fontSize: "11px"
    fontWeight: 500
  metric:
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
rounded:
  input: "6px"
  button: "8px"
  nav: "8px"
  card: "12px"
  large-card: "16px"
  pill: "9999px"
spacing:
  base: "4px"
  scale: "4 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 40 / 48 / 64"
  page-max: "1200px"
  card-padding: "16px"
  element-gap: "8px"
  section-gap: "24px"
---

# Design System: Al Mina administration console

## Direction

**"Frosted link dashboard on rice paper."**

The console borrows Dub's accounting of attention: a white canvas, paper-grey
chrome, 1px ash borders instead of drop shadows, dense monochrome type, and a
single electric blue that is allowed to speak only when something is active,
linked, or measured. Colour beyond blue is reserved for semantics — a status,
a warning, a destructive action — and never used as decoration on a large
surface.

This is an **Operate** surface. Familiarity beats expression: the staff member
is dispatching an order, correcting stock, or clearing a review queue. Brand
lives in the details — the conic-spectrum logo ring, the pill vocabulary, the
exact quietness of the chrome — not in the middle of a table.

**Scope guardrail.** Every rule in `admin.css` is scoped to `.admin-app`.
Nothing here may reach `.storefront-shell`, the wholesale surface, checkout,
or customer-facing routes. The two systems share the Geist family and the same
`cva`-variant approach to controls; they do not share a palette.

## Colour

### Surfaces

| Level | Token | Value | Use |
| --- | --- | --- | --- |
| 0 | `canvas` | `#ffffff` | Main content background |
| 1 | `paper` | `#f5f5f5` | Sidebar, table headers, nested wells, hover fills |
| 2 | `card` | `#ffffff` | Cards, popovers, top bar — separated from the canvas by a 1px ash border |
| 3 | `accent-wash` | `#eff6ff` | Selected rows, active navigation made stronger |
| 4 | `accent-soft` | `#dbeaff` | Sidebar active item, mobile active tab |

The sidebar is Paper Mist; the content canvas is Canvas White. Panels are
white-on-white and identified by their border, never by a shadow. Shadows are
permitted in exactly three places: a 1px lift under filled buttons
(`0 1px 2px rgb(0 0 0 / 5%)`), the focus ring (`0 0 0 3px rgb(0 0 0 / 8%)`),
and overlays/bottom sheets that must physically float over content.

### Text

| Token | Value | Use |
| --- | --- | --- |
| `ink` | `#171717` | Headings, primary labels, table cells |
| `slate` | `#404040` | Body copy and descriptions in dense regions |
| `muted` | `#6b6b6b` | Secondary text, card descriptions, metadata |
| `fog` | `#737373` | Supporting prose where the surface is white |
| `silver` | `#a3a3a3` | Disabled text, hover borders, decorative strokes — never text on an active surface |

Pure black is never used for body text. `#0a0a0a` is reserved for the filled
action and for focus rings where maximum contrast is the point.

`muted` is `#6b6b6b` rather than the reference's `#737373` so secondary text
still clears 4.5:1 on Paper Mist as well as Canvas White. Fog remains the
placeholder and supporting-copy token on white.

### Accent and semantics

- **Electric Blue** `#2563eb` — links, active navigation, the `+` in a metric,
  focus of a selected tab, the one highlighted number on a screen.
- **Deep Sapphire** `#1e40af` — active navigation text on `#dbeaff`, and the
  only other blue in the system.
- **Soft Mint / Vivid Green** — completed or live states. Text uses `#166534`
  on `#dcfce7` for contrast.
- **Tangerine** — pending, reconnecting, needs review. Text uses `#9a3412` on
  `#ffedd5`.
- **Danger red** `#b91c1c` on `#fee2e2` — destructive confirms and failures.
- **Lavender** — one feature-pill accent on the sign-in surface; not a status.
- **Conic spectrum** — the logo ring only. It never appears on a button, card,
  chart, or table row.

Rules:

1. One primary action per surface. It is the only `#0a0a0a` fill on the screen.
2. Blue is a highlight, never a large fill. If a block of blue is larger than
   a badge, it is wrong.
3. A pill gets exactly one accent. Two chromatic colours on the same component
   is a bug.
4. Semantic colour is paired with a word or an icon. Colour alone never carries
   meaning.

## Typography

**One family: Geist** (variable, 400–700, self-hosted at
`apps/web/src/app/fonts/Geist-Variable.ttf`, shared with the storefront but
loaded separately and not preloaded). It stands in for Dub's Inter body and
Satoshi display voice: neo-grotesque, geometric enough for a 30px heading,
neutral enough for 11px table headers.

- **Display / page title** — 30px, weight 500, line-height 1.15, tracking
  −0.02em. Fixed rem scale, not fluid: staff view at consistent DPI and a
  fluid heading that shrinks inside a narrow main column looks worse.
- **Login display** — 36px, weight 500, line-height 1.08, tracking −0.03em.
  The one place the console is allowed a display moment.
- **Card title / section heading** — 16px, weight 600.
- **Body and controls** — 14px / 1.5. Dense table text is 13px.
- **Labels** — 12px, weight 500, sentence case.
- **Caption / table header / sidebar group** — 11px, weight 500–600. Uppercase
  is reserved for table headers and sidebar group labels, with 0.04–0.08em
  tracking; never used as an eyebrow above a page title.
- **Metrics** — 30px, weight 500, `tabular-nums`, tracking −0.03em.
- **Monospace** — not used. Where the reference reaches for Geist Mono we use
  Geist with tabular numerals; the console has no code surface.

Copy rules: controls name their action ("Create product", "Dispatch order",
"Archive banner"). No generic "Submit". No decorative eyebrow above an `h1`.

## Spacing, radius, density

- 4px base unit. Recurring steps: 8 / 12 / 16 / 24 / 32 / 48.
- Sidebar 240px. Content max 1200px, padding 24px desktop / 14px mobile.
- Card padding 16px. Card internal gap 12px. Page header to content 20px.
- Tight internal groups (8px), generous separation between sections (24px),
  more space above a heading than below it.
- Radii: **tags and badges 9999px**; **buttons and nav items 8px**;
  **inputs 6px**; **cards 12px**; **large feature surfaces 16px**. No ad-hoc
  rounding. Pills are only for small controls.
- Rows are compact: 36px controls, 40–44px table rows, 30px inline action
  buttons. Touch targets grow to 44px below 768px.

## Components

### Sidebar
240px, Paper Mist, 1px ash right border, sticky full height. Brand mark: 28px
rounded square with a 2px conic-spectrum ring (`background: linear-gradient(#fff,#fff)
padding-box, conic-gradient(...) border-box`) and the "A" in ink. Group labels
are 11px uppercase muted. Items: 13px/500 slate, 32px, 8px radius, 16px icon.
Hover is `#ebebeb`. Active is `#dbeaff` fill with Deep Sapphire text and icon —
a soft chromatic fill, not a left border.

### Top bar
56px, sticky, `rgb(255 255 255 / 88%)` with `backdrop-filter: blur(14px)`, 1px
ash bottom border. Breadcrumb 12px (root muted, current ink). Right cluster:
live-order status pill, user chip (pill with 24px avatar), ghost sign-out
button. The status pill is a live region; its short text is never hidden on
mobile.

### Page header
Title, one-sentence description (max 68ch), optional action cluster right.
No eyebrow. Actions use the outlined and filled button pair.

### Card
White, 1px ash, 12px radius, 16px padding, no shadow. Title 16px/600 with an
optional 24px neutral icon tile. Description 12px muted. `flush` removes
padding so tables sit edge-to-edge with a bordered head strip.

### Stat tile
White card, 12px radius, 16px padding. Label 12px muted, optional 26px neutral
icon tile. Value 30px/500 tabular. Meta 12px muted. Hover raises the border to
Smoke only — no lift, no shadow. Tone tints the icon tile, not the card.

### Table
Wrapper: 1px ash, 12px radius, white. Header: Paper Mist, 11px uppercase
steel, 8px/16px padding, 1px ash bottom border. Rows: 13px, 10px/16px padding,
1px `#efefef` dividers, hover `#fafafa`. Captions are screen-reader-only; the
card title or page title carries the visible label. Inline row actions are
small outlined buttons (28px, 6px radius).

### Badge / pill
11px/500, 2px 8px, pill radius, tinted background, no shadow, optional 5px dot.
Neutral `#f5f5f5`/`#525252`; success mint/green-ink; warning orange-soft/
orange-ink; danger red-soft/danger; brand accent-soft/sapphire.

### Buttons
- **Primary** — `#0a0a0a` fill, white text, 8px radius, 34px, 13px/500, 1px
  lift shadow. One per surface.
- **Outline** — white, 1px ash, ink text, 8px radius, 34px. The workhorse.
- **Ghost** — transparent, muted text, 8px radius. Chrome and row utilities.
- **Danger** — red-soft fill with danger text; fills solid red only on hover or
  in a confirm dialog.
All states ship: hover, focus-visible (2px `#0a0a0a` ring, 2px offset),
active, disabled (Paper Mist, Silver text), pending copy ("Saving…").

### Inputs
White, 1px Smoke, 6px radius, 36px, 13px text. Hover Smoke→Silver. Focus
Midnight Ink border plus a 3px `rgb(0 0 0 / 8%)` ring and no outline — the
reference's "inputs feel important" moment. Placeholder Fog. Labels 12px/500.
Errors pair the message with `aria-invalid` and a red border.

### Notes, empty states, loading
Notes are a full 1px border + tinted background + icon — never a thick left
rule. Empty states use a neutral 40px icon well, a 14px/600 title, and one line
that teaches the next action. Loading uses skeleton bars on Paper Mist, not a
centred spinner.

### Sign-in
Split layout: Paper Mist aside with a low-opacity dot grid (Dub's blueprint
surface) and a 36px display statement; white form column on the right, max
400px. Assurances render as three bordered pills, each with one accent —
tangerine, green, lavender — in the reference's feature-pill spirit. Labels and
controls follow the form spec; the submit is the single black fill.

### Mobile
Below 768px the shell becomes an app bar plus a fixed bottom tab bar
(16px radius, white/blur, 1px ash, soft overlay shadow). The four primary
destinations stay visible; "More" opens a Radix Dialog bottom sheet with all
sections in a two-column grid. Tables become stacked definition cards with
`data-label` prefixes. Forms go single column with 44px controls and a sticky
action bar above the tab bar.

## Motion

150–200ms, `cubic-bezier(0.16, 1, 0.3, 1)`. Motion communicates state only:
hover, focus, active nav, sheet open and skeleton pulse. There is no page-load
choreography; cards do not rise in sequence, and metrics and sparklines render
at their final value — no count-up, no stroke draw. Everything collapses under
`prefers-reduced-motion: reduce` and keeps its fully visible resting state.

## Implementation map

| Concern | Source of truth |
| --- | --- |
| Tokens and all component styling | `apps/web/src/app/(admin)/admin/admin.css` (scoped to `.admin-app`, inside `@layer components`) |
| Font | `apps/web/src/app/(admin)/admin/layout.tsx` → `Geist-Variable.ttf`, `preload: false` |
| Shell, nav, mobile sheet | `apps/web/src/components/admin/shell.tsx` (Radix `Dialog`) |
| Primitives (`Button`, `Badge`, `Card`, `PageHeader`, `StatTile`, `Note`, `Table`) | `apps/web/src/components/admin/ui.tsx`, `views.tsx` — `cva` variants, Radix `Slot` for `asChild` |
| Inputs, selects and textareas | `admin.css` element rules scoped under `.admin-app` — the storefront's `components/ui/*` controls are not imported by the console |

Tailwind utilities inside `.admin-app` read the admin semantic variables
because they are declared on the same element, so a shadcn control dropped into
an admin screen inherits this palette without a wrapper.

## Do

- Use 1px `#e5e5e5` for every container border. Borders define structure.
- Keep one filled black action per screen; everything else is outlined or ghost.
- Use pills for badges, tags, status, segmented controls, avatars — not cards.
- Use 14px body, 13px tables, 12px labels, 11px captions. Fixed rem scale.
- Pair every semantic colour with text or an icon.
- Let the product data be the visual. No photography, illustration, or 3D.
- Verify at 360, 390, 768 and 1280 before considering a screen complete.

## Don't

- Don't add a shadow to a card. Don't combine a border and a wide soft shadow.
- Don't use pure black for body text; use `#171717`.
- Don't fill large areas with Electric Blue or the conic gradient.
- Don't use two chromatic accents on one component.
- Don't set Satoshi-style display sizes below 24px or use display weights in
  table cells, labels, or buttons.
- Don't add an eyebrow/kicker above a page title.
- Don't use a thick coloured left border on notes or cards.
- Don't animate page load, stagger cards, or count up a metric that did not
  change.
- Don't reach outside `.admin-app`; the storefront has its own system.

## Verification contract

Any visual change must pass, in this order:

1. `npm run typecheck` and `npm run lint` from the repository root.
2. `npm test` (at minimum `tests/admin-migration.test.ts`,
   `tests/stylesheet-policy.test.ts`, `tests/operations.test.ts`).
3. Run the synthetic admin fixture plus an isolated dev server and execute
   `scripts/tooling/verify-admin-browser.mjs` — 15 routes, 360/390/768/1280
   responsive checks, accessibility audit, login/logout, dispatch, multipart
   product update, redirects, order-arrival recovery, staff denial.
4. Review rendered screenshots at desktop/tablet/mobile before claiming done.

Behaviour, API contracts, RBAC, pricing, inventory and order state are out of
scope for this design system and must not change when it is restyled.
