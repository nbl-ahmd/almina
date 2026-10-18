# Administration console redesign — 18 October 2026

Frontend-only redesign of the Next.js administration module
(`apps/web/src/app/(admin)/admin` and `apps/web/src/components/admin`).

No API, contract, database, policy, route or commerce behaviour was changed.
No dependency was added. The work is presentation, layout and information
architecture on top of the existing authorised reads and mutations.

## Why this was safe to do now

The storefront redesign brief (`REDESIGN_SETUP_2026-10-18.md`) told the storefront
to leave administration alone. That constraint prevented admin styling from being
changed as a *side effect* of storefront work. It was never a ban on improving
administration when the owner asks for it directly, which is what happened here.

Administration keeps its own stylesheet, its own metadata and its own design
tokens. Nothing in the storefront layers reaches `.admin-app`, and nothing here
changed storefront rendering.

## What changed

### Design system (`app/(admin)/admin/admin.css`)

Rewritten as a scoped `.admin-app` design system on the existing semantic theme
tokens (`--color-brand`, `--color-ink`, `--color-border`, …). Still declared in
`@layer components`, so Tailwind utilities continue to win where a component needs
a one-off override.

Added: shell layout (sidebar / main / content container), sticky topbar, grouped
navigation, page header, cards, stat tiles, badges, bar list, SVG trend chart,
table and pagination styling, segmented filters, form panels, fieldsets, notes,
empty states, login panel and responsive behaviour.

Removed ambiguity that caused real bugs during verification: rules that targeted
bare elements (`button`, `a`) were losing specificity fights with the new shell, so
the shell rules are now scoped (`.admin-app .admin-menu`, `.admin-app .admin-scrim`,
`.admin-app .admin-num`). The scrim in particular was rendering as a grid item on
desktop and pushing all page content into a 268 px column.

### Shell (`components/admin/shell.tsx`, new)

One client component owning the chrome: grouped sidebar with Heroicons and
`aria-current` active state, user chip, session controls, live-update strip, and a
mobile drawer with scrim, `aria-expanded`/`aria-controls`, Escape to close, and
scroll lock. Page content is passed through as `children`, so every page stays a
Server Component; the client boundary is the chrome only.

The active navigation item is resolved by longest matching `href`. The dashboard
lives at `/admin`, which prefixes every other route, so a plain prefix test marked
Dashboard as active on every screen.

### UI primitives (`components/admin/ui.tsx`, new)

Server-safe presentational components: `PageHeader`, `Card`, `Badge`, `StatTile`,
`StatGrid`, `BarList`, `TrendChart`, `Note` and the order-status tone map. No
hooks, no browser APIs, no chart dependency.

### Dashboard (`components/admin/dashboard.tsx`, new)

Replaces the previous three-line dashboard with:

- KPI tiles: orders in view, awaiting confirmation, needs action (exact total,
  admin only), store availability (admin) or order value (staff).
- Order status distribution and orders-per-day trend.
- System health card (admin only) summarising operations alerts and per-group
  request/failure counts.
- Recent orders table with status badges.

**Every figure is real and labelled as what it is.** Orders are read from the
existing `orders` endpoint with `limit=25`; the copy says the figures are based on
the 25 most recent orders the account can access. Needs-action uses the existing
total from `products/needs-action`. Health data is the existing per-process
operations snapshot, and the card repeats its own caveat that one process is not a
hosting-wide total. No metric was invented, estimated or extrapolated, and nothing
is pre-computed or cached.

Optional reads `products/needs-action`, `store/status` and `operations` are
admin-only in the gateway, so they are guarded by role and by `try/catch`. A
failure degrades that one card instead of failing the dashboard. That also keeps
the synthetic fixture, which does not implement `operations`, usable.

### Section pages

`[[...section]]/page.tsx` and the section components now use `PageHeader` plus
cards, badges, filter bars and pagination. All existing behaviour is preserved:
every read, every mutation, every confirmation prompt, and every role check is
unchanged. Orders moved its status filter into a segmented control that still
writes the same `?status=` query parameter.

`needs-action`, `operations-view`, `catalog-import` and `recovery-import` were
moved off their ad-hoc slate/teal utility colours onto the shared classes, with a
single primary action per surface.

### Accessibility fixes found by verification

- The product editor had an `h1 → h3` heading skip (`Cloudinary product images`);
  the readiness disclosures had the same problem. Both are now `h2`.
- Inline links inside body paragraphs failed `link-in-text-block` once the old
  underline utility classes were dropped, so `.admin-app p a` restores an
  underline affordance.
- Unstyled `<fieldset>`/`<legend>` from the browser default stylesheet now follow
  the design system, and checkbox rows no longer stack.

## Verification

- `npx tsc --noEmit` in `apps/web` — clean.
- `npx eslint apps packages tests scripts/tooling playwright.config.ts` — clean.
- `tests/admin-migration.test.ts`, `tests/operations.test.ts`,
  `tests/stylesheet-policy.test.ts`, `tests/next-lint.test.ts` — 17/17 pass.
- `scripts/tooling/verify-admin-browser.mjs` against the synthetic fixture and an
  isolated dev server — passes: 15 routes, 60 responsive checks (360/390/768/1280)
  and accessibility audits, plus login/logout/reload, order dispatch, multipart
  product update, legacy redirects, order-arrival/outage recovery and staff denial.
- Screenshots for 14 screens at desktop, tablet and mobile widths were reviewed
  visually. They are local artifacts under `.verification-results/` (git-ignored)
  and are not committed.

### Harness correction

`verify-admin-browser.mjs` clicked **Save product** without filling
`stockReason`, a `required` field, so native constraint validation blocked the
submit and the following `Saved successfully.` wait timed out. This was a
pre-existing gap in the script, not a regression: the field's `required: true` and
the form's rendering were untouched, and the same step fails against the previous
code. The script now fills the field, which is what a real operator must do.

## Not changed

- No API route, gateway policy, `accessPolicy` rule, session handling or RBAC.
- No pricing, tax, delivery fee, stock, inventory or order logic.
- No MongoDB model, index, migration or data write.
- No route was renamed or removed; legacy admin redirects still pass.
- No new dependency. Charts are hand-written SVG/CSS.
- No cache introduced for authenticated admin data.
- No `localStorage` use; the staff browser check still asserts `localStorage.length === 0`.

## Limits and follow-ups

- The dashboard's commerce figures come from a bounded recent-order page because
  the orders endpoint returns no total. A genuine historical dashboard needs a
  server-side aggregate endpoint, which is a separate, contract-level change with
  its own review — deliberately not attempted here.
- Charts are dependency-free and intentionally simple. If richer charting is
  wanted later, it should be a deliberate dependency decision, not a default.
- The sidebar `Menu` control is mobile-only; the drawer behaviour should be
  re-checked on a real touch device before considering the interaction finished.
