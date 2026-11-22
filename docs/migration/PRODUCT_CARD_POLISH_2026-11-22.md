# Product-card polish — 22 November 2026

The user requested product-card refinement against the supplied mobile screenshots. The teal pharmacy reference supplies the compact price/add-control grouping; blue pharmacy and Pharmily supply restrained metadata, pack-first hierarchy and dense merchandising. Approved coral, forest, fonts, full product identities and commerce owners remain intact.

Below 600px, each card now has square contain-fit imagery, a full 16/22px name, actual pack or brand metadata, quiet availability, and price beside a 44px circular coral add control. Current and previous prices form one group. Sale badges are smaller, without changing their verified saving. Four shared shelf tracks replace five separate tracks: media, identity, availability, purchase row. At larger widths, full-width capsule purchase buttons remain.

Accessible product-specific action names, disabled availability, busy feedback, stock checks and cart persistence are preserved. The compact control displays a check after addition; its status and View cart action span the entire purchase row. Choose options remains a named selection action. No invented ratings, reviews or pack claims were added.

## Verification

- Production foundation build, root lint and root typecheck pass.
- All 21 storefront/Market Green browser regressions pass, including catalogue layouts at 320–1440px, product detail quantity limits, authoritative addition checks, persistence and gallery controls.
- Live English/Arabic checks at 320, 390, 599, 600, 768 and 1440px report no page overflow and purchase targets at least 44px in both dimensions. Compact addition produces the existing saved-cart success state and visible View cart link. No uncaught page errors; Next.js session diagnostics are clear.
- Batched desktop/phone inspection and one final confirmation completed. Evidence is under `screenshots/product-card-polish/`. No new critique score or detector run was produced; the previous critique backlog was already closed and no card-specific snapshot existed.

During visual inspection, one local wheelchair sample was found to use the wrong retained photograph. Its isolated demo record and helper were corrected to the matching wheelchair image. This changes preview data only; production catalogue records and media remain untouched.

The expanded sample data remains illustrative. Production media, physical-device checks and user visual acceptance remain release requirements. PR #103 stays open and unmerged.
