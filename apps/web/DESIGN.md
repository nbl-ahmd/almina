---
name: Al Mina storefront
description: Lively blue pharmacy retail with real products and friendly everyday care
colors:
  ink: "#19213b"
  muted: "#61677a"
  brand: "#3456da"
  brand-hover: "#2545bf"
  accent: "#e9edff"
  page: "#fafaff"
  surface: "#ffffff"
  subtle: "#f1f3fc"
  border: "#e7e9f1"
  sale: "#ac2632"
  sale-surface: "#fff0f1"
  focus: "#176784"
  ocean: "#252b49"
  teal: "#2d4dc5"
  campaign-skin: "#eef7ef"
  campaign-family: "#fff2e9"
  campaign-ink: "#193c35"
  campaign-muted: "#415a4d"
  savings: "#9b3d23"
  savings-surface: "#fff0e8"
  editorial-lilac: "#eeecfa"
  editorial-peach: "#fff0e8"
  support-blue: "#edf1ff"
  collection-blue: "#eef0ff"
  collection-peach: "#fff1e8"
  collection-mint: "#eaf6f0"
  routine: "#f0f2fc"
  intro-skin: "#edf5ef"
  intro-neutral: "#f1f1fc"
  spotlight-lilac: "#eeedfc"
  spotlight-peach: "#fff0e7"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(1.55rem, 3vw, 2.8rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Outfit, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Outfit, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
  label:
    fontFamily: "Outfit, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
rounded:
  control: "8px"
  image: "12px"
  module: "16px"
  panel: "24px"
  pill: "9999px"
spacing:
  compact: "8px"
  card: "12px"
  card-desktop: "16px"
  panel: "24px"
  section: "20px"
  section-desktop: "28px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.brand}"
    rounded: "{rounded.pill}"
  campaign-fallback:
    backgroundColor: "{colors.campaign-skin}"
    textColor: "{colors.campaign-ink}"
    rounded: "{rounded.module}"
  product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.module}"
  compact-product-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.image}"
    padding: "12px"
  routine:
    backgroundColor: "{colors.routine}"
    rounded: "{rounded.module}"
  category-tile:
    textColor: "{colors.ink}"
    rounded: "{rounded.module}"
    padding: "12px"
  storefront-intro:
    backgroundColor: "{colors.intro-skin}"
    textColor: "{colors.ink}"
    rounded: "{rounded.module}"
    padding: "20px"
  collection-tile:
    rounded: "{rounded.module}"
    padding: "16px"
  floating-contact:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "48px"
  search-field:
    backgroundColor: "#f6f7fb"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  savings-badge:
    backgroundColor: "{colors.savings-surface}"
    textColor: "{colors.savings}"
---

# Al Mina storefront design

## Overview

**Creative North Star: “A little care. A better day.”**

A lively neighbourhood pharmacy: blue shopping actions, uploaded campaign
artwork, photographic discovery tiles and real catalogue photography. Outfit and
Heroicons give everyday shopping a friendly, clear voice.

This replaces the prior green homepage and historical screenshot direction as
visual authority. The same identity now extends through category browsing,
catalogue/search/offers, curated collections, product detail, cart, checkout,
about and contact. Shared category tiles, page introductions and full/compact
product cards provide continuity. This extension preserves the V4 palette,
Outfit, Heroicons and commerce behavior; it is not a new visual system.
Administration remains outside this scope.

**Key Characteristics:**
- Confident blue actions and white product surfaces.
- Real products, readable prices and honest availability.
- Manual campaign navigation and restrained interaction feedback.

## Colors

Blue is the primary action color. Uploaded campaigns retain their own artwork;
generated fallback campaigns use gentle green and peach scenes with dark copy.
Pastel photographic category backdrops, peach and lilac editorial panels and the
cool footer add variety. Dark navy ink and muted slate carry product content.
Shared sale red remains available; full cards use peach savings badges only for
real catalogue savings. The frontmatter records exact
values; `line` aliases `border` in CSS. The existing `teal` variable now contains
blue for compatibility with shared components, not a green visual direction.

