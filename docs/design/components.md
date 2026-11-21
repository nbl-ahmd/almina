# Storefront components

Use the semantic [color](colors.md), [type](typography.md) and [responsive](responsive.md) rules. Fixed anatomy and states apply across pages. Content-dependent shelves and merchandising follow [page patterns](page-patterns.md). Measurements below are CSS pixels, with minimum heights that expand for text.

## Shared controls

| Component | Anatomy and states |
|---|---|
| Primary button | color.action fill, color.canvas label, 8px radius, 44px minimum height and 16px inline padding. Hover and press use their semantic action tokens. Preserve width and readable progress during requests. |
| Secondary button | Forest label on canvas with a control border. Tint hover, forest pressed outline. Match primary geometry. |
| Text link | Forest with an underline in prose. Keep hover/focus discoverable. A link navigates and a button changes local state. |
| Icon control | 44 × 44px minimum target around a 20px Phosphor regular glyph. Use an accessible name and expose pressed/expanded state where applicable. Hide decorative glyphs from assistive technology. |
| Field | Persistent label 4px above a 48px minimum field, 16px input text, canvas fill, control border and 8px radius. Helper/error copy sits 4px below. Use semantic input type and autofill. |
| Choice | Labeled checkbox/radio with a control outline. Selected state uses forest with a canvas mark. Add visible text or a check to selectable variants. Focus remains independent of selection. |
| Chip / badge | Interactive chips have 44px targets and 8px radius. Wrap collections before clipping labels. Offer badges use text on brand with 4px radius, showing verified offers only. |
| Menu / popover | Anchor to the trigger and fit the viewport. Canvas, 12px radius and the approved floating shadow. Support Escape, keyboard operation and focus restoration. |
| Dialog / sheet | Titled modal surface with close action, focus containment and inert background. Scrim uses text at 40%. Decision dialog max 480px, padding 24px desktop/16px phone. Phone task sheets fit the dynamic viewport and scroll internally. |
| Toast | Sonner polite status feedback above fixed actions, without moving focus. Persistent failures and required recovery actions also appear inline. |
| Loading | Reserve final media/text geometry with surface skeletons. Announce loading once per region. Keep controls and confirmed values understandable during updates. |

Keyboard focus uses the palette's 2px focus outline and 2px canvas separation. Reduced motion retains immediate state and status feedback. A disabled control explains unmet prerequisites nearby. Read-only values remain distinguishable from disabled controls.

## Shell and discovery

Desktop header has a 72px minimum identity row with the existing proportionate logo, flexible search, account and cart. A 48px department row follows. Mobile has a 56px minimum identity row and a full-width search row beneath it. Search precedes campaigns. Use the existing routes, accessible names and cart count.

Search has a 48px field, clear control and named submit action. Suggestions show product name and pack in rows with 44px targets, with at most six initial product options. Use an input combobox and option list with expanded state, popup association and active descendant. Arrow keys change the active option while focus stays in the input. Enter opens an active product or submits the query when no option is active. Escape dismisses suggestions and preserves the query. All results is a separate keyboard-reachable link. Loading, no-match and failure states retain normal search submission. Show scanner/camera controls only if their flows are supported.

Category shortcuts use an 80px pack/editorial media region and full label below. Phones can scroll a rail with a partial next item. Desktop can show six to eight items within available width. A missing category image uses a consistent Phosphor category glyph and its real name. Campaigns use at most one dominant lime block per merchandising page, with forest copy, an approved image grouping and a collection link. Additional promotions use quieter composition.

## Product cards and imagery

Fixed order is square media → complete product identity → pack → price → purchase action. Use 12px card padding, 8px media-to-title space, 4px title-to-pack, 8px pack-to-price and 8px price-to-action. Cards are flat canvas with 12px corners. Use a surface media well and contain the full pack within 75–85% of its longest dimension. Optical adjustment can accommodate supplier whitespace while preserving identifying labels.

Use 16/22px product names at every width. Grow rows for longer names and Arabic. Actions align at the row bottom and span the available text width with a 44px minimum height. At 390px, two columns yield 173px cards and 149px inner media wells. At a 1280px content width, a filtered four-column grid yields 240px cards. These are geometry references, with content determining height.

Show at most one verified promotional badge in the media corner. Keep current price prominent and pack/strength visible. Use real availability wording beside the action. Products requiring a choice use Choose options before purchase. Avoid nested links and overlapping card/purchase targets.

| Media state | Rendering requirement |
|---|---|
| Available | Contain-fit actual catalogue pack with explicit image dimensions and responsive sizes. |
| Loading | Keep the square well and final text geometry stable. |
| Missing / failed | Preserve the well, show a quiet package glyph and localized Image unavailable text, and retain name, pack and purchase information. |
| Detail | Primary pack first, then alternate pack and verified label/detail views. At desktop, main media well max 560px square. |
| Editorial | Crop approved photography to the component's frame with viewport-specific focal points. Put actionable text in HTML. |

Give meaningful product views concise alt text. Use empty alt when the adjacent title shares the same link and already supplies identical identity. Decorative icons have empty semantics. Prioritize only actual initial visible hero/pack media and load lower images on demand. Source image quality and clinical/offer claims require pharmacy approval.

## Detail, variants and purchase

