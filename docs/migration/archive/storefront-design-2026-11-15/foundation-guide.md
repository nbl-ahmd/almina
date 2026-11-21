> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Al Mina storefront UI system

Established 2026-10-03 before implementation. Applies to the additive `apps/web` storefront. Legacy deployment remains intact; checkout activation is a separate commerce migration.

## Direction and skill assessment

ui-ux-pro-max query: `pharmacy ecommerce trustworthy clean`; stack query: `responsive forms navigation` (Next.js). Adopt the relevant flat, content-first pharmacy direction, contrast rules, native labelled forms and minimal motion. The returned corporate sales CTA/logo-carousel pattern is unsuitable for retail and is rejected. Use catalog discovery, product information and cart actions instead. Retain the existing self-hosted PT Sans font through `next/font`; do not add external font requests. No invented reviews, medical efficacy, delivery promises or trust certifications.

## Tokens

Use the existing native CSS system as the single styling system in `apps/web`, avoiding a second framework or dependency migration during this redesign. Legacy Bootstrap/MUI remain isolated in the separate application until those production workflows migrate.

The canonical executable tokens live in `apps/web/src/app/globals.css`.

- Semantic colors: ink #17332f; muted #52645f; brand #086657; brand-hover #064f44; accent #c6e5d6; page #fafbf8; surface #fff; subtle #f0f4ef; border #c9d4cf; sale #a13726 on #fff0e9; warning #744513 on #fff5e6; focus #075dc7.
- Typography: PT Sans, system sans fallback; body 16px/1.6; supporting text 14px/1.5; labels 14px/600; card titles 16px/700; section titles 24–32px; page titles 32–40px; hero display 34–64px. AED prices use 20px/700 with tabular figures; original prices subordinate, struck through. Product names wrap.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64px. Page gutters 16px mobile, 24px tablet, 32px desktop; maximum content width 1280px.
- Geometry: controls 8px; cards 12px; editorial panels 20px. Borders, rather than decorative shadows, define hierarchy.
- Breakpoints: mobile base; 768px tablet; 1024px desktop; 1440px wide. Product grid 2/3/4/5 columns. Header search wraps below brand on mobile; mobile navigation reserves space including safe-area inset.

## Hierarchy and components

1. Header: brand, always visible labelled search, cart; shared navigation with current route state.
2. Homepage: pharmacy identity and catalog CTA; discovery/category section; featured and offer grids. Actual managed banners stay visible without autoplay.
3. Product card: image, sale/featured badge, category, wrapping name, current/original price, text stock state, add action and contextual status. No nested interactive controls.
4. Catalog: breadcrumb, one H1, explanatory text, labelled search/category form, applied-filter reset, product grid and pagination. Filters use existing server query parameters.
5. Details: gallery, category/name, price, stock, quantity/add action, description, related products. Existing identities/SEO remain.
6. Cart: item information, grouped quantity controls, visible remove, checked catalog prices, checkout review panel. No client-calculated authoritative totals.
7. Checkout: cart review and prominent existing ordering-unavailable state. Do not add a nonfunctional customer/payment form or enable ordering.
8. Footer: brand/location, real catalog destinations, navigational help. Contact links reuse the email and phone already published in the legacy footer; no invented contact details.

## Forms, buttons and states

Use one shared native form/control system. Labels remain visible (search has a programmatic label). Inputs/selects are at least 48px tall at 16px type. Search supports Enter, category selection uses a native select and explicit Apply. Retain submitted query values. Primary buttons are solid teal, secondary white with a border, tertiary text. Minimum touch target 44px; core controls 48px. Disabled state uses semantics plus a distinct appearance; pending actions retain size and show text. Errors/statuses use contextual text, not color alone. Out-of-stock cards retain product navigation and show a disabled purchase action.

Loading uses static reserved-shape skeletons and a status message; no shimmer. Catalog Suspense boundaries live inside valid homepage/listing pages. Do not add an ancestor `loading.tsx` around identity-sensitive detail routes: streaming before resolution can turn real 404s into HTTP 200 responses. The compiled smoke enforces this contract. Empty catalog offers a clear recovery link. Cart errors preserve stored lines and expose a retry. Error and 404 screens offer a recovery action. No unnecessary animation; only 150ms color/border feedback, disabled under reduced motion.

## Accessibility and verification

WCAG AA text contrast (4.5:1), nontext controls/focus (3:1), 3px visible focus, skip link, landmarks, sequential headings, descriptive image alternatives and explicit names for quantity/gallery controls. Decorative shared stroke SVG icons are hidden. Current navigation and selected thumbnails expose state. Ensure wrapping, 200% text/zoom resilience, no page overflow, keyboard operation and fixed-nav clearance.

Verify all affected routes at 360, 390, 768, 1024 and 1440px with screenshots, overflow and axe audits; direct navigation/reload, search/filter submit, cart stock/persistence/removal, closed-store rejection, error retry and empty states. Use only isolated synthetic catalog data. Run typecheck/lint, relevant regression tests, Turbopack build and compiled smoke. Record actual results in the redesign report and migration status.
