# Storefront refinement review — 18 October 2026

## Scope and evidence

Compared the open Life Pharmacy homepage with Al Mina's running local Next.js storefront at desktop, tablet and 360–390px mobile widths. Two independent reviews covered visual hierarchy and implementation/accessibility. The local catalogue includes synthetic fixtures and four copied public product records; it does not establish the production catalogue's completeness, production Core Web Vitals or accessibility conformance. The automated visual detector/context launcher could not run because its executable was denied; no detector score, overlay or historical trend is claimed.

Al Mina should retain its approved coral/aqua identity, Plus Jakarta Sans, Heroicons, pale-blue surfaces and neighbourhood-pharmacy content. Life is a useful reference for merchandising density and navigation, not a source of Al Mina's medical, delivery, discount or licensing claims.

## Recommended order

| Priority | Area | Evidence / change | Dependency |
| --- | --- | --- | --- |
| First | Mobile discovery | Categories began around y=845 and products around y=1053 at 390px. Reduce the four tall shortcut cards, compress reassurance/promotion and bring a category/product row into the first screen. | Existing catalogue and categories |
| First | Product photos | Use consistent white, uncropped contain frames for opaque and transparent product photography. Keep a clear missing-photo state and an admin work queue. Exact pack/size/model matching matters more than filling every tile. | Verified, usable photos |
| First | Header hierarchy | Desktop repeats search, category and shopping choices across header, secondary links and hero. Keep one prominent persistent search, a concise navigation row and one primary hero action. | Existing navigation/search |
| First | Touch targets and states | At 360px, header Contact/Search were 36px tall and cart 36px wide. Bring controls to at least 44×44px; show visible pending/out-of-stock feedback on compact product buttons. | UI changes and browser checks |
| Next | Product card density | Tighten gaps while preserving readable names, actual sizes/variants, price and action alignment. Remove ambiguous check marks that could imply certification. | Real catalogue details |
| Next | Category discovery | Life uses image-led category tiles. Al Mina supports category media already; populate with relevant verified images or distinct meaningful icons. Repeated generic grid icons in the local fixture do not prove production assets are missing. | Category media review |
| Next | Real offers on mobile | Current offer sections are desktop-only while mobile shows a generic promotion. Expose a compact real offer rail when actual offers exist. | Authoritative offer data |
| Next | Product details | Structured overview, useful benefits, suitability, supplied specifications and usage/care disclosures beat a repeated generic paragraph. Keep strength separate; no invented ingredients, directions, reviews or therapeutic claims. | Manufacturer/pack evidence, pharmacy review |
| Later | Richer merchandising | Brand discovery, recently viewed products, saved items and relevant recommendations can follow. Implement persistence and meaningful ranking before adding decorative controls. | Backend/product decisions |
| Later | Trust and fulfilment | Show delivery timing, service coverage, returns and payment choices only when supported by the pharmacy's operation. Existing guest checkout and payment-on-delivery remain real features. | Confirmed operational policy |

## Checks and current boundaries

No horizontal overflow was measured at 360, 390 or 768px. The delivery dialog supported Escape/focus return, and no-results search retained its query and recovery actions. Product navigation and direct reload passed on the checked local routes. Visual ordering of homepage sections still deserves a keyboard/screen-reader pass before further rearrangement.

A tablet hero image had a fixed rendered height with a responsive width; this pass adds automatic height to preserve its aspect ratio. The broader hierarchy changes above are recommendations, not a claim that the entire redesign was implemented in this release.

## Image delivery and hosting

This pass routes only the configured Cloudinary account's product images through width-specific CDN transformations (`c_limit,w_…,q_auto,f_auto`) using Next Image's custom loader. Local/static/legacy images keep the existing optimizer path and allowlist. This removes the frontend image-proxy hop, rather than promising that every file will be smaller.

Three existing photos measured 8,450 / 29,190 / 25,492 bytes at CDN width 640, with warm CDN response times around 38–41ms. A local Next optimizer produced smaller AVIFs (5,207 / 11,761 / 10,470 bytes), so the CDN change is a hosting/cache tradeoff, not proven production Core Web Vitals improvement. A first transformation still incurred roughly 0.6–0.7 seconds in this sample.

The Render frontend is on Free. Render documents idle spin-down and cold startup; it also serves a disallow-all robots response while a free service sleeps. App production indexing settings cannot eliminate that hosting behaviour. A supported always-available hosting plan is required for reliable crawling and consistently warm frontend responses.

Sources: [Life Pharmacy](https://www.lifepharmacy.com/), [Render Free services](https://render.com/docs/free), [Cloudinary optimization](https://cloudinary.com/documentation/image_optimization).

Questions skipped: the user already authorized the current publication, media and hosting work.
