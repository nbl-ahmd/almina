> **SUPERSEDED — historical record only.** Archived on 18 November 2026 by P2-05. Excluded from current design guidance. Read `apps/web/DESIGN.md`, the active brief and decision register. Do not regenerate tokens or restore instructions from this record.

# Al Mina — Pharmacy-app storefront brief

Updated 15 November 2026. The owner rejected the previous two local compositions and explicitly requested a rebuild from **02-pharmacy-app.png**, including a new ad banner. This is the current implementation brief. No deployment is authorized.

## Confirmed requirements

- Primary accent is exactly **#FF5A5F**. Keep the real logo, business facts and production safeguards in PRODUCT.md and AGENTS.md.
- Search is the primary shopping entry, with delivery-area selection and cart discoverable.
- Use reference 02 as the principal home and product-detail composition. Home: compact search, photographic ad, circular image categories, horizontal image-led product cards. PDP: large unframed image, name/brand, price, real options, quantity and clear purchase action, then compact related products.
- Keep persistent mobile purchase access from the earlier owner requirement. Use working coded mobile/desktop previews, including Arabic RTL.
- Preserve routes, query URLs, SEO, product identifiers, catalogue APIs, auth, saved items, cart, conditional checkout/payment presentation and server-authoritative commercial facts.
- Keep admin and wholesale independent. Shared styling remains until all consumers migrate.

## Latest confirmed card request

Reference 05 supersedes earlier card geometry: stock badge and wishlist around contained photography; brand/pack chips; clear product name; stronger dirham-symbol price and rounded-square quick add. Owner requested information density and purchase efficiency. Preserve exact coral. Do not copy the pictured rating without real aggregate data. Actual cart count appears after adding and restores on reload; all additions retain server validation. The full name remains accessible even where visible title removes exact repetitions in adjacent chips.

## Implemented choices pending owner acceptance

A cool pale lavender app canvas, white product/control surfaces, Figtree/Alexandria, rounded search/actions, circular category imagery and restrained headings interpret reference 02. Coral replaces the reference's blue. The owner subsequently requested a responsive repair and improved desktop layout on 16 November 2026. Desktop now pairs the ad with a compact category directory above four product columns; phones retain the reference order and scrolling rail. Tablets have a full-width search row. Listing adapts from two phone columns to three intermediate columns and four wide-desktop columns beside filters. The repair preserves the coral identity and shopping behavior. PDP mobile uses a compact back/search/save/cart toolbar and a fixed purchase dock; desktop retains the global search shell and places buying controls alongside the gallery.

Generated courier artwork is placed in the live home ad with semantic, translated HTML copy and a real catalogue link. Generated category illustrations are decorative, generic navigation aids. Actual category media takes precedence. Neither asset establishes a business claim or saleable item.

The older reference-01 card anatomy remains useful for factual price/availability/action hierarchy. Its exact mobile grid no longer overrides reference 02's home rail. Reference 03's category tiles are superseded; its persistent buying-access requirement remains.

## Content and scope

Priority is product search/identity, delivery context, real categories, selected pack and factual price/availability/action, then related products and secondary information. Preserve real descriptions, specifications, reviews and honest unavailable/empty states. Move secondary delivery/SKU text below the PDP buying sequence; do not remove it.

Core review: home, listing/search and PDP in English/Arabic at phone, tablet and desktop widths. Regression coverage includes cart, checkout, account, missing route, menus, filters and admin. Other existing customer routes inherit the scoped system; this task does not invent new screens, services or business programmes.

## Accessibility, responsive and localization requirements

Keep semantic controls, visible focus, keyboard navigation, names/labels, readable contrast, reduced motion, usable touch targets, status/error feedback and zoom/reflow. Product names wrap. Category links and product rails scroll within their own bounds. The purchase dock must respect safe areas and leave final content reachable; it replaces competing bottom navigation on mobile PDP. Arabic mirrors directional layout and arrows, with the same tasks and original pack/logo orientation. Native/pharmacy review of Arabic copy remains open.

## Success criteria and verification limits

The first mobile view must visibly express reference 02's search/ad/circles/rail sequence, with no dark promotional aside or category-first tile wall. PDP imagery must be unframed and buying controls reachable before secondary information. Automated and browser checks must preserve commerce and admin behavior, without page overflow or broken media. Owner visual acceptance remains pending; passing tests is not approval of the appearance or proof of live providers.

Preview prices and stock are labelled sample data. The small catalogue fixture does not establish production completeness or representative search relevance. Photograph quality varies in existing pack assets.

## Open questions and exclusions

Open business facts: category/revenue priorities, campaign schedule, delivery coverage/fees/hours, live provider readiness, catalogue/media quality and Arabic review ownership. Omit unsupported claims instead of blocking the local preview.

No copied discount, rating, certification, delivery promise, medical claim, brand, watermark, phone frame or viewer UI. No scanner, camera or chat feature inferred from the screenshot. No new payment methods, backend changes, data mutation, framework upgrade, admin/wholesale redesign or deployment. Future owner revisions go in docs/design/decisions.md; DESIGN.md records the actual current implementation.
