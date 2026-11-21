# Customer storefront design retirement — 15 November 2026

Scope: cleanup only on `codex/retire-storefront-design`. No replacement visual
world, palette, font, layout, design guide or token system is approved. The owner
will supply references later. Existing routes and runtime appearance continue
for compatibility; they have no authority over the next redesign. No deployment,
production data access, schema/API/auth/commerce/integration change or dependency
upgrade is included.

## Sources audited

Read root/web AGENTS.md, PRODUCT.md, the storefront guide and generated metadata,
storefront/homepage/checkout briefs, the project profile, related migration
records, root/storefront/admin CSS, layout font loading, Tailwind/PostCSS and
shadcn configuration, components, public/reference assets, retained-brand media,
scripts, package scripts, tests and CI references. General design skills are
installed capabilities, not an Al Mina visual specification, and remain intact.

[Pre-cleanup machine inventory](STOREFRONT_DESIGN_INVENTORY_2026-11-15.json)
records 255 source files, import edges and direct consumers, surface reachability,
197 CSS variable declarations and literal usage locations, 430 CSS class
candidates, class/inline-style source lines, hardcoded visual values
and 40 public/font asset entries with literal consumers. It is historical evidence, not executable
metadata or replacement tokens. It includes the entire frontend to expose
cross-surface dependencies. Local static reachability is conservative: aliases,
dynamic class fragments, runtime media and external packages require manual
review. Empty static consumer lists alone did not authorize deletion.

The import walk reaches 146 source files from storefront entries, 79 from admin,
29 from wholesale and 41 from root entries (sets overlap). Root CSS loads across
all these surfaces regardless of import-graph classification.

## Removed active authority and unused material

- Moved `apps/web/DESIGN.md`, root `.impeccable/design.json`, the homepage and
  checkout surface briefs, and `docs/migration/design-system/STOREFRONT.md` into
  [an explicitly superseded archive](archive/storefront-design-2026-11-15/README.md).
  Archive filenames avoid active DESIGN.md/surface discovery; generated metadata
  is inert `.json.txt`. No active storefront token sidecar remains.
- Removed old visual requirements and reference/competitor/skill bindings from
  `apps/web/AGENTS.md`, `apps/web/PRODUCT.md` and
  `.agents/skills/almina-project-profile/SKILL.md`. Product, architecture,
  accessibility, localization, SEO, commerce and safety requirements remain.
- Removed `apps/web/components.json`: its CLI preset targeted storefront.css and
  could regenerate an old component theme. It has no runtime consumer; TypeScript
  aliases and existing controls remain. Future generator setup requires its own
  approved scope, including any admin use.
- Removed unimported `design-icon.tsx` and `pharmacy-help.tsx`; searches found no
  code/test/script consumers of their modules or exports. Actual navigation/help,
  contact routes and the shared Heroicons-backed icon component remain.
- Removed all 12 unused `public/design/figma` reference assets (11 SVGs and the
  old hero PNG). No current source/test/script references them; the still-used
  `public/design/home` artwork and actual product media are retained.
- Removed unloaded Plus Jakarta Sans font/license and the unused PT Sans TTF.
  PT Sans WOFF2/license, Geist and Outfit remain because they have consumers.
- Removed seven unused global variable declarations: `--color-line`,
  `--color-care-lilac`, `--shadow-card`, `--shadow-nav`, `--space-16`,
  `--text-price`, `--layer-nav`; removed the unused `--color-line` and
  `--shadow-card` storefront overrides. Searched literal CSS variable references,
  Tailwind utility forms and source/packages/tests/scripts before removal.
  No variables were renamed or substituted and no active values were replaced.
- Kept existing responsive/browser regression coverage but removed one assertion
  prescribing the old home category flex/grid composition, the coral test label
  and its old screenshot destination. Responsive checks, product/navigation
  checks and captures remain; the test does not establish a future layout.

Historical mixed migration records retain their stable paths and useful
functional/verification evidence, with prominent superseded storefront-aesthetic
notices. Old setup rollback instructions to restore prior design authority were
retired. The continuation prompts and remaining migration plan no longer mandate
finishing the old palette or converting components to the retired token system. The historical homepage critique is marked superseded. Migration status
now explicitly disclaims all older storefront aesthetic entries. Admin reference
notes no longer point to a current storefront guide.

