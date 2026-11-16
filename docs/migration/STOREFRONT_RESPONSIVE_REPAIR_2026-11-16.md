# Storefront responsive repair and desktop adaptation

16 November 2026. Local branch: `codex/storefront-pharmacy-app-reference`. Owner requested responsive behavior to be preserved through visual changes, together with better desktop design. No deployment.

## Observations and changes

Baseline inspection covered English/Arabic home, listing, PDP and cart across 320–1920px. It did not reproduce global horizontal page overflow in that matrix. It did show inefficient desktop hierarchy, weak intermediate sizing and a closed filter panel with its disclosure hidden until hydration. Earlier screenshots/tests at a few fixed widths had not checked live resizing or short landscape purchase controls.

Customer-scoped CSS now provides:

- Desktop home: campaign and compact circular category directory share one row; products enter the initial viewport beneath them. Campaign and category surfaces align, with a full-row campaign fallback when category data is missing. The phone reference sequence stays stacked.
- Tablet: logo/area/cart row followed by full-width search. Department navigation scrolls locally rather than colliding with language controls or wrapping into an oversized navigation block. Campaign and categories use compact intermediate sizing.
- Listing: two phone columns, three columns from 600px and four wide-desktop columns from 1280px. A 240px desktop filter sidebar leaves useful card width. Closed desktop filters retain a visible native disclosure; hydrated responsive state opens them at 1024px.
- Small phones: 12px gutters below 360px and a 156px minimum home-rail card avoid cramped price/action rows. The rail caps phone cards at 220px instead of stretching them across intermediate widths.
- PDP: gallery scales between 320–430px beside the buying section, with 32px separation. Related rows use a single column below 1024px. Short landscape phones place quantity and purchase on one dock row while retaining safe-area behavior.
- Heading/grid sizing supports wrapping and shrinking; footer columns use bounded minimum widths. No blanket page-overflow hiding was introduced.

No route, identifier, data/API/auth, SEO, pricing, inventory, cart or checkout logic changed. Admin/shared/wholesale styling source is unchanged. Existing fonts, coral, dirham prices, card anatomy and actual media remain. DESIGN.md, brief/directions/decision register and sidecar breakpoint metadata now describe the responsive adaptation. Web AGENTS.md requires live-resize regressions for future design changes.

## Verification

Local evidence is under `.verification-results/responsive-repair/`.

- 80 loaded route/locale/viewport cases, widths 320/390/600/767/768/900/1024/1280/1440/1920, with no page overflow or browser errors. Final screenshots show home, listing and PDP. Listing captures wait for the desktop filter's open state; loading boundaries are excluded.
- 18 full-body axe scans: home/listing/PDP at 320/900/1440 in English and Arabic, zero violations.
- Four final tablet-density checks at 768/900px in both locales: no overflow, product rail starts within the first 820px. These verify the final compact tablet adjustment after the screenshot matrix.
- 30 existing compiled browser regressions passed, including admin, catalogue filters, navigation/menu and storefront/cart behavior. Five new responsive cases passed after correcting test selectors. The final five-case run uses the final isolated production build.
- New cases resize the same loaded home/catalogue through breakpoints without reload, check header collisions and grid/filter state, verify portrait/short-landscape purchase-bar geometry, and exercise the closed desktop filter's visible disclosure.
- The initial new test used an ambiguous nested-summary selector; it was narrowed to the panel's direct child. A JavaScript-disabled probe also disabled Next's streamed-boundary reveal, so it was replaced with a focused rendered closed-state regression. This task does not establish full no-JavaScript application support.
- Typecheck, lint and database-disabled isolated foundation production build passed. Next runtime reports no compilation/configuration/session errors. Agent-browser inspected the live home. Static Impeccable regex scan reported no findings; it did not run parsed-page rules. Rendered browser and axe checks provide the separate layout/accessibility evidence.

Preview prices/stock remain sample data. Automated checks are not owner visual acceptance or a complete assistive-technology/real-catalogue audit. No production data access or deployment.
