# Storefront flow review · 20 November 2026

## Evidence

The Nabeel Chrome profile opened, but its tabs could not be verified after the browser connection dropped. A separate Chromium session loaded public pages at 390 px and 1440 px. The spot checks covered search, discovery, product and review content, listing controls, visible delivery entry points and published head metadata. A mobile PharmEasy product detail was also available in Chrome at 400 px. Visit states depended on client hydration, browser location and consent. Checkout, address eligibility, account reviews and proprietary performance measurements were outside the observed public flows.

| Reference | Observed on public pages | Application to Al Mina |
| --- | --- | --- |
| [Life Pharmacy home](https://www.lifepharmacy.com/), [catalogue](https://www.lifepharmacy.com/catalogue), [reviews](https://www.lifepharmacy.com/product/vaseline-gluta-hya-flawless-glow-lotion-200ml/reviews?page=1) | Search leads the header. Mobile reviews retain product image, price, purchase control and compact bottom tabs. The review page exposes rating counts, distribution and recent reviews, with a distinct support footer. | Keep search reachable, use a single purchase action, and add direct links to existing product details, verified reviews and pharmacy support. Add a ratings distribution only when the service returns complete counts for each score. |
| [myAster store](https://www.myaster.com/en/online-pharmacy), [product](https://www.myaster.com/en/online-pharmacy/p/anua-pdrn-100-collagen-glow-facial-serum-capsule-mist-30ml/1072083) | Desktop pairs a large pack image with compact product identity, price, delivery and purchase. Gallery and share controls stay close to the image. Product facts are grouped by purpose. The observed shop and product documents emit canonical links and structured data. | Put area selection next to purchase, add share and swipe to the gallery, and let readers jump to information or reviews. Al Mina uses the customer's selected browsing area, with the checkout quote responsible for final fees and eligibility. |
| [Tata 1mg home](https://www.1mg.com/), [listing](https://www.1mg.com/categories/tata-1mg-health-products-664) | The listing fronts city, search, sorting and filters. Cards fit pack details, ratings, price and Add within a narrow width. The named Odomos detail URL returned a 403 in public research. | Keep quick add on listing cards. Use a temporary mobile filter sheet and a persistent desktop sidebar. Preserve the filter URL so results can be refreshed and shared. |
| [PharmEasy home](https://pharmeasy.in/), [healthcare](https://pharmeasy.in/health-care) | Pincode is available in the header and opens a form with a separate sign-in route for stored addresses. The observed mobile product detail groups location, variants and purchase, with review distribution, a share control, related rails and a sticky purchase action. The healthcare landing uses short category destinations below campaigns. | Keep the current emirate and area form available from the product page. Reuse the gallery, review and fixed purchase patterns with local data. Add compact daily-care and value collection links between homepage sections. |

## Design and implementation decisions

- Keep approved coral for the primary purchase action. Use pale pharmacy green for positive feedback and help, with quiet surfaces for form controls. Keep storefront controls local to the storefront.
- Make mobile filtering a labeled, dismissible bottom sheet with keyboard focus restoration. Keep native GET submission, Arabic labels, validation, and the desktop sidebar.
- Keep the same focused product purchase button after adding. Show success, change its action to Go to cart and return to Add to cart when the shopper edits quantity. Respect reduced motion. Product cards keep their compact quick-add action.
- Product sharing uses the canonical product URL. The native share sheet, clipboard and selectable URL are progressively available. Keep location, reviews and related sections available without interrupting purchase.
- Keep the cart visible while a mutation refreshes it. Move focus to a nearby removal control or the empty state and avoid a forced scroll when that target is already in view.
- Reserve space for the homepage shelf during loading. Fetch on-device recently viewed items when their rail is approached. Reuse the decoded cart across product cards for an unchanged storage snapshot and prioritize the initial gallery image.
- Add a pharmacy-support row to the footer and a WhatsApp shortcut using Al Mina's existing support number. Keep it clear of mobile PDP, cart and checkout purchase controls.

## Verification

The production build, lint, 274 unit tests and 56 Chromium tests passed. The browser suite covered English and Arabic, mobile and desktop, admin routing, search, filter validation, checkout quote review, product review validation, sharing, area persistence and delayed cart removal. The SEO smoke checked raw metadata, canonical routes, no-JavaScript content, nonce-safe structured data, index exclusions, redirects, robots and sitemaps.

Local Chromium and WebKit sampled the same mobile search position at seven scroll offsets in each language. Sampled home, listing and product routes stayed within the viewport. WebKit emitted one saved-list access error during rapid navigation in the fixture. A separate preview run completed with the fixture's expected guest response and did not reproduce the error.

## Follow-up evidence

- Browser results cover a local synthetic catalogue and controlled viewport samples. Production mobile Safari paint behavior, real-user Core Web Vitals and competitor checkout remain unmeasured.
- Collections, reviewed product facts, branch information and structured data provide the inputs for search and AI discovery. Measure production indexing, rich results and AI visibility separately with real data. A public canonical URL or a script count alone cannot establish rankings or discovery outcomes.
