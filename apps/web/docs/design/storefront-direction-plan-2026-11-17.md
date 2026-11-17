# Replacement direction and delivery plan — 17 November 2026

**Status: review proposal, not an approved replacement design system.** No runtime styling, screens, final tokens, PRODUCT.md or DESIGN.md changed in this review. This plan answers the owner's request for a new coherent direction using the newly supplied mobile/desktop references. Confirmed product facts and safety constraints remain authoritative; the incumbent aesthetic is evidence, not a requirement to preserve.

Companion: [per-image reference analysis](reference-review-2026-11-17.md). Originals and provenance: [reference manifest](../../../../docs/design/storefront/references/2026-11-17/manifest.json).

## 1. Direction to test

**A compact, search-first pharmacy store: an app shell on phones and a complete commerce workspace on desktop.** One identity, different compositions. Express Al Mina through the real logo, disciplined coral shopping actions, precise product information and consistent visual behaviour. Avoid a collage of coloured cards, an oversized brand landing page, or a desktop page made by widening phone modules.

The store's job is to help customers find the right actual product/pack, understand current price/availability, and continue through the existing verified commerce flow. Search is primary; useful discovery follows it. The homepage has some persuasion, but listing, PDP, cart and checkout are task-oriented surfaces.

### Confirmed

- Exact primary accent **#FF5A5F**, actual Al Mina identity and contact facts.
- Prominent search; delivery context; compact factual product cards; dirham symbol; persistent phone purchase access.
- App-like mobile and a complete desktop experience; readable density rather than oversized spacing.
- English/Arabic/RTL, accessible interactions, preserved routes, URLs/SEO, catalogue, auth, APIs, integrations and server authority.
- Local working previews for review. No deployment or production-data access.

### Proposed, requiring screen review

- A restrained near-white/neutral shopping ground in place of the current lavender cast; exact neutral values remain undecided.
- Coral for primary shopping actions/selected emphasis, readable dark foreground, restrained logo-aqua use. Link, state and campaign roles must stop competing as extra brand palettes.
- A compact chrome and density model; separate mobile/desktop component compositions.
- A deliberate type hierarchy, initially testable with the already licensed Figtree/Alexandria pair. Retention is an experiment, not default visual inheritance or font approval. If it cannot carry the intended character, compare one alternative pair on identical product content before deciding.
- A limited set of shelf, category, campaign and utility modules. Expand content only where actual managed/catalogue data supports it.

### Open, but not blockers to this plan

Supporting neutral values, final font pair, precise mobile header treatment and desktop campaign composition need screen evaluation. Catalogue photo/content quality, promotion cadence, delivery coverage/claims and live payment enablement require verified operational input. Missing business content must yield honest empty/absent modules, not invented features.

## 2. Why the current system still feels mixed

The Nov16 repairs addressed concrete usability defects; they did not establish a sufficiently unified visual identity. Functional correctness and responsive checks are valuable preservation evidence, not aesthetic acceptance or release certification.

| Layer | Current evidence | Consequence | Planned correction |
| --- | --- | --- | --- |
| Colour | Customer tokens combine coral, lavender page/subtle fills, deep teal links, aqua logo, semantic red/green and route-local exceptions. | Several unrelated colour stories appear simultaneously; pale containers carry too much identity. | Define a small semantic role map and explicit allowed pairings; separate branded, neutral, status and campaign usage. |
| Typography | Figtree/Alexandria are scoped, but route CSS defines many independent sizes, weights, line heights and tracking values. | Local components look independently tuned; section titles, metadata and purchase emphasis lack a consistent rhythm. | Specify roles and component mappings in both scripts; separate English/Arabic optical adjustment from arbitrary route exceptions. |
| Spacing | Space tokens exist, while headers, cards, panels, galleries and footer frequently use literal values. | No enforced relationship between density levels; small facts coexist with large low-information panels. | Create density/spacing contracts for chrome, card internals, shelves and major passages; keep readable targets independent of visual padding. |
| Shape | 16px controls, 18px cards, 24px panels, pill quantities/options and circles coexist, plus route-local values. | Shapes are individually plausible but do not communicate a clear component family. | Restrict shape by role: field, action, product, sheet, icon; allow actual circles only for equal-sided icon/media cases. |
| CSS ownership | Customer scoping is valuable, but global legacy rules, shared utilities, customer control CSS, page CSS and retained checkout CSS still meet in the cascade. | New changes can revive mixed styling despite fixing individual conflicts. | Trace and migrate customer bindings; remove obsolete declarations after consumers move. Never remove admin/shared styles first. |
| State ownership | Unlayered customer button declarations outrank layered added-state utilities; primary-foreground has both inline white and scoped ink mappings. | A new visual state can be authored but not appear; future primary labels can use an unsafe foreground. These are source-derived risks, not observed order/add failures. | Make base, variants and states share explicit ownership/layering; test compiled CSS and live pending/added/disabled/focus transitions. |
| Mobile composition | Website header, campaign, categories, product shelf, editorial tiles and footer are arranged responsively. | Bottom navigation alone does not create an app interaction model; narrow input space and vertical travel remain. | Design screen modes, focused search, contextual top bars, local browsing and purchase access as one system. |
| Desktop composition | Campaign/category side-by-side row and four-card shelf work, but below-fold generic tiles/brand buttons and inherited detail flows vary in richness. | Desktop can feel like a sparse enlargement rather than a complete retail destination. | Design independent shelf widths, information hierarchy, comparison grids, filter rail, two-column PDP and coherent footer. |
| Imagery/content | Exact product photos differ in crop, background and internal scale; sample fixture descriptions are blank. | UI consistency cannot compensate for low-trust source assets. | Establish packshot acceptance and reviewed-content rules; obtain verified replacements without altering factual product identity. |

