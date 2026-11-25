# Brands section, account orders and ratings, banner frames — 25 November 2026

Seven owner requests, with reference screenshots from other shopping apps for the account and rating screens. Their names, offers,
ratings and delivery promises are not copied.

## Admin: Catalogue → Brands

Brand pages already existed under Website & growth → Pages (type *brand*) and were hard to find. `/admin/brands` (administrators only)
now lists every brand written on a product and every brand page, with a logo, and one status per language.

- **Create brand** asks for the name; the editor sets the logo, search description, page text, optional chosen products, questions and
  publishing. English first, then Arabic at the same address.
- Records are the existing `growth_pages` documents (`kind: "brand"`). No new collection, field, route or migration.
- A brand with a page but no products is offered in the product editor's brand list.
- A published Arabic brand page now looks its products up by the English brand name; before, the Arabic title was searched.
- Brands are unpublished, never deleted. There is no separate cover banner: a brand page has one image, its logo.
- Products join a brand page by the exact brand name (compared by URL name). Renaming a page does not rename products.

## Homepage

- **Skincare routine.** The desktop column rule applied to the whole section, so the heading, the three products and the note shared one
  row and names broke mid-word. The rule now applies to the product list only: full-width heading, one card per step from 900px.
- **WhatsApp.** A link at the bottom right of the homepage, in both languages (Google's store badge owns the bottom left). It uses the
  verified number under Website & growth → Pharmacy details, otherwise the published pharmacy number +971 50 482 5007. The production
  profile was empty on 25 November, so the published number is used. **Confirm that number receives WhatsApp.**

## Why the hero banner had grey areas

The frame already depended only on screen width, and artwork is shown whole (never cropped). The live banner file is **2048 × 768
(8:3)**, while the frames are **16:5** on desktop and **2:1** on phones, and it had no phone file. The difference showed as the grey
frame: at the sides on desktop, above and below on phones. A code fault added to it: the phone file applied only below 768px while
the 2:1 frame applied below 900px, so 768–899px screens got desktop art in the phone frame.

| Banner | Screens 900px and wider | Phones and tablets below 900px |
|---|---|---|
| Main carousel | 1600 × 500 (16:5) | 800 × 400 (2:1); 1200 × 600 is sharper on tablets |
| Section strip | 1600 × 200 (8:1) | 764 × 176 |
| Two section strips side by side | 1600 × 400 (4:1) | 764 × 176 |
| Top promo strip | 2220 × 120 (37:2) | 764 × 88 |

A larger file of the same shape is fine. The image upload fields on Website & growth shrink files to fit 2000 × 2000; Banners keeps
up to 2400 wide. Sizes live in `apps/web/src/lib/storefront/artwork.ts`. Upload fields in Banners, campaigns and homepage sections now
warn when a file's shape differs from its frame. **Existing art keeps its bands until replaced**; nothing is cropped automatically.

Supporting campaign cards (1440 × 540 desktop, 800 × 400 phone) still switch at 768px, matching their own frame.

## Product page

A share button sits under the save button. Phones use the system share sheet; other browsers offer WhatsApp, e-mail and copy link. The
address shared is the product's canonical one, without tracking parameters.

## Account

| Screen | Contents |
|---|---|
| `/account` | Profile, shortcuts, three recent orders, rewards, addresses, reminders, preferences, sign out |
| `/account/orders` | Search by product or order number; All, In progress, Dispatched, Cancelled |
| `/account/orders/<number>` | Status steps with recorded times, items, rating, bill, payment choice, buy again, help |

- **Sign-in** adds three plain benefits. Google sign-in now reloads the screen once when reached by in-app navigation, because the
  previous page's security policy blocks Google's button.
- **Order placed** links to "Track your order".
- **Reviews** moved from the product page to the order. The order number is filled in automatically. Rating is offered for confirmed,
  packed and dispatched retail orders, the same rule the API enforces; one review per product, held for moderation. Photo upload from
  the reference screen is not supported by the review service.
- **Status wording** is exactly what the system records. There is no delivery confirmation, so nothing says "delivered".
- Order screens list the 30 most recent orders in the current format for the verified e-mail. Orders from the legacy format were not
  listed before and still are not.

### API change

`GET /api/v1/customers/orders` adds optional `timeline` (status and time only), `paymentMethod`, `paymentState`, `reviews` (the
shopper's own rating and moderation state), `totals.deliveryFeeMinor`, `totals.discountMinor`, `totals.lines[].variantLabel` and
`lineTotalMinor`. Staff identities, addresses and contact details are not returned. The contract is
`packages/contracts/src/customer-orders.ts`.

## Deployment and rollback

No data migration. Web and API can deploy in either order: the new screens work with the old API (without step times, bill lines or
saved ratings), and the old storefront ignores the new fields. Rolling either back is safe.

## Verification

All local, on synthetic data. Nothing was run against production.

- Typecheck, lint, release tests and the foundation, storefront and SEO smoke checks pass.
- Unit tests: 353 passed, 3 skipped. API tests: 172 passed. Integration tests: 251 passed (a fresh worktree needs
  `npm ci --prefix backend` first; without it one retained-server test fails and the run does not finish).
- Browser tests: the full suite passed 257 of 257. After later small fixes the account and storefront-admin specs passed again
  (31, including one added upload-warning test), and the new spec passed three repeats.
- Local demo against the real API at phone and desktop widths: skincare cards and WhatsApp on the homepage; order list and order page
  in English and Arabic; a rating that persisted after reload; the signed-out account screen; a brand published in the admin and its
  storefront page listing its products; the share button on a product page.

Not verified: the live site after deploy; Google sign-in and its reload after in-app navigation (no automated test, and Google sign-in
needs a configured client); whether the published phone number receives WhatsApp; an Arabic brand page listing products in a browser;
the system share sheet on a physical phone; real uploads to Cloudinary; the intermediate commits built one by one.
