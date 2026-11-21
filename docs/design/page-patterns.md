# Storefront page patterns

These patterns combine the [components](components.md) with the [responsive grid](responsive.md). Fixed rules apply across implementations. Contextual defaults can adapt to verified catalogue content. Every page uses the approved palette, real product data and existing supported actions.

## Homepage

Fixed order is header and search → primary campaign if approved → category shortcuts → first product shelf. Continue with contextual merchandising, then service/help content and footer. Keep the first shelf reachable after this short discovery sequence on phones. Search remains available before promotional content.

The campaign is the page’s only lime block. Use 24px padding on phones and 32px on desktop, 16px radius and a forest campaign heading. On desktop allocate roughly 55% to text and 45% to one approved image grouping, with 32px between. A 320–400px panel height is a starting range, growing for text. On phones stack text before imagery, use 16px between and a 3:2 image region when an image is present. Keep the collection link beside the copy. Use text that identifies the collection instead of a generic slogan. Review crops independently for each viewport.

Category shortcuts use 80px media and a full label on phones, with 16px gaps and a partial next item. Desktop shows six to eight shortcuts fitting the container. Follow with a shelf heading and a View all link sharing one baseline, 16px above products. Use a four- or five-column unfiltered grid on desktop, with the card minimum enforced. On phones use either two columns for a short shelf or a horizontally scrollable shelf with 160–200px cards. Choose one treatment consistently for all homepage shelves.

Contextual default is two to four curated shelves, separated by 32px on phones and 48px on desktop. Place a neutral editorial or department feature between shelves only when it introduces a distinct collection. Service actions can occupy two equal desktop columns and stack on phones when the application already supports them. Omit empty shelves and unverified ratings, delivery promises, consultation actions or prescription flows. Footer groups real support, account and policy destinations, with 24px gaps and a divider above.

## Department and product listing

Order is breadcrumb → page title and result count → relevant subcategories → applied filters and sorting → results → pagination. Use page-title type for the single H1. Separate title from toolbar by 24px. Department description is optional, limited to two short lines before results. The search field stays in the header. Promotional material follows the first result block when it has a relevant role, using a neutral treatment so results retain priority.

Desktop uses the documented filter rail and result grid. Filter groups have a plain heading, labeled choices and 24px between groups. Mobile uses a Filter button with active count and a labeled Sort control above results. Keep the result count readable while filters update. Reset clears the sheet’s draft. Apply commits it and closes the sheet. Escape, close, backdrop dismissal and Back discard the draft. Restore focus to Filter. Keep the existing committed result set visible while a new request is pending, with a loading message. On failure, preserve those results and filters and offer Retry.

Retain the application’s supported pagination method, with accessible loading and current-position feedback. Returning from a detail page restores the query, sort, applied filters and browsing position. An empty department gives a clear message and nearby categories. Zero filtered results offer Clear filters while retaining the department context.

## Search results

Lead with the submitted query in the heading and the confirmed result count. Follow with useful catalogue filters, sort and the same result grid as a department. Put direct product matches first according to the existing search behavior. Avoid inserting a campaign between query and matches. Show a corrected query only when the search response supplies one, with a way to return to the original query. A no-match state retains the input and offers edit query or clear filters. Suggestions and search results have separate loading and error messages.

## Product detail

Use breadcrumb → product identity and purchase area → verified product information → related products. Desktop places a gallery beside a purchase column, each taking half the available width with a 32px gap. Mobile places gallery first. Use the page-title role for the product H1, the card-name role only in related shelves.

Within the purchase column, use name → strength/formulation and pack → price and availability → required variants → quantity → purchase action → applicable delivery or purchase conditions. Space identity lines by 4px, price from identity by 16px and choice groups by 24px. The primary price uses 24/32px at weight 700. Keep former price secondary. Button height is at least 44px, growing for the locale. Purchase conditions sit immediately beneath the action with 8px spacing. Use actual conditions returned by the application.

The gallery shows the actual primary pack, then alternate pack views and verified label/detail images. A thumbnail is a navigation control, with a selected marker and view label. Single-image products omit redundant gallery navigation. Review zoom opens a titled dialog with a close control and a full view that remains navigable by keyboard.

Information sections follow the available verified fields in this order, where present: overview, product details/ingredients, directions, warnings, storage and delivery/returns information. Use real approved headings appropriate to the product. On phones use accessible accordions with overview initially expanded. Desktop can show the same sections expanded. Keep important purchase warnings beside the purchase action as well as in the full information. Omit unsupported sections. Related products use one shelf after the information.

## Cart and checkout

The cart drawer gives immediate access to the added item, editable lines and confirmed subtotal. Keep it as user-invoked feedback unless existing behavior already opens it. The cart page leads with its title and item count, then line items and a summary. Use 16px vertical spacing around rows, 64px thumbnails, complete product identity and a separate remove control. On desktop use the 360px summary at the widest breakpoint. On phones place the summary after the items and the checkout action in the single bottom region when space permits. Promotion-code entry is secondary to the total and checkout action.

Checkout uses a compact identity header, return-to-cart link and existing stage indicator. Give each stage a heading and group its fields with 24px spacing. At desktop widths, form content occupies the remaining space beside the summary, with field groups capped at 640px. On phones, order is stage content → order summary → stage action. Required selections and fees appear before payment submission. Use supported payment choices as labeled options and explain the next step for external payment flows. Preserve draft address data through recoverable errors.

The final action names the actual commitment and amount where supported by the existing flow. During submission show progress and prevent repeat activation. If an outcome is unknown after a timeout, show Checking order status and reconcile through the existing order/payment status flow before offering retry or success. A confirmed rejection presents its reason and recovery action. Confirmation leads with returned order status and reference, then next steps, items, totals and delivery details. Tracking uses a labeled chronological list. Keep help available beside failures and uncertain status.

## Page-level invariants

One H1, one clearly identified main region and a skip link precede repeated navigation. Every page supports direct navigation and reload with meaningful content or a recoverable error. Contextual shelves use actual catalogue coverage. Fixed controls have a shared selection state and reserve their complete outer height. Typography and spacing create hierarchy before borders, panels or decoration are added.
