> SUPERSEDED 2026-11-15: storefront aesthetic decisions here are historical evidence only, excluded from current design guidance. Functional and production requirements remain in force.

# Visual merchandising — 19 October 2026

## Implemented locally

Follow-up to the owner's Life Pharmacy carousel and two-row category references. Adds photographic merchandising without copying competitor artwork or introducing unsupported services, discounts or reviews. Existing compact header, floating contact, collection discovery and footer retained.

- Homepage promotions: the newest eight existing uploaded banners take priority. Saved destinations use the existing validated mapping. Whole uploaded artwork is contained without cropping; native previous/next and numbered controls, no autoplay. Admin banner help now explains placement and recommended wide artwork. Relative storefront destinations can be entered without native URL-field rejection. Provider upload/RBAC validation unchanged.
- When no uploaded banners exist, two original generated skincare/family editorial campaigns display live HTML headings and collection links. A real current product, actual price and product-page link sit alongside desktop and beneath mobile. No generated catalogue product packshots.
- Eight actual category links appear as two-row photographic tiles, horizontally scrollable on smaller screens and four columns on desktop. Six-scene atlas, dedicated deodorant artwork and an icon fallback cover current matching categories. Generic category imagery is decorative; category titles remain selectable HTML.
- Shared full and compact product cards across homepage; standard cards also replace duplicated catalogue/related-product markup. Real image, brand/category destination, name, stock, price, actual savings and family options retain existing purchase contracts. No fake ratings or wishlists. White contain-fit product fields accommodate photos with opaque backgrounds. Failed remote images recover to the existing local placeholder; missing photos remain explicit.
- Two editorial sections receive a once-only 360ms opacity/10px translate reveal. Content is visible before JavaScript and under reduced motion. No scroll pinning, animated blur or new animation dependency. Hover image scaling is motion-safe.

## Asset provenance

Original AI-generated artwork, inspected before use, saved as WebP:

| Asset under apps/web/public/design/home | Purpose | Bytes |
| --- | --- | --- |
| skincare-campaign.webp | Generic skincare editorial campaign | 77,640 |
| family-campaign.webp | Generic family care editorial campaign | 50,592 |
| category-scenes.webp | Six generic category scenes in one atlas | 78,580 |
| deodorant-category.webp | Generic deodorant category illustration | 6,210 |

Original PNGs retained under the local generated-images task directory. These contain unlabelled generic objects and are never assigned to real products. Existing wellness editorial artwork remains lower on the page. Images are served through Next Image with responsive sizing/lazy loading where appropriate. The atlas uses its measured scene boundary to avoid distortion or neighbouring-scene bleed.

## Validation

- Final production Next.js build passed in isolated output; no database connected during build. Initial invocation lacked required public environment values; rerun with explicit local configuration succeeded.
- TypeScript and focused ESLint passed. Twenty merchandising/storefront/SEO/media/stylesheet-policy tests passed.
- Impeccable 4.6.0 public CLI static detect returned no findings. This is not a claim of complete accessibility certification.
- Running Next.js MCP get_errors: no configuration/session errors. Earlier temporary JSX parse error was fixed; historical browser messages are retained in its log.
- Browser checks at 360, 390, 768 and 1440px: no horizontal page overflow; loaded images had no failures. Manual campaign navigation works; generated campaign CTA navigated to the real skincare collection. Collection cards expose proper h2 product headings, real prices and existing Add to cart controls.
- Independent finish review identified a brand-link mismatch and generic spotlight eyebrow; both corrected before final capture.
- Captures: outputs/homepage-v4-2026-10-19/desktop.png, mobile.png and hero.png. Below-fold imagery loaded by actual scrolling before capture.

## Limits and follow-up

No production upload, catalogue mutation, order submission, commit, push or deployment. Exact-photo acquisition and rich product content remain separate catalogue work. Admin banner provider upload was not exercised; current preview had no uploaded artwork, so generated fallback navigation was browser-tested and uploaded rendering was source-reviewed. Remote image failure recovery was not fault-injected. Reduced-motion guard source-reviewed; changing the OS preference live was not tested. Full assistive-technology testing and production Core Web Vitals remain follow-up checks.

Campaign scheduling, priorities beyond newest-first, per-banner mobile artwork, analytics and expanded merchandising APIs remain future work. Existing admin banner upload already supplies basic artwork management; no dummy API has been introduced. Rollback is a UI/component/asset revert, with no database migration. Preserve unrelated pre-existing fixture/test edits.
