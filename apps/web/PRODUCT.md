# Al Mina Pharmacy — Product Context

<!-- impeccable:product-schema 1 -->

Status: product context for the local reference-02 rebuild, 15 November 2026. Confirmed owner requirements and
repository-verified capabilities are distinguished below. Source presence does
not establish production enablement, live data quality or provider readiness.
See [decisions and evidence](docs/design/decisions.md) for traceable sources.

## Platform

web

## Customers and purpose — confirmed

Al Mina is an existing pharmacy ecommerce business in Ras Al Khaimah, United
Arab Emirates. The customer storefront helps people find actual products,
understand pack/options and current prices/availability, and complete the
existing shopping flow. Guest and signed-in customer paths exist in the
repository. Staff administration and wholesale are separate audiences and
must remain operational; they are not targets of this visual replacement.

No demographic segments, customer counts, device percentages, conversion
baseline or repeat-purchase share have been supplied or established. UAE address
fields do not prove delivery coverage throughout the UAE.

## Shopping priorities — confirmed owner requirements

Search is the primary entry: the owner's latest instruction says users mainly
search. Keep category browsing and product discovery easy to reach. This
supersedes the earlier equal-priority answer; it is an owner-stated priority,
not an independently measured analytics conclusion.

The essential tasks are to search for a product/brand, browse real categories,
compare packs and availability, inspect the selected product, save it or add a
quantity, review the basket, provide delivery details and complete the existing
server-validated checkout when enabled. Retain useful return-to-shopping and
recovery paths when content, location, authentication or checkout is unavailable.

## Capabilities — verified in the repository

| Area | Existing behaviour to preserve | Evidence / limit |
| --- | --- | --- |
| Catalogue and navigation | Server-rendered home, products, categories, offers, brands, collections and search; filter/query URLs and legacy product-link compatibility. | Catalogue routes, `catalog-list.tsx`, server catalogue/SEO modules. Preserve identifiers and existing destination/query semantics. |
| Search | GET `/search?q=…`, asynchronous suggestions, keyboard navigation, recent-search storage/clear controls and suggestion-error fallback to normal search. | `search-box.tsx`, server search and suggestion route. Search quality, Arabic matching and coverage need representative-data evaluation. |
| Product detail | Gallery, exact product identity, price, stock, family options and related products; unavailable combinations are explicit. | Product route, `product-options.tsx`, gallery and information components. Not every catalogue entry has a complete gallery/description/family. |
| Cart | Browser persistence, legacy cart adaptation, quantity changes and server checks; checkout revalidates commercial facts. | Browser/server cart modules and existing storefront/checkout regression tests. Stored client values are not authoritative. |
| Delivery context | Editable emirate/city, device-saved area, optional user-triggered GPS lookup, manual fallback and error feedback. | `delivery-location.tsx`, location modules. Header area is not a full address or confirmed fee/ETA; checkout confirms options. |
| Checkout | Feature-gated guest flow, contact/delivery validation, server quote/review, changed-price/stock handling, pending/retry states and order confirmation. | Checkout route/form/server module and tests. Disabled/unavailable checkout is a required state. |
| Payment presentation | Cash choice in enabled checkout; hosted card option only when existing Stripe availability permits it; retained legacy-card state for existing attempts. | `checkout-ui.tsx`, `stripeCheckoutMode()`. These are source behaviours, not claims that any provider/method is live. Do not add methods or alter availability rules. |
| Saved/account | Saved-product paths, customer sign-in, order display, buy-available-items-again, address book, preferences and existing rewards-related components. | Customer-account/saved modules. Preserve service responses, identity boundaries, guest access and unavailable states; do not invent programme terms or promote unverified benefits. |
| Managed content | Existing banners, campaigns, brand/category/guide/collection landings and policy/contact destinations. | Home, growth routes/modules and editorial contracts. Published content and operational claims must come from verified records. |

