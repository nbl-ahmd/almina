# P3-03 public home merchandising

The public home on `codex/storefront-pharmacy-app-reference` now uses the selected full-width campaign and separate category row. Product comparison uses two columns on phones, three on tablets, four from 1024px and five from 1280px. The home canvas, campaign, category density and shelf frame use the accepted roles. The shelf keeps the real product card, original photos, localized dirham prices and existing purchase actions. Full card and product-detail migration remains assigned to Phase 4.

The generic lead artwork and CTA use the accepted reference and existing asset. Published hero campaigns, secondary campaigns and legacy banners retain their own destinations. The slider renders only when there are extra hero slides. Missing public campaign art does not introduce an editor placeholder. The admin preview retains its existing empty-art treatment. The main shelf uses available catalogue records and can render independently of campaign and offer requests. Duplicate product IDs are excluded from the offer shelf. The brand row uses catalogue brand fields, and existing collection destinations are grouped as compact links.

Sparse inventory renders only real products. With zero available records, the page offers catalogue browsing. A catalogue failure gives a real reload action while keeping the campaign link usable. Missing categories, brands, offers or secondary campaigns leave no placeholder sections. Home loading uses a localized status and the lead campaign remains available while other requests settle.

Verification covered the isolated production build, workspace typecheck, lint, English and Arabic live resizing, sparse and failed catalogue data, managed hero keyboard selection and secondary campaign placement. The managed campaign test uses a synthetic local image response to exercise the existing CDN-shaped asset path. Existing navigation, mobile shell, checkout quote and admin regressions passed. Six captures at 390, 768 and 1440px use the local photo fixture. The first product row starts at approximately 565–657px across those captures and the document fits each width. No production data or order submissions were used.

[Preview](http://127.0.0.1:4880/) · [Bilingual captures and measurements](p3-03-home/)

P3-04 is the phase-wide shell/home verification, including the remaining device and route coverage. No deployment.