## Typography

Use the local variable Outfit font through `next/font/local`, weights 400–700,
with swap loading. Display copy is semibold, tightly tracked and short. Section
headings step from 24px to the frontmatter headline size at 768px. Product names
use 14px/20px on mobile and 16px/24px on desktop, wrapping naturally. Supporting
copy is generally 14px. Prices use tabular numerals. Use Heroicons' 24-unit
outline family; icon-only actions keep accessible names.

## Layout

The shared maximum content width is 1344px. Header and footer gutters grow from
16px to 24px at 768px and 32px at 1024px. Homepage sections use compact 20px gaps,
becoming 28px at 768px. Uploaded campaign frames use a 2:1 aspect ratio, changing
to 2.7:1 at 768px, and contain the complete artwork without cropping. Generated
fallback slides have a 230px minimum height, becoming 310px at 768px. At 1024px
the hero pairs a wide carousel with one narrow real-product card; on smaller
screens the product card is a compact horizontal row below the carousel.

Category tiles form a horizontally scrolling two-row photographic atlas below
1024px, then a four-column, two-row grid. Tiles have a 142px minimum column width
(190px at 640px) and a 190px minimum height (250px at 768px). Standard homepage
shelves use two columns, becoming four at 768px. Compact shelves scroll with
275px cards on mobile, then use two columns at 768px and four at 1024px.
Collection tiles use one column then two at 768px when two or more are eligible;
a singleton spans its row with a 180px desktop image column and 128px image
height. Editorial panels and footer stack below 768px. Preserve usable 360px
layouts and wrapping. Horizontal category/product shelves, information tabs
and gallery thumbnails hide scrollbar chrome while retaining native scrolling.

On mobile, PDP and cart purchase bars sit at `62px + safe-area-inset-bottom`,
above bottom navigation, at layer 19. Their floating contact action rises to
`178px + safe-area-inset-bottom` to clear both bars. From 768px purchase bars
return to normal flow; contact retains its desktop position. Preserve page
bottom spacing so fixed controls never obscure the final content.

## Elevation & Depth

Use quiet borders for product cards and cool tonal surfaces for grouping. The
campaign artwork stays flat; shared full product cards gain a faint shadow and
blue border on hover. Shared shadow tokens remain available to
existing route components. Avoid turning every pastel panel into a floating card.
Exact shadows and motion values live in the sidecar.

## Shapes

Campaign frames, category tiles and full product cards use 16px corners. Editorial
and support panels retain 24px corners. Product media, compact cards and purchase
actions use 12px. Search and prominent editorial actions use pills. Product
photographs stay contained with labels and aspect ratios intact; uploaded banner
artwork is also contained in full. Generated editorial scenes may crop to their
presentation frame.

## Components

### Navigation and footer

White header, pale-blue desktop greeting strip, real logo, compact inline delivery
selection, pill search and cart. Mobile delivery selection shares the first row
with the logo and cart rather than occupying a full-width row; the search is the
second row. Long saved areas truncate within the control. The existing native
delivery dialog preserves manual selection, saved-area and location states.
Search submits a native GET to `/search`. Desktop shopping links sit below the
main header; mobile retains the fixed five-item bottom navigation. Preserve skip
navigation and current-page states.

Contact is a floating blue circular link at the bottom right: 48px on mobile,
16px from the right and above bottom navigation using `80px + safe-area-inset`;
at 768px it becomes 56px with 24px right/bottom offsets. PDP and cart use the higher mobile offset specified in Layout. It links to the
pharmacy contact page. The cool footer groups shopping, help and real contact information;
telemetry preferences render only when enabled.

### Campaign and discovery

