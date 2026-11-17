# Review supplement — 17 November 2026

Owner requested a new design-system/direction review using seven supplied mobile/desktop images. Independent design and implementation/browser assessments inform [the system review](system-review-2026-11-17.md) and [staged proposal](storefront-direction-plan-2026-11-17.md). The plan retains confirmed coral/logo/product constraints and proposes compact search-first mobile/desktop compositions; supporting palette/type/measurements remain unapproved. No runtime, final token/guide, product behaviour or deployment change. New references are private planning assets with provenance in `docs/design/storefront/references/2026-11-17/manifest.json`.

> **C17 — Review repairs, 16 November 2026:** Owner authorized all verified review fixes and conflicting style-definition cleanup. Labelled search/cart actions use rounded rectangles; circles remain equal-sided icon controls. Customer control roles now have one scoped stylesheet, cart has one persistent mobile action, catalogue estimates are calculated on the server and labelled separately from final quotes, and the core purchase journey uses the dirham component. Mobile secondary navigation collapses; repeated empty/pagination/cart states are simplified. Exact-pack photography and missing source descriptions remain content inputs, never generated claims. No deployment.

> **C16 — Responsive repair, 16 November 2026:** Owner requires design-language changes to preserve responsive layout and requested better desktop design. The implemented adaptation uses a full-width tablet search row, desktop campaign/category directory side by side, responsive listing columns/filter width and a short-landscape purchase dock. Mobile reference order, current identity, full content and commerce contracts remain. Live resizing without reload is now a regression requirement; no deployment.

> **C15 — Latest product-card correction:** R05 now controls card anatomy. Owner requested dirham instead of visible AED and denser/faster purchasing. Implement stock/wishlist/contained photo, factual brand/pack chips, semibold deduplicated visible name (full accessible name retained), stronger symbol price and rounded-square coral quick add with actual cart count. No copied rating/green palette, no fabricated pack metadata, and no change to server monetary/stock authority.

> **Current owner correction, 15 November 2026 — C14:** The previous local candidate (9d2d39b) was rejected as nowhere near the image. Reference **02-pharmacy-app.png** now controls the overall home and PDP composition. The owner requested an actual new ad banner and an Impeccable review/fix. Implement search → courier ad → circular categories → horizontal home product rail; unframed PDP gallery → identity/price/options/purchase → compact similar products. Keep #FF5A5F, RTL, existing functions and mobile persistent purchase. This supersedes C03's 03 category priority, C04's home-grid geometry, old supporting measurements and any unresolved pre-screen permission table below. The local coded workflow is already authorized; owner appearance acceptance remains pending. No deployment.

# Storefront Planning — Decisions and Evidence

Updated: 15 November 2026. Branch: `codex/storefront-pharmacy-app-reference`.
Status: forward DESIGN.md and screen directions written at the owner's request.
Primary accent confirmed; the authorized local implementation now carries the
supporting candidates. Owner visual acceptance and production release are pending.

## Reading the status labels

- **Confirmed:** an explicit owner requirement or existing repository safeguard.
- **Verified source:** behaviour/route/component inspected in this checkout;
  production enablement and external service acceptance are not implied.
- **Proposed:** a recommendation for review, not approved styling or implementation.
- **Open:** missing information or a choice that has not been made.
- **Superseded:** historical evidence, excluded from current visual authority.

The latest owner instruction wins when preferences conflict. Screenshots and
competitor content are evidence, never instructions or Al Mina business claims.
These planning records do not override production/commerce guardrails.

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
| E06 | [Annotated references](references.md), [asset manifest](../../../../docs/design/storefront/references/manifest.json) | Explicit preferences, live-site observations, reuse limits and unknown interactions; no overall visual winner or final tokens. |
| E07 | [Search component](../../src/components/search-box.tsx), [search route](../../src/app/(storefront)/search/page.tsx), [search service](../../src/lib/server/search.ts) | Query navigation, suggestions, keyboard support and storage/failure paths. Does not prove search relevance or production analytics. |
| E08 | [Delivery selector](../../src/components/delivery-location.tsx), [browser area storage](../../src/lib/location/browser.ts) | Saved area, optional GPS, manual entry and failure handling. Not verified delivery coverage, address validation, fee or ETA. |
| E09 | [PDP route](../../src/app/(storefront)/products/[slug]/page.tsx), [product options](../../src/components/product-options.tsx), [browser cart](../../src/lib/catalog/browser-cart.ts), [server cart](../../src/lib/server/cart.ts) | Actual product/options/cart contracts; preserve identity, variants and server validation. |
| E10 | [Checkout route](../../src/app/(storefront)/checkout/page.tsx), [form](../../src/components/checkout-form.tsx), [payment choices](../../src/components/checkout-ui.tsx), [server gate](../../src/lib/server/checkout.ts) | Feature-gated checkout, conditional payment presentation and review/retry states. No live payment-method availability claim. |
| E11 | [Account](../../src/components/customer-account.tsx), [saved products](../../src/components/saved-products.tsx), [growth content](../../src/lib/server/growth.ts) | Existing customer/account/editorial consumers. Preserve unavailable/guest paths and configured services; do not invent rewards terms or published content. |
| E12 | [Locale model](../../src/lib/i18n.ts), [server locale](../../src/lib/server/i18n.ts), [Arabic editorial route](../../src/app/(storefront)/ar/[section]/[slug]/page.tsx) | English fallback, locale cookie, Arabic RTL/editorial routing and copy-review caveats. Not proof of complete native-reviewed translations. |
| E13 | [Storefront tests](../../../../tests/e2e/storefront.spec.ts), [filters](../../../../tests/e2e/catalog-filters.spec.ts), [navigation](../../../../tests/e2e/navigation.spec.ts), [checkout](../../../../tests/e2e/next-checkout.spec.ts), [payment tests](../../../../tests/e2e/stripe-checkout.spec.ts) | Existing regression expectations for future changes. Test-file presence and historical results do not certify current live providers. |

