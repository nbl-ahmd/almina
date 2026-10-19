# Al Mina storefront design — redesign preparation

## Active direction: 18 October 2026

The owner requested a new design following the Life, myAster, BinSina and RAK
competitor review. The former Figma/PNG composition, pale-blue panels and old
visual token values below are incumbent implementation evidence, not a mandate
for the replacement. See `docs/migration/REDESIGN_SETUP_2026-10-18.md` from the
repository root. The original document is archived under docs/migration/.

Target a distinctive, product-led health, beauty and everyday-care retailer:
recognizable real products, useful categories, restrained promotion, warm neutral
surfaces, strong ink typography and a deliberate deep teal/green action hierarchy
with selective coral brand accents. This is a design direction, not final numeric
tokens or a claim that any new UI is already implemented.

Next establish the component/page concept with real product names, photos and
empty states; record the chosen type/spacing/colour/component tokens here before
broad implementation. Retain Tailwind-first styling, Heroicons, one optimized
font, semantic accessible interactions and server-rendered commerce content.

## Historical implementation reference — superseded visual authority

## Previous visual direction

Preserve the structural desktop/mobile reference layouts in Figma file
llmDMdaminn2wcCIAZQ9U7. Make shopping and product information clear before adding
decoration. Friendly pharmacy retail: aqua/coral from the Al Mina identity,
pale-blue page surfaces, thin blue borders, small-radius white cards and readable product content. The eight PNG screenshots attached by the owner are the current visual authority; the earlier rounded/shadow-heavy interpretation is superseded.

## Foundations

- Plus Jakarta Sans variable WOFF2 through next/font/local; one storefront
  family. Heading weights 700–800; body 400–500; controls 600. Legible supporting
  text and no decorative marketing eyebrow repeated above every heading.
- Heroicons 24-unit outline family; decorative icons hidden from assistive
  technology; icon-only controls keep explicit accessible names.
- Tailwind spacing and responsive utilities; semantic colors rather than
  repeated literal values. Ink #203e46, muted #52676d, primary coral #ca3344,
  primary hover #ba283b, teal #007573, aqua #bdf2ee, page #f3f9ff,
  subtle #e8f4ff, border #d4e5f1, white surface.
- Radius: 8px controls, 10–12px cards/panels, pill desktop purchase actions and compact rounded mobile actions. The hero is a blue bordered image/note panel.
- Elevation: light shadows and 1px blue borders as in the supplied screenshots; no raised floating hero or large-radius card styling. Keep actual form boundaries and disclosure separators clear.
- Mobile starts at 360px; md 768px, lg 1024px, content max 1344px.

## Surface behavior

Homepage keeps a desktop discovery/photo hero and mobile quick actions.
Catalog uses native GET search/category filters and desktop sidebar/mobile
disclosure. Product detail uses a focused mobile header and bottom purchase bar.
Cart uses real saved quantities and says delivery/VAT/final total are reviewed
at checkout. Unsupported reference features remain omitted.

Shared components own normal/hover/pressed/focus/disabled/loading/error/empty
states. Keyboard focus remains visible; touch controls are at least 44px; motion
is restrained and disabled for reduced-motion preferences. Native form controls
remain native unless an actual interaction requires an accessible primitive.

## Implementation and skill authority

Use Tailwind directly in components. Small CSS remains for semantic tokens and
documented browser exceptions. Avoid overlapping library themes or broad global
selectors that change admin routes. Existing administration retains its separate
styles and font behavior.

The Al Mina profile and user decisions govern visual choices. Impeccable refines
this world; shadcn guidance supplies component APIs when needed; Vercel guidance
and version-matched Next docs supply performance/framework patterns. Older
generic design-generator skills do not independently choose styles here.
