# Homepage browser-comment refinements — 22 November 2026

Implemented the user's seven annotated browser comments while preserving the Market Green / Coral palette, fonts, reference direction and commerce owners.

| Comment | Result |
| --- | --- |
| Search roundness / button height | 12px outer search radius, inset 44px-high submit button with 8px corners; shared geometry on phone and desktop |
| Category rail | Hidden visual scrollbar with native scrolling retained; compact desktop columns and 64px media with 12px corners |
| Campaign carousel | Native horizontal scroll snapping, swipe/trackpad input, named indicators, Arrow/Home/End keyboard controls and RTL behavior; no autoplay. Existing managed campaigns/banners remain supported. The fallback now includes everyday care, skincare and personal care using existing repository artwork |
| Product cards / currency | Compact phone names and metadata, slightly shallower media, grouped prices and existing 44px purchase targets. Currency marks replace visible AED abbreviations in shared product-price presentation; full localized amounts remain available to screen readers |
| Brand rail | Two rows, compact items and no visible scrollbar; mobile retains horizontal scrolling and desktop uses four columns |
| Sale badges | Small percentage-off badge based on the real displayed saving, rounded down; exact saving remains in the accessible label |
| Benefits strip | Removed component, homepage invocation and obsolete styles |

No packages were installed. No API, database, auth, checkout, stock or payment behavior changed. Currency formatting is presentation only; the underlying amounts and authoritative calculations are unchanged.

## Currency source

The [UAE Design System currency guidance](https://designsystem.gov.ae/docs/patterns/currency-symbol) specifies symbol placement before the number and consistent visual alignment. The [Central Bank guidelines](https://centralbank.ae/media/e4ebcgtb/the_guidelines_for_the_national_currency_symbol_uae_dirham_english.pdf) provide the geometry and usage rules. The local vector at `apps/web/public/currency/dirham.svg` is the matching [Wikimedia symbol asset](https://commons.wikimedia.org/wiki/File:UAE_Dirham_Symbol.svg); the Central Bank's linked SVG ZIP was unavailable when fetched. The shape is used unchanged as a decorative CSS mask, with separate spoken currency text. This avoids relying on device font support for the new character.

## Verification

- Production build, root lint and typecheck pass.
- 20 homepage/carousel, navigation/accessibility and responsive checks pass; 16 additional storefront/Arabic checks pass, including quantity bounds, stock checks and saved-cart behavior.
- The first live capture revealed overflow from absolutely positioned screen-reader currency text in offscreen slides. Making the scroll track its containing block resolved it. Final 495px and 1508px captures report no horizontal overflow or uncaught page errors. Arabic capture also completed. Next.js reports no compilation issues.
- Four focused carousel/homepage checks were repeated after that correction. Screenshots are under `screenshots/homepage-comments/`. Earlier captures with overflow were rejected.

Physical-device and manual assistive-technology verification remain release checks. PR #103 remains open and unmerged; no production deployment occurred.