Source anchors: `src/app/(storefront)/storefront-tokens.css`, `storefront.css`, `storefront-controls.css`, `storefront-cart.css`, `storefront-checkout.css`, `src/app/globals.css`, `src/lib/storefront-fonts.ts`, `src/components/navigation.tsx`, `search-box.tsx`, `homepage.tsx`, `product-card.tsx`, `cart-controls.tsx`, `checkout-form.tsx` and `src/app/(storefront)/page.tsx`.

## 3. System specification to produce after concept acceptance

This describes responsibilities, not replacement token values.

1. **Foundations:** brand constants, neutral steps, semantic states, type roles in two scripts, spacing scale, shape roles, border/elevation levels, icon sizing/stroke and motion/reduced-motion rules.
2. **Semantic roles:** page/surface/raised surface, primary/secondary/muted text, default/strong/interactive boundary, primary action/foreground/hover/pressed/disabled, secondary/ghost/link states, focus, selected, success/warning/error, offer and stock. Selected is not automatically success; sale is not error; wishlist selection is not a sale.
3. **Component contracts:** mobile/desktop header, search/suggestions, location selector, navigation, category item, standard/compact product cards, price, quantity, option selector, campaign, filter/sort, gallery, disclosure, sheet/dialog, cart summary and purchase dock.
4. **Behaviour/state contracts:** resting, hover, focus, pressed, pending, success, disabled, unavailable, error, empty and loading. Specify keyboard and screen-reader semantics alongside visuals.
5. **Source ownership:** runtime customer tokens as one value source; guide/sidecar document them. Keep Tailwind semantic aliases connected to that source, not a second palette. Keep component-owned geometry separate from route-owned layout. Avoid a new styling library or general-purpose global reset.

Before migrating screens, resolve the actual cascade, not only filenames: normal unlayered CSS overrides normal layered utility rules. The current added-state background utilities in cart-controls.tsx cannot override the matching unlayered accent background in storefront-controls.css. Also verify compiled primary foreground utilities, because an inline literal white alias does not become ink merely by overriding a similarly named runtime variable. Keep storefront, admin and wholesale variant contracts independently correct. Include portal/dialog theme inheritance and storefront-to-admin client navigation in verification.

Colour approval must include contrast calculations for actual pairs, including coral with its foreground, outlines, disabled controls, small metadata, focus and Arabic glyphs. Do not place normal white text on the exact coral simply because other references do so. Campaign art may vary within an approved limited art-direction policy; it must not create another UI theme.

## 4. Screen and device plan

### Mobile app shell

- Location and cart remain visible context; search gets nearly the full usable width. Reduce competing hamburger/submit/utility chrome rather than reducing text size or targets.
- Define browse, focused-search, PDP and checkout modes. On focused search, keep the query, clear/cancel/back and suggestions reachable above the software keyboard. Preserve GET search URLs, Enter, Escape and existing keyboard selection.
- Use existing bottom destinations with labels and unmistakable active state. Do not add prescription, scanning, voice, chat, notifications or install onboarding from the mockups.
- Preserve back navigation, query/filter state and scroll continuity where the framework already supports them; explicitly test return-from-PDP. Any new persistence must remain scoped, optional and non-authoritative.
- PDP buying dock replaces global bottom navigation; cart and checkout must each have one dominant next-step action. Account and form screens need correct software-keyboard behaviour.
- Reachable content at safe areas, landscape, zoom and large text. Keep browser semantics and URLs; do not simulate a native application by hiding browser affordances or disabling zoom.