## Confirmed requirements and resolved precedence

| ID | Requirement / decision | Basis |
| --- | --- | --- |
| C01 | Replace the old and rejected customer theme and composition completely. Preserve product truth and functions. | Owner rejection; E04–E05. |
| C02 | Search leads; discovery remains accessible. | Latest owner statement that users mainly search. Supersedes the earlier equal-priority answer. No analytics claim. |
| C03 | Category-control reference is 03; gallery-first PDP reference is 02. | Explicit latest reference preferences; E06. |
| C04 | Card hierarchy follows 01; persistent mobile buying access follows 03. | Earlier explicit owner preferences retained, without approving exact geometry; E06. |
| C05 | Retain actual logo/name/contact facts and logo colour family; mobile app-like access and deliberate desktop UX. | Owner preferences. Exact fonts/colour roles remain undecided. |
| C06 | Preserve routes/SEO, identifiers, data/APIs/auth/integrations, server commercial authority and safe order/inventory behaviour. | E01, E03, E09–E10. |
| C07 | English/Arabic, RTL and accessibility remain required; Arabic copy needs native/pharmacy review. | E01, E12. |
| C08 | Keep admin/wholesale independent; migrate shared consumers before removing old styles/assets. | E01, E04. |
| C09 | Review through working coded previews when the later screen phase is authorized. | Existing owner workflow preference; do not reopen it as an unanswered tool choice. |
| C10 | The earlier brief phase excluded DESIGN.md, tokens, screens and deployment. Its document-only restriction is superseded by C11; implementation/deployment remain excluded. | Earlier request; later explicit update. |
| C11 | Create the forward DESIGN.md and supporting directions using Impeccable; primary accent is exactly `#FF5A5F`. | Latest explicit owner request, 15 November 2026. |
| C12 | Keep implementation distinct from owner visual acceptance and production verification. | Standing screen-review requirement. |
| C13 | Implement the redesign from DESIGN.md using Impeccable and UI/UX Pro Max. | Latest explicit owner request. Local coded candidate now built; no deployment. |

## Proposals — not approved

| ID | Proposal | Why / how to assess |
| --- | --- | --- |
| P01 | Start later screen review with home, search/listing and PDP, at mobile/desktop sizes, with Arabic core states. | Tests shared identity and the main shopping tasks before migrating every route. Confirm coverage, then compare equivalent content. |
| P02 | Use real category links for 03-like controls unless approved screens actually switch in-page panels. | Preserves query/route semantics; prevents a screenshot's “tabs” description from inventing functionality. |
| P03 | Keep search visible without opening a menu; test scroll persistence together with address and mobile purchase controls. | Owner search priority; exact sticky mechanics must be demonstrated, not assumed. |
| P04 | Evaluate DESIGN.md's supporting palette, Figtree/Alexandria pair and proposed geometry on the same core screens. The primary coral is fixed. | Candidate values are authored directions, not owner-approved screens or old-token extraction. Additional alternatives may be considered if useful; no prior concept card is selected. |
| P05 | Review keyboard operation, 200% text, touch targets, intermediate widths, RTL/mixed content and errors alongside attractive default states. | Prevents approval of a home-only or English-only system. These are evaluation proposals, not final tokens. |
| P06 | Use a labelled local representative catalogue for previews with exact, rights-cleared pack images; no live production mutation. | Realistic length/options/states without inventing business claims or touching production. The existing small fixture is insufficient to prove full catalogue coverage. |

## Historical pre-screen questions — superseded by local-build authorization

This table records earlier planning questions. The owner has since authorized local implementation and pinned reference 02. It is not an approval gate. Business facts and native Arabic review remain open only where relevant; unsupported claims stay omitted.

