# Storefront components

Use the [color states](colors.md), [type roles](typography.md) and [responsive grid](responsive.md) throughout. Dimensions below are CSS pixels. Minimum heights can grow with text size.

## Finding products

| Component | Anatomy and behavior |
|---|---|
| Header | On desktop, place the existing logo at its natural aspect ratio, search in the flexible center, then account and cart. Use a 72px minimum row on canvas and a divider above the department row. On phones, use a 56px identity row and a full-width search field below. The logo links home. Cart has an accessible item count. |
| Search | Use a visible search icon, 48px field and 16px input type. Provide a clear action when populated. Anchor suggestions to the field on desktop. On phones, use a full-width panel that scrolls above the keyboard. Show matched product name and pack, then a link to all results. Keep input focus during arrow-key navigation, announce the active option, submit with Enter and dismiss with Escape. Preserve the query on dismissal. |
| Categories | Show department names in a 48px desktop row. A menu groups subcategories under plain-text headings. A category card uses a square pack or editorial crop with its label below. On phones, allow a horizontally scrollable row with a partially visible next card and a link to all categories. |
| Campaign | At most one dominant lime campaign panel per page, primarily for homepage and merchandising use. Use forest for the headline and one underlined forest collection link. Keep type beside imagery on wide screens and above it on narrow ones. Put type on solid fill. Reserve brand photography and offer claims for approved campaigns. |
| Results | Put title and count above filters and sort. Use labeled sort choices. Place applied filters in removable chips and offer Clear all when multiple are active. On mobile, draft filter choices inside a sheet with Apply and Reset. Cancel restores the previous selection. Preserve the active query, filters and sort through product navigation and Back. |

## From shelf to cart

| Component | Anatomy and behavior |
|---|---|
| Product card | Flat canvas, 12px radius, 12px inner space. Reserve a square media well with contained pack photography and consistent optical scale. Follow with product name, pack size, current price and action. Align actions to the row bottom. Let names wrap and expand the row where truncation would hide strength or formulation. Keep the detail link and purchase control separate. |
| Merchandising labels | At most one verified offer badge in the media corner, using text on brand and 4px radius. Pair a genuine former price in muted strike-through with the current price in text ink. Show unavailability in words beside the purchase control. |
| Detail and gallery | Put the primary pack first in a square contain-fit frame. Provide labeled previous/next controls, position text and selectable thumbnails for multiple images. Support swipe and keyboard. Follow name with pack, price, availability, variant choice, quantity and purchase action. Group longer product information below. |
| Variants and quantity | Use labeled single-select options with a check on the current choice. Expose unavailable options with a reason. Use a select for a long list. Give decrement and increment their own 44px targets and announce the new quantity. Respect limits supplied by commerce logic. |
| Add to cart | Use one action-colored Add to cart per purchase region. Products requiring a choice link to selection first. Preserve button width while pending and prevent duplicate activation. Announce confirmation and offer View cart. On rejection, restore the control and explain the next available action inline. |
| Cart | Desktop drawer up to 440px wide, phone sheet up to full height. Use a 64px pack thumbnail, name, variant, quantity control, line price and named remove action. Pin subtotal and checkout below the scrolling items. Full cart groups the same rows with the order summary. Reconcile quantity and totals with the confirmed response. |
| Checkout and address | Present existing stages in order, with persistent labels and a single primary action for the current stage. Group related fields in a fieldset. Address cards use radio selection, recipient and address lines, plus a separate edit action. Keep delivery and map controls reachable by touch and keyboard. Preserve entered values on validation failure and focus the error summary linking to affected fields. |
| Confirmation and tracking | Lead with status, order reference and actual next step. Follow with purchased items, totals and delivery details. Present tracking as an ordered list with timestamps where known. Mark the current stage in words. Distinguish pending payment from confirmed payment using the returned order state. |

## Shared controls and feedback

- **Buttons and fields.** Primary and secondary buttons have 44px minimum height, 16px inline padding and 8px radius. Text links use an underline in running copy. Fields use canvas, a 1px control border and a persistent label 4px above. Use the same focus treatment for keyboard access to buttons, links, fields and icon controls.
- **Chips and tags.** Give removable and selectable chips a 44px hit area, 8px radius and a visible remove or selection indicator. Read-only tags use the badge type role and have no hover state.
- **Menus and overlays.** Align menus to their trigger and support arrows and Escape. Use dialogs for decisions, sheets for extended tasks. Give modal surfaces a title, close control, scrim and focus containment. Restore focus to the opener on close. Limit a decision dialog to 480px wide, with 24px padding on desktop and 16px on phones.
- **Pending and empty states.** Skeletons reserve the final media and text dimensions and disappear together when content arrives. Announce loading once per region. Empty search retains the query and offers to clear filters. Empty cart links back to browsing.
- **Errors and success.** Place field errors immediately beneath the field and associate them programmatically. Keep transaction failures visible until resolved. Use a polite Sonner toast for supplementary confirmation, above fixed controls, with dismissal and no required action available only in the toast. Pair each semantic color with an icon and readable status.

