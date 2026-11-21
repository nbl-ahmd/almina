# P0-02 — style ownership and migration inventory

17 November 2026; source `d6fd0f5`. Inventory only: no theme, component, asset or behaviour changed. See [phase evidence](phase-0.md), [progress](../implementation-progress.md) and [complete token/component/asset index](p0-02-style-consumers.json).

## Method and limits

Examined 264 TS/TSX/CSS files under apps/web/src and packages/ui/src. TypeScript AST imports/dynamic imports and module resolution yielded no unresolved relative code imports. Surface reachability seeds all TS entry files within each route group plus root layout: storefront 153 files, admin 82, wholesale 35. These are inclusive import closures, including type imports, not bundles, visible-component counts or a route/state audit. Root not-found is inspected separately; CSS @import dependencies are expanded below.

PostCSS source parsing records eight local CSS modules, their layers/selectors/custom properties; lexical scans map all 40 customer token declarations to direct variable and colour-utility reference files/lines. Global/admin references to the same token name do **not** mean those consumers inherit customer values. Scope, component ancestry and portals determine actual values. Utility/type references, source comments and generated CSS can retain unused names; no-match is never sufficient removal proof.

Compiled homepage CSS was fetched from two loopback stylesheet links for the existing preview. This confirms emitted rules/layers, not computed browser states or interaction success. No cart mutation, login, order or provider call. Raw audit script, full graph and emitted-rule extracts remain under ignored `.verification-results/storefront-replacement/phase-0/p0-02-*`; durable index and findings are tracked here.

## Dependency map

```text
root app/layout.tsx → globals.css + PT Sans
  storefront/layout.tsx → storefront.css → tokens + controls + cart + checkout
    → Figtree/Alexandria + customer UI + managed CampaignArtwork
  wholesale/wholesale/layout.tsx → SAME storefront.css + SAME .storefront-shell
    → Geist (Arabic inline fallback) + shared customer UI controls
  root not-found.tsx → SAME storefront.css + SAME .storefront-shell
    → customer Navigation/Footer + Figtree/Alexandria
  admin/admin/layout.tsx → admin.css + Geist + inherited globals.css
    → campaign editor → shared CampaignArtwork + Outfit preview
    → delivery-map.tsx → local map CSS + Leaflet/Geoman vendor CSS
```

**Important correction to earlier independence assumptions:** wholesale does not currently have an independent stylesheet/theme boundary. Its layout directly imports the full storefront CSS and matches the customer token/control/main selectors. Merely leaving wholesale source untouched does not preserve its appearance when customer tokens change.

## Ownership / migration / safe-removal matrix

All paths below are relative to apps/web unless labelled otherwise. Ownership describes actual consumers, not file names.