Uploaded banners take priority in the manually controlled hero carousel. Show up
to the newest eight returned by the banner API (newest identifier first). Images
use containment, preserving their entire artwork; never crop uploaded text or
prices. Use supplied names as alternative text and validated destinations when
present. Without a destination, show the image without a false link. The first
slide loads eagerly, subsequent slides lazily. The carousel never auto-advances;
inactive slides are hidden and controls expose slide labels and selected state.

When no uploaded banners are available, show two generated editorial campaigns:
`skincare-campaign.webp` and `family-campaign.webp`. The headings, descriptions
and collection CTAs are real HTML over decorative images with empty alternative
text. These scenes communicate skincare and family-care themes; they must not
impersonate catalogue product photography or invent brands, offers or results.
A separate hero companion card displays an actual available product and price.

Shared `CategoryTile` labels and destinations come from the API. Homepage shows
up to eight in a photographic two-row atlas; the category index uses the same
tiles in a responsive two-, three- and four-column grid. Supplied category
photography takes priority and is contained, bottom-aligned beneath the label. Generic generated `category-scenes.webp` supplies
six crops for skincare, baby care, oral care, hair care, first aid and feeding;
`deodorant-category.webp` covers deodorant, and `general-nail-scenes.webp` adds
generic general/personal-care and nail-care scenes. These generated atlases are
category decoration, never replacement images for exact catalogue products.
Match by category label and preserve
the artwork's crop boundaries. Other categories receive an honest decorative
icon fallback. Images are decorative; visible category names identify links.

Editorial skincare and baby-care panels retain existing collection/search
navigation. The generated `wellness-editorial.webp` remains decorative editorial
imagery with empty alternative text, not a catalogue photograph or medical claim.

### Products and commerce states

Homepage shelves and existing product grids use the same `ProductCard`; compact
shelves use `CompactProductCard`. Both share `ProductPhoto` and `ProductPrice`,
so real imagery, price formatting and missing-photo behavior remain consistent.
Full cards show brand/category, a wrapping product or family name, option label,
option count when applicable, availability, current price and purchase action.
Their contained 5:4 media area has a quiet border. Savings badges show an actual
currency saving only when the sale lowers the catalogue price. Stock indicators
combine a dot with visible text; color alone never carries availability.

Preserve “From” for variable family pricing and “Choose options” for multiple
options. Single products retain existing cart controls and stock handling.
Missing full-card photography says “Photo coming soon”; compact cards use an
honest bag icon. Empty shelves are omitted. Existing commerce logic remains
server-authoritative; decorative campaigns never supply product data.

### Additional merchandising modules

**Compact shelf:** thumbnail-and-name cards with current prices and a 44px product
link, distinct from the larger add-to-cart shelf. Render only with at least two
products; show up to four. Thumbnail wells are 64px, with 12px card padding. Shared compact cards preserve
brand/family names and option counts where present.

**Collection tiles:** pastel blue, peach and mint panels pair a short collection
introduction with a real product image. Show only collections with at least two
photo-ready products. The text CTA opens the collection; the image opens its
product. Routes are `/collections/skin-essentials`, `/collections/baby-care`,
`/collections/daily-care` and `/collections/under-50`. Collection pages reuse the
existing product grid with breadcrumb, heading, available count and honest empty
state; these are curated query results, not a newly invented catalogue taxonomy.

**Routine:** a cool rounded wrapper contains two or three white horizontal cards,
80px product thumbnails, step labels and live prices. Cleansing, moisturising and
sun-protection matches come from actual product names and availability. Render
only with at least two matching photo-ready products. Products are sold
individually; preserve the suitability and directions copy.

**Brand strip:** white bordered 16px cards combine real brand names with a 64px
photo from a matching available catalogue product when one exists. Match an
explicit product/family brand or a product-name prefix; otherwise retain the
text treatment. Do not generate a product image or brand logo. The grid uses
two columns then four at 640px and appears only for at least two supported
brands. Each link opens the existing brand search.