## Product-card construction and media

Fixed card anatomy is media → complete identity → pack → price → action. Apply 12px padding and 8px between the media and title. Name to pack uses 4px, pack to price uses 8px, and price to action uses 8px. The action spans the text area and has a 44px minimum height. Optional former price wraps below the current price if needed. At 16/22px type, a two-line name, one pack line, price and button produce approximately 192px of content and padding below the square media. This is a sizing reference, with content determining the actual height.

At 390px viewport, a two-column grid has 173px cards and 149px media wells after padding. At the 1280px content maximum, a four-column filtered grid with a 224px rail, 24px rail gap and 24px column gaps has 240px cards. Use the same anatomy for both. A narrow 320px layout uses one column to preserve the 140px card minimum. Home shelves may scroll horizontally using 160–200px cards and 12px gaps on phones. Results grids use vertical document scrolling.

| Media state | Fixed rendering rule |
|---|---|
| Available pack | Contain within a square canvas well. Aim for the visible pack to occupy 75–85% of the longest dimension. Adjust optical scale per approved asset without cropping labels. |
| Loading | Reserve the same square dimensions. Use a static surface skeleton, with text geometry matching the final card. |
| Missing or failed | Keep the square surface well, a small forest package icon and the text Image unavailable. Retain identity and purchase information. Use an empty alt for the decorative placeholder icon. |
| Detail gallery | Contain the pack, with a maximum 560px square well on desktop and available page width on phones. Thumbnails are 56px with 8px gaps and 44px or larger interactive targets. |
| Category or campaign | Crop approved editorial imagery within the specified aspect ratio. Set its focal point per asset and viewport. Place all actionable text in HTML. |

Give pack images concise alt text that identifies the product and view. When an image and adjacent title share one link and communicate the same identity, use empty alt on the image to avoid repetition. Declare image dimensions and responsive sizes during implementation. Prioritize only the actual initial hero or primary pack and lazy-load images below the initial viewport. Keep high-resolution gallery images on demand.

## Interaction contracts

Search suggestions cover loading, results, no matches and request failure. Use a combobox with a listbox for product options and a separate all-results link. Show at most six initial product suggestions, each with a 44px minimum row. Keep category links outside the listbox. A request failure preserves the query and offers normal search submission. Hide camera, scanner or voice affordances unless the application supports their complete flow.

A selected variant includes its text label, forest outline and check. Focus adds the focus ring independently. Selection updates the existing product identity, media, price and availability together from the supported data. Keep unavailability reasons visible. Quantity limits explain why increment or decrement is unavailable. A pending line update keeps its last confirmed price readable and shows Updating… until reconciled. A failed removal restores the item and places the error beside it. Offer Undo only if the existing operation can restore the same selection safely.

Use neutral skeletons and a textual pending label. Reduced motion removes spatial travel and retains immediate state changes and completion announcements. Disable campaign autoplay. A gallery swipe preserves vertical page scroll, clears on gesture cancellation and has visible button alternatives. On desktop, sticky summaries stop within their parent and become normal flow whenever their height exceeds the available viewport.

Define overlay order as page, sticky header/navigation, popover, modal scrim, modal surface, then toast. Keep tooltips and suggestions within the active modal layer when opened there. Background content becomes inert during a modal. Menus stay short and aligned to their trigger. Sheets and dialogs preserve entered data when presenting recoverable errors. Browser Back closes a full-screen navigation or filter surface before leaving the underlying page when the existing navigation model supports that state.

With an active suggestion, Enter opens that product. With no active suggestion, Enter submits the query. Give the input a persistent accessible name, expanded state and popup relationship, and associate the active descendant with its option. Tab reaches the all-results link after the input without selecting an option. Announce suggestion count without interrupting typing.

A timeout can leave an outcome unknown. Show a checking state and reconcile with the existing cart or order owner before presenting success or enabling a duplicate submission. Confirmed failures restore controls with their error message. This state contract uses the existing commerce mechanisms.
