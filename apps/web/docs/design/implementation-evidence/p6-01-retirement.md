# P6-01 — Storefront design retirement

19 November 2026. Baseline `f3710c2` on `codex/storefront-pharmacy-app-reference`. This task retires superseded code and records live dependencies. The approved screen direction and product requirements still apply.

## Removed and isolated

- Removed the development-only comparison routes under `/design-proof`, component specimen, alternate density and stress controls, proof navigation and gate, launch and capture scripts, and the tests dedicated to the removed routes. Removed the proof-only variants and endpoints from the current local reference fixture. Its normal storefront catalogue and reviewed image fixture remain available.
- Removed the older October synthetic design fixture and its paired browser verifier. Neither had a caller in the current scripts, CI, app or test graph. The current storefront and commerce suites cover the live routes.
- Moved the accepted token source and its generic utility aliases to the retail layout. Existing component boundaries still own interaction styles. The old palette is explicitly scoped to the wholesale and root missing-page layouts. Removed unused legacy aliases, four unused global care colors, prototype-only runtime roles and superseded compact Save and Add feedback styling. Generic error and availability colors resolve through approved retail roles.
- Updated [DESIGN.md](../../../DESIGN.md), [web instructions](../../../AGENTS.md) and the Al Mina project profile to point to retail routes for working examples. There is no active palette generator binding in the checked-in scripts or CI. Archived the old Impeccable homepage surface brief, which still prescribed a lavender canvas, circular categories and a product rail. The Phase 1/2 prototype material is marked historical. Captures and approval records remain in their evidence folders. The last pre-retirement implementation can be inspected at `f3710c2`.

## Live dependencies retained

| Source | Consumers and reason for retention |
| --- | --- |
| Shared root stylesheet | Tailwind utility bridges, native form and layout defaults, and the root fallback palette still serve wholesale, admin and older utility consumers. Retail aliases are scoped to the storefront wrapper. Shared Button and form APIs still have consumers across route groups. |
| Storefront compatibility and shell CSS | Wholesale and root recovery retain the old palette. The root 404 still uses the fallback Navigation, SearchBox and Footer. The retail chrome uses the existing search/cart geometry with accepted overrides. Named base CTA and native-control geometry still support shared and fallback consumers. The checkout stylesheet styles live retail checkout and recovery states. |
| Fonts | Figtree/Alexandria are used by retail, with storefront font classes also used on the root 404. PT Sans remains on the root layout. Geist serves admin and wholesale. Outfit supports the admin campaign editor preview. Font files and licences remain paired. |
| Public media | The live campaign and category images, product fallback, logo, PWA manifest/icons and shared catalogue media still have consumers. The six older files in `public/design/home` had no literal runtime callers in the checked source. Their public URLs and potential operator-managed references remain until their use can be verified. |
| Admin | Admin theme, campaign preview, delivery-map styles and vendor integrations retain their own ownership. |

The previous [ownership inventory](p0-02-style-ownership.md) records the baseline. Use [documented references](../../../../../docs/design/storefront/references/) for evidence and [DESIGN.md](../../../DESIGN.md) for the active specification. Earlier critiques, screenshots and rejected selections remain historical evidence. The active homepage guidance comes from the accepted screen directions and design guide. The remaining shared styling and public assets above must be traced again if their consumers are migrated.

## Verification

- Ran the isolated Next.js 16.4.2 Turbopack production build, web typecheck and repository lint. Regenerated stale local route types before the successful build. The compiled route list excludes the retired proof.
- Passed 57 Chromium cases using the compiled build and disposable fixtures. Coverage includes the nine retired URL forms, bilingual home/search/listing/product/cart and checkout, confirmed add/save feedback, unknown-route recovery, wholesale and staff login. The checkout quote review created no order or receipt.
- Passed 24 live preview checks across English and Arabic home, listing and cart at 320, 390, 768 and 1440px. Checked direction, canvas, text, viewport overflow and the wide search action radius. The development comparison returned 404, the browser reported no page exceptions and Next reported no compilation issues. A fresh loopback process also confirmed the reference fixture still serves its normal catalogue and media metadata.
- Passed 17 WebKit cases covering shared-route boundaries, bilingual responsive navigation and checkout quote review. The initial WebKit run reported canceled requests during the checkout test's reload. The test now seeds the cart on a same-origin static document before opening checkout. The strict browser exception check remains in place.
- Passed 34 focused unit checks covering token and documentation bindings, CSS policy, retained dependencies, catalogue, SEO, account surfaces and fixture ownership.
- The additional Chromium checkout, payment and telemetry run passed 23 of 28 cases. Five telemetry cases still look for the consent button in the hidden checkout footer. The 360px case reproduced on the compiled P5-05 baseline (`p5-close`). P6-02 carries the full consent and withdrawal verification against the current route layout. The checkout verification used synthetic payment and inventory fixtures.

The build used `APP_ENV=development DATABASE_MODE=disabled AL_MINA_ISOLATED_BUILD=1 AL_MINA_VERIFICATION_TAG=p6-retire`. Browser suites used the compiled build with disposable loopback commerce and catalogue fixtures. The live development check used the reference preview in this checkout on ports 4880/4881. A comparison process in the separate original checkout on 4870/4871 was left alone. Physical devices, Firefox and the full final route matrix carry into P6-02. No production services or deployment were used.
