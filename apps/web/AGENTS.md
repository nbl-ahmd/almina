# Al Mina Web — Next.js Agent Instructions

These instructions supplement the repository root `AGENTS.md`.

They apply to the Next.js storefront and admin frontend.

# Framework

Use:

- Next.js 16.x App Router
- the latest stable security-patched 16.x release available
- TypeScript
- React version required by the installed Next.js release
- Turbopack unless a documented compatibility issue requires otherwise

Always inspect the installed framework version before relying on framework-specific behavior.

Use version-matched Next.js documentation.

---

# Rendering Strategy

Default to Server Components.

Use Client Components only when required for:

- browser APIs
- event handlers
- local interactive UI state
- client-only libraries

Do not make an entire route or layout a Client Component merely because one child requires interactivity.

Push client boundaries as low as practical.

---

# Data Fetching

Public catalog pages should render useful content on the server.

Avoid reproducing legacy patterns such as:

`useEffect -> axios -> loading spinner -> render`

when the data can be fetched server-side.

Good server-rendering candidates include:

- homepage catalog content
- categories
- product listings
- product detail
- offer pages
- SEO metadata

Client fetching may still be appropriate for genuinely interactive behavior.

---

# Caching

Caching must be deliberate.

Generally cache:

- catalog metadata
- category information
- banners
- product information that can tolerate bounded staleness

Do not casually cache:

- checkout calculations
- inventory validation
- authenticated admin data
- customer information
- order mutation responses

Any caching decision affecting product stock or pricing must be explicit and documented.

---

# SEO

Use Next.js metadata APIs rather than React Helmet.

Product/category pages should support:

- title
- description
- canonical URL
- Open Graph metadata
- Twitter metadata
- sitemap inclusion where appropriate
- structured data where valid

Do not fabricate reviews, ratings, availability, pricing, or other structured-data properties.

Do not index:

- admin routes
- checkout
- cart
- authentication routes
- arbitrary internal search/filter states unless intentionally configured

Preserve redirects from legacy URLs.

---

# Images

Use `next/image` for storefront media where practical.

Configure trusted image hosts explicitly.

Provide meaningful alt text.

Do not mark every image as priority.

Only likely LCP content should receive high priority.

Specify responsive sizing appropriately.

---

# Styling

The owner rejected the previous storefront candidate and explicitly requested
complete visual replacement on 15 November 2026. Its guide, generated metadata,
page composition, fonts and token values are not a baseline for new work.
Historical material is excluded from current visual guidance. PRODUCT.md owns
confirmed facts. The owner requested the current DESIGN.md as a forward
specification and pinned the primary accent to #FF5A5F. Read its confirmed versus
candidate labels, DESIGN-BRIEF.md, docs/design/screen-directions.md and the decision
register. Do not extract a replacement guide from rejected runtime styling.
The owner subsequently authorized implementation. DESIGN.md and the scoped
metadata record the built local candidate; storefront-tokens.css owns its runtime
values. Owner visual acceptance and production release are separate. Preserve
exact primary #FF5A5F and do not restore retired care-colour families.

Keep the real logo/brand colour family and the supplied interaction references.
The new direction must visibly replace header/navigation, first-screen structure,
category browsing, cards, listing, gallery/purchase hierarchy and footer, together
with a coherent token, type, spacing, shape, state and motion system. Renaming
existing tokens or appending override styles does not constitute replacement.
Retained runtime CSS is temporary implementation, not aesthetic authority.

Keep customer styling scoped. Trace shared/admin/wholesale consumers before
removing shared rules, fonts, component APIs or campaign preview dependencies.
Migrate customer consumers to the replacement system before retiring their old
bindings. Do not introduce a second active customer palette or styling stack.
Preserve English/Arabic/RTL, keyboard use, semantics, visible focus, contrast,
touch targets, reduced motion, loading/empty/error states, routes, query URLs,
SEO and every server-authoritative commerce/auth/API contract. Local preview
only; no production data access, commerce changes or deployment.

---

# Accessibility

Interactive elements must support:

- keyboard operation
- visible focus
- semantic HTML
- labels
- accessible names
- appropriate touch sizes
- readable contrast
- reduced-motion expectations where applicable

Do not replace semantic buttons/links with clickable divs.

---

# State

Keep server state on the server where practical.

Do not create a large global state container by default.

Client state should be limited to interactive concerns such as:

- cart UI
- filter state
- drawers/dialogs
- quantity controls
- local form behavior

Do not store privileged authentication information in localStorage.

---

# Cart

A local cart may store:

- product identifier
- quantity
- presentation hints if useful

It must not be trusted for authoritative pricing, stock, VAT, discounts, delivery fees, or final totals.

Checkout always revalidates with the server.

---

# Browser Verification

After UI changes, verify the running application.

At minimum inspect:

- 360px mobile
- ~390px mobile
- tablet
- desktop

Check:

- layout overflow
- console errors
- broken requests
- navigation
- direct reload
- loading states
- empty states
- errors

For substantial UI changes use browser automation/visual inspection instead of assuming CSS is correct.

For design-language or layout changes, preserve responsive behavior as a release
requirement. Test live resizing of the same loaded page across phone/tablet/desktop
breakpoints, not only fresh navigation at fixed sizes. Check header collisions,
filter disclosure state, grid/card widths, local rails, RTL, and portrait/short
landscape purchase-bar clearance. Keep `tests/e2e/responsive-layout.spec.ts`
passing alongside relevant existing shopping/admin regressions.


<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Latest storefront reference precedence

The owner rejected the category-first identity-overhaul candidate on 15 November 2026. Reference `docs/design/storefront/references/02-pharmacy-app.png` now leads home and PDP. Preserve search → photographic ad → circular categories → image-led home rail, and unframed product gallery → buying sequence → compact related rows. Retain exact primary #FF5A5F and persistent mobile buying access. Earlier 03-style categories, dark campaign asides and the rejected guide are not current authority. Read the current DESIGN.md/brief/decision register. Generated generic campaign/category illustrations may not replace factual product imagery or create claims. Owner visual acceptance remains pending; no deployment.

## Storefront control ownership

`src/app/(storefront)/storefront-controls.css` owns customer action/search/cart
geometry, colour roles and states. Components use semantic variants/classes; do
not add competing background/radius/size utilities to those controls. Route CSS
owns layout only. Shared Button variants and admin/wholesale themes remain
independent. Ghost/link actions must use explicit variants, not inherit the legacy
native button fill. Keep native checkout quantity, auth, quote and payment logic
unchanged during visual work. Cart estimates come from server-loaded catalogue
prices and are never the final checkout quote.

## Staged replacement control boundary

During P2–P5 migration, `storefront-controls.css` owns incumbent `.storefront-shell`
consumers. Opted-in replacement consumers use
`src/components/storefront-system/boundary.module.css` for native base treatment,
shared variants and final states; `tokens.module.css` remains their value source.
Keep colour ownership for these migrated controls out of route layout modules
and competing utilities. Remaining option/gallery selection styles migrate with
the P2-03 component specimen.
Compiled foreground/control aliases resolve through scoped `--ui-*` bridges;
verify the actual scope/fallback rather than assuming a raw custom property wins.
See `docs/design/implementation-evidence/p2-02-cascade.md` before changing shared
aliases, state selectors or portal containers. P2-05 owns full guide reconciliation.
