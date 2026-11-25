# Admin page patterns

## Page frame
Title (24), one-sentence description, right-aligned actions. Content in 16px-gapped cards. Never more than one primary action per page header.

## Dashboard (admin)
1. **Needs attention strip** first: pending orders (with oldest age), address reviews, out-of-stock products, products ready to go
   live, hidden products. Each tile links to the filtered list and is hidden when its count is zero and nothing is wrong, replaced by one "All clear" line.
2. Four metric cards (order value, orders, average order, dispatched) with period selector and export.
3. Sales chart (wide) beside fulfilment donut.
4. Recent orders table beside most-ordered products.
5. Scope note at the bottom: what the period report covers and its date basis.

## Dashboard (staff and branch)
Status counts with the real total, not the size of a sample. Recent orders. No sales figures.

## List page (products, orders, categories, banners, users)
Title and primary action, filter chips, search field, table with footer pagination. Filters live in the URL so lists can be shared and reloaded.

- **Orders**: status chips, search by order number or customer, date range, export.
- **Products**: view tabs with counts (All, Live, Hidden, Out of stock, On sale), filter chips for what needs work (ready to go live,
  missing photo, type, name, details, prescription), search and category, clickable thumbnail that accepts dropped photos, bulk
  upload, bulk go-live, bulk product type behind a confirming dialog, numbered pagination. The former Needs action screen is this list with filters.
- **Categories and banners**: image thumbnail column; banners show which eight are live in the carousel.

## Detail and form page
Two columns on desktop: main form cards left, side panel right (media, category, status, save actions). Sticky action bar with Save draft and Save or Publish. Section cards named by task (General information, Pricing and stock, Care and usage). Unsaved changes prompt on leave.

## Settings-style pages
Group by task, never by technical area. Security actions such as revoking sessions sit under Team & access, not Notifications.

## Navigation groups
- Today: Dashboard, Orders
- Catalogue: Products, Categories, Banners, Image review, Catalog import
- Customers & growth: Coupons, Website & growth, Email marketing, WhatsApp, Search, Wholesale
- Delivery: Branches & delivery, Notifications
- Administration: Team & access, Store settings, Operations, Product recovery

Rarely used tools (Operations, Product recovery, Catalog import) stay in the sidebar but at the bottom of their group.
