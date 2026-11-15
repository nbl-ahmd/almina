# Replacement Storefront — Design Brief

Status: **requirements brief for review**, updated 15 November 2026. The owner
subsequently authorized DESIGN.md and pinned the primary accent; see the current
[forward specification](DESIGN.md). The owner subsequently authorized a local implementation, now available as a
coded candidate. This brief remains the requirements record; owner review and
production release acceptance are separate.

This brief describes the desired customer experience and evaluation boundaries.
The primary accent is now confirmed as `#FF5A5F`. Other palette/font and
measurement candidates are documented in DESIGN.md for screen review; this brief
does not approve final layouts or implementation. The later local implementation is recorded in DESIGN.md and the migration report;
this brief does not authorize production changes. [PRODUCT.md](PRODUCT.md) owns product facts; [decisions.md](docs/design/decisions.md)
records evidence, proposals and unresolved choices.

## 1. Desired experience

**Confirmed:** a complete replacement of the rejected storefront theme and page
composition, while preserving actual shopping capabilities. Search should be
immediately useful to customers who know what they need; categories and products
should remain easy to discover. Mobile should feel direct and app-like, desktop
should make good use of space, and Arabic should receive equal functional care.

**Proposed experience interpretation:** a recognisable Al Mina shopping service
where a customer can find the right pack, understand its price/availability and
move confidently into the existing cart/checkout. This is task intent, not a
selected aesthetic or approved composition.

### Concrete principles

| Status | Principle | What a screen must demonstrate |
| --- | --- | --- |
| Confirmed | Search leads | A visible search entry without opening a menu; search survives navigation to results and has clear loading/no-result/failure recovery. |
| Confirmed | Recognise the product | Exact pack imagery when available; readable name, brand/pack and current price; no fictional ratings or claims. |
| Confirmed | Discovery is accessible | 03-style compact category controls plus access to all categories, without burying search beneath advertising. |
| Confirmed | Purchase state is honest | Selected option/quantity and stock feedback are clear; no implied availability, saving, fee or success before server confirmation. |
| Confirmed | Mobile and desktop are designed deliberately | Reachable mobile buying controls; useful wide-screen comparison/navigation; equivalent tasks in Arabic/RTL. |
| Proposed | One emphasis per task | Campaigns aid discovery; the current search, product selection or checkout action receives priority over promotions. |
| Proposed | A coherent new identity across surfaces | Evaluate type, colour roles, spacing, geometry, imagery and state together; do not approve a home-only restyle or rename old tokens. |

## 2. Content priorities

**Confirmed hierarchy of importance:** search and product identification; delivery
context where relevant; real categories and browse paths; selected pack, price,
availability and purchase controls; cart/checkout facts; factual campaigns and
support. This is not an approved vertical page order.

**Proposed home emphasis:** expose search first, make compact category discovery
visible early, then use actual merchandising and products. Test campaign size
against immediate shopping access rather than assuming a large hero or repeated
shelf sequence. Choose featured categories and campaigns from actual catalogue
coverage and owner priorities, not labels copied from screenshots.

**Product content:** name, brand, exact media, pack/variant, current price,
availability, option/quantity controls and truthful buying feedback. Additional
description/specifications/guidance only where real content exists. Preserve an
honest missing-image/description state; never fill gaps with invented health copy.

**Open:** no additional business priority, leading category, campaign schedule,
content owner or quantified business target was provided. Those fields in the
request were placeholders, not instructions to invent details.

## 3. Scope and required screens

The full replacement covers customer routes and shared customer presentation.
Admin and wholesale remain outside its visual scope. The staged sequence below
is **proposed**; route/behaviour preservation is **confirmed**.

