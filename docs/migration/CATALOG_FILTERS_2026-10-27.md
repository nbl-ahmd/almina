# Catalogue filter refinement — 27 October 2026

The owner requested filters that match the existing Al Mina storefront and chose
a refined inline mobile panel. Preserve the Geist, ink/white/mint/teal identity,
actual catalogue, URL parameters and server commerce authority.

The native price fieldset retained a browser-default square frame because this
project intentionally omits global Preflight. Reset only that fieldset; use two
rounded, labelled numeric fields. Local filter/sort overrides reference the
storefront control-border variables to avoid the older inline slate aliases.
One desktop heading, mint count, a wider rail and secondary category disclosure
replace the competing headings and permanently expanded category list. Mobile
keeps a compact native disclosure, grouped controls and adjacent Apply/Clear.

The small CatalogFilterForm client island rejects reversed bounds using native
localized validation, while retaining GET navigation, query/hidden refinements,
sorting and server rendering. Server validation stays authoritative. Applying
filters closes the mobile disclosure to reveal results; reopening retains values.
Existing tests now explicitly address the outer disclosure and reopen it when
asserting saved field values. Product counts use singular English for one item.

## Verification

- 11 production-build browser cases passed: 360/390/768/1440px, English/Arabic,
  keyboard disclosure, zero fieldset border/padding, correct theme boundary,
  native checkbox serialization, reversed-bound validation/recovery, query/sort/
  hidden-filter preservation, reload, reset, category pagination and empty search.
- Typecheck and lint passed; isolated Next.js 16.4.2 Turbopack foundation build
  passed. The running isolated dev server reports no compilation/runtime errors.
- Impeccable detector returned no findings for the three changed UI components.
- Two bounded visual rounds checked desktop/mobile and Arabic screenshots.
  Finish verdict: matches the established storefront; no material outstanding
  visual or interaction defect in the checked filter path.

Screenshots under `outputs/catalog-filters-2026-10-27/` are synthetic loopback
verification evidence, not production product/catalogue screenshots or shipping
artwork. No new raster assets, dependencies, API/schema, production data or
production configuration changes. This task prepares a reviewable frontend change.
