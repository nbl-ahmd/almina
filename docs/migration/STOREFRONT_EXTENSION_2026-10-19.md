> SUPERSEDED 2026-11-15: storefront aesthetic decisions here are historical evidence only, excluded from current design guidance. Functional and production requirements remain in force.

# Storefront design extension — 19 October 2026

## Scope and direction

Extends the approved V4 Outfit / cobalt / lavender / photographic merchandising direction across the storefront. This is local UI work; no commit, push, deployment, production order, database write or image upload. Existing product/category URLs, metadata, JSON-LD, family options and authoritative commerce handlers remain in place.

## Delivered

- Shared photographic CategoryTile on the homepage and complete categories directory. Current category imagery, if provided, takes priority; generic category illustration follows, then an icon fallback. Desktop grid and mobile two-column directory; homepage retains a two-row horizontal rail.
- Shared StorefrontIntro for catalogue/category listings, offers, curated collections, About and Contact. Clear copy field and complementary image field; no text embedded in raster files. Search/filter/pagination behavior is unchanged.
- Product detail: prominent contain-fit photo, concise category/brand identity, name/summary, stock and SKU, unified price panel, existing options and purchase controls, delivery guidance, clearer details/specifications. Mobile purchase bar now sits above the 62px bottom navigation; floating contact clears purchase bars on product/cart routes.
- Cart: separate item cards, clearer quantity/price grouping, concise help panel, matching order summary, illustrated empty state and continued recommendations. Final delivery/VAT/total remain unknown until the server quote; no client totals invented.
- Checkout: matching surfaces, field treatment and section hierarchy. Event handlers, validation, quote acceptance, idempotency, storage recovery, submission and payment options unchanged.
- About/Contact match the new visual language and retain factual contact details. Loading cards and offers empty state updated; no active offers is clearly explained rather than presented as generic search failure.
- Both homepage carousels coexist: uploaded/generated artwork in main hero, a separate In the spotlight carousel with current real product names, summaries, prices and links further down the page. Manual buttons and keyboard controls, no autoplay. Hero artwork was not replaced again.
- Brand cards show verified matching catalogue product photography when available, retaining text when unavailable. These are brand search destinations, not invented logos. Baby editorial panel now uses family campaign photography.
- Horizontal category/compact/product-gallery/detail-navigation rails hide unnecessary scrollbar tracks while preserving touch, trackpad, keyboard focus and scrolling. Vertical page scrollbars remain visible.

## New imagery

`apps/web/public/design/home/general-nail-scenes.webp`: original generated two-scene editorial atlas (general personal care / nail care), compressed to 1200x800 WebP. Generic unlabelled objects only, never assigned to an exact product or brand. Original retained at `/Users/administrator/.codex/generated_images/01a139c0-367c-7402-b5e2-73872768ebbf/exec-678139f4-72ac-4206-9400-6bed793342d6.png`.

Prompt: Create a clean editorial photography atlas for a pharmacy ecommerce website. Output wide landscape 1536x1024 with exactly TWO side-by-side equal rectangular scenes, hard straight division precisely at center, no border or gutter. Left half: everyday personal care still life with plain unbranded white soap, folded cream cotton towel, simple translucent pump bottle, soft ivory backdrop. Objects mostly in lower two thirds, top quarter quiet empty cream. Right half: nail care still life with stainless steel nail clippers, white emery board, neutral nude manicure brush and small plain unlabelled white lotion jar on pale lavender backdrop. Objects mostly in lower two thirds, top quarter quiet empty lavender. Soft daylight, photorealistic premium ecommerce editorial, restrained pastels consistent with pharmacy skincare category cards, no text, no letters, no logos, no invented brand packaging, no medical claims, no people, all objects fully contained within their own half.

Existing generated family/skincare/wellness artwork reused for section banners; provenance in the V4 audit. Existing exact product photos reused without modifying product records.

## Verification

- Installed Next.js 16.3.8 and bundled Image documentation checked. Final isolated production build passed; focused ESLint and TypeScript passed.
- 30 commerce/policy/storefront/merchandising/SEO/media/stylesheet-policy tests passed. No monetary or checkout logic change.
- Isolated local demo: increased cart quantity from 1 to 2, restored 1, entered synthetic test contact/address, requested server quote and observed item AED20.00, delivery AED0.00, included VAT AED0.95 and total AED20.00. Did not place the order. Real API used only for public catalogue reads.
- Product carousel next changed the visible product; keyboard Enter on first numbered button restored its pressed state. No autoplay introduced.
- Mobile 390px and desktop 1440px checks across categories, products, offers, collection, PDP, cart, checkout, About and Contact. No mobile page overflow found. Mobile PDP bar measured y707–782 with navigation y782–844, at 390x844 viewport.
- Static Impeccable 4.6.0 detect returned zero findings. Independent visual finish review: ship scoped storefront work after refreshed settled homepage/catalogue/offers screenshots. Initial screenshots captured streamed loading states; replaced with loaded content before review completion.
- Final running preview: browser error log empty; Next.js MCP configuration/session error arrays empty after local preview restart.
- Screenshots: outputs/storefront-v5-2026-10-19. Full-page captures can position fixed/sticky controls at the current viewport; geometry was checked separately.

## Limits / follow-up

Some products and brands still have no verified photography. Honest placeholders/text remain; generated category illustrations never masquerade as exact packshots. No news CMS or genuine news articles were available, so no fabricated news section added. Campaigns/collections supply the requested smaller image-led sections. New branded campaigns and scheduled news require real admin content and appropriate APIs.

Full physical-device/assistive-technology coverage, production Core Web Vitals and order-submission permutations are not claimed. Design-only changes can be reverted without a data migration. Unrelated pre-existing fixture/admin/recovery test changes left untouched.
