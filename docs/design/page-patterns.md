# Storefront page patterns

These compositions translate the approved direction and [component anatomy](components.md) into pages. Use the [responsive grid](responsive.md) for widths and the [type roles](typography.md) for hierarchy. Fixed rules cover identity order, accessibility and action semantics. Optional modules depend on real content and supported workflows.

## Homepage and merchandising

Order is header/search → optional primary campaign → category shortcuts → first product shelf → contextual merchandising → service/help content → footer. Search remains available before the campaign. Omit empty shelves and unavailable service flows. Prioritize actual catalogue coverage over a prescribed section count.

The optional dominant campaign uses lime with forest copy and a 16px radius. Default padding is 24px on phones and 32px desktop. Desktop starts with a 55% text / 45% image grouping and a 32px gap in a 320–400px high panel that can grow for content. Phone reading order is copy, action, then imagery. A compact side-by-side arrangement can put the image alongside the copy when the headline and action retain their full measure. Use 240–320px as a contextual height target for a short-copy phone campaign, growing freely for Arabic and enlarged text. Stack imagery only when its composition or copy requires it, with a 16px gap. Review the opening 390 × 844px composition so category access is visible and the first shelf heading is close to the opening viewport. A campaign lacking suitable approved art may use concise type and a collection link on lime. Choose the crop per approved asset and keep the collection link beside the copy. Additional relevant promotions use neutral surfaces and distinct content without repeating the dominant lime treatment.

Category shortcuts precede shelves. Each shelf places its heading and View all link on a shared row, 16px above products. Separate sections by 32px on phones and 48px desktop. Default to two to four useful shelves, with an editorial collection feature where it introduces a distinct shopping path. Use restrained brand discovery when actual brands are available. Add service actions, reviews or delivery claims only when supported and approved. Footer groups real support, account and policy destinations.

## Department, listing and search

Department order is breadcrumb → H1/count → relevant subcategories → filters/sort and applied chips → products → existing pagination. Description is optional and limited to a short introduction. Desktop has the documented filter rail. Phone filters use a sheet with draft choices. Reset clears the draft, Apply commits it, and other dismissal restores committed choices and focus to Filter.

Search leads with the submitted query and actual count, followed by filters/sort and products. Keep campaigns below direct results. Suggestions, corrections and no-match recovery reflect actual search responses. A correction offers the original query. An empty filtered result offers Clear filters while preserving context. A request failure retains the query and prior confirmed results with Retry. Preserve filters, sort and browsing position on return from detail. Retain the application's supported pagination mechanism.

## Product detail

Order is breadcrumb → gallery and purchase block → verified product information → related shelf. Desktop uses equal gallery and purchase columns with a 32px gap. Phone places gallery first. The product name uses the page-title H1 role. Purchase order is complete identity/strength/pack → price and availability → required choices → quantity → accessible coral purchase action → relevant conditions.

Use 4px between identity lines, 16px before price and 24px between choice groups. Conditions sit 8px below the action. Retain real delivery, stock and purchase restrictions from existing data. Longer information follows available verified fields, such as overview, ingredients/specifications, directions, warnings and storage. Omit absent sections. Phone accordions can keep overview initially open. Important purchase warnings stay beside the action as well as in the full information. A related shelf follows the information.

## Cart and checkout

Cart leads with its title/count, followed by editable rows and a summary that identifies catalogue estimates and the point at which fees/final totals are confirmed. Use the existing pricing and quote semantics. Desktop uses a side summary, phone puts it after items and gives the continuation priority over browse navigation. Promotion-code entry stays secondary. Retain current cart persistence and server reconciliation behavior.

Checkout uses a compact identity header, return-to-cart link and existing progress stages. Desktop puts the form beside its 300/360px summary. Phone order is stage content → summary → stage action. Use one dominant action for the active stage. Fees and the full authoritative amount appear before commitment. Supported payment choices remain labeled options. The final action states its actual commitment. Pending and unknown outcomes use the existing status/reconciliation flow before allowing another attempt.

Confirmation leads with returned status/reference and actual next step, then items, totals and delivery details. Distinguish pending payment from confirmed order. Tracking is a readable timeline using known timestamps and current status. Help remains reachable alongside errors.

## Account and information

Sign-in groups existing authentication choices in a single readable column, default max width 440px. Account pages use clear sections for existing profile, addresses, saved items and order history. Keep transaction history and recovery actions easy to scan. Information and policy text stays within 65 characters per line with normal heading hierarchy. These pages use white/neutral surfaces and the same controls.

## Shared page rules

One H1, a main landmark and skip navigation identify each page. Preserve direct navigation, reload, existing URLs and route metadata. Supported tasks remain available in English and Arabic. Primitive libraries supply behavior while the approved typography, spacing, pack framing and purchase hierarchy give Al Mina its presentation. Use borders for controls and grouping, with flat shelves and purposeful surfaces.

## Secondary merchandising compositions

These contextual patterns elaborate the existing editorial/collection slots. Keep the optional lime campaign as the dominant promotional moment.

| Pattern | Desktop | Phone | Content prerequisite |
|---|---|---|---|
| Editorial collection feature | Neutral surface, 16px radius, equal image/copy columns with 32px gap and 32px padding. Section-role heading, one short paragraph when needed and one collection link. | Copy/action before a 3:2 image region, 16px gap and 24px padding. Preserve the image subject in its crop. | A distinct collection with real products and approved editorial imagery. |
| Paired collection features | Two equal-width neutral modules, 24px gap and 24px padding. Each has a short heading, one image grouping and one named collection link. | Stack in reading order with 16px between modules. | Two relevant shopping paths with distinct content and real destinations. |
| Brand discovery | One compact row of proportionate brand marks and names with an all-brands link. Align marks optically within consistent wells. | Scrollable labeled row with a partial next item and a visible all-brands route. | Verified brands with valid assets and catalogue coverage. |

Separate each module group from adjacent product shelves by the normal section rhythm. Omit a module when its content prerequisite is missing. Its heading remains subordinate to the primary campaign headline. Avoid consecutive decorative panels that delay product discovery.

## Annotated hierarchy

- **Shell.** Existing mark anchors identity → flexible search has the largest useful control area → account/cart remain compact named destinations. Keep delivery information readable without compressing search.
- **Shelf.** Heading and View all identify the collection → consistent square packs and complete identity carry selection → price and coral action form the purchase row. Review repeated buttons as one shelf so their area and spacing leave packs and names dominant.
- **Checkout summary.** Items and editable selection → labeled subtotal/discount/fees as supplied → emphasized final total → one stage continuation. Use normal text for intermediate amounts and the price role for the final amount. Keep unknown fees explicitly pending.