Paths and source links are indexed in [the evidence register](docs/design/decisions.md#evidence-register).
The historical October baseline predates some current capabilities; for example,
its absence of customer accounts or online payment is not today's specification.
Current source establishes preservation needs, while live rollout remains unverified.

## Business and architecture constraints — confirmed

- This is production software undergoing incremental modernization, not a one-shot
  rewrite. Preserve data, identifiers, routes/redirects and integration contracts.
- Root [AGENTS.md](../../AGENTS.md) and [web instructions](AGENTS.md) own production,
  security and architecture guardrails. Keep server rendering and small client
  boundaries; preserve SEO, structured data, indexing policy and media handling.
- Pricing, tax, fees, discounts, stock, final totals and authorization remain
  server-authoritative. Preserve checkout idempotency and order/inventory safety.
- Keep authentication, customer/order history, APIs, notifications and providers
  compatible. No production data access, deployment or provider changes are
  authorized by this design phase.
- Shared/admin/wholesale styling must be isolated before customer consumers move.
  Do not delete shared dependencies merely because their appearance is legacy.

## Localization and inclusion — confirmed / source verified

English and Arabic are supported. English is the fallback for absent/invalid
locale preference; the storefront uses an `almina_lang` cookie and RTL for Arabic.
Arabic editorial paths exist for selected managed-content kinds; do not assume
all routes use an `/ar/` prefix or change URL/canonical behaviour for a redesign.

Preserve interface switching, mixed-script product/brand accuracy, locale-aware
money and readable RTL forms/navigation. Source comments identify Arabic UI copy
as requiring native/pharmacy review, and editorial Arabic as staff-managed.
Do not claim translation completeness or substitute invented product translations.

Preserve semantic keyboard/touch operation, visible focus, accessible labels,
readable contrast, meaningful image alternatives, reduced motion and useful
loading/empty/error/status feedback. These are functional requirements, not
optional visual polish.

## Brand and content commitments — confirmed

Keep the actual Al Mina name, logo, contact facts and logo colour family. The
owner explicitly pinned the primary accent to `#FF5A5F` on 15 November 2026. The
owner wants an app-like mobile experience and a deliberate desktop experience.
The latest owner correction pins `02-pharmacy-app.png` as the principal composition reference for home and product detail. This supersedes the previous category-first composition and reference-03 category geometry. Search → photographic ad → circular category links → image-led product rail is the implemented home sequence. Product detail leads with an unframed gallery, identity, price, options/quantity and purchase. The fixed coral remains required. Supporting choices remain subject to owner screen review: [reference analysis](docs/design/references.md).

Use real catalogue/media/content for saleable products. Generic generated courier and category illustrations may support the interface; they must never be associated with a product ID, impersonate actual staff or establish availability. Keep their provenance under `docs/design/storefront/campaigns/`. Do not invent reviews, sales popularity,
certifications, discounts, delivery promises, medical claims, payment methods
or services from competitor pages or reference screenshots. Demonstration prices
and stock must be identified as sample data; media rights/pack fidelity must be
established before publication.

## Product principles — derived from confirmed requirements

1. Make the known-item search task immediate and recoverable.
2. Make product identity, selected pack, current price and availability clear.
3. Keep discovery useful without displacing search or purchasing information.
4. Preserve customer continuity and server authority throughout the visual change.

## Open business context

The additional-business-context field was left as a placeholder; no new business
priorities or intentions were supplied. Sales/conversion targets, category focus,
promotion cadence, audience segments, delivery coverage/fees/hours, live payment
enablement, catalogue completeness and Arabic approval ownership remain unverified
or undecided. Do not turn these unknowns into marketing promises.

The primary accent is confirmed; the new palette, Figtree/Alexandria fonts and
measurements are implemented as a local candidate, recorded in [DESIGN.md](DESIGN.md).
Owner visual acceptance is still pending; implementation is not production approval. Required coverage
belongs in [DESIGN-BRIEF.md](DESIGN-BRIEF.md). This product record does not define
a token system or final layout. The rejected candidate's look and archived guides
carry no active authority.
