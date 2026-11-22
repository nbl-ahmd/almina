# Admin components

All components live in `apps/web/src/components/admin/`. New patterns go through `ui.tsx` so screens do not restyle them.

## Shell
- **Sidebar**: white 16px surface, 260px wide. Group label, then items (icon + label). Active item is a mint pill. Footer holds "View storefront" and the account chip. Collapses to the mobile sheet below 1024px.
- **Topbar**: separate white surface. Left: breadcrumb. Centre: global search with `Ctrl K` hint. Right: alert bell with unread badge, sound toggle, account menu.
- **Mobile**: bottom tab bar with four primary destinations plus More. Unchanged model.

## Metric card
Label (13, muted), figure (28, tabular), change chip, caption "vs previous period". Optional 36px tinted icon chip at top right (ref 1, 4). Four across at 1200px+, two across at tablet, stacked on phone. A metric with no baseline says so instead of showing a chip.

## Buttons
Primary capsule forest, secondary capsule white with hairline, quiet text button, danger capsule red text on soft red. 40px high, 44px on touch. Icon buttons 40px circle. Loading shows text change, never a spinner alone.

## Fields
Filled soft-grey, 12px radius, 44px high, label above, helper text below, error text with an icon. Focus is a 2px forest ring. Selects match. Search fields carry a leading icon.

## Chips and tabs
Filter chips: capsule, soft fill, selected = forest fill white text. Used for order status and inventory views. Section tabs inside a page stay underlined with arrow-key support.

## Status pill
Capsule, dot plus text: Live/Dispatched green, Pending amber, Confirmed teal, Packed blue, Cancelled/Refunded grey, Failed red. Text is never omitted.

## Data table
- Header row soft fill, 12px uppercase-free labels, 13px.
- Zebra rows on soft fill; hover darkens slightly; the row is a link target when it opens a detail.
- First column may carry a 40px rounded thumbnail.
- Money and counts right-aligned, tabular.
- Row actions: primary text link, then a three-dot menu. Destructive items inside the menu, confirmed.
- Footer: "Showing 26 to 50 of 312", page size select (25, 50, 100), numeric pagination with first, previous, next, last and the current page highlighted. When the total is unknown the footer says "Showing 26 to 50" and offers Previous and Next only when they lead somewhere.
- On phones, rows become stacked cards with labelled values.

## Confirm dialog
One `ConfirmDialog` (Radix Dialog). Title states the action, body states the effect and what is kept, buttons are the action verb and "Cancel". Danger variant for archive, deactivate, close store. Store-wide actions repeat the store state in the title. Focus starts on Cancel.

## Empty and error states
Icon, one-line title, one sentence of help, one action. Errors say what failed and what to try.

## Charts
Straight-segment line or bars, single forest series plus one muted comparison. Hover and keyboard tooltip. Always accompanied by a text summary for screen readers. Donut only for part-of-whole with three segments or fewer and the percentage printed in the centre.
