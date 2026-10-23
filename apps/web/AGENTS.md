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

For storefront UI, read `DESIGN.md`, `PRODUCT.md`,
`docs/migration/REDESIGN_SETUP_2026-10-18.md` from the repository root and the
`almina-project-profile` skill. The owner requested a replacement direction after
the Life, myAster, BinSina and RAK competitor review; the old Figma/PNG layouts and
pale-blue bordered theme are historical references, not constraints on the new
redesign. Keep Heroicons, one optimized storefront font and Tailwind-first styling.
Impeccable owns composition, hierarchy and critique; gpt-taste supplies creative
alternatives within the retail brief; Emil Kowalski's skills own purposeful motion
and interaction details. Load the relevant skill for the task, not every skill.
The official shadcn skill applies only to shadcn component work.
The older overlapping design generators (`frontend-design`, `ui-ux-pro-max`,
`ui-styling`, `design-system`, `design`, `brand`) are not default direction sources
for this project. Use them only for a separately requested task where relevant.
Preserve actual Al Mina content and commerce behaviour. When a new Figma frame
is selected, extract its tokens/components before implementation. Otherwise
establish a coherent replacement system from the competitor-based brief.

Shopping task success, accessibility, truthful product information and performance
override generic skill prescriptions. Do not force AIDA onto catalogue/PDP/cart,
randomize layouts, simulate tool execution, mandate cinematic spacing, install
GSAP, add scroll pinning or use unrelated placeholder imagery just because a
skill recommends it. Choose motion only when it supports the interaction and
honour reduced motion. Do not copy competitor assets or unsupported claims.

Use one coherent styling/design system.

Do not reintroduce overlapping styling stacks such as:

- Bootstrap
- React-Bootstrap
- MUI
- multiple icon systems

unless there is a specific migration requirement.

Target:

- Tailwind CSS
- accessible primitives/components
- one icon family
- reusable project-specific UI components

Visual changes must work on mobile and desktop.

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

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
