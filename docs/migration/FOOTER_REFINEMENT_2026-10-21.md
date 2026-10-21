# Storefront footer — 21 October 2026

## Scope and direction

Customer storefront footer only. This pass replaces the first footer attempt — a deep-pine slab with a white logo plate — which the owner rejected as off-brand, because the logo could not sit on the dark ground and the uniform ruled columns read flat. The replacement keeps every destination and contact fact and rebuilds the surface inside the storefront's own world: pale-blue band, white panel, mint help card, logo coral for action only.

No catalogue, pricing, stock, checkout, account, API, route, metadata or analytics behaviour changed. The only edit outside the footer is the removal of one duplicate action from the homepage support band. No production data, credential or deployment operation occurred.

## Before / after / why

| Before | After | Why |
|---|---|---|
| Deep-pine closing slab | Pale-blue `#e6f2fc` band holding one white 20px panel | Closes the page inside the storefront palette instead of opening a second, darker identity |
| Logo on a white plate | Bare 140/184px logo on the white panel | The coral wordmark, blue "Pharmacy" and teal flower read as themselves; the plate was a workaround for the dark ground |
| Statement, then a flat four-column ledger with 12 hairlines | Two-zone panel: statement zone plus a mint "Let's talk care" card with phone, email and both actions; four balanced link groups below | Adds three depth layers (band → panel → card) and gives the help path a real home instead of repeating contact rows in a column |
| Contact rows sat in a link column | Help card keeps phone, email, `Contact our team` and `Call the pharmacy` together | One place to act, with 48px actions |
| Language switch only in the bottom row | Bottom strip carries the legal line, the 44px language switch and a back-to-top control | Keeps the preference reachable and adds a real long-page utility |
| Second link column repeated the local page | Link groups are shop, help, account and visit; the visit group holds the address, map and local page | Even column heights and clearer grouping, with no destination lost |

The homepage support band above the footer lost its duplicate `Call pharmacy` action, so the shared footer card owns the page's single call action; the band keeps its statement and `Let's talk` link. Shop links stay products, categories, offers and brands. Account links are saved products, account and cart. Help links are guides, about, contact and delivery. The visit group carries the address, the map and the Ras Al Khaimah page. No link, label or route was added or removed apart from the new back-to-top and "Open the map" affordances.

## Layout and interaction

The band is full width; the panel uses a 1344px measure and 20px radius. Top zones share one row from 1024px and stack below it, with the mint card inset 12px from the panel edge. The link zone is two columns on mobile — account and visit span the full width there — and four columns from 1024px. Link rows are 44px with no rules, a `subtle` hover fill and coral arrows that appear on hover above 768px. Long labels wrap rather than truncate.

Motion is limited to colour transitions, a 2px arrow travel and a 0.99 press scale, all behind `motion-safe`. Focus rings are ink on the light surfaces. The logo, statement, contact rows and links stay server-rendered; only the existing language and usage-preference controls remain client components.

## Verification

- Visual review at 1440, 1280, 1024, 768, 390, 360 and Arabic/RTL 390. Captures in `outputs/footer-redesign-2026-10-21/`.
- No horizontal overflow at any checked width.
- Contrast against the white panel: links `ocean` 9.51:1, group labels `muted` 6.51:1, ink headings 14.08:1; ink on coral 5.54:1. Coral icons on mint measure 2.54:1 and are decorative, always paired with the text they repeat.
- Targets: footer links 44px, card actions 48px, language switch 44px, back-to-top 44px.
- Focus ring and hover arrow checked at 1440; floating contact control clears the panel at every checked width.
- The global not-found route keeps the same band, panel and card, because the footer carries its own theme variables.
- Back-to-top targets the `#top` body anchor and was click-tested in Chromium from scrollY 2183 to 0, including focus landing on the body target.
- Arabic statement uses normal tracking and 1.25 leading: one line at 390, 768 and 1440 with no overflow.
- `npm run typecheck --workspace @almina/web`, focused ESLint, 15 focused unit tests and the isolated production build pass (Next.js 16.3.8). The design detector reports only the two pre-existing 12px header sizes.
- The optional usage-preference panel was not rendered locally because telemetry is disabled; its light styling is covered by typecheck, lint and build but not a visual capture.