| Proposed stage | Required review surfaces | Essential states / constraints |
| --- | --- | --- |
| 1 — Core identity proof | Global header/search/address/navigation; home; search/results or category listing; product detail | Search idle/focus/query/loading/no-results/error; category controls; real and missing media; long names; available/unavailable product; family variants and invalid combinations. |
| 2 — Commerce continuity | Cart; delivery-area dialog; guest checkout; order confirmation; hosted-payment return where supported | Empty/populated cart, quantity/stock limit, price change, location unset/saved/GPS denied/lookup failure/manual entry, form validation, checkout off/service unavailable, quote/review, pending/uncertain response/retry, success and supported cancellation/failure states. |
| 3 — Customer continuity | Saved items; account/sign-in/recovery states; order history/reorder; address book and existing preferences/rewards surfaces | Guest/signed-in, loading, no records, expired/unavailable session, partial service failure. Preserve configured identity and provider rules; no new programme terms. |
| 4 — Route coverage | Category/brand directories and detail, offers, collections/routines and managed landings, guides, about/contact/local information, policies, unsubscribe, 404/loading/error | Accurate content, existing routes/redirects, valid metadata/indexing, Arabic editorial variants and honest empty/unpublished states. Existing map and compatibility routes remain valid without inventing replacement screens. |

The minimum first review set is **proposed**: mobile and desktop home, search/listing
and product detail, plus Arabic examples of the shared shell, results and PDP.
Approving those screens would not automatically approve checkout or account
redesign. All remaining customer consumers need coverage before old styling can
be removed. Keep admin/shared regression checks in the eventual implementation.

## 4. Reference interpretation

Full observations and limitations: [annotated reference inventory](docs/design/references.md).

| Reference | Confirmed preference / observed input | Proposed translation and limits |
| --- | --- | --- |
| 01 pharmacy listing | Owner previously selected card structure | Stable photo → metadata/name → price/action hierarchy, useful two-column mobile comparison. Exact density/geometry remains to test; no copied reviews, badges or promises. |
| 02 pharmacy app | Owner explicitly prefers its PDP; earlier campaign reference | Gallery leads, followed by identity/pack/price/quantity/action. Adapt to desktop without copying the device frame, blue theme, medical copy or unsupported scanner/chat features. |
| 03 green storefront | Owner explicitly prefers category controls; earlier persistent purchase reference | Compact image-and-label category controls; persistent mobile purchase access. The screenshot does not establish tab semantics, stickiness, exact docking or carousel behaviour. |
| 04 Russian app | Supplemental only | Compare compact search/context/shortcut/product ordering; no ownership priority, copied text, currency, impossible promotional date or device chrome. |
| Life / Apollo / 1mg | Owner requested UI/UX study | Learn from strong search/location entry and product/pack clarity; avoid overlays, unrelated services and promotional overload. Live-site observations are dated and not approval of their branding. |
| Blinkit / Instamart | Owner's search-priority analogies | Search prominence, not endorsement of delivery speed, grocery taxonomy or unverified current interactions. |

No strongest overall reference is selected. The old Al Mina appearance provides
business/functional context only. Earlier concept-board options and archived
candidate guides remain unapproved; do not silently select one.

## 5. Mobile, desktop and RTL

### Confirmed requirements

- Mobile: easy search, readable comparison, comfortable controls and persistent
  PDP buying access. Address and cart remain discoverable. Do not obscure content
  or conflict with the keyboard, safe area or other fixed navigation.
- Desktop: deliberate navigation/search/address grouping, clear result/filter
  relationships and useful gallery/information comparison; preserve direct links
  and browser back/reload. Do not enlarge a phone composition mechanically.
- Arabic: proper RTL, logical spacing and directional navigation; preserve exact
  mixed-script brand/product data, money, input behaviour and content accuracy.
  Do not assume every page is served under `/ar/` or change canonical URLs.
- Preserve locale switching, semantic headings/controls, loading/empty/error
  messages and equivalent task completion in both languages.

### Proposals to validate on screens

- Test 360/390px mobile, tablet around 768px and desktop around 1440px, plus
  intermediate widths and enlarged text; these are review viewports, not tokens
  or final breakpoint choices.
- Consider category controls as links to existing categories. Use tab semantics
  only if a later design actually switches in-page panels.
- Test persistent search/address and the purchase dock together before choosing
  fixed-position behaviour; reduce duplicate contact/promotional interruptions.
- Demonstrate long Arabic names, mixed numerals/Latin packs, long categories,
  missing content and keyboard-open states before approval.

## 6. Accessibility and content requirements

**Confirmed:** keyboard/touch operation, semantic links/buttons/forms, visible
focus, accessible names and labels, readable contrast, meaningful alt text,
reduced motion, usable zoom/reflow and textual feedback for loading, error,
selection, unavailable and added states. Never make price or actions hover-only.

