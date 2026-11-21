> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Tailwind storefront foundation and Impeccable — 2026-10-14

The owner approved Heroicons, optimized font loading, Tailwind-first styling and
a smaller skill set, then requested evaluating/installing Impeccable and starting
the work. This implements that foundation within the existing Figma layouts.

## Skills and design authority

Installed project-local skills:

- `.agents/skills/impeccable`: official pbakaus/impeccable, version 4.5.2,
  inspected source commit `2f98774f86bc05563876643db37e6c37c322850f`.
  License/attribution are retained. Its instructions were read and applied in
  this turn; normal skill discovery is available on subsequent turns.
- `.agents/skills/shadcn`: official shadcn-ui/ui `skills/shadcn`, retrieved
  from main on 2026-10-14, for component-specific work when needed. No shadcn
  runtime components or second primitive library were added merely to initialize
  a stack; existing native controls remain suitable for the current flows.
- `.agents/skills/almina-project-profile`: validated project rules. It separates
  design decisions from component APIs, React performance and runtime checks.

`apps/web/PRODUCT.md` records product facts; `apps/web/DESIGN.md` records the
approved visual direction. `apps/web/AGENTS.md` makes those the storefront's
authority and excludes the older overlapping design generators from the default
workflow. Shared global skills and unrelated plugins are not uninstalled.

Impeccable is useful for hierarchy, typography, spacing, visual consistency,
adaptation and critique. Its general preferences cannot change the owner's
Heroicons/font/Tailwind choices, actual catalog content or commerce rules.
The installation copied reviewed skill instructions/resources; it did not
install automatic edit hooks or a new application runtime dependency. Its
context/detector launcher used a temporary `/tmp` engine cache.

## Application changes

- Added the pinned `@heroicons/react` 2.2.0 package and narrow lockfile change.
  The existing Icon API now renders the Heroicons outline family, so navigation,
  controls and supporting symbols no longer mix custom/Figma SVG styles.
- Migrated homepage, navigation/footer, catalog/filter/sidebar/pagination,
  product/category cards, gallery, product information, purchase controls and
  cart presentation to Tailwind utilities. Semantic class hooks remain for
  meaningful browser checks; they no longer own component CSS layout rules.
- The storefront stylesheet shrank from 395 lines to 31: scoped semantic theme
  values plus a documented Chromium native-details desktop-sidebar exception.
  Existing global baseline/admin compatibility styles remain; no reset was added.
- Supporting typography is larger and more consistent; product names remain
  readable. Existing GET forms, native disclosures, server pages and small client
  islands remain. Stock, price, cart and checkout calculations are not rewritten.
- The product grid uses a rem-based minimum column size to become a single
  column when enlarged text needs room. Purchase action tracks scale with text,
  preventing the 200%-text overflow found during verification.
- Retained self-hosted variable Plus Jakarta Sans for the storefront. PT Sans
  in the root layout uses `preload: false`, preserving admin/base rendering while
  preventing an unused storefront preload. A compiled mobile page requests only
  the Jakarta WOFF2: 27,572 transferred bytes, one font preload. Admin login
  still requests PT Sans and does not request Jakarta.

Real products/categories/media/contacts, identifiers, URLs, metadata and
structured data remain application-owned. No sample content, unsupported claims,
production data migration or deployment is introduced.

## Verification and evidence

- Focused lint, web typecheck and isolated Turbopack production build pass.
- 21 catalog/SEO/commerce/policy unit regressions pass.
- All 29 storefront/enabled-checkout browser regressions pass; the storefront
  subset passes again against the final enlarged-text layout (9 tests).
- Responsive evidence is under `/tmp/almina-tailwind-verification`, covering
  nine routes at 360/390/768/1024/1280/1440px, overflow, visible images and axe,
  followed by search/filter/gallery/keyboard/200% text/reduced motion and error
  recovery/reload behavior. The complete final run passes and is recorded there.
- Font evidence: `/tmp/almina-tailwind-font-loading.json`.
- Impeccable detector: `/tmp/almina-impeccable-detection.json`. Its one warning
  flags the desktop active-navigation underline as a rounded-card accent border.
  This is an intentional breakpoint distinction: mobile navigation uses pills;
  desktop explicitly uses `md:rounded-none` with an active bottom underline.
  The detector does not resolve that distinction; rendered navigation is checked.
- The verifier now names browser sessions by worktree and preview port. A stale
  3120 development-tab performance error previously contaminated the 3160
  compiled-run error list; separate origin sessions retain strict error checks
  without ignoring or filtering app errors.

Verification uses synthetic loopback catalog fixtures/disposable test databases.
Font transfers and responsive checks are measured local results, not evidence
of real-user production Core Web Vitals. Production catalog/media and hosted
performance remain deployment acceptance checks.

## References

- [Impeccable source](https://github.com/pbakaus/impeccable)
- [Heroicons](https://github.com/tailwindlabs/heroicons)
- [Official shadcn skill](https://ui.shadcn.com/docs/skills)
- Version-matched Next 16.3.8 bundled font/CSS documentation from `npm run docs:next`.

Rollback only the affected storefront/component/font/package/skill-policy changes;
preserve the workspace's unrelated work and production commerce contracts.
