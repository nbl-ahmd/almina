# Mobile storefront shell — 25 October 2026

Local implementation; not deployed by this task.

- Compact single-line delivery selector, without raised button treatment.
- Phone delivery picker docks as a scrollable bottom sheet; desktop retains a centred modal. Existing location lookup, persistence and checkout authority are unchanged.
- Mobile hamburger entry is no longer mounted. The existing drawer implementation is retained for a future explicit opt-in.
- Mobile top bar contains logo, delivery selector and search. Cart remains in persistent bottom tabs rather than appearing twice.
- Edge-to-edge bottom tabs respect device safe areas; Shop opens categories and remains selected through category/product/collection routes.
- Sticky phone header, touch targets, input scroll clearance and compact footer separation apply across storefront routes. Desktop mega-menu and account/cart controls remain available.
- Existing product/cart purchase docks and guest checkout are retained. This changes the shared mobile shell, not the native installation/offline capabilities of the site.

Verification: isolated production build, web TypeScript and targeted ESLint passed. Eight distinct navigation/search checks passed across 360/390/768/1280px, including axe accessibility audits, keyboard access, Arabic RTL and delivery-area save/reload. Visual evidence at 360/390/768/1440px and phone shopping/cart/checkout/account screens is in outputs/mobile-app-shell-2026-10-25/. Demo checkout keeps background network activity; screenshots use rendered-content readiness rather than network-idle readiness.