### Home

- Phone: compact search/context → bounded live-copy campaign → concise categories → complete purchasable product shelf. Aim to expose useful merchandise early without a giant hero.
- Desktop: unified header/search → shallow, purposeful campaign and discovery area → aligned product shelves → selective category/brand/campaign modules → compact complete footer. Determine whether a full-width shallow campaign or split lead wins in comparable coded previews; neither is approved yet.
- Replace generic empty editorial tiles with useful actual managed media/content or omit them. Do not manufacture more shelves from duplicate products merely to mimic the reference length.
- Major sections need distinct jobs. Avoid alternating rounded white rectangles that all look equally important.

### Product listing/search

- Desktop: persistent filter rail, clear query/category heading and result count, compact sorting, selected filters, consistent product grid. Phones: short context/toolbar and an accessible filter/sort sheet or disclosure using existing query semantics.
- Cards align photo/identity/price/action without discarding long identity/strength/variant facts. Use two columns on typical phones; stress-test the narrowest widths and large text before locking that density.
- Provide skeleton, empty, partial/error, no-stock and pagination states. No lone page marker or repeated explanations.
- Search should make useful matching products distinguishable; search quality and Arabic matching are separate from visual redesign and need representative data evaluation.

### Product detail

- Phone: contextual top bar → truthful contained gallery → identity/pack → price/availability → actual options/quantity → persistent purchase → useful description/specifications/delivery facts → related products.
- Desktop: gallery and thumbnails beside a compact buying column; clear relationship among selected pack, amount, stock and purchase. Detailed information below, with related products subordinate.
- Actual single images have no fake dots; missing photos/content have honest fallbacks. Preserve full identity and route/SEO metadata. Never replace a product photo with a generic generated pack.
- Do not carry the references' seller profiles, medical claims or ratings into the page unless verified existing product content supports them.

### Cart, checkout and account

- Cart: compact item rows with clear selected pack, unit and line amounts, quantity/removal, availability; summary visually distinct from recommendations; one principal next action per device.
- Checkout: retain existing steps, server quotes, payment gates and recovery logic. Migrate presentational roles comprehensively instead of leaving checkout as a separate visual product. No reordering or reinterpretation of high-risk behaviour without appropriate tests.
- Account/saved/orders/addresses/sign-in and policy/help routes use the same field, disclosure, summary, message and navigation contracts. Existing functionality stays intact; a redesigned home alone is insufficient.
- Unavailable checkout/payment/catalogue states must look intentional and communicate actual limitations. Do not activate a feature to make a preview feel complete.

## 5. Density and visual acceptance experiments

The following ranges are proposed prototype constraints, not final tokens or universal CSS instructions.

| Area | Experiment | Acceptance evidence |
| --- | --- | --- |
| Phone gutters | Compare 12–16px at typical phone widths, with adequate room for Arabic and 44px targets. | No squeezed names, unsafe edges or horizontal page scrolling. |
| Product-grid gaps | Compare 8–12px phone and 16–20px desktop; choose by readable real card width. | Names/variants remain legible, price/action don't collide. |
| Major passages | Test approximately 20–28px phone and 28–40px desktop where section changes need it. | Sections are distinct without low-information stretches. Avoid applying one large gap everywhere. |
| Card anatomy | Stable image frame and aligned price/action; modest internals instead of padding inflation. | Four-word and long multi-line names, full price range, offers/options and unavailable state all work. |
| Touch controls | Keep 44px minimum target; visual icon may be smaller with a larger hit box. | Compact appearance does not reduce touch reliability. |
| First view | At 390×844 aim to reach real product content; at 1440×900 aim to show complete merchandise and meaningful next content. | Record positions with production-like content. This is a hierarchy target, not permission to shrink type or crop facts. |
| Desktop grid | Test 4 versus 5 useful columns on wide home, retain fewer where filters reduce content width. | Approve at actual browser scale; no tiny labels solely to fit another card. |
| Typography | Compare a small role set with readable secondary metadata and intentional Arabic line height. | Long mixed-script names, zoom and currency keep stable hierarchy. |

