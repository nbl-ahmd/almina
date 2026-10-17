# Proposed UI foundation and skill policy — 2026-10-14

Status: the owner requested proceeding and installing suitable UI guidance.
The implementation is recorded in [Tailwind UI foundation](TAILWIND_UI_FOUNDATION_2026-10-14.md).
Impeccable is now the single visual critique/polish skill within the Al Mina
profile; the earlier comparison below records the proposal that preceded it.

## Findings

The maintained Next storefront uses Next.js 16.3.8, React 19.3, TypeScript,
Tailwind 4.3.3/PostCSS and mostly scoped custom component CSS. It does not yet
use shadcn, Radix, DaisyUI or HeroUI. The small @almina/ui package is not a
complete component library.

The root layout loads PT Sans Regular through next/font/local; the storefront
layout separately loads a 27 KB variable Latin Plus Jakarta Sans WOFF2. Verify
the emitted preload/network behavior and move font ownership to the appropriate
route layouts to avoid unused storefront font transfers, preserving admin
behavior. A move to next/font/google alone is not a proven speed improvement.

Several installed skills overlap in visual direction: frontend-design,
ui-ux-pro-max, design, brand, design-system and ui-styling. ui-styling also embeds
assumptions about shadcn's primitive stack that must be checked against current
official component documentation. Availability should not mean simultaneous use.

## Recommended implementation stack

- Preserve Next App Router, TypeScript and small interactive client boundaries.
- Tailwind 4 for layout, breakpoints, typography, spacing, borders, states and
  motion. Use semantic theme tokens shared by reusable components.
- Use only Heroicons for interface icons. Default to the 24-unit outline family;
  reserve an explicitly defined solid treatment for selected states. Import
  individual components from @heroicons/react; no broad dynamic icon registry.
- Keep Plus Jakarta Sans as the single storefront family, hosted through
  next/font/local. It is available through Google Fonts; Google provenance and
  local Next hosting are compatible choices. next/font/google is an acceptable
  alternative if its build-time font fetch is desired, not a runtime speed fix.
- Use selected shadcn source components with a single Radix primitive base for
  complex interactive controls. Keep native HTML and simple server-rendered
  components for ordinary links, forms, cards and navigation where appropriate.
- No simultaneous DaisyUI/HeroUI styling stack. No wholesale template import.
- Preserve the Figma screen layouts and actual app content. An Al Mina design
  specification, not a library preset, owns the visual language.

Tailwind replaces component stylesheet rules incrementally. Keeping a small CSS
file for semantic theme variables, required baseline rules and documented
browser/third-party exceptions is valid. Do not merely move existing selectors
into @apply blocks or enable global resets that disturb verified admin routes.
Remove each old component rule after its utility-based replacement is verified.

## UI library decision

| Option | Assessment for Al Mina |
| --- | --- |
| Tailwind + native HTML only | Appropriate for most catalog layout; insufficient on its own for the behavior of custom dialogs, menus and comboboxes. |
| shadcn + Radix | Recommended selectively: editable source, Tailwind tokens and reusable complex controls. We maintain copied code and dependencies; accessibility still requires testing. |
| Direct Radix | Viable alternative; unstyled accessible primitives, but we own more component styling and composition work. Avoid a second parallel wrapper system. |
| DaisyUI | Convenient CSS component classes and themes; does not itself supply all React interaction/focus behavior needed for custom controls. Less aligned with direct source ownership here. |
| HeroUI v3 | Viable Tailwind 4/React Aria suite with CSS animation. Not rejected as inherently slow; a broader suite than we currently need. |

No bundle-size ranking is asserted without building equivalent implementations.

## Recommended skills

| Action | Skill | Boundary |
| --- | --- | --- |
| Create | almina-project-profile | Project constraints, approved design tokens, Tailwind/Heroicons/font rules, UI states, SEO and verification checklist. No unrelated aesthetic generation. |
| Keep | vercel-react-best-practices | React/Next performance patterns; checked against installed Next bundled documentation and commerce caching constraints. |
| Keep | next-dev-loop | Runtime/browser verification, not design direction. |
| Keep | web-design-guidelines | Explicit accessibility/usability reviews; findings checked against project requirements. |
| Add | Official shadcn skill | Only for shadcn component implementation; bind to project configuration and Heroicons, not generic presets. |
| Conditional | One Figma design-to-code integration | Only when reading or implementing supplied Figma references. Related Figma skills only for their specific operations. |
| Remove from default project workflow | frontend-design, ui-ux-pro-max, ui-styling, design-system, design, brand | Replace overlapping default direction with the project profile. Can remain installed for other projects or explicit separate design/marketing tasks. |
| Outside storefront workflow | banner-design, slides, imagegen, Stitch generation | Use only for explicitly scoped asset/marketing/ideation work, not routine component updates. |

Do not uninstall shared user-level skills or duplicate Figma plugins merely on
the basis of this proposal. Resolve active project policy first. No new generic
SEO, animation or full Next skill bundle is needed at this stage.

Project decisions and root AGENTS production guardrails override skill defaults.
Approved Figma layouts and the Al Mina specification constrain visual choices;
library skills handle APIs/composition; performance and review skills check the
implementation. A skill must not silently introduce a new font, icon family,
palette, template, cache policy or unsupported commercial feature.

## Design language to freeze

Friendly, clear pharmacy retail: logo-informed aqua/coral accents, restrained
neutral surfaces, one spacing/type scale, purposeful radius/elevation levels,
one icon family and readable product information. No generic library theme
should redefine Al Mina's identity. Define normal/hover/focus/pressed/disabled,
loading/empty/error states once for each reusable component.

## Acceptance criteria

- UX/accessibility: responsive 360/390/tablet/desktop views, keyboard/focus,
  labeled controls, contrast, touch targets, reduced motion, 200% text,
  visible error recovery and preserved search/cart/checkout behavior.
- Performance: inspect production CSS/JS/font/image transfer and request
  waterfalls. Keep catalog content server-rendered, size images correctly,
  preload only critical media/fonts and avoid unnecessary providers. Measure
  mobile lab results now and real-user metrics after deployment; synthetic
  fixture results are not production performance proof.
- Core Web Vitals goals at the 75th percentile: LCP <= 2.5 s, INP <= 200 ms,
  CLS <= 0.1. Treat these as goals, not measured current results.
- SEO: preserve metadata/canonicals/sitemaps/redirects and noindex policies;
  verify production indexing rules, headings and Product/Breadcrumb data against
  visible real data. No fabricated ratings, stock promises or pharmacy claims.
  UI library choice alone does not supply SEO.
- Production safety: preserve server-authoritative commerce, identifiers, URLs,
  auth/RBAC and integrations. Corresponding regression tests are mandatory if
  checkout/order/inventory/security behavior changes.

## Sources reviewed

- [Heroicons](https://github.com/tailwindlabs/heroicons)
- [Next font optimization](https://nextjs.org/docs/app/getting-started/fonts)
- [Tailwind theme tokens](https://tailwindcss.com/docs/theme)
- [shadcn introduction](https://ui.shadcn.com/docs)
- [Official shadcn skill](https://ui.shadcn.com/docs/skills)
- [Radix primitives](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [DaisyUI](https://daisyui.com/docs/intro/)
- [HeroUI v3](https://heroui.com/en/docs/react/releases/v3-0-0)
- [Google Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Core Web Vitals](https://web.dev/articles/vitals)

Implementation must recheck installed dependency APIs and version-matched docs.
