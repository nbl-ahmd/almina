# Storefront banners, section strips and popups — 25 November 2026

The owner asked for three things, all managed from the admin panel:

- a fixed-height main carousel of designed banner images, either image-only or with text and a button on the left;
- thin, wide section banners between sections (as on Life Pharmacy and Aster);
- offer and information popups when the storefront opens.

Life Pharmacy's homepage serves its hero and "Deals under AED 9/49/99" strips as finished images, each a single link with alt text. Its
pages did not expose image dimensions, so Al Mina's sizes below are its own.

## How staff use it

**Website & growth → Pages**: create a *campaign*, then choose **Homepage position**. This extends the existing campaign system rather
than adding a parallel one.

| Position | Artwork | Notes |
|---|---|---|
| Main campaign carousel | Desktop 1440 × 400, mobile 800 × 400 | **Layout:** "Finished image only" (the whole slide links; the default), or "Image with title, text and button on the left". For the text layout, leave the left 45% of the artwork plain (right 45% for Arabic artwork) and choose dark or white text. |
| Section banner (thin strip) | Desktop 1440 × 200, mobile 800 × 200 | **Where it appears:** Home under categories, Home between shelves, Home above brands, or product listing / category / search pages. Two strips in one place sit side by side on desktop. |
| Popup when the store opens | Optional, 800 × 600 | Uses the title and description. Leave the button text empty for an information-only message. It shows once per device for each saved version, about two seconds after a page loads. It never appears on cart, checkout or account pages, and never over another open dialog. |
| Supporting campaign banners | As before | Unchanged. |

**Button link** (optional, any placement): a page on this site starting with `/`. Leave it blank to open the campaign's own page.
External and admin links are rejected. Schedules, priority, publishing, readiness checks and pinned products work as before.

## Implementation

- **Contract** (`packages/contracts/src/growth.ts`):
  - `homepagePlacement` gains `strip` and `popup`;
  - new fields `heroLayout` (`image` | `overlay`, default `image`), `textTone`, `ctaHref` (local links only) and `stripSlot`.
  - Publish rules follow the placement. Only overlay heroes and supporting banners need button text, strips need artwork, alt text
    and terms, and popups need a message or described artwork.
  - Older admin clients cannot clear the new fields (the `saveLegacyGrowthPage` field list), and the v1 legacy read strips them.
- **API:** `homepageCampaigns` returns up to 8 hero, 4 supporting, 6 strip and 3 popup campaigns. The popup is the one placement allowed
  without artwork.
- **Storefront:**
  - `hero-banner.tsx`: `HeroBanner`, `StripBanner` and `SectionStrips`, with fixed aspect frames (2:1 / 18:5 hero, 4:1 / 36:5 strip)
    so nothing shifts as artwork loads. Legacy `/admin/banners` slides use the same frame.
  - The overlay hero uses a real `<h2>`, and its button's hit area stretches over the slide.
  - `offer-popup.tsx` loads on the client after the page settles, through the existing public campaigns route, so it adds no server work.
- **Admin:** placement options, layout, text colour, button link and strip position, with artwork-size hints and a preview in the exact
  storefront ratios.

## Compatibility and rollback

All fields are additive with defaults, so no migration is needed. Existing hero campaigns default to "Finished image only". They are
no longer shown as an image card with text and a button below it, so **check live hero campaigns after deploy** and switch any that
need text to the text layout. Rolling back the API ignores the new fields: strip and popup pages then fall outside the homepage query
and simply stop appearing.

## Verification

- **Unit tests:** `tests/campaign-placements.test.ts` covers defaults, legacy stripping, publish rules per placement and local-only links.
- **Integration:** campaign integration passes, with the legacy-payload test updated to strip the new fields as an older client would.
- **Browser:** the campaign, home, storefront, market-green, admin and coupon suites pass.
- **Visual:** checked at 390 and 1280 with Cloudinary's public demo artwork on the local preview: overlay hero, image hero, home and
  listing strips, and the popup once per revision.