Gallery supports swipe, previous/next buttons, position text and selected thumbnails of 56px with 8px gaps. Single-image products omit redundant navigation. Swipes preserve vertical scrolling and have keyboard/button alternatives. Zoom uses a titled, dismissible dialog. Preserve native pinch zoom.

Use labeled single-select variants for supported pack/form choices. Selection has a check and forest boundary on tint. Show unavailable combinations with their reason. Long choice sets can use a select. Update identity, gallery, price and availability from the supported product record together. Quantity decrement/increment targets are 44px with an announced current amount and visible limits.

Purchase state sequence is ready → checking → confirmed or rejected. Suppress duplicate activation while pending. Success confirms addition and offers View cart. A rejection explains recovery beside the control. An unknown response shows Checking status and reconciles with the existing commerce owner before retry or success. The fixed and inline purchase regions share the same selection, quantity and busy state.

## Cart, checkout and customer states

Cart drawer max width is 440px on desktop and full available width on phones. Each line has a 64px pack, complete identity and chosen variant, quantity, line price and named remove action. Separate lines with a divider and 16px vertical spacing. Totals and continuation follow the scrollable items. A full cart adds a summary beside items on desktop. Failed updates retain confirmed quantities/prices and show an inline error. Offer Undo only when supported by the existing operation.

Checkout retains the existing stages, address/map behavior, supported payment choices and authoritative totals. Each stage has a heading and one dominant continuation. Address cards use radio selection, recipient/address and a separate Edit action. Group fields with fieldsets and 24px spacing. Validate without losing entered values. A failed multi-field submission focuses a linked error summary while retaining inline errors. Payment progress distinguishes rejection, unknown outcome, pending payment and confirmed order.

Confirmation starts with returned status and order reference, then actual next step, purchased items, totals and delivery. Tracking is a chronological list with readable current status and known timestamps. Account sign-in supports password managers/paste and existing verification methods. Profile, address book, saved items and order history share the same controls and error treatment. Empty states explain the available next action using supported routes.

## Layering and ownership

Overlay order is page → sticky header/navigation → popover → modal scrim → modal surface → toast. Place suggestions/tooltips inside their active modal layer. Sticky summaries release to normal flow if taller than the available viewport. Keep interface state local to existing interactive boundaries. Reuse owned shadcn-style components, compatible Base UI primitives for new interactions and existing Radix where integrated. Each component must have default, hover, focus, selected, disabled, busy, error and long-content examples where applicable.

## Imagery art direction

Use genuine isolated catalogue packs for product cards and galleries. Use approved human/lifestyle photography for campaigns or editorial collections when it explains the shopping context. Keep category shortcuts consistent within a row through the same image role, comparable subject scale and shared media dimensions. Choose an image or glyph according to asset availability and retain the full category name.

Campaign photography reserves an uncluttered copy-safe area, with text on solid approved fill. Record a focal point for each crop, such as a person's face and hands or the front label of a pack. Desktop crops can place the subject toward the image-side edge. Phone crops retain the meaningful subject and leave the action clear. Preserve authentic packaging, branding and identifying label detail. Staff/professional imagery and campaign claims use pharmacy-approved content and supported services.

## Runtime handoff details

Use `layer.page` 0, `layer.sticky` 20, `layer.popover` 30, `layer.scrim` 40, `layer.modal` 50, `layer.toast` 60 and `layer.skip` 70 for the established stacking order. Scope overlay portals to the correct surface/locale so font, semantic colors and RTL remain consistent. Reference the existing radius, icon and motion tokens from DESIGN.md instead of inheriting a primitive's default appearance.

Filter Reset clears draft choices and keeps the sheet open. Apply commits them and closes the sheet. Cancel, Escape, close, backdrop and Back discard the draft. Restore focus to its trigger and retain committed results while loading the replacement set. Background results remain inert while the modal sheet is open. Gallery movement stops when interrupted; preserve vertical pan and native system navigation.

Cart rows keep catalogue estimates clearly labeled where the current flow supplies estimates. Quote details, fees and final totals use their actual returned state. Essential transaction failures remain visible until resolved. Optional success toasts can dismiss after five seconds, with a pause while hovered or keyboard-focused; persistent inline confirmation/recovery stays available. Announce a changed cart count as a complete phrase through one appropriate status region, without moving focus.

Search results must correspond to the current input query. Ignore late suggestion responses for earlier queries and clear the active suggestion whenever the query or option set changes. Enter opens a current visible active option, otherwise it submits the current query. Announce the loading/result change once through the combobox status instead of repeatedly reading the complete list.

Associate field labels, helper text and error messages programmatically. Expose required and invalid states. Error-summary links focus the affected field. On opening a form dialog, focus the first relevant field or explanatory heading when reading context comes first. Informational dialogs initially focus their heading or close control. Modal Escape/close restores focus to the opener. Preserve draft values according to the owning task. Nonmodal popovers keep the surrounding page operable.

Gallery thumbnails are named buttons with an exposed selected/current state and a readable image position, such as Image 2 of 4. Keep thumbnail focus on selection and announce the changed main view once. Quantity uses the existing editable numeric input where supported, with a persistent accessible name, bounds and decrement/increment buttons. Reject or correct invalid entries through the existing validation rules, show reached limits nearby, and announce confirmed changes through one status channel. Focus stays on the control used.
