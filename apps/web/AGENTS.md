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

Read PRODUCT.md for verified facts, DESIGN-BRIEF.md for scope, DESIGN.md for the
accepted replacement system and docs/design/screen-directions.md for compositions.
The decision register records precedence; implementation-progress.md owns status.
The public routes use the accepted system. Check the [verification matrix](docs/design/implementation-evidence/p6-02-verification.md)
and the progress ledger for local evidence, owner acceptance and release inputs.

The accepted runtime value source is
`src/components/storefront-system/tokens.module.css`. Its opted-in state/control
owner is `boundary.module.css`. DESIGN.md and `.impeccable/design.json` are checked
documentation projections, never inputs for regenerating CSS. Do not create a
competing palette/token stack or restore rejected values from metadata, references,
archives, generic skills or old public styling. Preserve exact #FF5A5F and the
actual logo; only recorded owner revisions change the accepted direction.

The legacy palette in `src/app/(storefront)/storefront-tokens.css` serves
wholesale and root missing-page recovery. Its shared shell geometry and the
fallback controls in storefront-controls.css support the consumers recorded in
`docs/design/implementation-evidence/p6-01-retirement.md`. Route CSS owns layout;
accepted controls use their single boundary owner. Do not add competing colour,
size or radius utilities to migrated controls. Shared Button APIs/admin themes
remain independent; native checkout/auth/payment logic stays unchanged.

Trace consumers before removing shared rules, fonts, component APIs or media.
Preserve EN/AR/RTL, keyboard/focus/semantics, contrast, targets, reduced motion,
loading/empty/error states, query/legacy URLs, SEO and every server-authoritative
commerce/auth/API contract. Use actual catalogue/media/content; never infer claims
or services from screenshots. No production data/provider access or deployment.

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

## Accepted storefront precedence and boundaries

Owner-selected A/full campaign and five wide-screen home columns supersede the
split/four-column comparison. The owner kept those layouts and requested lighter
controls and stronger type hierarchy. The current review revision uses DM Sans,
Noto Sans Arabic, soft mint control surfaces and quiet coral quick add. Latest N03
image-first phone product detail keeps the overlay controls and purchase dock.

Use current retail routes to review working components. The former specimen is
historical evidence. `docs/design/implementation-evidence/p2-04-refinement.md`
records the baseline contrast and motion decisions. The [current control revision](docs/design/implementation-evidence/p6-05-controls.md) and DESIGN.md describe the current treatment. Preserve default/explicit shape
APIs, bounded label wrapping and portal theme/direction. Compiled foreground/control
aliases resolve through scoped `--ui-*` bridges; verify emitted/computed CSS and
fallbacks using `p2-02-cascade.md` before changing shared aliases.

The pre-P2-05 archive and migration/review records are historical evidence only,
excluded from new visual guidance and regeneration inputs. Do not use a general
purpose design generator to overwrite the selected world. Admin retains its own
scoped DESIGN.md/sidecar; no shared dependency removal before consumer migration.
