---
name: almina-project-profile
description: Apply Al Mina's approved storefront UI foundation when implementing or reviewing its pages and components. Preserves Figma layouts, app content, Tailwind styling, Heroicons, font loading, SEO and production commerce constraints.
---

Read the repository AGENTS.md, apps/web/AGENTS.md and apps/web/DESIGN.md before
storefront work. apps/web/PRODUCT.md records product facts; existing API/model
contracts remain authoritative for commerce behavior.

Use Tailwind utilities and shared semantic theme tokens. Retain custom CSS only
for theme definitions, inherited baseline compatibility or documented browser
exceptions. Replace the corresponding old component rules after verifying each
migrated component. Do not enable a global reset that changes admin rendering.

Use Heroicons outline for interface icons. Keep the approved self-hosted Plus
Jakarta Sans variable font via next/font; do not add display/body pairs or
replace the font based on generic skill preferences. Keep client boundaries
small and product media responsive through next/image.

Impeccable owns visual critique and polish within this approved world. Use the
official shadcn skill only for shadcn component APIs; Vercel React guidance owns
performance patterns; next-dev-loop owns runtime verification. Figma skills are
conditional on Figma operations. Do not combine the older design generators,
ui-styling, design-system, frontend-design or ui-ux-pro-max as competing sources
of direction for routine Al Mina storefront work.

Preserve real catalog content, contacts, identifiers, URLs, metadata, structured
data and indexing policy. Never invent discounts, reviews, certifications or
services from reference screens. Server pricing/stock/order validation remains
authoritative. A UI library does not authorize changes to commerce or auth.

Verify mobile, tablet and desktop rendering, focus, contrast, text scaling,
loading/empty/error states, direct navigation/reload and relevant regression
tests. Compare compiled asset transfer when claiming a performance improvement;
fixture measurements are not proof of production Core Web Vitals.