## Runtime compatibility retained — consumers and replacement boundary

| Source / dependency | Consumers and reason retained |
| --- | --- |
| `src/app/globals.css`: Tailwind theme, semantic aliases, baseline controls, spacing/geometry, notices, skeletons, reduced-motion and Google sign-in rules | Imported by root layout for storefront, admin, wholesale, root errors and global 404. The global not-found page renders Navigation/Footer outside `.storefront-shell`; the footer has its own fallback palette here. Deleting or scoping the whole file would change those screens. |
| `(storefront)/storefront.css`: remaining scoped variables, control overrides, checkout fields/payment states, navigation clearance, focus and motion | Imported by storefront layout and consumed by all customer routes, buttons, forms, galleries, cart, checkout and accounts. It is marked legacy implementation. Must replace consumer groups before removing rules. |
| Hardcoded Tailwind/CSS/inline values in active components | `homepage`, `navigation`, `product-card`, `catalog-list`, `product-information`, `product-options`, `cart-view`, `checkout-form`/`checkout-ui`, account/search/help components and route markup. Exact source locations are inventoried. Functional component APIs and UI behavior remain; these classes are not the next specification. |
| `src/components/ui/*`, `control-styles.ts`, icon, app-link; global Tailwind build/PostCSS | Shared controls/call sites across customer/admin/wholesale. Keep focus, validation, disabled state, accessible names, direction and form semantics. Do not delete the shared build or enable a global reset. |
| `campaign-artwork.tsx` | Imported by customer homepage and admin `campaign-editor.tsx`. Shared artwork/copy preview is still functional. Isolate preview presentation from customer styling before migrating either consumer. |
| Delivery map/CSS, admin delivery-place search/controls and order monitor | Reachable from both customer and admin graphs. Location selection, suggestions and order progress are behavior, not disposable design decoration. |
| `src/app/fonts/Geist-Variable.ttf` and license | Loaded separately by customer, admin and wholesale layouts. Retain shared asset until all consumers migrate; its current use does not select the next font. |
| PT Sans WOFF2/license; Outfit WOFF2/license | PT Sans is the root/base font including error/admin fallback. Outfit is loaded by admin growth preview. Neither is unused merely because customer font loading changed. |
| `public/design/home/*.webp` | Home campaign/editorial modules, `storefront-intro` (catalogue, categories, brands, collections, health guides, about/contact/RAK and growth landing), `category-tile`, empty cart. These are legacy authored artwork; migrate consumers before removal. No new artwork was made. |
| Logo, favicons, manifests, product placeholder and retained-brand inventory/media | Branding identifiers, install metadata, missing-photo fallback and production-compatible media references. Root/page metadata, service worker and external persisted references must be audited before any removal. No media migration/deletion is authorized here. |
| Admin `admin.css`, DESIGN.md, `.impeccable/design.json`, admin surface brief and admin primitives | Separate admin authority retained. Root CSS and global shared controls still underpin it. No admin palette/token/layout edits. |
| `packages/ui/src/index.tsx` | Server-compatible PageContent primitive; not a storefront theme generator. Preserved. |

Package consumer separation (no dependency changes): `gsap`/`@gsap/react` are
still used by storefront editorial motion; Heroicons, Radix and Tailwind underpin
multiple surfaces; Leaflet/Geoman support location UI in storefront/admin/wholesale.
Sonner and GrapesJS/MJML have admin consumers. Next/React and the contracts/config
packages remain architecture dependencies. The inventory includes external import
consumers so the next phase can isolate packages without treating the entire web
workspace as storefront-only.

No actively consumed shared style was removed. Shared consumers were mapped and
existing `.storefront-shell`/`.admin-app` boundaries retained; there was no need
to invent a replacement shared layer for the consumer-free deletions. Temporary
legacy code is explicitly allowed to keep the application working in this phase.

## Regeneration and remaining influence

