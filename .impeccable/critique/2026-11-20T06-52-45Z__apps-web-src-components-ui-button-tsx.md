---
target: Storefront tokens and shared UI primitives
total_score: 29
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 1
target_identity: "file:/Users/administrator/Nabeel/dev/almina-storefront-p3/apps/web/src/components/ui/button.tsx"
target_fingerprint: "sha256:5f194790e25dcc5ca6a6d43438455b3b6a837d0c60c23b2bdae8cf023458138e"
target_path: /Users/administrator/Nabeel/dev/almina-storefront-p3/apps/web/src/components/ui/button.tsx
timestamp: 2026-11-20T06-52-45Z
slug: apps-web-src-components-ui-button-tsx
---
# Apothecary storefront token audit

The visual critique scored the previous storefront 29/40. The independent technical pass found the public palette overriding the root theme, layered and unlayered button rules competing for the delivery action, and one duplicated literal control text size. English and Arabic shared the same responsive structure. The campaigns still embed display lettering in artwork.

| Role | Previous path | Current owner |
| --- | --- | --- |
| Brand, surface, border, and shared radii | Conflicting root, retail and shell definitions | Tailwind v4 theme in src/app/globals.css |
| Storefront layouts and status aliases | Storefront CSS module with duplicated color literals | Storefront token aliases and route layout CSS |
| Button and field states | Shared primitives and a storefront fallback overriding the same data slots | components/ui primitives, with storefront-only confirmation, busy and stepper states |
| English and Arabic fonts | Storefront-scoped local loaders | Root Next font loaders for Plus Jakarta Sans and IBM Plex Sans Arabic |
| Legacy non-retail colors | Stylesheet imported by the public storefront | Compatibility selector imported by wholesale and root missing-page recovery |

The former storefront theme had limited control-role consistency despite clear search, useful pack and stock information, recognizable RTL and localized account recovery. The new visual roles give primary actions deep green, while coral marks count badges, sales and urgent alerts. Cart, checkout and localization behavior stays in existing components.

Measured token contrast is 6.89:1 for white on green and 4.65:1 for dark ink on a coral badge. The requested mineral border is intentionally subtle at rest and provides about 1.4–1.6:1 against the field and surrounding white. Keyboard focus adds the dark brand border and a three-pixel tinted ring. The unfocused color pair alone does not support a blanket non-text contrast claim.
