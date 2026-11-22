# Market Green / Coral storefront implementation

## Baseline and inventory

Branch `feat/market-green-coral-storefront` starts from local integration commit `fdc292a`, including the reset reviewed in PR #102. The approved uncommitted root design documents are carried into this branch. The current task uses that agreed baseline and introduces storefront-only presentation changes. Admin, wholesale, API, authentication and commerce owners remain in place.

The customer route inventory includes home, products, categories and departments, search, brands, offers, collections, routines, guides, cart, checkout and Stripe return, account, saved items, policies, regional, contact, error and not-found pages. Main presentation boundaries are navigation, homepage, catalog-list, product-card, product-gallery/options/information, cart-view, checkout-form and customer account/sign-in/address components. PWA service workers, legacy route redirects and both English/Arabic locale flows already exist.

## Utility audit before scanning

The reset left utility strings for layout, responsive visibility, spacing, position and interactions. They currently have no Tailwind engine. Sources contain old 768/1024px boundaries, decorative pill/shadow/uppercase classes and shared primitive class strings. Enabling global automatic detection would reactivate these outside the intended surface.

The implementation explicitly scans only customer routes and reviewed shared component files, and contain generated utilities inside the storefront surface. New semantic CSS sets the approved card, campaign, control and 900px navigation rules over inherited layout strings. Root browser defaults and admin/wholesale consumers retain their styling behavior. No global preflight is introduced.

[Explicit Tailwind source registration](https://tailwindcss.com/docs/detecting-classes-in-source-files) supplies scanning controls. Next.js bundled CSS, font and image docs are resolved through `npm run docs:next` before framework edits.

## Implementation and validation

The storefront now maps the approved semantic tokens directly to scoped CSS custom properties. Tailwind v4 scans explicit customer/shared-primitive sources inside `@scope (.storefront-shell)`, without global Preflight. Local Manrope/Noto Sans Arabic fonts and Phosphor icons replace the storefront presentation while existing admin icon imports remain untouched. The existing `cn`, CVA, Radix and Sonner stack is retained; no second class-merging engine or additional animation/carousel library is required.

Shared shell, campaign/category discovery, shelves, listing/search, gallery/options, cart, checkout, account and secondary routes use the same surface boundary. The gallery supports swipe, keyboard controls and focus-restoring zoom. Mobile filters keep draft changes local, commit through the existing GET form, and support Reset/Cancel/Escape/Back. A single product action instance docks after its inline region leaves view and retains quantity; browsing navigation yields to it. Cart review precedes recommendations, and checkout uses compact identity chrome.

The purchasing controls continue to call the existing server actions. No API, database, auth, inventory, pricing, payment, webhook or service-worker implementation changed. The browser regressions verify current quotes, immutable option identity, forged-total rejection, stock limits, uncertain-result recovery, card/cash choice and synthetic payment cancellation.

The visual finish review identified five material changes: purchase-first PDP sequencing, cart-summary order, compact checkout chrome, row price alignment and the approved fluid PDP title scale. All five were resolved in one correction batch and confirmed by the reviewer. See [design review](MARKET_GREEN_STOREFRONT_DESIGN_REVIEW_2026-11-21.md) and [validation evidence](MARKET_GREEN_STOREFRONT_VALIDATION_2026-11-21.md).

## Asset provenance and delivery limits

Fonts are the official Google Fonts Manrope and Noto Sans Arabic variable fonts with their OFL licenses retained alongside the files. The campaign reuses the repository's existing `apps/web/public/design/campaigns/almina-care-courier.png`, without asserting that the depicted person is a pharmacy employee or clinician. The five supplied references remain inspiration, not copied brand assets. Product media stays catalogue-supplied; absent images remain honest fallbacks.

The local demo is isolated and synthetic. No production orders, payments, catalogue changes or provider messages were created. Physical-device PWA/keyboard, assistive-technology and production field-performance verification remain release checks. This branch is prepared for review, not deployed or merged. PR #102 remains the integration prerequisite.
