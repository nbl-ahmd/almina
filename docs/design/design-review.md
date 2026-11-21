# Documentation review and implementation QA

## Scope and decisions

Prepared on 2026-11-21 from the supplied approved Market Green / Coral Edition brief and five image references. The specification covers the customer storefront. Administrative workflows retain their existing ownership and can receive a separate specification when requested.

DESIGN.md preserves the approved direction, foundations, tooling, implementation sequence and document precedence. Changes to the supplied root text are a Markdown H1, current reference-copy locations and an explicit distinction between the brief's previous external audit and this pass's supplied-image review. Its historical board link is preserved with provenance.

The supporting documents define target state recipes, type roles, component anatomy, page composition, responsive geometry and reference mapping. Fixed decisions are the approved colors, font families, Phosphor icon family, identity order, minimum targets and accessible purchase hierarchy. Contextual defaults include optional campaigns, exact shelf counts and image crops. Additional promotions can fit their content without repeating the dominant lime treatment.

## Refinement audit

Two independent document assessments applied Impeccable's critique and technical-audit guidance to composition and specification consistency. All five repository references were visually inspected. The review concerns documented targets. Runtime markup detectors and browser implementation scores do not evaluate a Markdown specification. No implementation health score is assigned.

The project-local UI UX Pro Max bundle is absent following the reset. Its checklist supplied earlier in this chat was used as a secondary cross-check for keyboard access, CSS-pixel targets, focus visibility, navigation, loading, form errors and text expansion.

| Area | Evidence and retained strength | Refinement applied |
|---|---|---|
| Hierarchy / homepage | Pharmily and muted teal expose shopping content beneath compact campaigns | Added a contextual phone campaign height and opening-composition review target |
| Desktop composition | Medicare alternates shelves and collection features | Defined neutral editorial split, paired collection and brand-row anatomy |
| Color | Primary white/action pairing measures 4.56:1; brand white pairing measures 2.89:1 | Kept every palette value and clarified surface/state consistency |
| Typography | Table breakpoint labels conflicted with fluid-title prose | Changed headings to endpoint references and added intermediate computed sizes |
| Spacing / density | Card dimensions and rail arithmetic already agree | Preserved card geometry and clarified shelf hierarchy and repeated action balance |
| Listing / search | Query and filtering flow is specified, asynchronous option identity was implicit | Added current-query-only suggestions and complete draft/apply/dismiss behavior |
| Detail / variants | Electronics reference separates gallery, choices and purchase context | Added thumbnail/quantity semantics and shared purchase-state handoff |
| Cart / checkout | Teal reference separates lines, totals and continuation | Distinguished catalogue estimates from returned final totals and defined summary hierarchy |
| PWA / desktop | One fixed region and safe-area rules were established | Added task-bar padding, sticky offsets, release conditions and state retention across breakpoints |
| Imagery | Pack-safe contain fit and failed-image fallback were established | Defined campaign/category/editorial art roles, optical consistency and focal-point review |
| Accessibility / RTL | Full identity, Arabic line-height overrides and logical spacing are established | Added field associations, initial modal focus, single status announcements and locale-aware portals |
| Component consistency | Shared radius, icon and timing values were established | Named motion/icon/layer bindings and specified whole-shelf/summary review |

No live-interface defect or WCAG violation is asserted from a documentation gap. Acceptance checks below apply when the frontend is implemented.

## Repository tooling inventory

The reset frontend currently uses native defaults and minimal interaction/media styles. The package manifests list Next.js 16.4.6, React 19.3.0, Radix, CVA, Sonner, Heroicons and cn. Playwright is present in the root workspace. The approved future stack includes Tailwind v4, owned shadcn/ui components, compatible Base UI primitives, Phosphor, clsx/tailwind-merge, Storybook and applicable Motion/Embla usage. These documents describe that target stack. Audit dependencies and existing consumers before installing or replacing anything during implementation.

Before enabling Tailwind scanning, inventory surviving layout, visibility, position and arbitrary-selector utility classes and retire or scope their old effects. Follow the approved incremental sequence and recheck the installed framework's matching docs before framework-specific work.

## Documentation validation

The color table reports 23 computed opaque-sRGB contrast pairings. White on action is 4.56:1. White on brand is 2.89:1 and is excluded from purchase label recipes. All local document/reference links and saved-image identities are checked. Grid examples are calculated from the stated container, gutters, rail and gap dimensions.

Rendered component contrast, text metrics, layout, loading, gestures and transaction feedback remain implementation acceptance work. Documentation measurements establish the target values. They do not establish rendered accessibility or device behavior.

## Prioritized production frontend checklist

### P0 — Product identity and purchase integrity

- [ ] Complete name, formulation, strength, pack, chosen variant and currency remain readable in product, cart and checkout views.
- [ ] Prices, fees, availability and final totals use existing authoritative responses. Pending, rejected, unknown and confirmed states match the actual outcome.
- [ ] Duplicate activation is suppressed while checking/submitting. Unknown order/payment responses reconcile before retry. Reload restores returned status.
- [ ] Keyboard and screen-reader users can select variants, adjust quantity, complete existing checkout stages and recover from errors without losing entered data.

