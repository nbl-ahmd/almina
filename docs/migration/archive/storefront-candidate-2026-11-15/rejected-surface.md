> SUPERSEDED — rejected by the owner on 15 November 2026. Historical record only; no current design authority.

---
version: 1
slug: "apps-web-src-components-homepage-tsx"
primary_target: "apps/web/src/components/homepage.tsx"
related_targets: ["apps/web/src/components/navigation.tsx","apps/web/src/components/product-card.tsx","apps/web/src/app/(storefront)/products/[slug]/page.tsx","apps/web/src/app/(storefront)/storefront.css"]
---

Scope: customer storefront; admin and wholesale keep their independent systems. Mode: Operate; homepage introduces the same shopping flow.

## Direction contract

THESIS: A familiar pharmacy app that becomes a spacious retail website on desktop. Product choice and purchase remain immediate; no inherited pastel bento or giant editorial footer.

OWN-WORLD: Owner-selected coral/aqua logo palette with dark blue-gray ink, white product surfaces and quiet cool-gray canvas. Manrope and a purpose-chosen Arabic face; rounded cards, contained catalogue photography, honest status and 44–52px controls. Image 1 supplies cards, image 2 the gallery-first PDP, image 3 home rhythm and purchase dock.

STORY: Choose an area, search or browse a department, compare actual products, inspect images/options and use the existing validated cart/checkout.

FIRST VIEWPORT: Mobile: logo/cart and delivery row, full-width search, compact campaign, departments, two-column product shelf. Desktop: one integrated logo/search/address/account/cart row, department navigation, wide campaign, compact categories and four-column products. PDP images lead; purchase dock clears navigation and safe areas.

FORM: User-pinned composite overrides assigned candidate 5 (seed: see `docs/design/storefront/reference-direction-roll.txt`) and its unrelated challengers. The grounded set was care counter, pharmacy app, product shelf, local service directory, everyday retail catalogue (5), wellness guide, department index. User selected the combination and code-first review explicitly. Challengers declined: departure board and acetate layers obscure retail affordances; map lobes and character catalog impose unrelated visual identities; bitmap specimen harms product-label legibility. Retain only their discipline of stable state, clear grouping and readable hierarchy. No random world or generated comp is authorized over the supplied references.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Stages: foundation/shared controls; header/home/cards; listing/PDP; remaining customer surfaces through the scoped theme; runtime/regression review; record the implemented system. No new commerce/auth/API behavior, claims or production deployment. Reference photos are not shipping assets. Build uses real catalogue media, configured campaigns and truthful empty/error states.
