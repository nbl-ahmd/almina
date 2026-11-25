# Homepage sections, brand management and banner sizes — 25 November 2026

The owner asked for admin control over homepage sections in the style of Life Pharmacy and Aster: product rows filtered by category,
brand or chosen products, category and brand cards, image tiles, custom carousels and thin section banners, with pages behind them. They
also asked for:

- brand management (name, logo, description);
- a decision on category images;
- separate desktop and phone artwork in English and Arabic;
- Life's image popup;
- a sticky search bar;
- a more compact phone homepage tailored to each screen size.

## What the reference sites do

Life Pharmacy showed a Cloudflare bot check in the built-in browser, which was not bypassed, so it was studied from the owner's
screenshots. Aster (myaster.com) was measured directly at 1440 and 375 pixels wide:

| Slot | Desktop artwork | Phone artwork |
|---|---|---|
| Top promo strip | 2220 × 120 | 764 × 88 |
| Hero carousel | 1600 × 500 | 764 × 376 |
| Section banner above a product row | 2224 × 276 | 764 × 176 |

Both sites use separate files per device and language (Aster file names carry `_APP_`/`_WEB_` and `English`). Life's sections alternate
tinted product rows, image cards and strips, and its popup is a designed portrait poster with one "Shop now" button. Aster keeps a
sticky header with search on phones, uses edge-to-edge hero art, shows categories as three-across image cards, and places two-up
image tiles between product rows.

## Changes

- **Banner frames:**
  - The Al Mina sizes are hero 1600 × 500 / 800 × 400, section strips 1600 × 200 / 764 × 176, and a new **top promo strip** slot at
    2220 × 120 / 764 × 88.
  - Frames **contain-fit** artwork instead of cropping it. Art at these sizes fills the frame exactly, and older banners with text baked
    in letterbox on grey instead of being cut off. This corrects the cover-fit shipped earlier today.
  - The Banners admin accepts a **phone image** (the backend already stored one), and the hero serves it below 768px.
- **One upload field everywhere** (`components/admin/image-upload-field.tsx`): upload a file or paste an approved URL.
  - It reuses the existing image endpoint, which shrinks images to fit 2000 × 2000 and stores WebP on the configured Cloudinary
    account. Transparency is kept and nothing is cropped.
  - If storage is not configured, the field says so and falls back to pasting a URL.
- **English and Arabic:** campaigns, banners and popups were already per-language, and a **Copy to Arabic draft** button now
  duplicates a page as an unpublished Arabic version to translate. The admin hints say Arabic artwork should be mirrored.
- **Popup:** a second style, **Designed poster** (900 × 1200, Life Pharmacy): the artwork fills the card with one full-width button
  under it, and the title stays the dialog's accessible name.
- **Sticky search:** the header sticks with a negative offset. On phones only the search row stays; on desktop the logo, search, cart
  and departments stay. Checkout keeps its own bar, and `scroll-padding-top` keeps anchors visible below the header.
- **Compact phone homepage:**
  - one swipeable row of 64px category tiles instead of two rows of large squares;
  - 16px section spacing and smaller headings;
  - narrower shelf tiles;
  - an edge-to-edge hero, as on Aster.
- **Category images (decision):** the admin's uploaded image is used first, because it is curated and consistent. If there is none,
  the card uses an in-stock product photo from that category, and only then an icon. No card is left as a generic icon while the
  category has stock.
- **Homepage section builder** (Website & growth → **Homepage**):
  - **Layout:** one layout per language, versioned by revision, so concurrent edits fail safely instead of overwriting each other.
  - **Built-in sections:** listed by key, and they can be dragged (or moved with arrows), hidden or interleaved. With nothing published,
    the homepage is exactly today's.
  - **Custom sections:**
    - product row from a category, a brand, current offers or chosen products (4–24 items, in stock first);
    - category cards;
    - brand tiles;
    - image tiles (2/3/4 a row on phones; square, portrait or landscape);
    - image carousel;
    - banner strip.
  - **Section options:** each section can have a tinted background (Life Pharmacy style), a "View all" link, an optional thin banner
    above it, and a UAE-time schedule.
  - **Content rules:** sections store ids, links and artwork only, never prices or stock. Every image needs a description, and links
    must be on this site.
  - **Draft and publish:** staff save a draft, **preview** it (`/?preview=layout`, admins only), then publish or unpublish.
  - **Section pages:** "View all" opens the category, brand or offers page. A row of chosen products gets its own page,
    `/sections/<id>`, with breadcrumbs and CollectionPage data.
- **Brands** (Website & growth → Pages, type *brand*):
  - staff pick the brand from the catalogue, which sets `/brands/<slug>` so the page lists that brand's products;
  - they upload a logo and write a description and body;
  - logos appear on the brand page, the brands index, homepage brand tiles and brand sections.

## Implementation

- **Contract:** `packages/contracts/src/home-layout.ts`.
- **API:** `apps/api/src/modules/growth/home-layout.ts`, collection `home_layouts` keyed by locale.
  - `GET /growth/home-layout` returns the published layout, or 404 when there is none.
  - `GET` and `POST /admin/growth/home-layout` read and save the layout.
  - `GET /admin/growth/brands` returns distinct catalogue brand names.
- **Storefront:**
  - `components/home-sections.tsx` renders the custom sections and `app/(storefront)/home-sections.css` styles them, with tint tokens in
    `storefront-tokens.css`.
  - The homepage builds its built-in blocks by key and renders the published (or previewed) order.
  - Every managed image passes the approved-host check before `next/image`, so a bad URL skips the image instead of breaking the page.
- **Admin:** `home-layout-editor.tsx`, `brand-picker.tsx`, `image-upload-field.tsx`.

## Compatibility and rollback

Everything is additive: a new collection and new optional fields. No migration is needed. The homepage is unchanged until a layout is
published. Rolling back the API makes the public layout read return 404, and the homepage falls back to the built-in order.

## Verification

- **Unit:** `tests/home-layout.test.ts` covers the default order, validation of content and links, unique ids, rejection of unknown
  fields (no prices), and schedules.
- **Integration:** `tests/home-layout-integration.test.ts` covers drafts staying private, stale revisions being refused, publishing per
  language, invalid input never being stored, a corrupted row falling back to the built-in homepage, and the brand list. All 244
  integration tests pass.
- **Browser:** `tests/e2e/home-layout.spec.ts` checks that a published layout renders custom sections in order, that scheduled and
  hidden sections stay out, that there is no overflow at 390 and 1280, that the "View all" section page works, and the built-in
  fallback with its 404 section page.
- **Visual:** checked on the local preview with Cloudinary's public demo artwork at 390 and 1280.