### P1 — Access, responsive behavior and resilience

- [ ] Verify actual foreground/background contrast for normal text, essential controls and every focus state. Preserve the action/canvas pairing without opacity changes.
- [ ] Search has its name, combobox semantics, active-option announcement, defined Enter behavior and usable fallback when suggestions fail.
- [ ] Targets are at least 44 × 44 CSS px. Menus and modals support Escape, focus containment/restoration and an accessible name.
- [ ] Filter Apply, Reset, Cancel, close, backdrop and Back follow the draft/committed rules. Returning from a product preserves browsing state.
- [ ] English and Arabic layouts pass 320/390/768/900/1024/1440px plus boundary widths, 200% text enlargement, 400% zoom and text-spacing overrides.
- [ ] Missing/failed images retain geometry and identity. Compare tall bottles, wide cartons and long supplier whitespace for optical balance.
- [ ] One fixed bottom region is active at a time, with safe-area padding reserved once. Focus, errors and last items remain visible.
- [ ] Test PWA portrait/landscape, keyboard opening and gallery gestures on physical mobile devices. Record emulated and physical evidence separately.
- [ ] Native Arabic review covers label expansion, diacritics, numeric isolation, focus/reading order and price pronunciation.
- [ ] Reduced motion retains immediate status feedback. Galleries have visible navigation alternatives and manually controlled movement.

### P2 — Composition and delivery quality

- [ ] Search precedes the optional homepage campaign. Category discovery and the first product shelf remain near the opening content.
- [ ] Cards align identity, pack, price and action across rows, with full names allowed to grow. Detail H1 and detail price use their distinct roles.
- [ ] White shelves dominate. Coral purchase controls, forest support and purposeful lime merchandising follow the token roles.
- [ ] Use actual catalogue data and approved campaign artwork/copy. Omit unsupported reviews, services and promises.
- [ ] Confirm responsive image sizes, reserved media geometry, font swap behavior, transfer size and layout shift on a constrained connection.
- [ ] Storybook covers applicable default, hover, focus, selected, disabled, busy, error and long-content states. Combine browser/axe checks with manual keyboard and screen-reader review.

Record route, viewport, locale, browser/device, evidence and result for each acceptance check. Implement and review shared controls and cards first, followed by discovery/listings, detail, cart/checkout and the remaining customer pages.

## Refinement changelog

1. Preserved the approved direction, palette values, font families, icon family and chosen component stack. Named existing motion/icon values and supplied a concrete layer order for consistent implementation.
2. Resolved fluid-title sizing ambiguity through endpoint table headings, linear size/line interpolation and computed 768/900px examples. Section headings retain the explicit 900px step.
3. Added compact phone-campaign defaults, a short-copy/art fallback and a discovery review target. These follow the visible mobile reference proportions while allowing Arabic and enlargement to grow.
4. Defined neutral editorial split, paired collection and brand-discovery compositions to carry Medicare's sectional rhythm into the established system.
5. Added campaign/category imagery roles, focal-point guidance and full-shelf hierarchy review to keep content and pack identity prominent across the chosen primitives.
6. Completed filter dismissal, current-query search, modal/field, thumbnail and quantity state contracts. These make interaction and accessibility decisions explicit for implementation.
7. Distinguished catalogue estimates from confirmed fees/final totals and clarified fixed-bar sizing, sticky offsets and shared state at breakpoint changes.
8. Added reference adaptation constraints so complete product identity, supported features and action hierarchy guide reuse of the static artwork. Revalidated source images, links, colors and grid arithmetic.

## Additional acceptance cases

- [ ] Compare campaign/category/first-shelf discovery at 390 × 844px in both locales, then with enlarged text. Optional campaign height yields to readable content.
- [ ] Compare all repeated purchase actions as one shelf, then confirm the order summary's total and continuation dominate its supporting amounts.
- [ ] Type rapidly into search with delayed/out-of-order responses and press Enter after the query changes. Active options always match the visible query.
- [ ] Exercise Reset, Apply, Escape, close, backdrop and supported Back for filters, verifying committed choices and restored focus.
- [ ] Verify gallery current-view announcements, editable quantity limits, required/invalid field associations and initial modal focus without duplicate status announcements.

Native Arabic approval, real-device PWA/keyboard/gesture checks, approved campaign copy/artwork and rendered font/image performance remain implementation acceptance work. Questions skipped because the user supplied a fixed approved direction and requested a finished documentation refinement.

## User correction after first implementation — 2026-11-21

The user rejected the first rendered result as blocky and excessively underlined. The five supplied images govern composition and silhouettes; earlier dimension recipes do not justify a reference mismatch. Current corrections use circular category media, compact mobile campaigns, connected PDP content, unboxed totals and non-prose shopping actions without persistent underlines. The initial runtime review is superseded for visual acceptance; see [correction record](../migration/MARKET_GREEN_REFERENCE_CORRECTION_2026-11-21.md). Keep semantic colors, fonts, accessible behavior and commerce owners.
