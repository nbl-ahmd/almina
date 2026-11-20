# Accepted storefront screen directions

Updated 19 November 2026. These compositions describe the selected storefront as implemented. [DESIGN.md](../../DESIGN.md) owns visual roles and [PRODUCT.md](../../PRODUCT.md) owns facts. See [decisions](decisions.md) and [progress](implementation-progress.md).

## Home

Use prominent search, delivery context and cart, then a full-width campaign, category discovery and compact product comparison. The owner selected A/full campaign and five wide-screen home columns. Near-white surfaces, contained photographs and compact buying controls remain. The current phone home has two product columns and category links can overflow locally. Do not reinstate the earlier incumbent horizontal home rail or split campaign/category directory as the default composition. The four-column and split options are retained as historical comparisons.

The built-in carousel slides use live bilingual copy and link to existing catalogue destinations. Published banners keep the responsive artwork frames. The home category lane uses short text links. Skincare and baby care place a section heading and a collection link above the product shelves. Only published campaigns supply promotion-specific artwork and claims.

## Listing and search

Preserve real query/count/filter/sort/pagination and suggestion fallback, with native disclosure/sheets and selected-state semantics. Use the shared compact card anatomy; two-column phone comparison and responsive intermediate/wide layouts retain their own constraints. Five home columns is not a blanket listing rule. Keep exact identity/pack/stock/current price, honest unknowns, real variant navigation and server-checked purchasing. No copied ratings or unsupported badges.

## Product detail

Latest N03 `docs/design/storefront/references/2026-11-17/03-green-pharmacy-screens.jpg` supersedes the standalone phone toolbar. Phone: full-width gallery at top, overlay Back/Save/Cart, compact identity/price/stock/options, verified facts/description before useful alternatives and persistent quantity/purchase access. One real photo has no fake carousel dots. Sticky buying replaces global bottom navigation and measures clearance so final content remains reachable.

Desktop retains the global search/location/cart shell and gallery beside buying context. Real thumbnail/pack links select actual records and preserve price/stock relationships. Return to results preserves existing query/scroll/focus behavior. Keep actual descriptions/specifications/reviews/policies and honest missing states; reference screenshots do not fill catalogue gaps.

## Shell, cart, checkout and customer states

Search has browsing/focused/task contexts. Location and menu interactions retain native labels/focus, optional user-triggered GPS/manual fallback and Arabic direction. Cart and checkout have one dominant continuation within their task mode. Browser cart data and server-loaded estimates remain distinct from final server quotes. Preserve auth, conditional payment availability, failed/pending/unavailable states and existing account features.

The checkout uses the accepted canvas, readable labels above native fields, and one continuation in a measured phone dock or desktop review column. On short landscape screens and when the software keyboard opens, the action moves into the page. Enter and review the address before progressing on phones. Desktop keeps the form and order breakdown together. Payment options and result messages follow the existing checkout and provider state. [Checkout verification](implementation-evidence/p5-02-checkout.md).

## Responsive, RTL and content guardrails

Test the same loaded page through phone/tablet/desktop boundaries, short landscape, enlarged text and task-mode changes. Keep local overflow inside intentional rails and leave the page free of horizontal overflow. Verify focus/keyboard, state feedback, scroll return, safe areas and last content above actual fixed docks. Filled dirham and product/logo images are not mirrored. Product identities remain factual mixed-script text; Arabic native review remains open.

No watermarks, device frames, competitor claims, fake features, generated packs, fabricated ratings or marketing promises. Reference assets/annotations remain inputs, never product facts. [P2-04](implementation-evidence/p2-04-refinement.md) records current contrast, shape, icon, badge, stock and reduced-motion decisions. Native/provider/release verification remains separate from local direction acceptance. No deployment.