| ID | Definition / current consumers | Class | Migration destination and task | Safe-removal / retention condition |
| --- | --- | --- | --- | --- |
| O-A | src/app/globals.css; imported by root layout, inherited by every route. Theme/base/component/utilities order, old root palette, native forms, headings, notices, galleries and layout helpers. | Shared root compatibility | P2-01/P2-02 map customer semantic values while preserving root/admin/wholesale defaults; P6-01 consumer audit. | Do not delete root rules/palette because labelled legacy. Migrate every effective consumer, including missing-page/native controls, then verify all surfaces/route transitions. |
| O-B | src/app/(storefront)/storefront-tokens.css; CSS-imported by storefront.css. .storefront-shell/.storefront-footer apply in storefront, wholesale and root 404. | Actually shared storefront/wholesale/error | P2-01/P2-02 accepted customer system plus explicit wholesale/error isolation plan (NEW-001/002). | Preserve wholesale's current effective values until its independent boundary/compatibility mapping is verified. No wholesale restyle as a side effect. |
| O-C | storefront.css; imported by storefront layout, wholesale layout and root not-found. Imports tokens, controls, cart and checkout; mixes scoped and unqualified classes. | Shared entry, predominantly customer rules | P2-02 layer/scope contract; P3/P4 owned route migrations; NEW-001/002. | Disentangle importer/class consumers first. Do not delete/scope/rename a class without checking the three entries and client navigation retention. |
| O-D | storefront-controls.css; .button/.checkout-link/default+accent/search/cart/quantity/save geometry and states. Shared Button consumers include customer and wholesale. | Shared effective customer/wholesale controls | P2-02/P2-03 component-owned semantic variants/states. | Resolve added-state precedence and compiled foreground mapping; verify pending/disabled/invalid/focus/added/saved as well as idle. Preserve wholesale outcomes. |
| O-E | storefront-cart.css; cart-view, cart page, checkout-disabled fallback, recommendations; inherits global .status/utility primitives. | Customer-only component selectors, shared imported file | P5-01 compact rows/summary/dock, P6-01 cleanup. | Trace fallback/cart recommendations and fixed-nav clearance, estimate labels and quantities before removing old rules. No monetary-authority changes. |
| O-F | storefront-checkout.css; checkout-form/progress/result/docks, stripe return and feature-gated routes. Unqualified .checkout-* plus scoped variants. | Customer route compatibility | P2-03 map state roles; P5-02 presentation migration; P5-03 regressions. | Compare enabled/disabled/loading/quote-change/retry/payment/result states, consolidate duplicated declarations, retain functional animation/keyboard/visibility rules until verified. |
| O-G | src/components/ui/* utility primitives: Button, control-styles, Input/Field/Label/NativeSelect/Separator shared by customer and wholesale; Checkbox/Textarea customer-reachable in current graph. | Shared storefront/wholesale APIs | P2-02/P2-03 adapt semantic variables/variants; no blanket component redesign outside accepted scope. | Button has 14 direct importers (listed in JSON); current graph has no admin consumer. Preserve API/caller state expectations; recheck indirect/new consumers rather than assuming admin usage. |
| O-H | src/app/(admin)/admin/admin.css imported by admin layout; .admin-app variables and console rules, including some unlayered tails. | Admin-only specification | Retain; P2/P6 only verify boundary and shared/global impact. | Do not clean or restyle this system as storefront work. Scope/comment alone is not proof against global/vendor/route CSS effects. |
| O-I | src/components/campaign-artwork.tsx used by homepage and admin/campaign-editor; admin preview inline blue palette in campaign-editor plus Outfit class from protected/growth/page.tsx. | Shared storefront/admin production preview | P2-03/P3-03 explicit preview appearance policy, NEW-003; protect staff preview contract. | Keep artwork/copy/data/asset validation working in both consumers. Do not remove Outfit or replace preview styling because current customer uses Figtree. Decide/document whether preview follows accepted customer look without restyling admin chrome. |
| O-J | src/components/delivery-map.tsx + delivery-map.css + Leaflet/Geoman CSS; admin delivery-zone editor via dynamic import. | Admin/vendor map | Retain under current scope; P6 shared/vendor boundary checks. | Map CSS includes hard-coded neutral/blue values and native modal workspace. They are not unused customer tokens. No vendor/global reset removal without map interaction verification. |
| O-K | Root not-found.tsx imports customer Navigation/Footer, fonts, stylesheet and .storefront-shell outside the route group. | Customer-looking shared root error entry | P2-02/P3-04 explicit root error contract, NEW-002. | Preserve unknown URL/error rendering and no-index/navigation/accessibility. Test direct unknown route and customer/admin/wholesale transitions before root asset/style removal. |
| O-L | packages/ui/src/index.tsx PageContent export; no imports found in inspected app/package code. | Shared foundation export, currently unconsumed | Keep unless a separately justified package cleanup; P6 may recheck. | Zero imports is not justification to remove foundation/public API during this focused task. |

### Layer and alias findings

| Finding | Definitions/consumer evidence | Disposition |
| --- | --- | --- |
| Added-state colour overridden | cart-controls.tsx supplies data-added background-accent/border-teal classes; emitted CSS puts them in utilities. storefront-controls.css assigns brand background/border to matching accent buttons outside any layer. | Confirmed source **and emitted-rule** precedence. P2-02 must give base/variant/states coherent ownership; verify actual computed transitions later. No claim that add/cart persistence failed. |
| Primary foreground contract trap | globals.css @theme inline maps primary-foreground to literal white; customer tokens redefine similarly named variable as ink. | No current source consumer or emitted .text-primary-foreground rule found in fetched homepage CSS. Dormant contract risk, not a current observed white/coral contrast failure. Verify generated aliases when establishing P2 system. |
| Nominal spacing/width under-adopted | Customer --space-* and --content-width references found in inherited globals.css, not new customer CSS modules; main/container still hard-code 1280px. | These variables are **not unused overall**. Map inherited native/layout consumers before retirement; introduce accepted density roles later. |
| Accumulated checkout treatments | checkout CSS early accent/teal confirmation becomes hard-coded blue later; input 9px then 12px and selected-payment styling is superseded. | Preserve task behaviour while consolidating in P2/P5, not blind last-rule deletion. |
| Broad selectors across entries | Customer CSS imports through wholesale/root 404; header-content/product-stock/cart-layout/currency-amount/menu-group and checkout classes include unqualified rules. | Scope/layer inventory risk, not proof of observed admin breakage. Verify persistent client-navigation CSS and portals before removal. |

Local CSS inventory (source selector/declaration counts, **not defect counts**): globals 85 rules / 51 custom-property declarations; storefront 303 rules (283 outside layer); controls 30, cart 42, checkout 140 all outside layer; customer tokens 40 declarations; admin 877 rules (34 outside layer) / 71 declarations; delivery map 43 outside layer. Counts omit keyframe-step rules and include media variants. Do not “fix” admin or flatten legitimate responsive rules to reduce these counts.

## Token reference groups

The [JSON index](p0-02-style-consumers.json) enumerates every customer token, value, definition line and matching direct/utility consumer files/lines. These are existing values for migration, not replacement proposals.

| Roles / names | Effective consumers | Handling |
| --- | --- | --- |
| brand, brand-hover, ink, muted, page, surface, subtle, border, accent, teal, ocean | Global rules, customer CSS and utility controls; wholesale inherits customer values; admin has its own scope values for many same names. | Map by semantic role and actual scope; never global search/replace hue names. |
| sale/sale-surface, warning/warning-surface | Notices, reviews/forms, price and error/status surfaces, inherited root helpers; some wholesale utilities. | Separate sale/error/selected/saved meaning; preserve truthful functional status and contrast. |
| success/success-surface, ad-surface | Stock badge and photographic campaign customer rules. | Customer candidates to migrate after P1 acceptance. Do not infer popularity, offers or fulfilment promises from colours. |
| focus, control-border/hover/disabled | Root/native controls, new customer/checkout controls and utility primitives. | Explicit keyboard/invalid/disabled states and contrast; shared consumer checks. |
| primary-foreground, secondary-foreground | No direct source variable/utility reference found outside declarations by this scan. | Alias contract investigation, not deletion permission. Check emitted consumers when added. |
| logo-aqua, ease-drawer | No direct source consumer found in this scan. Actual raster logo is independent of the aqua token. | Candidate unused customer values only; check documentation/generated/binding/dynamic consumers before later removal. |
| radius-control/card/panel, shadow-raised, ease-out, motion-feedback | Actions/cart/search/checkout and inherited root layout/motion helpers; utility shadow-raised references need generated-CSS context. | Migrate per component role; preserve reduced-motion and portal elevation. |
| space-1/2/3/4/6/8/12, content-width | Inherited globals.css consumers; customer copies repeat the values but new modules use literals. | Not unused. Replace intentional role mappings only after accepted layouts; preserve root/shared defaults. |
| Root care-peach/blue/mint/sun (outside customer file) | care-peach/mint are actively used in wholesale portal message/pending/receipt; blue/sun have no TS/TSX consumer found. | Preserve wholesale colours/meaning until isolated. No inference of customer use merely because Tailwind emits utilities from the global source scan. |

## Fonts and assets

| Resource | Verified consumers | Migration / retention condition |
| --- | --- | --- |
| PTSans-Regular.woff2 + OFL.txt | Root layout/base inherited by all surfaces unless overridden. | Retain until root/admin/wholesale/error consumers are explicitly migrated. |
| Figtree-Variable.woff2 + Figtree-OFL.txt; Alexandria-Variable.woff2 + Alexandria-OFL.txt | storefront-fonts.ts → customer layout and root 404. | Candidate pair only; acceptance/consumer verification before replacement/removal; retain licences. |
| Geist-Variable.ttf + Geist-OFL.txt | Admin and wholesale layouts. Admin comment claiming shared storefront Geist is historical; actual customer imports Figtree/Alexandria. | Retain independently of customer font decision; test Arabic wholesale inline fallback separately. |
| Outfit-Latin.woff2 + Outfit-LICENSE.txt | Admin growth campaign preview. | Shared preview dependency; NEW-003, no deletion as “old storefront font”. |
| logo.png, favicon/Apple/Android icons, manifests | Customer/root metadata/SEO plus wholesale; Android icons also referenced from both customer/admin manifests. | Shared identity/PWA resources. No literal TS reference is **not** unused: manifest links are effective consumers. |
| public/design/campaigns/almina-care-courier.png | homepage.tsx; generated decorative courier, documented campaign provenance. | Customer owned asset; replace/retire after accepted campaign migration, preserve live copy and truthful staff meaning. |
| public/design/categories/pharmacy-categories.png | category-tile.tsx atlas fallback. | Customer category imagery; verify actual-data fallback/RTL and reference approval before removing atlas. |
| public/design/home/*.webp (six files) | No literal app TS/TSX/CSS reference found; historical merchandising documents reference them. | Candidate superseded media, **not deleted**. Inspect dynamic managed-content/external URL/public-serving consumers and rights/provenance before retirement. |
| product-placeholder.svg | ProductImage/catalogue/cart/checkout/SEO source helpers. | Functional missing-photo fallback; replace coherently, don't remove factual/accessible recovery. |
| public/service-worker.js | Historical root-scope registration compatibility, documented NEXT_ROUTE_PARITY_2026-10-04.md; no literal current TS reference. | Preserve until registration/notification compatibility verified; not a design asset cleanup target. |
| public/admin/worker.js + manifest; templates/recovery-products.xlsx | Admin notifications/PWA and recovery import. | Admin operational resources; preserve. |
| docs/design/storefront/previews/assets/* | Reference fixture/provenance for exact-pack photos, not a production catalogue replacement. | Preserve fixture integrity/provenance; no generated packs or removal based on “outside public”. |
| docs/design/storefront/references/*, including N01–N07 | Planning docs/manifests; outside public/runtime bundles. | Private reference evidence; no image/claim/watermark copying. Preserve source context across phases. |
| Remote product/banner/editorial media | Runtime API/CDN/managed URLs, not fully enumerable by source literal scan. | Production/media consumer migration is a separate verification requirement; no deletion in this inventory. |

Public literal scan covers 21 files; nine lack literal source references, including manifest-linked Android icons, historical service worker and six older home assets. The table explains why that list is **not a deletion list**. Broader legacy CRA/backend media is outside the Next source graph and untouched; its public URLs/data cannot be retired through this source-only audit.

## Portals, vendor and provider boundaries

- StorefrontMenu uses Radix Dialog/Popover with a mounted container ref inside the customer DOM; theme/direction can inherit there. Preserve the container contract when changing shell scope. Initial mounting, keyboard/focus and live resizing require later actual-state checks.
- DeliveryLocation uses a native dialog still parented beneath customer layout. Top-layer display does not move its DOM ancestry; don't convert to a body portal without carrying theme/RTL.
- Admin RowActions selects closest .admin-app for Popover; admin shell supplies an internal Dialog portal container. Preserve these independently of customer shell changes and verify any early undefined-container fallback on interaction.
- Delivery-map native modal workspace plus Leaflet/Geoman CSS belongs to admin. Marketing designer imports GrapesJS vendor CSS; admin alert-monitor uses Sonner. Vendor/global styles must be considered in cross-route checks, not rethemed as customer components.
- Google sign-in button/provider-rendered presentation and merchant widgets have external boundaries. Do not invent branding/control authority over them or change provider behaviour as token cleanup.

## Instructions, metadata and automation

| Source | Current role / future action |
| --- | --- |
| Root/web AGENTS.md, project-profile SKILL.md | Persistent safety plus incumbent reference-02/style binding. Tracker/source plan establishes that new supporting visuals are unapproved proposals. P2-05 must align project-specific bindings after screen acceptance; preserve general skills. |
| PRODUCT.md | Confirmed business/functional/localisation constraints; incumbent visual paragraphs are current-candidate evidence, not new palette approval. Preserve facts; update only accepted-direction context later. |
| DESIGN.md, DESIGN-BRIEF.md, screen-directions.md, decisions.md, references.md | Current guide plus historical/forward precedence. P2-05 will replace visual authority coherently; preserve useful marked historical migration records. |
| apps/web/.impeccable/design.json | Metadata describes current candidate, not an independent token generator or screen approval. Synchronise from accepted build in P2/P6. |
| apps/web/.impeccable/config.json | buildPath=code; no separate visual generator selected. Preserve code-led review workflow. |
| Root .codex/hooks.json | Configures Impeccable hook after file edits and on Stop. This is detector/check wiring, not a token regeneration binding. Configuration presence does not prove the host ran it in a particular turn; preserve general-purpose checks. |
| package.json scripts, web package scripts, .github workflows, scripts/tooling | No binding found invoking generate-tokens/sync-brand-to-tokens/embed-tokens or restoring storefront-tokens.css. Build, verification and fixture tools remain functional constraints. Absence of matching bindings is bounded to inspected tracked scope, not user/global automation. |
| Generic .agents/skills/design-system and brand scripts/templates | Reusable token generators exist, but no inspected project build binding invokes them. Keep general-purpose skills. Do not run a generator/template as authority over accepted customer tokens. |
| Historical docs/migration and archived guides | Useful audit/rollback records, not active visual authority. Keep marked superseded; do not follow their old asset/token instructions. |

## New findings to carry forward

| ID | Finding | Owner / acceptance |
| --- | --- | --- |
| NEW-001 | Wholesale imports full customer CSS and .storefront-shell; also consumes old care colours/shared controls. | P2-01/P2-02 isolate or provide explicit compatibility before customer token switch; P5-05/P6-02 wholesale state/navigation checks. No incidental wholesale restyle. |
| NEW-002 | Root 404 outside route group imports customer styles/fonts/shell. | P2-02/P3-04 preserve root error composition and scope; P6-01 removal includes unknown routes and cross-surface navigation. |
| NEW-003 | Admin CampaignArtwork/Outfit preview is a shared customer/admin dependency with its own inline palette. | P2-03/P3-03 preview policy and consumer migration, P6-01 font/component removal proof. Preserve admin editing and validation. |

These are dependencies to resolve, not blockers to continuing the baseline inventory and route map. No runtime fixes are claimed. Next task P0-03 maps actual routes/states/tests and selects the correct isolated harness for each.
