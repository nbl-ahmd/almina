# P5-04 customer and information surfaces

Implemented on `codex/storefront-pharmacy-app-reference` from `8471a4b` on 19 November 2026. Route dispositions follow the [P0 inventory](p0-03-routes-states-tests.md).

| P0 route | Disposition |
| --- | --- |
| R01–R03 home, catalogue, search, offers, category detail and product detail | Retain the P3–P4 purchase and discovery implementations. Recently viewed stays on the existing homepage rail with its on-device history and clear action. The category directory now uses the shared information layout, compact linked category tiles and the existing shortcuts. |
| R04 collections | Use the information layout for the published collection introduction, available products and refresh state. Retain canonical, breadcrumb, ItemList and empty noindex behavior. |
| R05–R06 brands, guides, shop, routines, campaign details and explicit Arabic editorial routes | Brand and guide directories have bounded empty states. Published detail pages use a shared reader layout, preserved content, product lists, and conditional terms, bundles and disclosures. Explicit editorial locale, publication gates, canonical and actual alternate languages stay in place. |
| R07–R09 cart, checkout and hosted payment returns | Retain the verified P5-01–P5-03 implementations and feature gates. |
| R10 account | Apply the accepted system to retail sign-in, loading, failure and the signed-in dashboard. Purchases and eligible reorder lead address book, preferences, existing rewards and reminders. Current sign-in flows, account status, private storage boundaries, newsletter choices and server-checked reorder logic remain in place. Historical totals use the dirham component. |
| R11 saved and unsubscribe | Use responsive saved cards, localized loading, empty and retry states, and existing guest/account sync. The list waits for session resolution and distinguishes a failed product fetch from an empty list. Ability to remove, quick-add and paginate survives. Unsubscribe uses the same layout and keeps its opaque token check and no-referrer metadata. |
| R12 about, contact, local pharmacy, shipping, returns, privacy and terms | Use bordered information panels or a bounded reading layout. About and contact show bilingual interface copy. Existing business contacts, local directory fallback, delivery links and the original policy copy remain. In Arabic mode, English-only policies are identified in Arabic and the published text is tagged English and left-to-right. |
| R13–R15 service status, map and legacy product links | Keep the service status probe and noindex with a compact localized screen. Map and product aliases retain their redirect and query behavior. |
| R16–R18 wholesale, admin and recovery | Retail styling opts in by route. Wholesale still uses its independent invitation flow and existing shared sign-in implementation. Admin, route boundaries and their remaining verification stay in P5-05 and P6. |

## Preview evidence

| Surface | Captures |
| --- | --- |
| Saved products | [Arabic phone](p5-04-information/ar-saved-390.png), [English desktop](p5-04-information/en-saved-1440.png) |
| Contact | [Arabic phone](p5-04-information/ar-contact-390.png), [English desktop](p5-04-information/en-contact-1440.png) |
| Account | [Phone connection failure](p5-04-information/en-account-390.png), [phone sign-in](p5-04-information/en-sign-in-390.png), [signed-in desktop](p5-04-information/en-account-signed-in.png) |
| Responsive evidence | [Two browser engines × two locales × five routes × five viewports](p5-04-information/matrix.json) |

The live local matrix covered 100 measurements from 320px to 1440px, including short landscape. No document overflow was observed. Ten scoped Chromium axe audits on the sampled states returned zero violations. The live design reference returns an account connection failure because the local catalog preview lacks the customer gateway. The disposable commerce fixture separately checks signed-out, signed-in, session and form states.

## Regression disposition

The final isolated build, lint and typecheck passed, alongside 42 unit checks, 37 focused Chromium cases and 7 focused WebKit cases. The changed visual source reported zero mechanical design findings. Next reported zero compilation and session errors on the local preview.

The wider initial Chromium selection passed 37 of 46 cases. Nine failures fall into five assertion groups. A representative case from each group reproduced against the pre-P5-04 build. The cart task header and empty-cart title expectations predate P3 and P5-01. The home carousel and staff-managed home placement cases expect campaigns that are absent on those fixture home pages. The compatibility-worker assertion expects the older orders destination while the shipped worker opens admin notifications. The current suite keeps the maintained homepage and route contracts in coverage. The representative failures remain recorded for P5-05.

No published programme terms, editorial health claims, delivery promises or catalogue facts were added. No production data, provider or deployment operation occurred.
