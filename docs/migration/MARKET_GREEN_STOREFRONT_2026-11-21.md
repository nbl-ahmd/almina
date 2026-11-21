# Market Green / Coral storefront implementation

## Baseline and inventory

Branch `feat/market-green-coral-storefront` starts from local integration commit `fdc292a`, including the reset reviewed in PR #102. The approved uncommitted root design documents are carried into this branch. The current task uses that agreed baseline and introduces storefront-only presentation changes. Admin, wholesale, API, authentication and commerce owners remain in place.

The customer route inventory includes home, products, categories and departments, search, brands, offers, collections, routines, guides, cart, checkout and Stripe return, account, saved items, policies, regional, contact, error and not-found pages. Main presentation boundaries are navigation, homepage, catalog-list, product-card, product-gallery/options/information, cart-view, checkout-form and customer account/sign-in/address components. PWA service workers, legacy route redirects and both English/Arabic locale flows already exist.

## Utility audit before scanning

The reset left utility strings for layout, responsive visibility, spacing, position and interactions. They currently have no Tailwind engine. Sources contain old 768/1024px boundaries, decorative pill/shadow/uppercase classes and shared primitive class strings. Enabling global automatic detection would reactivate these outside the intended surface.

The implementation will explicitly scan only customer routes and reviewed shared component files, and contain generated utilities inside the storefront surface. New semantic CSS sets the approved card, campaign, control and 900px navigation rules over inherited layout strings. Root browser defaults and admin/wholesale consumers retain their styling behavior. No global preflight is introduced.

[Explicit Tailwind source registration](https://tailwindcss.com/docs/detecting-classes-in-source-files) supplies scanning controls. Next.js bundled CSS, font and image docs are resolved through `npm run docs:next` before framework edits.

## Implementation and validation

Pending. Record final commits, browser evidence, regression results and limitations here before completion.
