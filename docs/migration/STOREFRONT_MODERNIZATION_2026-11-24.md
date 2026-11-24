# Storefront modernization pass — 24 November 2026

Branch `codex/storefront-modernization`, from `master` at `f96513f`.

## Scope and direction

The request was a full redesign and engineering pass across the customer storefront. The approved **Market Green / Coral** direction
(`DESIGN.md`, `docs/design/*`) already governs the storefront and is largely implemented, so this pass treated it as the design authority
and closed the gap between the rendered app and that direction. It did not choose a new visual world. The new checkout-flow references
(`docs/design/references/checkout flow/`, Zomato, 1mg and Noon style carts) were used for layout patterns only: unboxed lines, full-bleed
section bands, an exposed bill and one pay bar. Their fees, "pro" banners, savings claims and free-delivery prompts were **not** copied,
because Al Mina has no data behind them.

Commerce logic is unchanged. Pricing, stock, quote, coupon, payment and order creation keep their existing owners, and the server still
validates every value the browser sends.

## Method

1. Read `AGENTS.md`, `apps/web/AGENTS.md`, `DESIGN.md`, `PRODUCT.md`, every `docs/design/*.md`, the recent storefront migration records,
   the reference images and the version-matched Next.js 16.4.6 docs (viewport API).
2. Baseline: typecheck and lint clean; 323 unit tests passed and 3 skipped.
3. Baseline screenshots of 15 customer routes at 320, 360, 390, 430, 768, 1024, 1280, 1440 and 1920 px, using the isolated
   `.local-demo` catalogue (24 sample products, synthetic data only).
4. Performance baseline from a **production** build of `master` in a separate worktree. The harness used a 390 × 844 mobile viewport,
   4× CPU throttle and roughly 1.6 Mbps download with 150 ms latency, and took the median of three loads per page.
5. Audit, fixes, then an after sweep at the same widths and measurements on a production build of the branch.

Harness scripts are in the git-ignored `.local-demo/redesign/` folder (`capture.mjs`, `perf.mjs`, `cls.mjs`, `cta.mjs`, `chunks.mjs`).

