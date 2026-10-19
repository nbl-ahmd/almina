# Storefront homepage replacement — 19 October 2026

## Delivered scope

Replaced the prior green/sage homepage direction at the owner's request. New cobalt campaign hero, warm white shopping field, lavender/peach supporting panels, Outfit variable font self-hosted as WOFF2, Heroicons outline, revised navigation/search, category shortcuts, product shelves, editorial collections, pharmacy support and footer. Shared header/footer, font and semantic storefront colours apply across storefront routes; individual PDP/cart/checkout/admin layouts were not rebuilt.

References: owner's mobile pharmacy screenshot, [Life Pharmacy](https://www.lifepharmacy.com/) and [myAster](https://www.myaster.com/en), plus prior competitor research under outputs/commerce-direction-2026-10-18. Existing DESIGN.md and old project visual rules were not used as design authority. The new implementation is documented after the work. Production/security/commerce constraints still apply.

## Data and commercial truth

- Product IDs, images, names, available stock and prices are read from the current API. No production catalogue writes, uploads or order submissions.
- Hero prefers available products with photos. Active offers enter selection before featured products, then a temporary CeraVe query and general catalogue fallback. Savings labels require a real active sale price below regular price.
- No fictional discounts, reviews, certifications, guaranteed delivery times, prescription tools or loyalty programmes.
- Existing AddToCart and product-family options reused; server remains responsible for inventory/pricing verification.
- Manual carousel controls, no autoplay; native keyboard-operable buttons, active-state labels, hidden inactive slides, persistent page h1. Slide content stays server-rendered; only selection state is client-side.
- Existing delivery-area picker retained; duplicate inline prompt removed to reclaim mobile space.
- Real catalogue preview runs at http://127.0.0.1:4765. Demo remains at http://127.0.0.1:4760, preserving local admin credentials. No switching the demo to the production API.
- Demo products are existing synthetic fixtures and retain demo names. No additional dummy product data authored for this redesign.

## Asset provenance

`apps/web/public/design/home/wellness-editorial.webp`: original AI-generated category editorial still life (orange, water, unlabelled cosmetic containers, towel, lavender backdrop). Decoration only, empty alt; it is never assigned to a catalogue product. Original generated PNG retained in the local generated-images directory; web asset resized to 1000px and WebP for delivery.

Outfit: Google Fonts, SIL Open Font License retained at `apps/web/src/app/fonts/Outfit-LICENSE.txt`. Locally served through next/font/local; 31 KB variable Latin WOFF2. No external runtime font request. Existing root/admin typography was not refactored.

## Missing API / future integration

A structured campaign API for ordered hero product IDs, campaign copy, dates and link targets is still needed for admin-driven merchandising. Existing legacy banner-image data is not represented as a campaign object in this UI. The hero presently selects real products in code. No pretend CMS controls added. Editorial collection links use existing search; curated collections would improve search precision. No bestseller/reorder/personalized claims without supporting APIs. Missing product images honestly say “Photo coming soon.”

## Verification

- Next.js 16.3.8 version and bundled font documentation checked.
- Focused ESLint and TypeScript checks passed.
- 16 storefront/SEO/media/stylesheet-policy tests passed.
- Production Next.js build passed. Subsequent focused semantic/image-layout fixes passed typecheck/lint.
- Impeccable skill launcher: permission denied; not bypassed. Public npm Impeccable 4.6.0 CLI static `detect --no-config` run succeeded with zero findings. This excludes browser scanning and old DESIGN.md authority; result saved under outputs/homepage-v2-2026-10-18. Static zero findings is not a blanket accessibility certification.
- Local Next.js MCP get_errors reported no configuration or session errors.
- Browser confirmed real catalogue prices/images, manual next/dot selection, keyboard Enter, persistent h1 on slide change, header search to `/search?q=cerave` and no console errors during that test.
- Local synthetic AddToCart action returned “Added to cart.” No order submitted.
- Responsive checks at 360, 390, 768 and 1440px, no horizontal overflow. Lazy editorial image explicitly loaded by scrolling before final mobile screenshot.
- Independent Impeccable/Emil finish review requested clear editorial text field, persistent h1 and removal of duplicate delivery prompt; implemented. Review screenshots and final verdict recorded alongside outputs.
- Reduced motion: campaign entrance and press transform are media-gated; hover transforms use motion-safe. No autoplay, scroll pinning, animated blur or GSAP runtime dependency.

## Limits / rollback

Local only, no commit/push/deployment. Production Core Web Vitals, complete assistive-technology coverage and all checkout/payment permutations are not claimed from these UI checks. Revert homepage/components, shared nav/footer/layout theme and font references to roll back; no database migration required. Unrelated pre-existing fixture/admin test changes left untouched.
