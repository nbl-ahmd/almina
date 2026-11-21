---
target: Al Mina public storefront and shared shopping controls
total_score: 28
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: "file:/Users/administrator/Nabeel/dev/almina-storefront-p3/apps/web/src/app/(storefront)/page.tsx"
target_fingerprint: "sha256:e6b67757e20ee113170ce1f81f5ff865fdb8dafc07becedfb4b0d2aee4432efd"
target_path: /Users/administrator/Nabeel/dev/almina-storefront-p3/apps/web/src/app/(storefront)/page.tsx
timestamp: 2026-11-19T19-33-39Z
slug: apps-web-src-app-storefront-page-tsx
---
# Storefront critique

Independent visual and browser assessments of the local storefront before the retail refinement. The visual assessor scored the original experience 28/40. Nielsen scores in order were 3/3/3/2/3/3/3/2/3/3. No blocking issue was identified.

The shopping structure had a clear search entry point, real pack and stock information, and an accessible purchase dock. The design fell short on control hierarchy. Long utility buttons, pink quick-add surfaces, varied field outlines and repeated mint blocks drew attention with similar weight. The default campaign also featured an oversized embedded call to action. The mobile references use a quieter utilitarian shell and product-centered media. The desktop reference uses images and small controls to organize comparison.

1. **P1. Phone support and navigation obscured shopping controls.** The first product row fell under the bottom navigation. The floating WhatsApp target overlapped a card and intercepted part of the footer’s Back to top link. Tighten the mobile rhythm and make room for shopping controls.
2. **P1. Forms looked inconsistent across surfaces.** Delivery controls, filters and checkout used several resting edges and more than one button silhouette. Put field, focus, invalid and disabled styling under the storefront boundary and use section layout to group forms.
3. **P2. Product detail called too much attention to utility controls.** Keep the primary purchase action coral. Compact the desktop action, present delivery and sharing as utilities, and give catalogue quick add a distinct role.
4. **P2. The homepage felt like a campaign template.** Lead with product still life already approved for the storefront and let the header search stay clear. The visual pass identified one inconsistent incoming product photo. Replacing product photography needs validated pack artwork.

The mechanical scanner found one advisory against a literal suggestion-label size. Browser flags on category gaps and live-region clipping were verified as intentional. Public preview checkout and account were in recovery states. Enabled checkout and form validation require synthetic browser tests.