## Audit findings (prioritised)

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | P0 conversion | **No checkout button on 768–899 px** (portrait tablets). The inline link is hidden below 900 px and the sticky bar was hidden from 768 px | `cta.mjs`: 0 visible checkout links at 768 and 899 px |
| 2 | P1 systemic | Legacy `sm:/md:/lg:/xl:` and `.hidden` helpers in `globals.css` are unlayered and fire at 640/768/1024/1280 px. They overrode the storefront's own Tailwind utilities, which use the documented 600/900/1200 px breakpoints, for about 80 storefront usages | Cause of #1 |
| 3 | P1 performance | ~310–350 KB of compressed JS on every page. zod and the whole `@almina/contracts` barrel (~32 KB gz) were bundled site-wide, because the cart badge, the add-to-cart button and the header delivery chip used zod to read `localStorage`. The full delivery sheet (forms, response schemas) also shipped on every page | `chunks.mjs` |
| 4 | P1 Core Web Vitals | Layout shift: cart **0.31**, checkout **0.48** (poor). The footer started on screen while the client cart loaded, then jumped. Listings showed 0.05–0.08, caused by the server-rendered filter summary being swapped for the mobile Filters pill | `cls.mjs` |
| 5 | P1 network / hosting | Every guest page view requested `/api/customer/saved`, which round-tripped to the API only to return 401. The cart's delivery sheet and checkout did the same for `/addresses` and `/me`. These are serverless invocations on Vercel and outbound traffic on Render | `perf.mjs` (`api: 1` on every page) |
| 6 | P2 consistency | Product cards showed prices with the dirham mark, while cart and checkout printed "AED 40.00" | Screenshots |
| 7 | P2 semantics | PDP "Out of stock" was rendered in the **success** green | Screenshot at 1280 |
| 8 | P2 visual noise | Every card carried an "In stock" badge, product packs were small inside the media well, and names were link-green rather than ink (DESIGN.md: "dark type leads the eye from product name to pack size to price") | Screenshots |
| 9 | P2 composition | The phone cart nested boxed groups, a dashed coral delivery prompt, and an "Image unavailable" caption clipped inside 64 px thumbnails. `docs/design/page-patterns.md` asks for whitespace and selective dividers | Screenshots |
| 10 | P2 PWA | Manifest had no `id`/`scope`/description, no maskable icon (the mark fills the canvas and would be cropped) and no shortcuts. There was no `viewport-fit=cover`, so iOS reports zero safe-area insets and the existing `env(safe-area-inset-bottom)` padding on fixed bars never applied in the installed app | Code |
| 11 | P3 | Bottom-nav label broke mid-word at 320 px ("Accoun‑t"). Internal "View all" links used an up-right (external) arrow | Screenshots |
| 12 | P3 tokens | 40 arbitrary `text-[var(--color-…)]`/hex utilities and one off-palette `--color-danger` fallback (#b42318) | grep |

## Changes

### Network and bundle (commits `938b19a`, `36e3794`, `9634352`, `eb98e0c`)

- The storefront shell renders `data-customer-session` from the presence of the session cookie, and `accountRequest` updates it on
  sign-in and sign-out. Layouts do not re-render on client navigation, so without this a fresh sign-in would read as a guest
  (covered by a new `customer-account.spec.ts` test). Guests skip session-only reads, and the
  `/api/customer/*` proxy answers tokenless session-only reads with the API's own 401 body without an upstream call
  (`lib/account/session-reads.ts`, `lib/account/session-hint.ts`). An in-page sign-in still re-enables the saved-list read.
- Dependency-free browser readers (`lib/browser-validation.ts`) replace zod for the cart, delivery area and point, and search attribution.
  `tests/browser-validation.test.ts` asserts that each reader accepts and normalises exactly what its zod schema does. The zod schemas
  remain for the server, in `lib/location/schema.ts` and `lib/catalog/model.ts`.
- `deliveryEmirates` moved to the dependency-free `@almina/contracts/delivery-emirates` (re-exported unchanged from `location.ts`).
- The delivery sheet (`components/delivery-sheet.tsx`) loads on first open or when the first-visit prompt is due. The header chip stays eager.
- `money()` moved to the dependency-free `lib/catalog/money.ts` (re-exported from `model.ts`).
- Product images import `@almina/contracts/media`, the save button no longer imports the catalogue model, and the layout's Google merchant
  widget lives in its own module apart from the order-survey validator.

### Design system and components

- **Tailwind v4 tokens.** The approved palette and radius scale are theme tokens (`text-forest`, `bg-surface`, `text-warning`,
  `rounded-card`, …). They are bridged through `--sf-*` aliases so they still resolve inside the scoped `.storefront-shell`. All arbitrary
  colour utilities in storefront components now use them, and the off-palette danger colour became `error`.
- **Responsive boundary.** Legacy helpers in `globals.css` no longer reach inside `.storefront-shell`, so storefront utilities follow the
  documented breakpoints. This fixed the tablet checkout gap.
- **Product card.** Availability badge only when the product is unavailable (recorded in `docs/design/components.md`). Larger pack in
  the 5:4 media well. Names in ink with forest on hover. Badges use `rounded-badge`.
- **Prices.** Cart and checkout display amounts with the shared `CurrencyAmount` (dirham mark plus spoken "AED …"). Text labels such as
  "Pay AED …" keep the formatted string.
- **Stock.** The PDP shows "Out of stock" in the warning colour.
- **Cart on phones.** Lines and the bill sit on the canvas, separated by full-bleed surface bands. The delivery prompt is a quiet surface
  row. Thumbnail fallbacks show the glyph only. Cart line names use ink.
- **Layout stability.** Cart and checkout reserve a screen while loading, including the empty-checkout state (empty-cart CLS 0.81 → 0). The checkout order card renders placeholder rows for the stored
  lines. The server-rendered filter summary matches the mobile pill below 900 px.
- **Navigation.** Tab labels wrap only between words, with a smaller size below 360 px. Internal links use a direction-aware right arrow.

### PWA

- `manifest.json`: `id`, `scope`, `start_url`, description, `display_override`, categories, maskable 192/512 icons
  (`public/maskable-*.png`, the mark on white inside the safe zone) and shortcuts to search, offers, cart and account.
  Admin keeps its own `/admin/manifest.webmanifest`.
- Storefront `viewport` export with `viewport-fit=cover` and `theme-color`. Side safe-area insets on the shell and fixed bars for
  landscape notches. The admin viewport is untouched.
- The service worker is unchanged. It is shared with admin push and the order alarm and has an explicit no-cache policy, so offline
  caching was deliberately not added.

## Results

Production builds served by `next start` against the same isolated demo API. Baseline is `master` at `f96513f`; after is this branch
at `eb98e0c`. Mobile 390 × 844, 4× CPU throttle, ~1.6 Mbps / 150 ms, median of three. JS and total are encoded transfer sizes.

| Page | JS KB gz (before → after) | Total KB | Requests | API calls | LCP ms | CLS | TBT ms |
|---|---|---|---|---|---|---|---|
| home | 304 → 237 | 500 → 432 | 42 → 37 | 1 → 0 | 736 → 760 | 0 → 0 | 111 → 75 |
| products | 308 → 243 | 493 → 427 | 40 → 35 | 1 → 0 | 2164 → 2116 | 0.051 → 0.003 | 132 → 98 |
| category | 308 → 243 | 455 → 389 | 33 → 28 | 1 → 0 | 640 → 660 | 0.073 → 0.004 | 100 → 64 |
| search | 308 → 243 | 451 → 385 | 32 → 27 | 1 → 0 | 676 → 680 | 0.079 → 0.007 | 77 → 46 |
| product | 319 → 310 | 462 → 452 | 32 → 30 | 1 → 0 | 692 → 728 | 0 → 0 | 105 → 75 |
| cart | 321 → 313 | 460 → 451 | 35 → 33 | 1 → 0 | 648 → 2952 | 0.313 → 0.004 | 82 → 97 |
| checkout | 339 → 334 | 465 → 461 | 35 → 32 | 2 → 0 | 644 → 2788 | 0.483 → 0.01 | 79 → 89 |

- **JS:** −65 KB gz (−21%) on home, listing, category and search. zod and the contracts barrel no longer load on those pages.
  Product, cart and checkout still load zod by design: reminder sign-up and coupon/checkout responses are validated with their schemas.
- **API calls:** guest page views make no customer API request (before: one 401 round trip per view, two on checkout).
- **CLS:** every measured page is now below 0.01 (before: 0.31 cart, 0.48 checkout, 0.05–0.08 listings).
- **TBT:** lower on discovery pages (−25% to −40%). Within noise on cart and checkout.
- **LCP on cart/checkout reads higher (≈0.65 s → ≈2.9 s). This is a change in what is measured, not a slower page (inference, not separately
  timed).** Before, the footer started inside the viewport while the device cart loaded (`cls.mjs` recorded it at y≈583 before it
  jumped), so the footer was the largest paint. With space reserved, LCP is now the cart lines, which arrive after hydration plus the
  `loadCart` server action. Making that faster needs server-side cart state (a cookie-backed cart). That is a separate, behaviour-sensitive
  change and was not made here.

Visual sweep (after): 15 routes × 9 widths, **no horizontal overflow** anywhere. The only console errors are the intentional 404 route and
the guest `/account` reads. Screenshots are in `.local-demo/redesign/{baseline,after}/` (git-ignored, local evidence).

Verification: typecheck and lint clean; 328 unit tests pass, including the new `session-reads` and `browser-validation` tests. 124
storefront, checkout, coupon, Arabic, search, filter, navigation and account Playwright specs were run on an isolated production build:
122 passed on the first run. The 2 failures were spec assumptions changed by this work: a literal "AED 20.00 per item" `textContent`
check, and a signed-in fixture without a session cookie. Both specs were updated, and the affected 48 specs passed on rerun.

## Coverage of the original brief

This pass covered the shared system: tokens, breakpoints and the product card, plus discovery-page performance, cart and checkout
stability and presentation, guest network traffic and PWA basics. It did **not** redesign every customer page, and some parts of the brief
remain open:

- Page-level composition passes for the home, PDP, account, information and policy pages beyond the shared component changes.
- A motion and interaction pass (Emil/animation skills). No motion was added or changed.
- An SEO and structured-data audit. The existing metadata, canonical, JSON-LD and sitemap implementation was not modified or re-audited.
- Full end-to-end journeys with sign-in against the real customer API. Browser specs cover them with fixtures only.

## Not changed / follow-ups

- The root `<html lang>` stays `en`. The storefront wrapper carries the correct `lang`/`dir`. Making the root locale-aware needs a decision for admin routes.
- Section subtitles such as "Small essentials. A little more care, every day." are approved copy and were left alone.
- Radix still ships for the menu, gallery and filter sheet. Replacing it with native `<dialog>` is a separate, behaviour-sensitive change.
- `/brands` renders only its heading when no curated brand has catalogue matches (seen on the demo data). It needs an empty state.
- Cart and checkout LCP is bound by hydration plus the `loadCart` server action. A cookie-backed server cart would let these render on
  the server.
- Real-device PWA checks (iOS safe areas, keyboard, install prompt) and native Arabic review remain release checks.

## Rollback

Revert the branch commits. No data, API contract or schema changed. `@almina/contracts` gained one additive subpath export.
