# Design review, QA and changelog

## Review scope and evidence

Documentation refinement dated 2026-11-21, using Impeccable’s critique and audit guidance. Two independent document assessments covered composition and measurable specification consistency. Inputs were the five existing design documents and the five supplied images identified in [Reference mapping](references.md). UI UX Pro Max was unavailable in the installed skill catalog.

This review assesses the specification. Implementation accessibility, performance and visual fidelity need rendered verification during frontend work. A markup detector cannot establish those properties from Markdown, so this review assigns no implementation health score. The static references establish visible anatomy and composition. Interaction rules are design requirements, with their verification listed below.

The retained strengths are the white product canvas, pack-first identity, restrained coral purchasing hierarchy, forest campaign type and readable font pairing. The main gaps were page composition, image consistency, state transitions and precise responsive rules.

| Priority | Evidence in previous draft | User impact | Resolution |
|---|---|---|---|
| P1 | Components described separately, with no page recipes | Implementers could arrange competing banners, search and products differently | Added page patterns with fixed sequence and contextual merchandising |
| P1 | One product-name type role for both cards and detail | Product identity could lose hierarchy on detail pages | Assigned page-title H1 and a 24/32px purchase price on detail |
| P1 | Missing-image handling appeared only in acceptance checks | Broken assets could collapse shelf geometry or hide identity | Defined fixed media wells, fallback text and optical pack scale |
| P1 | Pending and rejected actions specified, uncertain responses omitted | A shopper could retry an already accepted operation | Added status reconciliation through existing commerce flows before retry |
| P2 | “One lime panel per page region” differed from single-campaign direction | Repeated attention blocks could weaken product hierarchy | Unified to one lime campaign per page |
| P2 | Safe-area inset added after measuring a bar that already includes it | Bottom spacing could be excessive or inconsistent | Reserve the measured outer height including safe-area padding once |
| P2 | Rail gap, section-type breakpoint and search Enter behavior implicit | Uneven layouts and inconsistent keyboard interaction | Added arithmetic examples, role-specific type rules and search behavior |

## Prioritized implementation QA

These are acceptance checks for future implementation. Record viewport, locale, browser, screenshot or interaction evidence and result for each. A browser viewport screenshot establishes layout only. Exercise touch gestures separately and record whether evidence came from emulation or a physical device.

### P0 — Purchase and identity blockers

- [ ] Full name, strength, formulation, pack, selected variant and currency remain readable in cards, detail and cart, including long Arabic names.
- [ ] Price, availability, fees and totals reflect the existing authoritative response. Pending, confirmed failure and unknown-outcome messages are distinct and accurately timed.
- [ ] Repeat taps during a pending purchase remain suppressed. Timeout recovery checks the existing status before offering retry. Reload after payment shows the returned order state.
- [ ] Keyboard and screen reader users can choose a variant, change quantity, edit an address and complete the supported checkout stages. Errors identify fields, preserve values and offer recovery.

### P1 — Access, mobile operation and content resilience

- [ ] Primary labels retain the measured action/canvas contrast at rest, hover and press. Enabled text meets 4.5:1, essential boundaries 3:1. Verify actual composited colors and visible focus on every surface.
- [ ] Search has a label, active-option announcement, predictable Enter behavior and accessible loading, no-match and failure states. Escape preserves the query.
- [ ] Every target is at least 44 × 44px. Galleries work with synthesized touch, interrupted gestures, keyboard and a physical touch device before release.
- [ ] Filter Apply commits the draft, Reset clears the draft, and every other dismissal restores committed choices. Back from detail restores results and position.
- [ ] At 320, 390, 768, 900, 1024 and 1440px, plus adjacent breakpoint widths, the grid follows the documented geometry. Test 200% text enlargement, 400% zoom/reflow and text-spacing overrides.
- [ ] Installed PWA portrait and landscape layouts preserve focus and content around safe areas and the open keyboard. One fixed bottom region is present at a time, with its outer height reserved once.
- [ ] Arabic direction mirrors navigation and logical spacing while preserving pack artwork and numeric runs. Check diacritics, full labels, price pronunciation and reading order with a native Arabic reviewer.
- [ ] Missing, failed and loading images preserve geometry and product identity. Compare tall bottles, cartons and wide packs for optical balance without cropping pack text.
- [ ] Modal focus is contained and restored on dismissal. Background is inert. Sticky elements never obscure focus, errors or the last item.
- [ ] Reduced motion retains readable progress and completion feedback. Campaigns stay manually controlled.

### P2 — Composition and delivery quality

- [ ] Homepage search precedes the campaign. One lime block leads into category discovery and compact shelves. Optional modules have approved content and distinct purposes.
- [ ] Product media, name, pack, price and action align within each row. Hover and focus preserve geometry. Detail H1 and purchase price have the specified hierarchy.
- [ ] White shelves dominate, with forest support and coral actions. Primitive defaults map to Al Mina’s typography, spacing and shapes. Compare against the supplied references for anatomy and rhythm.
- [ ] Responsive images reserve dimensions, initial visible media loads promptly and lower images load on demand. Verify font swap, layout shift, transfer and interaction responsiveness on a constrained connection.
- [ ] Storybook includes default, focus, selected, disabled, busy, empty, error and long-content states. Use Playwright and axe-core alongside manual keyboard, screen reader and physical-device checks.

## Decision changelog

1. Preserved every approved palette value, font family, icon family and stack choice. Added semantic role boundaries and full state recipes so the same coral is used consistently for purchasing.
2. Distinguished fixed requirements from contextual defaults. Content and available width govern optional shelves and campaign composition, while identity order and access requirements remain fixed.
3. Added page patterns for homepage, department, search, detail, cart, checkout, confirmation and tracking. This resolves the missing composition layer between tokens and components.
4. Set one lime campaign per page and defined desktop text/image proportions and mobile stacking. This reconciles the previous campaign-frequency contradiction and retains the Medicare-inspired emphasis.
5. Defined complete card spacing, calculated 173px phone and 240px maximum-width filtered cards, and made the 320px single-column case explicit. Full product identity can expand rows.
6. Added media safe areas, missing-image anatomy, alt-text guidance and gallery view purpose. These give inconsistent catalogue assets a predictable shelf treatment.
7. Separated detail heading and price roles from compact card typography. Specified section breakpoints, badge weights and Arabic line-height precedence to remove optical ambiguity.
8. Completed search, filter, variant and transaction state behavior, including uncertain outcomes. These describe presentation and recovery through existing application capabilities.
9. Defined single-region mobile actions, safe-area measurement, sticky release, overlay order and stronger zoom/RTL checks. These resolve layering and expansion gaps across desktop and PWA layouts.
10. Recorded the exact five source references and their availability. The previous audit narrative referred to a different earlier image set. The current mapping reflects this request’s supplied files.

## Remaining verification and handoff

Native Arabic review, approved campaign assets and real-device safe-area/keyboard checks remain implementation acceptance work. The source images are available locally but absent from the repository. Keep their original filenames if they are later added as design evidence. The code-level stack inventory recorded in DESIGN.md is historical and should be rechecked before implementation.

Recommended implementation order is shared tokens and bilingual primitives → product cards and media → header/search and listings → detail/gallery → cart and checkout → remaining page modules and full QA. Use Figma for component and page review, Storybook for states and the existing test tools for supported workflows. This review introduces documentation requirements only.
