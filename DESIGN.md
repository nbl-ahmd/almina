# Al Mina Pharmacy · Market Green / Coral Edition

**Approved design direction for the customer storefront.** White shelves give product packs room to read. Dark type leads the eye from product name to pack size to AED price. Coral marks the purchase decision. An optional lime campaign introduces a department or collection, primarily on the homepage and merchandising pages, with forest lettering and the existing Al Mina mark on white.

## What the audit changed

Direction A already placed search before the campaign and put a recognisable pack beside its name, size, price and purchase action. Keep that order. The sample put its strongest contrast on a decorative arc and repeated forest on the purchase button, while the coral wordmark had little connection to the shopping controls. Remove the arc, give the button its own coral role, and return the page canvas to white. The original board records the comparison and illustrative price. [Historical directions](docs/design/directions.png)

The five supplied references are saved under `docs/design/references/` and were reviewed for this specification. They cover Pharmily, Medicare desktop, electronics shopping, blue pharmacy and muted teal pharmacy. Their source filenames, saved copies and pattern mapping are recorded in [Reference mapping](docs/design/references.md). The historical direction board remains comparison material. Use Al Mina’s own assets and catalogue data for products, availability, offers and delivery information.

The following external observations are retained from the approved brief’s earlier audit. The current reference review uses the five supplied images. Sephora’s moisturiser listing places subcategories ahead of results and keeps price, brand and size available as filters. Apply that ordering to departments with sufficient catalogue coverage. Glossier’s single-product page is a reference for keeping the identity of one pack clear through a longer shopping page. Mobbin’s public index separates discovery, checkout and confirmation into distinct tasks. The index was accessible; individual gated flows were outside this review. [Sephora listing](https://www.sephora.com/shop/moisturizing-cream-oils-mists) · [Glossier product page](https://www.glossier.com/products/milky-jelly-cleanser) · [Mobbin public index](https://mobbin.com/explore/web/screens)

## Foundations

| Decision | Specification |
|---|---|
| Color | White canvas, optional lime campaign, forest supporting ink. Use `color.brand` (`#FF6465`) for branding and accents, with `color.text` for labels on brand coral. Primary purchase actions use `color.action` (`#D63D44`) with `color.canvas` white text and `color.hover` (`#C93640`) on hover across page types. White text on brand coral fails WCAG AA. Use `color.forest` for supporting brand expression and secondary controls. [Authoritative semantic tokens and measured contrast](docs/design/colors.md) |
| Type | Manrope for Latin interface and display, Noto Sans Arabic for Arabic. [Type scale and prices](docs/design/typography.md) |
| Space | Space steps in CSS px are 4, 8, 12, 16, 24, 32, 48 and 64. Use 4 between name and pack, 8 between price and action, 16 inside a panel and 32 between related sections. |
| Shape | Radius 4px for badges, 8px for fields, buttons and chips, 12px for cards, 16px for campaign panels and sheets. Circles identify round icon controls or progress indicators. |
| Depth | Flat product cards. Use a 1px divider between rows and a control border around fields. Floating menus and popovers use a 0 4px 16px shadow in text ink at 12% opacity. Modal scrim uses text ink at 40%. |
| Icons | Phosphor regular, 20px in controls, 24px in navigation, 16px beside text. Selected destinations use fill plus a text label. Give icon-only actions an accessible name. |
| Motion | Feedback 140ms ease-out. Sheets enter in 200ms cubic-bezier(.2,0,0,1) and exit in 140ms ease-in. Animate opacity and transform. Reduced motion switches states immediately. |

[Component specifications](docs/design/components.md) · [Responsive, PWA and RTL rules](docs/design/responsive.md) · [Page patterns](docs/design/page-patterns.md) · [Audit, QA and changelog](docs/design/design-review.md)

## Implementation sequence

1. Inventory the reset frontend. It uses native defaults, responsive visibility rules, locally owned form components, Radix, CVA, Sonner, Heroicons and the cn helper. Playwright and axe checks already exercise browser workflows. Preserve the accessible names, checkout stages, server-rendered catalogue and map sizing when restyling.
2. Author English and Arabic components in Figma against these tokens. Before enabling Tailwind CSS v4 scanning, audit surviving utility classes and identify previously inactive classes that would reactivate. Remove or migrate obsolete classes, or exclude their sources until reviewed, so scanning cannot unexpectedly change layouts or component styling. Enable scanning with explicitly scoped sources and migrate one surface at a time. Map clsx and tailwind-merge through one helper.
3. Use editable shadcn/ui components, compatible Base UI primitives for new interactions, and existing Radix where integrated. Build Storybook states for search, cards, selectors and checkout errors. Introduce Phosphor at storefront boundaries. Move to Motion for React only for coordinated transitions and Embla for galleries that need swipe and slide controls.
4. Verify catalogue and product pages first, then cart and checkout, with Playwright, axe-core, keyboard and real touch devices. Check image transfer, layout shifts and font loading with DevTools and Lighthouse. Keep personalized state and all price, stock and payment decisions with their existing owners.

**Implementation sign-off still needed:** native Arabic review of labels and price pronunciation, real-device safe-area and keyboard testing, and pharmacy approval of campaign copy and imagery. The visual direction and token choices are settled.

## How to apply this specification

This system governs the customer storefront. Fixed rules are the approved palette, font families, semantic states, minimum touch targets, product identity order, honest commerce feedback and accessible reading order. Contextual defaults include campaign artwork, optional shelves and exact column counts within the documented minimum widths. Choose those from real content and available space. Record deviations beside the component in Figma and verify them against the QA checklist.

Keep the storefront recognisable through white product shelves, consistent pack framing, accessible coral purchase controls and large forest headlines where campaigns are used. Lime campaigns are optional homepage and merchandising elements. Product detail, cart, checkout and account pages do not require them. Additional promotional sections may appear when relevant, using restrained treatments that avoid repeating the dominant lime campaign. Use the chosen primitives for accessible behavior and give their anatomy the dimensions in these documents. Headings sit directly on the canvas. Reserve panels for grouped choices, media and overlays. Product shelves use alignment and whitespace to create hierarchy.

Use `color.<name>` for the palette keys, `space.<px>` for the documented space steps, `radius.badge/control/card/panel` for 4/8/12/16px, and `type.<role>` for the typography table. Share these semantic names between Figma and code. The palette is the light storefront theme. Alternate themes require their own validated specification.

## Documentation precedence

1. `DESIGN.md` defines the overall approved design direction and principles.
2. [Colors](docs/design/colors.md) and [Typography](docs/design/typography.md) define authoritative semantic tokens and typography.
3. [Components](docs/design/components.md) defines component anatomy, variants and interaction states.
4. [Page patterns](docs/design/page-patterns.md) defines page composition and responsive layout patterns.
5. [Responsive](docs/design/responsive.md) defines responsive, PWA, accessibility and RTL requirements.
6. [References](docs/design/references.md) supplies visual inspiration and reference mapping. Specifications take precedence over reference imagery.

Resolve conflicts using the document responsible for the decision. Page composition follows page patterns, while responsive, accessibility and RTL requirements follow the responsive specification. Preserve approved decisions and reconcile conflicting wording within those responsibilities.

## Implementation precision

The approved foundations map to `motion.feedback` 140ms ease-out, `motion.sheet-enter` 200ms cubic-bezier(.2,0,0,1), `motion.sheet-exit` 140ms ease-in, and `icon.inline/control/navigation` 16/20/24px. Text, status and final state remain available with reduced motion. Overlay ordering is defined in the component specification.

Product shelves derive their identity from consistent pack scale, full product names, deliberate spacing and coral purchase controls. Homepage expression comes from the forest headline and optional lime campaign, followed by compact discovery and neutral collection compositions. Apply those rules to the editable primitives at their storefront boundary and review a whole shelf and checkout summary together before treating individual component states as complete.
