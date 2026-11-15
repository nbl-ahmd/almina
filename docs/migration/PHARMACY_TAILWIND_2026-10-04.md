> SUPERSEDED 2026-11-15: historical implementation evidence only. Not current design guidance. Do not restore its palette, type, layout, tokens or instructions. Functional and production requirements remain in root/web AGENTS.md and apps/web/PRODUCT.md.

# Pharmacy component migration — 2026-10-04

The product grid, product cards, stock labels, compact category tiles, gallery and catalog loading grid now use Tailwind utilities backed by the existing pharmacy palette. Base element defaults are layered so component utilities can override them. Preflight remains omitted to preserve retained admin and form rendering. Navigation, checkout and admin component styles remain incremental work; this is not a blanket CSS replacement.

Product identifiers, destinations, catalog reads, stock availability and cart contracts are unchanged. Sale strike-through requires an active sale below regular price, including a valid zero sale price. Galleries handle empty image lists and a list shrinking after selection. No reviews, medicine claims or availability are invented.

## Verification

- Full lint, workspace typecheck and foundation production build passed; all 26 Chromium commerce/admin/recovery/storefront regressions passed.
- Synthetic compiled preview: nine public routes at 360/390/768/1024/1280/1440px, 54 route/viewport checks; no overflow, broken images or axe violations. Screenshots reviewed for narrow listing and desktop home.
- Search/filter/clear, gallery controls, unavailable controls, skip-link/focus, 200% text, reduced motion, loading/empty states, cart outage/retry and direct reload passed.
- Running Next.js 16.3.8 Turbopack: healthy `/products` browser navigation; `get_errors` returned empty config/session errors and `get_compilation_issues` returned no issues.
- Reproduce with the design fixture and compiled preview as documented in `STOREFRONT_REDESIGN_2026-10-03.md`, then `VISUAL_OUTPUT=.verification-results/pharmacy-tailwind node scripts/tooling/verify-storefront-design.mjs`. Output paths are now absolute so screenshots are reliably written inside the requested evidence directory.

These checks use representative synthetic products, not recovered production data. Hosted recovered-product image/rendering, real delivery policy, performance and production accessibility acceptance remain required. No master push, merge or production deployment occurred.
