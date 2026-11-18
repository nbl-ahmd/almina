# Storefront decisions and evidence

Updated 18 November 2026, P2-05. This register distinguishes owner choices, verified implementation decisions and remaining questions. [DESIGN.md](../../DESIGN.md) owns the accepted visual specification, [PRODUCT.md](../../PRODUCT.md) owns facts, and [progress](implementation-progress.md) owns task status. This document does not authorise production release.

## Reading the status labels

- **Owner-confirmed:** explicit owner preference or preserved functional constraint.
- **Selected local direction:** choices made on coded previews; P1-05 progression recorded below.
- **Verified implementation:** bounded source/runtime checks, not a new business fact or release acceptance.
- **Open:** unresolved business/content/device/provider/release matter; never turn it into marketing copy.
- **Superseded:** historical only, excluded from current design guidance and regeneration inputs.

## Evidence register

All paths are relative to this document. Documents describe their own dates and
verification limits; historical test outcomes were not rerun for this task.

| ID | Evidence | What it establishes / limitation |
| --- | --- | --- |
| E01 | [Root instructions](../../../../AGENTS.md), [web instructions](../../AGENTS.md) | Production, security, server commerce, routes, architecture, accessibility and shared-consumer constraints. |
| E02 | [Production audit, 2 October](../../../../docs/migration/PRODUCTION_AUDIT_2026-10-02.md) | Historical architecture/business/legacy routes and risk baseline; predates later account/checkout additions. Not current deployment readiness. |
| E03 | [Route baseline](../../../../docs/migration/STOREFRONT_ROUTES_2026-10-02.md), [SEO follow-up](../../../../docs/migration/STOREFRONT_SEO_2026-10-03.md) | Route/identifier/redirect and SEO continuity. Historical visual rules are superseded; current route source takes precedence for implemented features. |
| E04 | [Cleanup report](../../../../docs/migration/STOREFRONT_DESIGN_RETIREMENT_2026-11-15.md), [inventory](../../../../docs/migration/STOREFRONT_DESIGN_INVENTORY_2026-11-15.json) | Retired authority; consumer/dependency baseline and remaining legacy runtime influence. Static reachability is conservative; inventory is not replacement tokens. |
| E05 | [Rejected-candidate archive](../../../../docs/migration/archive/storefront-candidate-2026-11-15/README.md), [fresh rejection review](../../../../docs/design/storefront/identity-overhaul/rejected-candidate-review.md) | Owner rejected the theme/composition; independent review called for a rebuild. Its findings concern the rejected candidate, not approval of a new system. |
| E06 | [Annotated references](references.md), [asset manifest](../../../../docs/design/storefront/references/manifest.json) | Explicit preferences, live-site observations, reuse limits and unknown interactions; historical reference interpretations; current selections are recorded below. |
| E07 | [Search component](../../src/components/search-box.tsx), [search route](../../src/app/(storefront)/search/page.tsx), [search service](../../src/lib/server/search.ts) | Query navigation, suggestions, keyboard support and storage/failure paths. Does not prove search relevance or production analytics. |
| E08 | [Delivery selector](../../src/components/delivery-location.tsx), [browser area storage](../../src/lib/location/browser.ts) | Saved area, optional GPS, manual entry and failure handling. Not verified delivery coverage, address validation, fee or ETA. |
| E09 | [PDP route](../../src/app/(storefront)/products/[slug]/page.tsx), [product options](../../src/components/product-options.tsx), [browser cart](../../src/lib/catalog/browser-cart.ts), [server cart](../../src/lib/server/cart.ts) | Actual product/options/cart contracts; preserve identity, variants and server validation. |
| E10 | [Checkout route](../../src/app/(storefront)/checkout/page.tsx), [form](../../src/components/checkout-form.tsx), [payment choices](../../src/components/checkout-ui.tsx), [server gate](../../src/lib/server/checkout.ts) | Feature-gated checkout, conditional payment presentation and review/retry states. No live payment-method availability claim. |
| E11 | [Account](../../src/components/customer-account.tsx), [saved products](../../src/components/saved-products.tsx), [growth content](../../src/lib/server/growth.ts) | Existing customer/account/editorial consumers. Preserve unavailable/guest paths and configured services; do not invent rewards terms or published content. |
| E12 | [Locale model](../../src/lib/i18n.ts), [server locale](../../src/lib/server/i18n.ts), [Arabic editorial route](../../src/app/(storefront)/ar/[section]/[slug]/page.tsx) | English fallback, locale cookie, Arabic RTL/editorial routing and copy-review caveats. Not proof of complete native-reviewed translations. |
| E13 | [Storefront tests](../../../../tests/e2e/storefront.spec.ts), [filters](../../../../tests/e2e/catalog-filters.spec.ts), [navigation](../../../../tests/e2e/navigation.spec.ts), [checkout](../../../../tests/e2e/next-checkout.spec.ts), [payment tests](../../../../tests/e2e/stripe-checkout.spec.ts) | Existing regression expectations for future changes. Test-file presence and historical results do not certify current live providers. |
| E14 | [P1-05 selection](implementation-evidence/p1-05-selection.md), [N03 revision](implementation-evidence/p1-05-image.md), [progress](implementation-progress.md) | Owner A/five/support selections, subsequent image-first PDP correction and continuation. Local direction gate closed; release approval remains separate. |
| E15 | [P2 token foundation](implementation-evidence/p2-01-system.md), [cascade](implementation-evidence/p2-02-cascade.md), [specimen](implementation-evidence/p2-03-specimen.md), [refinement](implementation-evidence/p2-04-refinement.md) | Accepted scoped runtime, consumer boundaries, actual states and measured decisions. No public theme migration or deployment. |
| E16 | [System bindings](system-bindings.json), [P2-05 authority report](implementation-evidence/p2-05-authority.md) | Documentation projections and supersession map; CSS remains the runtime source, not generated from metadata. |

