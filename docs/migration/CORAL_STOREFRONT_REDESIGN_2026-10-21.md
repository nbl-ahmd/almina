> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Coral storefront redesign — 21 October 2026

## Scope and direction

Customer storefront redesign, continuing the existing local work. The latest brief replaces the preceding warm-neutral/ink-action direction with logo-led coral. Admin styling remains unchanged. No images were generated, edited or added to shipping artwork in this pass. Existing photography and catalogue images are reused; missing product photographs retain honest placeholders.

The modular care cabinet uses approximately 60% white, 30% pale blue/mint/butter surfaces and 10% coral emphasis as compositional guidance, not an automated pixel quota. Geist is self-hosted with its OFL licence. Dark ink on coral measures approximately 5.54:1 contrast; primary actions use dark labels rather than white on coral.

## Before / after / why

| Before | After | Why |
|---|---|---|
| Warm-neutral skin and ink actions | Logo coral actions, white field and defined care pastels | Clear pharmacy identity and consistent action recognition |
| Disconnected campaign/product modules | Editorial split campaign, actual photo-ready product companion and compact local help | Connect discovery with real products and pharmacy support |
| Mobile category layout could stack five tall tiles | Horizontal category rail; dense five-tile desktop bento | Useful browsing density at each screen size |
| Repeated shelves and oversized brand cards | Deduplicated shelf selections and compact brand rail | More distinct discovery with less repetition |
| Closed collection panels left large empty fields | Existing collection artwork remains visible while collapsed | Preserve photographic browsing and disclosure controls |
| Inconsistent forms and purchase actions | Customized shared shadcn/Radix controls, 48px fields, visible focus and invalid states | Coherent touch and keyboard use |
| PDP taxonomy competed with product name | Product heading precedes category/brand metadata | Improve exact product recognition |

## Coverage

Header, search, location access, account/cart actions, mobile navigation, footer, homepage campaigns and collections, product/category cards, catalogue filters, product gallery and information, purchase controls, offers, cart, checkout, account/sign-in and public information surfaces share the new tokens and geometry. Inputs retain labels, native semantics, validation states and existing form payloads. Header delivery selection stays compact; contact remains floating.

The growth/competitor plans inform prominent search, care-based browsing, real offers, price-led discovery, brands, local pharmacy support, guest checkout and return-customer entry points. This visual change does not claim to complete every operational growth initiative. Pharmacy-owned promotions, delivery promises, reviewed product information and exact photography require real configured data. No invented reviews, sales counters, scarcity or clinical claims are introduced.

## Motion and accessibility

Existing GSAP dependencies power small editorial translations and readable opacity changes. Reduced-motion bypasses these effects. Purchase controls and checkout do not receive scroll pinning or cinematic transitions. Category rails hide decorative scrollbars while remaining swipe/keyboard reachable. Product titles wrap instead of being truncated. Native disclosures retain keyboard operation. Arabic product-page delivery/navigation labels use the existing translation dictionary; product identity and commerce values remain unchanged.

## Integrity and implementation

No API, database, pricing, inventory, checkout calculation, permission, URL or production integration changes are part of this redesign. The working tree already contained substantial unrelated migration work and was preserved. No commit, deployment or production write was performed. The existing Next.js 16.3.8 bundled documentation was consulted; Geist uses next/font/local. No additional UI or motion dependency was installed in this pass.

The former [homepage surface direction](../../apps/web/docs/design/archive/superseded-reference02-homepage-surface.md) was superseded and removed from active design context in P6-01. Recorded launcher output is outputs/coral-redesign-2026-10-21/direction-roll.txt. Its installed version emits an eight-character roll key; a newer sixteen-character reference was not fabricated. User references are the critique bar for this code-led, grounded direction; no generated comp exists.

## Verification and review

Verification: 168 unit tests and the complete 113-test browser suite passed. After the review fixes, the isolated production build, typecheck and lint passed; 9 focused Arabic/responsive browser tests passed, followed by one Arabic delivery-block recapture test. The documentation scan then caught an ink-on-ink checked glyph: its coral/ink correction passed a fresh isolated build/lint and both shared-control browser tests, including a settled foreground/background contrast assertion of at least 4.5:1. The final source corrections were limited to localized PDP copy, taxonomy placement and collection-panel presentation and checked-state colors. Responsive captures cover home, catalogue, product, cart, offers and contact at 390/1280px, plus checkout/account and a separate real-catalogue inspection. The fixture now includes five categories to prevent recurrence of the mobile stacking bug. A focused Arabic PDP check asserts the translated delivery explanation and links.

The detector ran once and reported 19 findings against the previous DESIGN.md, including two excluded admin findings. These are evidence to interpret, not a reason to restore the old theme. The new design documentation describes actual implemented values. The independent finish reviewer confirmed all scored visual fixes resolved and no visible regression. Its literal final disposition remains **fix** solely because its required sixteen-character seed-reference format is unavailable from the installed launcher’s corroborated eight-character output. This workflow-format mismatch is disclosed; no seed reference was fabricated and no unconditional reviewer ship verdict is claimed. Screenshots and tests establish the exercised routes and states; they are not a universal accessibility certification.

## Remaining operational work

Exact product photography and catalogue curation remain the main merchandising limitations. Missing photographs are not disguised by decorative assets. Real offers, delivery coverage/ETA and rewards must follow pharmacy-approved configuration. Google account sign-in still depends on configured provider credentials where absent. This pass does not alter those readiness conditions.

Rollback should revert only this visual layer and its theme/font changes, preserving existing unrelated local work and all production data. No schema rollback is needed.

## Follow-up: preserve shopping sections and reduce accent repetition

The budget shelf was suppressed by cross-shelf exclusions plus a four-product/two-category threshold. Personal care and brands also required at least two entries. These rules now prefer unseen products without excluding overlapping eligible inventory; a non-empty collection or brand group renders. No empty offers or unavailable products are invented. Live-catalogue browser verification confirms Personal care for every day, AED 50 & under and Find your familiar brands.

The shared primary button is neutral ink/white; utility and product-list actions use quiet white/bordered surfaces. Coral is explicit for the hero campaign CTA and PDP purchase control. New shelf-prioritization regression and existing merchandising tests pass, as do four responsive/shared-control browser cases, isolated build, typecheck and lint. Snapshot: outputs/coral-redesign-2026-10-21/restored-budget-brands.png.