Whitespace should separate decisions, not enlarge every container. Density should come from removing repetition, aligning facts and simplifying chrome, not shrinking body copy. Different screen widths must not share one fixed card width or an indiscriminate clamp scale.

## 6. Delivery stages and gates

| Stage | Work | Reviewable output / exit gate |
| --- | --- | --- |
| 0. Baseline | Freeze current local behaviour/screens, inventory customer/shared/admin selectors and component consumers, map token meanings and route exceptions. Record missing content. | Auditable ownership matrix and current EN/AR screenshots. Retain functional tests as guardrails, not aesthetic proof. |
| 1. Direction proof | Build one comparable set of home/listing/PDP previews with realistic data, mobile and desktop; include Arabic on a core screen. Test the new colour/type/shape/density rules together. | Side-by-side reference annotations and working coded screens. Owner chooses/refines the coherent direction before finalising tokens. No separate competing generator. |
| 2. System | Replace active visual guide and sidecar from the accepted screens; establish single runtime token source, semantic aliases and state/component specifications. Update brief/styling instructions; preserve PRODUCT facts. | No competing active customer system or generator; component/state specimen and audited source ownership. |
| 3. Shell + home | Implement mobile screen modes/search/location/nav, independent desktop header/home/footer and real managed module rules. | Phone/tablet/desktop/RTL live-resize checks; focus, keyboard and route continuity pass. |
| 4. Catalogue + PDP | Migrate listing/search filters, standard/compact cards, gallery/options/buying sequence and product information. | Realistic edge cases, direct links, metadata/query compatibility and stock/add/reload regression checks pass. |
| 5. Cart + checkout + customer | Apply the same visual contracts to cart, enabled/disabled checkout, account/saved/orders/addresses/auth/help/policies. | Server-price/stock/quote/idempotency/auth/payment recovery tests pass. No capability changes. |
| 6. Retire + release review | Remove superseded customer bindings after consumer verification; protect admin/wholesale. Update docs from shipped local code and conduct independent visual review. | Final regression matrix and outstanding content/operational release checklist; owner visual acceptance. Deployment remains a separate explicit instruction. |

Do not append a broad override sheet as the implementation strategy. Migrate an owned component or route coherently, verify it, and remove its displaced customer-only declarations. Leave shared legacy rules until their last consumer has moved. Do not rename old values and call the result a new system.

## 7. Verification and completion definition

- Compare phone 320/360/390, tablet 768/900, desktop 1280/1440 and a wide desktop, including live resize on the same loaded route. Also test short landscape, software keyboard, zoom/large text and reduced motion.
- English and Arabic: home, search/listing, PDP, cart, enabled/disabled checkout and key customer routes. Mixed-script product facts, currency and directional icons must remain correct.
- Test typical and difficult catalogue data: long names/strengths, variable packs, missing/poor images, sale/no sale, unavailable item, unknown price, one/many images/options and loading/error states. Do not store test data in production.
- Test keyboard focus, dialogs/sheets, combobox semantics, touch sizes, colour contrast, scroll/fixed dock clearance and no page overflow. Automated accessibility scans supplement actual interaction review.
- Verify visual rhythm at 100% browser scale against the references and approved screens. A clean detector or passing build cannot certify design quality.
- Preserve search URLs, navigation/back/reload, saved/cart persistence, server-authoritative pricing/stock/tax/fees, quote changes, idempotent checkout, payment failure/retry and auth boundaries. Use existing appropriate tests plus focused regressions for changed behaviour.
- Check Next runtime errors, browser console/network, metadata/structured data and image delivery/performance after implementation. No claimed speed/conversion gain without measurement.
- Admin/wholesale visual and interaction checks after any shared dependency migration; do not infer safety from untouched route files alone.
- Test layered/unlayered state precedence using actual computed styles, including pending/added/saved/disabled/invalid/focus, and verify dialog/portal theme ownership. A clean static detector does not establish these properties.

## 8. Decisions before implementation

1. Accept or refine the single recommended direction: compact search-first pharmacy commerce, coral-led actions, restrained supporting surfaces, separate app/desktop compositions.
2. Review the first comparable coded home/listing/PDP set before locking neutral colours, font pair, exact radii/spacing and desktop lead composition.
3. Supply or verify only content that materially changes screens: actual managed campaign content, exact-pack replacement media and reviewed product information. Do not block structural previews on production content; use labelled representative fixtures.

The existing confirmed coral, logo and product/commerce safeguards do not need to be re-approved. No further preference questionnaire is required to produce the direction proof once authorised. This planning task stops before generating or implementing it.
