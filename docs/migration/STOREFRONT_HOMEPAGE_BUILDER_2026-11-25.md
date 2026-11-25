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
  - **Built-in sections:** listed by key, and they can be dragged (or moved with arrows), hidden or interleaved. This includes the thin
    promo strip and the main carousel. With nothing published, the homepage keeps the built-in order.
  - **Custom sections:**
    - product row from a category, a brand, current offers, chosen products, or **filtered** products (category, brand, on offer, in
      stock and a price range combined, with a sort order; at least one filter), 4–24 items;
    - category cards;
    - brand tiles;
    - image tiles (2/3/4 a row on phones; square, portrait or landscape);
    - image carousel;
    - banner strip.
  - **Section options:** each section can have a tinted background (Life Pharmacy style), a "View all" link, an optional thin banner
    above it, and a UAE-time schedule.
  - **Content rules:** sections store ids, links and artwork only, never prices or stock. Every image needs a description, and links
    must be on this site.
  - **Draft and publish:** the saved draft and the live layout are stored separately. **Save draft** never changes what customers see;
    **Publish** copies the draft live; **Unpublish** returns to the built-in homepage and keeps the draft. Staff can **preview** the
    draft (`/?preview=layout`, admins only) and **copy it to the Arabic draft**. A layout holds at most 12 product and category rows.
  - **Section pages:** "View all" opens the category, brand or offers page. A row of chosen products gets its own page,
    `/sections/<id>`, with breadcrumbs and CollectionPage data.
- **Custom pages** (Website & growth → Pages & campaigns, type *page*): a page at `/pages/<slug>` (and `/ar/pages/<slug>`) built from
  the same sections, with an optional introduction, SEO title and description. Banners, image tiles and homepage sections can link to it.
- **Brands** (Website & growth → Pages & campaigns, type *brand*):
  - staff pick a catalogue brand or type a new one, which sets `/brands/<slug>` and starts the title and description;
  - they upload a logo and write a description and body;
  - the brands index lists every published brand page (even before products carry the name) and every brand with products;
  - logos appear on the brand page, the brands index, homepage brand tiles and brand sections.
- **Banner language:** the Banners page has **Show on**: English and Arabic, English only, or Arabic only. Existing banners keep showing
  on both.
- **Desktop layouts:** from 900px product rows page with previous and next buttons (five, six or seven across) instead of hiding the
  extra products; category tiles span the row; "View all" is an outlined button. Phones keep the swipeable rail.

## Implementation

- **Contract:** `packages/contracts/src/home-layout.ts`.
- **API:** `apps/api/src/modules/growth/home-layout.ts`, collection `home_layouts` keyed by locale: `{revision, sections (draft),
  live}`.
  - `GET /growth/home-layout` returns the published layout, or 404 when there is none.
  - `GET` and `POST /admin/growth/home-layout` read and write it; the write takes `action: save | publish | unpublish`.
  - `GET /growth/brands` lists the brands shoppers can see; `GET /admin/growth/brands` all catalogue brand names.
- **Storefront:**
  - `components/home-sections.tsx` renders the custom sections and `app/(storefront)/home-sections.css` styles them, with tint tokens in
    `storefront-tokens.css`.
  - The homepage builds its built-in blocks by key and renders the published (or previewed) order.
  - Every managed image passes the approved-host check before `next/image`, so a bad URL skips the image instead of breaking the page.
- **Admin:** `home-layout-editor.tsx` (also the page section editor), `brand-picker.tsx`, `image-upload-field.tsx`.
- **Contracts:** shared on-site link validation in `packages/contracts/src/links.ts`; growth kind `page` with `sections`.
- **Shelves:** `components/product-shelf.tsx`.

## Compatibility and rollback

Everything is additive: a new collection, new optional fields (`sections` on growth pages, `locale` on banners) and a new page kind. No
migration is needed. The homepage keeps the built-in order until a layout is published.

- A layout row saved by an earlier build of this branch (a single `published` flag) is still read; the first save replaces that flag with
  `live`.
- Rolling back the API makes the public layout read return 404, and the homepage falls back to the built-in order.
- An older API ignores a banner's `locale`, so language-specific banners would show on both languages after a rollback.
- **Pages and coupons saved after this release are not readable by the previous API.** See [Rolling back](#rolling-back-the-api)
  below. Prefer fixing forward.

## Rolling back the API

The previous API reads `growth_pages` and `checkout_coupons` with strict schemas, so unknown fields are rejected, not ignored:

- every page saved by this release stores the new fields (with defaults), and one such row makes the previous page list fail;
- homepage campaigns saved by this release are skipped;
- every coupon saved by this release makes the previous admin coupon list fail, and checkout would apply a **scoped** coupon to all
  eligible products.

Before deploying the previous API and storefront together:

1. Take and verify a backup of `growth_pages` and `checkout_coupons`.
2. Disable every coupon whose scope is not "all".
3. Export, then take out of `growth_pages`, rows of kind `page` (the previous API has no such kind).
4. Set `homepagePlacement` to `none` on rows placed as `strip` or `popup`.
5. Unset `heroLayout`, `textTone`, `ctaHref`, `stripSlot`, `popupLayout` and `sections` on `growth_pages`.
6. Unset `title`, `description`, `scope` and `listed` on `checkout_coupons`.

These steps have not been rehearsed against a database, and no script performs them.

## Defects found by clicking through the admin

Signed-in browser tests found that the homepage layout could not be saved from the admin screens at all: the read route also answered
the write with 405. Integration tests had called the save function directly. The route is fixed, and the browser test now covers it.
Choosing a brand also left the placeholder title "New page"; it now takes the brand name.

## Verification

- **Unit:** `tests/home-layout.test.ts` and `tests/banner-locale.test.ts` cover the default order, content and link validation, filters,
  unique ids, rejection of unknown fields (no prices), schedules and banner language.
- **Integration:** `tests/home-layout-integration.test.ts` covers drafts staying private, a later draft leaving the live layout alone,
  stale revisions being refused, publishing per language, invalid input never being stored, a corrupted row falling back to the built-in
  homepage, and the brand lists.
- **Browser:** `tests/e2e/home-layout.spec.ts` checks the storefront rendering. `tests/e2e/storefront-admin.spec.ts` signs in and checks
  save, publish, unpublish and the Arabic copy; custom and brand pages; a banner for one language; a category coupon; and the popup.
- **Visual:** checked on the local preview with Cloudinary's public demo artwork at 390 and 1280; the editor was checked at 390 and 1280.
- **Not verified:** uploading an image file from these screens against real Cloudinary (the tests paste approved URLs, apart from one
  banner upload to the synthetic fixture), and any hosted or production environment.
