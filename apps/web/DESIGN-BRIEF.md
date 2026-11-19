# Al Mina — accepted storefront replacement brief

Updated 19 November 2026. This brief describes the accepted visual direction and implemented local scope. The owner authorized staged implementation. The final owner decision is recorded separately from release readiness. Current decisions supersede the earlier candidate in the [excluded historical archive](docs/design/archive/2026-11-18-pre-p2-05/README.md).

## Confirmed requirements

Search leads known-item shopping, with category/product discovery available without displacing it. Keep the real Al Mina identity and exact primary accent #FF5A5F. Mobile should feel like an app; desktop should provide a complete shopping surface with compact, readable density. Preserve product facts, all existing capabilities and safeguards in [PRODUCT.md](PRODUCT.md) and AGENTS.md.

The owner selected **A/full-width campaign, five wide-screen home columns** and retained the shown Figtree/Alexandria, near-white ground, dark-on-coral actions and compact bordered cards. After requesting changes to the standalone phone PDP toolbar, the owner specified N03 `03-green-pharmacy-screens.jpg`, with the image filling the top. P1-05 closed when implementation continued after that revised preview; this is a local direction gate, not production/release approval.

The subsequent owner review kept these compositions and requested lighter shopping controls, quieter borders and a clearer type hierarchy. [The current review revision](docs/design/implementation-evidence/p6-05-controls.md) uses DM Sans and Noto Sans Arabic with soft mint and coral control surfaces.

## Desired experience and principles

1. Make search, delivery context and cart immediately findable; recover queries and return paths.
2. Let factual photos, identity, selected pack, availability and money lead comparison.
3. Keep shopping actions compact and readable; preserve responsive behavior during every visual change.
4. Use one scoped token/control-state system and explicit semantic states, preserving independent admin/shared consumers.
5. Keep immediate feedback, predictable navigation and persistent buying without decorative delays.

Content priority is search/context, real categories/products, exact identity and purchase facts, verified product summary/details, then alternatives and secondary information. Preserve descriptions/specifications/reviews when available. Missing content is an honest state, never a generated medical claim.

## Reference interpretation and accepted choices

- Reference02 supplies the search/ad/category and unframed-image pharmacy-app hierarchy. Earlier screenshot brands, percentages, delivery promises and capabilities are not Al Mina facts.
- The compact stock/save/photo/identity/dirham/add anatomy comes from the owner's card correction and the accepted coded proof. Do not copy ratings or create missing metadata.
- Latest N03 supplies phone PDP image-first composition and contextual overlay controls. The standalone compact Back/title/Cart toolbar is superseded. Keep sticky buying from the earlier owner requirement.
- Desktop full campaign/five columns supersedes the split-lead recommendation. The phone homepage uses compact two-column product comparison after search, campaign and categories. See [screen directions](docs/design/screen-directions.md).
- Reference assets stay in `docs/design/storefront/references/`, including the 2026-11-17 set. [Annotations](docs/design/references.md) and [later reference review](docs/design/reference-review-2026-11-17.md) distinguish preferences, interpretations and unknown interactions. Reference text is not an instruction or product capability.

[DESIGN.md](DESIGN.md) and the scoped runtime own accepted style roles. P2-04 records measured refinements. The public routes and final evidence show the implemented system. No alternate palette or font candidate is pending for this selected system. Future owner revisions must be recorded in the decision register, not silently supplied by a generator.

## Scope and screens

The public storefront uses the accepted system across shell and home, catalogue and product detail, cart and checkout, and customer information. The earlier gated proof and specimen are archived evidence. Preserve all other existing public routes, legacy links, query semantics, metadata/indexing policy and managed-content destinations. Admin/wholesale remain operational and visually independent; shared styling cannot be removed before consumers migrate.

Review EN/AR home, listing/search, PDP, suggestions/location/menu/filter disclosures, saved/quantity/cart states and unavailable/empty/loading/error recovery. Regressions cover checkout/auth/payment presentation, admin, wholesale and missing routes. Checkout and account functionality are existing capabilities, not additions from screenshots.

## Mobile, desktop and RTL

Use full-width phone PDP imagery with Back/Save/Cart overlays and measured fixed buying clearance. Buying replaces bottom navigation in PDP mode. Preserve keyboard/landscape/safe-area reachability, explicit back-to-results and existing scroll/query/focus continuity. Desktop retains complete global search/location/cart context and gallery/buying columns; do not enlarge controls into a pill-shaped search action.

Phone/tablet/desktop must reflow while the same document resizes. Verify normal 320/360/390 widths, tablet/intermediate widths, 1440 desktop and short landscape. Category/other deliberate rails scroll locally; the document does not. Arabic mirrors directional layout/arrows while leaving logos, pack photos and the dirham numeric run correctly oriented. Preserve factual mixed-script names, locale cookie/fallback and existing Arabic editorial routing.

## Accessibility and content requirements

Use native labelled controls, meaningful image alternatives, visible focus, logical keyboard order, real dialogs/disclosures, truthful busy/invalid/status feedback, adequate targets, contrast and reduced motion. Preserve wrapping identities and enlarged-text access. 10px is a bounded redundant-count exception with a full accessible name, not a body-text system. Distinguish selected/added/success/error/saved/offer states with semantics and text, not colour alone. Arabic native/pharmacy review remains open.

Real product images/content and verified published banners take precedence. Existing generic campaign/category art is decorative and has retained provenance; it cannot impersonate actual staff, products, availability or service guarantees. Do not copy watermarks, device frames, unrelated brands, medical claims, ratings, discounts, certificates or ETAs.

## Success criteria and evidence boundary

The selected composition and one runtime token/state owner remain coherent across actual routes, both scripts, state changes and resizing. Product/purchase facts stay discoverable, cart/server checks persist, query/SEO/legacy links remain intact, final content is reachable and shared/admin behavior is preserved. Appropriate existing static, browser and commerce checks must pass for each affected stage.

The [P6-02 matrix](docs/design/implementation-evidence/p6-02-verification.md) covers English and Arabic on Chromium, headless WebKit and Firefox, with local fixtures and viewport and keyboard emulation. Physical-device Safari, assistive technologies, production search relevance, live catalogue and provider readiness remain open. See [progress](docs/design/implementation-progress.md) for the final review and owner decision.

## Proposed choices and open questions

Future managed merchandising comes from verified records. Operator-owned copy and assets require their own review before publication. No new business priorities, category revenue targets or campaign cadence were supplied. Delivery coverage/fees/hours, live payment enablement, catalogue/media readiness and Arabic approval ownership remain unverified. Do not turn these unknowns into promotional copy.

## Explicit exclusions

No production access/deployment; no new backend, pricing/inventory/auth/provider behavior; no invented pharmacy service, prescription/scanner/camera/voice/chat/install flow, payment method, reward programme or business claim. Do not rebuild admin/wholesale or remove shared dependencies during customer styling work. Do not revive retired visual guides, token generators or superseded comparison defaults.