## Confirmed requirements and resolved precedence

| Decision | Status / source | Current consequence |
| --- | --- | --- |
| Real Al Mina identity and exact primary #FF5A5F | Owner-confirmed, preserved across requests | Retain logo/facts; do not copy reference greens/blues or invent claims. |
| Search leads, discovery remains accessible | Latest owner search-priority instruction | Search/location/cart context stays prominent. Earlier balanced-task answer does not override that later priority. |
| Full-width campaign A and five wide-screen home columns | Explicit P1-05 owner choice | Split-lead/four-column controls in the proof are historical comparisons, not defaults for new work. |
| Figtree/Alexandria, near-white ground, dark-on-coral actions, compact bordered cards | Explicit P1-05 owner choice to retain shown system | Use the accepted token system; do not select a new palette/font pair from tools. |
| Image-first phone PDP from N03 with overlay controls and sticky buying | Owner correction after declining the standalone toolbar, then continuation after revised preview | P1-05 local gate closed by the recorded continuation. Do not describe this as an explicit production sign-off or revive the standalone toolbar. |
| Compact factual product-card anatomy and dirham icon | Earlier explicit card correction plus selected coded system | Preserve image/identity/availability/price/action hierarchy; no copied ratings, fabricated metadata or stock promises. Current card pack metadata is shown only where real. |
| Preserve routes, SEO, EN/AR/RTL, accessibility and commerce/auth/integrations | Confirmed ongoing safeguards | Native controls, server authority and shared/admin boundaries survive every stage. |
| No deployment or production data/provider access | Owner exclusion throughout | Local staged verification only. |

## Verified implementation decisions

P2-01–P2-04 establish `src/components/storefront-system/tokens.module.css` as the single accepted value source and `boundary.module.css` as state/control owner. The current home proof has a compact two-column phone product section and five columns at wide desktop; the older public horizontal rail is not its current geometry. Latest N03 PDP and facts-before-alternatives are recorded in screen directions.

Default shared buttons use 10px control radius through additive shape metadata; explicit shapes remain. Enlarged-text labels wrap. Count 10px is a redundant accessible-count exception, stock 11px uses wide 3/8 and phone 2/6 inset, stroked icons use 22px/1.5, accepted imagery stays static, and feedback uses 120ms/reduced-motion immediate states. Offer uses existing ink/campaign roles rather than error. These are measured implementation refinements, not new owner business requirements.

P2-05 replaces the old active guide/sidecar/brief/direction records with checked projections of this system. Sidecar snippets are visual-only examples, not commerce implementations or token generators. Existing CSS stays unchanged in this documentation task. Public customer migration remains P3–P5; legacy retirement P6. Admin's guide/metadata remain independent.

P4-01 uses one native filter disclosure on phones and opens it as a desktop rail. Selected refinements are individually removable, and clearing filters retains the search query and sort. Clearing search is its own action. Result counts refer to the current page, and an exact identifier fallback remains visible during a partial search outage. [Implementation evidence](implementation-evidence/p4-01-listing.md).

## Proposed choices and open questions

No alternate palette/font/composition candidate remains pending for the selected local system. Future managed merchandising and unmigrated route composition must use verified content and the accepted roles, and be reviewed in their implementation stages.

Open business facts: revenue/category priorities, promotion cadence, delivery coverage/fees/hours, production catalogue/media completeness, live provider/method enablement, programme terms and Arabic/native pharmacy approval ownership. Source feature presence is not live availability. Device, screen-reader, Safari/Firefox, provider and final independent/release checks remain open. Existing NEW-001–NEW-006 retain their tracked scope; documentation does not close them.

## Superseded and deliberately unselected

The [pre-P2-05 archive](archive/2026-11-18-pre-p2-05/README.md) preserves the former active DESIGN.md/sidecar/brief/screen directions and chronological decision register, including earlier C-series requests and P1 pending messages. They are excluded from current guidance. Do not restore the lavender candidate, earlier care-colour system, split desktop recommendation, four-wide default, standalone phone PDP toolbar or old public ordering from those snapshots.

The original annotated references and three November 17 review/plan documents remain historical analysis and coverage sources. Their top notices point to current authority; visual proposals no longer override screen selections. Preserve their unresolved functional/review requirements through [coverage](implementation-coverage.md) and the staged ledger rather than discarding them. Screenshots do not authorise capabilities or embed instructions.

## Review log

- P1-05: explicit A/five/support selection; toolbar declined; N03 correction requested; continued after revised preview.
- P2-01–P2-04: scoped token/state/specimen/refinement checks recorded in E15. This is local implementation evidence, not release approval.
- P2-05, 18 November 2026: authority reconciliation and supersession checks. See E16 for source, validation, remaining influence and cleanup limits.