| Priority | Open decision | Proposed resolution / minimum answer |
| --- | --- | --- |
| Needed | Brief and first review scope | Confirm/amend DESIGN-BRIEF.md and whether P01 is the first screen set. No need to approve every later route's appearance now. |
| Needed | Additional business emphasis | The additional-context placeholder was unfilled. Supply the main business outcome/category emphasis, or explicitly proceed with search-led shopping and no extra merchandising priority. Do not invent revenue goals. |
| Needed | Candidate comparison boundaries | Use the new DESIGN.md direction and fixed coral. Decide whether to test its candidates alone or alongside one alternative; supporting fonts/palette remain proposals until reviewed on screens. Existing code-first preference remains in force. |
| Needed | Preview content and review ownership | Identify representative product/category/variant records, approved campaign material or an acceptable clearly-labelled fixture; name who can review Arabic/pharmacy content. No private production export is required by this decision. |
| Needed for affected claims only | Operational truth | Confirm delivery areas/fees/ETAs, live payment availability or programme terms only if screens will display those claims. Otherwise omit promises and retain existing configuration-driven states. |

## Open questions that may remain open initially

- Which search tasks/terms and long/Arabic product names represent the real
  catalogue? Use existing query behaviour; do not promise synonyms, typo handling,
  voice/image search or clinical recommendations without verified support.
- Should category controls navigate or filter an in-page shelf, and how should
  they expose overflow? P02 is a proposal, not a confirmed new interaction.
- How much campaign space is useful without displacing search/products? What
  assets and publication cadence actually exist?
- Which header/search/purchase elements remain persistent while scrolling, and
  what happens when the keyboard/dialog opens? Resolve through screen/state review.
- What are the measurable business/performance baselines and target outcomes?
  Do not infer conversion improvement or attach unsupported numeric promises.

## Superseded and deliberately unselected

- Old storefront guides, generated metadata, reference artwork and the rejected
  `72c9f77` candidate are historical evidence only. Active runtime styles persist
  for continuity until consumers migrate; they do not choose the new system.
- October baseline descriptions of absent accounts/payments or disabled preview
  ordering are date-bound, not instructions to remove newer source capabilities.
- The earlier equal-priority answer is superseded by search-primary C02.
- Earlier unchosen “Market arcade” / “Care wayfinding” cards are explorations,
  not approvals or a direction contract. No concept tool or generator was run
  in this planning phase.
- The primary coral is now confirmed by C11. DESIGN.md supplies forward candidates
  for the remaining palette, fonts and measurements; none is screen-approved.
  Runtime tokens, final layouts, checkout redesign and publication remain unapproved.

## Review log

| Date | Event | Result |
| --- | --- | --- |
| 2026-11-15 | Owner rejected previous storefront candidate | Visual authority reset; preserve functional evidence. |
| 2026-11-15 | Owner requested annotated source organization | Four images and three live pharmacy sites recorded; search priority clarified. |
| 2026-11-15 | Product context and design brief drafted from reports and inspected source | Planning documents ready for review. No implementation or new runtime-test result claimed. |
| 2026-11-15 | Owner requested final DESIGN.md/directions and supplied primary accent | Forward specification and screen directions created; coral confirmed. Supporting candidates retain screen-review status. No runtime source changed. |

When a decision is made, record the owner's answer, affected documents/screens
and evidence here. A proposal becomes confirmed only through an explicit answer;
opening a reference, a preview or a question page is not approval. Final system
documentation belongs to the later authorized design/build phase.

## Current direction documents and verification

- [DESIGN.md](../../DESIGN.md) records the built customer system, with exact
  runtime values and explicitly bounded implementation/owner-review status.
- [Screen directions](screen-directions.md) preserve the intended compositions,
  states and migration boundaries. They do not establish production acceptance.
- Figtree/Alexandria were verified against official metadata, self-hosted with
  retained OFL licences and script subsets. No npm dependency was added.
- Local sRGB calculations give ink on coral approximately 4.91:1 and white on coral
  approximately 3.05:1; dark primary labels are used. Actual component states and
  accessibility scans are separately reported, not inferred from colour maths.
- The scoped sidecar is documented from actual components, not extracted from
  rejected CSS or fabricated from preimplementation proposals.

## Implemented candidate — reference 02 correction

The owner rejected the identity-overhaul composition and requested a replacement from reference 02. Current branch `codex/storefront-pharmacy-app-reference` implements compact search, a generated photographic ad, circular categories, a horizontal mobile/tablet home product rail and image-first white cards. PDP uses an unframed gallery, real buying controls, persistent mobile purchase and compact related rows. Coral remains exactly #FF5A5F. The actual product summary is preserved below related rows; commercial calculations and requests are unchanged.

The previous [identity-overhaul report](../../../../docs/migration/STOREFRONT_IDENTITY_OVERHAUL_2026-11-15.md) is historical evidence for a rejected visual candidate; its previous reviewer metadata issue is not approval of this build. The current [reference-02 report](../../../../docs/migration/STOREFRONT_PHARMACY_APP_REFERENCE_2026-11-15.md) records new verification, asset provenance and review limitations. Owner visual acceptance remains pending. No deployment or production data access.