**Proposed acceptance checks:** keyboard completion of search → result → option
→ cart; predictable suggestion and dialog focus/Escape behaviour; visible
field-associated errors; text enlarged to 200%; no unintentional horizontal
page scrolling at review widths; controls sized and spaced for touch (44px
minimum target proposed for primary/utility controls). Final accessible colour
pairings and script coverage must be checked on actual screens.

**Confirmed content boundaries:** use actual catalogue facts, product imagery,
contact/policy content and server responses. Show real savings only when the
price data supports them. Keep claims, payment availability, delivery terms and
medical content under the existing factual/editorial rules. Clearly label demo
prices/stock; keep references and unlicensed imagery out of shipping assets.

**Open:** native Arabic/pharmacy review ownership, approved translation coverage,
rights-cleared campaign assets and representative edge-case product records.

## 7. Palette and typography candidates

**Confirmed:** retain the real logo; primary accent `#FF5A5F`, explicitly supplied
by the owner after the first brief. This supersedes the previously unfilled
accent field and all older storefront primary assignments.

**Implemented candidate, pending owner review:** DESIGN.md now records a supporting palette, Figtree for English,
Alexandria for Arabic, and a compact visual geometry/reading hierarchy. These
were applied in the explicitly authorized build; they are not yet owner-accepted
screen choices or production-approved changes. Do not inherit the rejected candidate's files/values.

**Process:** use [screen-directions.md](docs/design/screen-directions.md) to evaluate
the same core screens and real states. Record approval or revisions in decisions.md.
The owner authorized the forward DESIGN.md now; runtime tokens, generated
component metadata and claims of implemented-system verification remain later work.

## 8. Success criteria

| Status | Criterion | Evidence expected in a later phase |
| --- | --- | --- |
| Confirmed | Search-first intent is visible | A first-time visitor can identify search immediately; normal query/results and failure recovery remain functional. |
| Confirmed | Products are unambiguous | The selected pack, factual price, stock state and next action are understandable with representative catalogue records. |
| Confirmed | Complete visual replacement | Owner review finds a coherent new identity and compositions across core screens; old rounded-panel/shelf grammar is not retained by default. |
| Confirmed | Commerce continuity | Existing routes, URLs, cart, auth, server amounts, stock checks, retry/idempotency and confirmation remain intact under relevant regression checks. |
| Confirmed | Bilingual access | The same core tasks work in English/Arabic, including long/mixed-script content and RTL. |
| Proposed | Responsive/accessibility review passes | Viewport/zoom/keyboard/state checks above plus appropriate existing automated checks; automated checks do not replace manual review. |
| Open | Business impact | Baseline and desired outcome must be supplied/established before claiming conversion, revenue, search-success or performance improvement. |

This phase succeeds when the owner can review a traceable brief with clear
preservation boundaries and explicit decisions. Historical passing tests are
baseline evidence, not new runtime verification of this documentation task.

## 9. Explicit exclusions

The earlier documentation-only phase is superseded by the owner's explicit local
redesign request. Screen implementation and scoped tokens are now a reviewable
candidate; production changes and unsupported capabilities remain excluded.
No competing visual generator was activated. No backend/commerce/auth/data
migration, route deletion, framework upgrade, provider change or deployment.
No admin/wholesale redesign, new medical/insurance/lab/prescription service,
scanner/camera feature, invented review/rating system, new payment method,
promised delivery time/free delivery, fictional certification or promotional rule.
No copying watermarks, device frames, viewer UI or unrelated competitor brands.
No destruction of still-consumed shared styles or media.

## 10. Review and decisions before screen generation

Review this brief and resolve the minimum decisions recorded in
[decisions.md](docs/design/decisions.md#decisions-needed-before-screen-generation):
confirm or amend the brief; supply any business emphasis; agree the first review
set; agree how visual candidates will be compared; and settle usable preview
content/Arabic review ownership. Open operational facts may remain unknown if
screens omit their claims and use existing gated states.

DESIGN.md is now the forward direction, with explicit candidate/confirmed status.
Approval of this brief alone does not approve candidate styling, generated screens,
provider enablement, runtime implementation or production release.