No project package script or CI job regenerates the storefront palette. The
removed shadcn config was an actionable generator binding. Generic design-skill
scripts still know how to document/extract/design tokens; they are general-purpose
capabilities, not deleted. The project profile/web instructions now prohibit
reconstructing the retired system from current code or historical captures.
At this initial cleanup, `storefront-design-fixture.mjs` and `verify-storefront-design.mjs` were retained for synthetic browser QA. [P6-01](../../apps/web/docs/design/implementation-evidence/p6-01-retirement.md) later retired both scripts. Synthetic fixture colours
represent sample packs, not a selected storefront palette.

Old artwork, runtime CSS/classes/fonts, screenshots in `.impeccable/review` and
`apps/web/.impeccable/review`, historical migration text, ignored `outputs/`
research and inert archived metadata can still bias a future session. They are
legacy evidence only, never future visual authority. Admin references remain
admin-only. A running session may cache the old project-skill catalogue description;
the on-disk project profile and scoped instructions now override that wording. External Figma files were not modified or deleted. No general-purpose
skill package was removed.

## Future reference and specification locations

Owner-supplied evidence goes in `docs/design/storefront/references/` with source,
date, permission and intended scope. A Figma link should identify its file/frame;
no old frame or competitor brief is selected by default. Only the later approved
design phase may create `apps/web/DESIGN.md`, scoped storefront metadata and new
implementation tokens. `apps/web/PRODUCT.md` continues to hold product facts,
function and safeguards. This report is a cleanup inventory, not a visual guide.

## Verification

Passed on isolated local fixtures:

- `npm run typecheck` and `npm run lint`.
- `npm run build:foundation` with a clean environment, database access disabled,
  loopback API origins and isolated `design-retirement` build output. Installed
  Next.js 16.4.2 and its bundled CSS documentation were checked; no upgrade.
- 22 existing focused tests across storefront, i18n, stylesheet policy,
  Next lint and sign-in surface behavior.
- Both existing `redesign.spec.ts` responsive cases (390/1280px), run against the
  loopback storefront with a temporary local configuration.
- 64 direct browser cases: home, listing, PDP, cart, checkout, categories,
  contact and global 404 at 360/390/768/1440px, English and Arabic. No horizontal
  overflow, missing main heading, broken loaded image or page error. Customer
  shell RTL/LTR was asserted; the global 404 retains its existing root behavior.
  Added a synthetic item to cart and verified its server-returned unit price and
  persistence after direct navigation/reload.
- 16 admin browser cases: dashboard, product list, orders and product edit at
  360/390/768/1440px, plus synthetic login. No horizontal overflow, page errors or
  unexpected request failures. Login was also exercised through the browser UI.
- Inspected captures of customer home/listing/PDP and Arabic listing, plus admin
  mobile dashboard and desktop product edit. Existing admin CSS, active guide,
  metadata and surface brief match HEAD byte-for-byte.
- Next dev `/_next/mcp` tools/routes were inspected; compilation issues and
  config/session errors returned empty lists after storefront/admin checks.
- `git diff --check` passed. Final source scope reviewed: no routes, models,
  API/auth/checkout calculations, locale logic or integrations changed; no
  credentials or unrelated generated files added.

Local evidence: `.verification-results/design-retirement/` contains build,
unit/typecheck/lint logs, existing E2E output, storefront/admin result JSON,
MCP responses and captures. These are ignored verification artifacts, not design
reference material. Temporary drivers/configuration are not production code.

Limits and tooling notes: the older `verify-storefront-browser.mjs` stops at its
stale “Featured products” heading. Current-label browser checks and the existing
responsive tests passed instead. An initial temporary driver also used the stale
exact Add-to-cart accessible name; corrected checks passed. Network-idle waits
were unsuitable for some development sessions; the completed direct checks wait
for document/heading/loaded fonts instead. Development logs include request-abort
messages during navigation, image-loading advisories and expected unavailable
fixture requests; final Next diagnostics and completed browser page-error checks
are clean. Admin synthetic fixtures expose reporting/reconnect and channel-price
loading states; these checks do not establish real reporting/provider readiness
or full admin editing acceptance. No production data, real payments, providers,
physical-device acceptance or full commerce mutation suite was exercised. This
cleanup changes no such behavior and makes no production-readiness claim.

No new visual direction or design specification was generated. No deployment.
