# P3-04 shell and home verification

The public shell and home were checked on the selected storefront branch. English and Arabic captures show the full-width campaign, separate categories, two-column phone grid, five-column wide grid and current navigation. The viewport matrix covers 320, 360, 390, 667 short landscape, 768, 1100 and 1440px. All sampled document widths fit. A separate CSS zoom check at 200% in a 640px viewport also fit the header, home, shelf and footer in both engines. These are viewport and CSS emulations.

Three repeated home → category → browser Back → reload cycles per locale and engine returned the finished shelf. The earlier long-session loading issue was not reproduced by these twelve bounded cycles. The compiled checks also verify direct home, search, category and product reloads, real search GET parameters, browser Back from a product, and result scroll restoration within 40px. Native footer links remain reachable above the bottom navigation in both directions at 667×375px.

## Corrections and style ownership

- Missing routes and the customer route error boundary show localized Arabic recovery copy. A direct missing product and a root missing URL keep HTTP 404. Arabic retry recovers after the catalogue fixture is restored. Saved/account copy remains part of P5.
- The delivery dialog now records whether the header or the delivery prompt opened it and returns focus there after Escape, close or save. This fixes the WebKit failure observed after pointer opening. Category popovers keep the accepted header ancestry, direction, white surface and keyboard focus return. An open desktop category popover closes when resizing to phone width.
- Resolved conflicting responsive bindings by limiting the old header grid, placement and footer column rules to the compatibility shell. The accepted mobile/header/footer modules now own the corresponding styles for opted-in pages. Removed the unused hidden home section-heading paragraph rule and the displaced two-column mobile footer declaration. Shared section, category, catalogue, PDP, checkout and wholesale bindings remain for their current consumers. Root 404 continues to use its compatibility Navigation/Footer.
- Updated the cart regression to assert the accepted task layout after removing the final item. Continue shopping goes to products and restores browse navigation.

## Verification

The isolated Next production build, repository/workspace typecheck and lint passed. The 40-case compiled Chromium suite covers shell/home, transitions, direct reloads, native retry, cart/stock, checkout quote, admin and wholesale/root fallback scope. The 12-case compiled WebKit subset covers home, desktop chrome, restoration and recovery. The live Chromium Next/browser probe reported no browser, Next config, session or compilation errors.

The raw live WebKit cycle record includes a saved-account request diagnostic during rapid document navigation. Waiting for that guest request to settle before deliberate document transitions allowed the compiled Back/scroll test to pass without relaxing its browser-error assertion. No saved-account service change was made. The first Chromium run also exposed an outdated empty-cart test expectation, corrected as described above.

No production data, orders or deployment. Physical devices, native keyboard and safe-area behavior, screen readers, provider and release verification remain open. The verified browser Back behavior is distinct from the existing PDP's in-page category Back link, which belongs to Phase 4.

[Local preview](http://127.0.0.1:4880/) · [Captures, matrix and zoom measurements](p3-04-shell-home/)