**Product spotlight:** `HomeProductCarousel` restores a separate “In the spotlight”
module beneath the uploaded campaign area. Up to four available real products
receive their own manually selected slides, contained photo, actual title,
optional API summary, current price and product link. Lilac and peach alternate;
mobile stacks the photo and content, while desktop pairs them. This is separate
from uploaded campaign artwork and introduces no invented offer or product claim.

**Banner strip:** the reusable two-artwork strip remains available, but the current
homepage displays uploaded campaigns in the hero carousel. Do not duplicate
hero campaigns into an additional strip by default.

### Shared page introductions and route extension

`StorefrontIntro` carries the same 16px panel corners, Outfit hierarchy and
subtle palette to catalogue, category, collection, about and contact pages.
Its skin/family/care variants reuse decorative editorial artwork; the neutral
variant has no image. Mobile artwork is subdued to 15% opacity behind readable
text; desktop confines it to the right 42%, leaving copy within 55%. Headings
step from 24px to 36px; descriptions remain 14px/24px with a 55-character measure.
These panels never represent an exact product or create clinical claims.

Catalogue/search/offers retain native search, category links, filters, pagination
and real shared product cards. Categories retain real identifiers and URLs.
PDP pairs the real contained gallery with category/brand identity, a lilac price
panel, option controls and existing purchase handling. Any displayed saving
must derive from real prices. Product information sections retain their tabbed
navigation and honest absent-field states.

Cart uses real line images, names, variants, quantities and availability with a
quiet summary; the empty state reuses decorative editorial imagery and real
recommendations. Delivery, VAT and final totals remain explicitly deferred to
checkout. Checkout uses a bordered form with numbered contact, delivery and
payment sections, a separate order summary and clear review/confirmation states.
Form controls, errors, loading and retry states preserve existing behavior.
About/contact extend the shared intro into white bordered help panels and real
contact links. Reuse established contact and delivery facts rather than adding
service promises.

### Data and merchandising boundary

The page combines real categories, featured products, general products, offers,
banners and curated collection queries, deduplicating products by identifier.
The former single CeraVe query has been replaced by multi-query collections;
queries are curated merchandising inputs, not brand exclusivity or fabricated
inventory. Hero and shelf selection prefer available photo-ready products, and
the lead shelf favors varied brands. Budget content uses actual displayed prices
at or below AED 50; its homepage shelf requires at least four products spanning
two categories. Failed requests degrade to omitted modules or catalogue
retry/contact guidance. Do not invent stock, discounts, delivery guarantees or
campaign claims.

### Motion and focus

Manual slide changes fade and rise by 5px over 240ms. Product imagery scales
slightly on hover. Pressed buttons scale subtly, arrows shift and floating
contact lifts on interaction. Transform
feedback respects reduced-motion preferences.

Only marked editorial and collection sections receive once-only entrance motion:
10px upward travel with opacity 0.85 to 1 over 360ms, using
`cubic-bezier(.16,1,.3,1)` when 8% enters the viewport. Content is visible by
default; no JavaScript, unsupported observation and reduced-motion settings all
retain visible content. Do not hide product shelves behind entrance animation.
Retain the shared 3px focus outline with 3px offset and named icon controls.

## Do's and Don'ts

- **Do** use Outfit, Heroicons and the blue storefront tokens.
- **Do** preserve real catalogue data, existing URLs and commerce behavior.
- **Do** distinguish generic generated category/editorial imagery from real product photos.
- **Do** preserve complete uploaded campaign artwork and real HTML fallback copy.
- **Do** keep motion subtle and respect reduced-motion preferences.
- **Don't** restore old green or historical screenshot authority implicitly.
- **Do** extend existing route patterns through shared components without changing commerce rules.
- **Don't** fill data-dependent modules with fabricated products, brands or promises.
- **Do** keep the delivery selector compact and floating contact clear of bottom navigation.
