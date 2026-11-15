# Search-led customer storefront replacement — 15 November 2026

Branch: `codex/storefront-identity-overhaul`. Based on the owner-authored brief,
annotated references and forward DESIGN.md, with implementation explicitly
requested after documentation. This is a local coded candidate for owner review,
not production release acceptance. No deployment or production database access.

## Implemented changes

- Replaced the rejected customer token source with one scoped semantic palette,
  exact primary coral `#FF5A5F`, charcoal reading text, clear white product grounds,
  restrained aqua, separate status colours, compact geometry and explicit states.
  Removed customer `care-*` utility bindings instead of retaining four pastel
  families under compatibility aliases. Shared global/admin/wholesale tokens stay
  intact for their consumers.
- Replaced customer typography with self-hosted Figtree for English and Alexandria
  for Arabic. Retained OFL licences. The subset WOFF2 files are approximately 23 KiB
  and 89 KiB; old customer Manrope/Noto assets were removed after searches found no
  remaining runtime consumers. Shared Geist/PT Sans/Outfit assets are untouched.
- Rebuilt the header around search, address context and cart. Search submit uses
  coral with dark labels; keyboard suggestions/query URLs keep existing behaviour.
  Department links reflow on tablet rather than collide with the language switch.
- Moved compact category controls before merchandising, using actual category or
  matching product photography when present and consistent icons otherwise.
- Replaced the pale campaign with a coral/photography composition and a separate
  desktop browse index. Existing managed artwork and banners retain their content
  contracts. No screenshot crops, generated pack shots or unsupported offers.
- Shortened home to useful product comparison, two department destinations, actual
  brands, managed campaigns and existing recent history. Removed repeated product
  spotlight, duplicate compact shelves and redundant contact hero blocks. Existing
  collection/budget/contact destinations remain reachable through navigation.
- Restyled listing/filter/results and factual product cards. Added no ratings,
  discounts or availability claims. Option/save/add APIs and server checks remain.
- Preserved gallery-first PDP while flattening reading/purchase presentation;
  removed the outer nested product-information card. Mobile purchase controls sit
  above navigation without overlap in the checked viewport. Footer is a compact
  contact/destination index instead of another marketing introduction.

## Behaviour and ownership boundaries

No backend/API/model/auth logic, server pricing, stock handling, checkout intent,
order numbering or provider contract changed. Customer class bindings and layout
changed; shared component interfaces remain. Admin and wholesale source styling
was not edited. Current card/add state feedback, cart persistence, native GET
filters, route redirects, metadata, locale and feature gates remain operational.

The isolated loopback preview at 4860 uses the existing reference fixture at 4861,
with exact-pack local reference photos and visibly labelled synthetic prices and
stock. No production media association, customer record, order or charge changed.
The fixture has no DB and rejects writes outside its existing local test handlers.

Root globals still support customer fallback controls as well as admin/wholesale;
they must not be deleted wholesale. Scoped checkout layout and state rules remain
functional compatibility, including small inherited blue confirmation-mark and
order-panel exceptions. These are not a second active storefront token system or
permission to reuse the old identity. Further replacement of those exceptions
requires appropriate checkout acceptance, not an unreviewed commerce refactor.

## Verification

Evidence: `.verification-results/identity-overhaul/` (ignored local artifacts).

- Installed Next.js 16.4.2 CSS/font docs consulted; no framework/dependency upgrade.
  UI/UX Pro Max focused UX search matched focus-obscuring guidance, and a narrowed
  Next.js search matched server-component guidance. No second palette generator
  or separate MASTER.md system was created.
- Typecheck and lint passed. Isolated production foundation build passed; final
  build includes the reviewed tablet navigation correction.
- 33 focused unit tests passed: storefront, localization, styling ownership,
  product families and search.
- 57 existing compiled browser cases passed across storefront, responsive routes,
  native filters, shared controls, search/navigation, checkout and admin. Covers
  current prices/stock, reload persistence, changed-price review, uncertain-response
  retry/idempotency, forged totals/cross-origin rejection and GPS/manual recovery.
  All mutation tests used disposable local fixtures, not production systems.
- After the final tablet fix,8 compiled navigation/menu cases passed again against
  the final build. No test expectations were weakened or production tests added.
- 42 direct route/locale/viewport cases passed after correction, covering home,
  listing, PDP, cart, checkout, account and 404 at 360/390/768/1440 English and
  390/1440 Arabic. No horizontal overflow, broken loaded images or page errors.
  Six axe scans of home/listing/PDP at 390/1440 reported zero violations.
- Targeted EN/AR 760/768/820/1024 checks found no locale/nav overlap or overflow.
  Coral quick-add style, synthetic notice, cart price/persistence and separated
  mobile purchase/navigation geometry were checked directly.
- Next dev MCP compilation issues, config errors and session errors were empty.
  Real browser view and server diagnostics were both used; no production
  diagnostics were enabled. The mechanical detector ran once and returned `[]`.

The first pass exposed duplicate landmark labels and a shared outline utility
winning over coral card actions; both were corrected. Independent review then
identified tablet navigation crowding, corrected with wrapping and rechecked in
both languages. A temporary verification assertion expected the original font
name in computed CSS; Next exposes the local-font alias instead. Verification
was corrected to check the loaded alias, without renaming application fonts.

## Review and documentation

Independent finish review covered the 13 supplied EN/AR core captures including
768 px tablet. The genuine installed 4.3.1 concept roll emits an 8-character key;
the reviewer contract referenced a newer 16-character format. Raw key was removed
from the surface contract, preserving its verifiable roll-file path. No fabricated
key or additional direction selection was introduced. Final review disposition is **fix** solely because the installed tool emits an
eight-character key while the reviewer requires a tool-issued 16-hex reference.
The reviewer verified evidence integrity and the resolved tablet correction and
reported no further UI repair for its scored findings. A locally content-addressed
reference was tested transparently, then removed because it was not tool-issued.
No fabricated tool key is committed. This format incompatibility is documented
open rather than represented as a review pass. Implemented DESIGN.md and scoped
metadata were completed by the documenter, with exact source colours, typography,
responsive rules, states and 9 self-contained component previews. Schema/token
references and narrative parity were validated. These records describe the local
candidate without claiming owner acceptance.

The owner has not yet reviewed this coded candidate. Physical devices, live full-
catalogue parity, native Arabic/pharmacy editorial approval, real provider/payment
acceptance, performance measurement and production rollout remain separate work.
Automated axe results and screenshot review are bounded evidence, not universal
accessibility or production certification.
