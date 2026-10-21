# Arabic shopping interface continuation — 20 October 2026

Continues the Phase 4 next-slice order in `GROWTH_COMPLETION_2026-10-19.md`.
This is local code and verification on `codex/arabic-phase-four`; no production
publication, provider activation, database writes or deployment occurred.

## Implemented in order

1. **Cart-adjacent panels:** free-delivery progress, its accessible name and explanatory
   copy; reminder signup labels, choices, consent, interpolation, statuses and sign-in
   link. Existing consent, eligibility, request payloads and disabled-provider behavior
   remain unchanged.
2. **Storefront chrome:** first-visit delivery-area prompt, manual/GPS dialog and status
   messages; search placeholder, combobox/suggestion/history labels; header cart names.
3. **Catalogue, PDP and home:** listing filters/results/pagination/empty states; product
   card availability/photo/options/price labels; add-to-cart/quantity/status controls;
   gallery, variant and specification labels; saved-product and purchase-review controls;
   built-in homepage campaign/section labels, recently-viewed rail and carousel controls.
   Shared server components read the locale; existing client controls receive a locale
   prop. No global client provider or translation dependency was added.
4. **Server-returned interface copy:** cart load, unavailable product, stock and closed
   store responses; Arabic emirate display labels in area selection, checkout and free
   delivery qualification. Canonical option values, storage and API requests remain
   unchanged. Cart/checkout titles use the locale; robots/canonical policies are preserved.

Arabic hero copy originally overlapped the fixed-position product artwork under RTL.
The artwork keeps its original placement while its text region has the correct reading
direction. Shared page-intro artwork uses the same treatment. Directional arrows mirror
only under RTL. Arabic has an explicit system sans-serif font fallback; English retains
Outfit and its prior visual formatting.

`i18n.ts` continues the named cart/checkout dictionary. `i18n-storefront.ts` is an explicit
whitelist of built-in interface labels keyed by their existing English source. English
returns its exact input, including intentional spaces. Unknown values remain untouched;
this is not a machine translator for product names, pack facts or clinical content.

## Verification

| Completed surface | Isolated foundation build | Full `AL_MINA_ISOLATED_BUILD=1 npm run test:e2e:smoke` |
| --- | --- | --- |
| Cart-adjacent panels | Pass | 91 passed |
| Delivery/search/cart chrome | Pass | 93 passed |
| Catalogue/PDP/home, after RTL visual correction | Pass | 96 passed |
| Server copy / emirate labels / final integration | Pass | 98 passed |

Each build used `APP_ENV=development DATABASE_MODE=disabled`, a loopback `WEB_ORIGIN`,
`NEXT_TELEMETRY_DISABLED=1` and `AL_MINA_ISOLATED_BUILD=1`. The browser harness used
matching isolated build output and synthetic/disposable catalogue/order fixtures.

- Workspace typecheck and repository lint pass.
- All 165 unit tests pass. Translation tests cover identical English passthrough,
  placeholder parity, staff-content passthrough, money display and all seven emirates.
- Compared all 191 pre-existing English dictionary entries with the merged baseline:
  byte-identical. Existing English browser regressions continue to run in every surface.
- New browser cases cover English/Arabic free-delivery progress; canonical saved-area
  persistence across reload; Arabic search filters and purchase controls; unchanged
  product identity/cart quantities; carousel navigation; stock/closed-store rejection;
  and Arabic checkout with canonical emirate values.
- Running Next.js 16.3.8 Turbopack was checked through `/_next/mcp` and an isolated
  agent-browser session. No compilation, configuration or session errors were reported.
  Mobile screenshots and overflow checks covered home, catalogue and PDP; screenshots
  are in ignored `outputs/arabic-phase-four-2026-10-20/`.
- One preliminary unit run overlapped the browser harness and encountered the fixture
  ownership test's occupied-port check. Rerunning unit tests sequentially, with browser
  fixture ports free, passed. One preliminary catalogue browser run was stopped after
  the visual RTL overlap was found; the corrected isolated build and full run passed.
  Neither interrupted/conflicting attempt is counted as passing verification.

## Remaining review boundaries

- A native Arabic speaker and the pharmacy must approve interface wording before it is
  treated as approved publication copy. No native approval is claimed.
- Cart/header counts retain the existing one/other fallback. Arabic dual/few/many wording
  needs the documented native grammar/plural review; this is not certified as complete.
- Product names, category labels, pack/variant values, clinical descriptions/directions/
  warnings, customer review bodies, staff editorial text and uploaded banner artwork
  remain their original content. Staff-authored Arabic content uses the existing CMS.
- Account dashboard and admin localization are outside this shopping/checkout pass.
- Reminder email delivery and provider-backed account activation were not enabled or
  tested against customer accounts. No customer message or real order was sent.

## Compatibility and rollback

No prices, inventory, identifier/URL resolution, discount/VAT/delivery arithmetic,
checkout idempotency or order snapshots changed. Money localization affects display
only; English retains exact `AED 0.00` output. Serviceability and reward policies are
unchanged. Rollback is a code rollback with no data/index rollback needed.
