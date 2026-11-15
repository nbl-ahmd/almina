# Al Mina storefront — reference analysis

Reviewed: 15 November 2026. Status: **reference planning only**. No final visual
identity, screen composition, font choice, palette or token values are selected
by this document. No screens or commerce behaviour were changed for this task.

## 1. Authority and owner preferences

### Explicit preferences

| Priority | Owner instruction | What it establishes |
| --- | --- | --- |
| Search | “users search mainly”; make search important like Blinkit, Instamart and Life | Search is the primary shopping entry. Discovery remains accessible, but the latest instruction advances search beyond the earlier equal-priority answer. This is an owner requirement, not a measured analytics finding. |
| Categories | Category tabs like `03-green-storefront` | Compact, horizontally arranged category controls with labels and small product imagery. The image does not establish their selected state or navigation behaviour. |
| Product detail | Product page like `02-pharmacy-app` | Gallery at the top, then product identity, price, pack/options, quantity and a clear purchase action. |
| Cards, earlier confirmed | Product cards from `01-pharmacy-listing` | A comparison-friendly two-column mobile structure with contained photos, readable names, pack information, prices and quick add. |
| Mobile purchase, earlier confirmed | Sticky purchase button like reference 03 | Persistent buying access is desired; its exact positioning and relationship to navigation remain to be designed. |
| Brand, earlier confirmed | Use the actual Al Mina logo and its colour family | Preserve brand recognition; this does not approve the rejected candidate's colour assignments, fonts or shapes. |
| Devices and header, earlier confirmed | App-like mobile; good desktop UX; improved navigation/search/address grouping; ad banners like 02/03 | Adapt the shopping experience deliberately to both device classes. Preserve real campaign capabilities. |
| Review process | Working coded previews, then refine | Future implementation workflow. This task stops at reference documentation. |

**Strongest overall reference: not supplied.** There are explicit component-level
preferences, not an approved whole-site template. None of Life, Apollo or 1mg
has been selected as the complete Al Mina identity. Blinkit and Instamart are
owner-supplied search-priority analogies; their current sites/apps were not
independently audited in this pass.

### Interpretation, not approval

A plausible synthesis is search-led shopping, a visible delivery selector,
03-style category controls, 01-style product comparison and 02-style gallery
hierarchy with reachable purchase controls. This is a set of ingredients to test,
not an approved page order or a new design system. “App-like” is interpreted as
fast task access and persistent context, not imitation of device chrome.

The rejected local candidate and older Al Mina design guides are not visual
references. The existing application supplies business facts, routes, catalogue
contracts and functional constraints only. Earlier unchosen concept-board
options do not acquire approval through this reference exercise.

## 2. Sources, assets and evidence limits

Canonical image location: [`docs/design/storefront/references`](../../../../docs/design/storefront/references/)
at repository root. Keep one original copy, outside `public/` and customer
bundles. [Asset manifest](../../../../docs/design/storefront/references/manifest.json)
records dimensions, hashes, origins and reuse limits.

| ID | Source | Coverage / evidence |
| --- | --- | --- |
| R01 | [01-pharmacy-listing.png](../../../../docs/design/storefront/references/01-pharmacy-listing.png) | Static mobile listing, 450 × 1220. |
| R02 | [02-pharmacy-app.png](../../../../docs/design/storefront/references/02-pharmacy-app.png) | Static home + product-detail mockups, 1056 × 1066. |
| R03 | [03-green-storefront.png](../../../../docs/design/storefront/references/03-green-storefront.png) | Static home + detail mockups, 942 × 1004. |
| R04 | [4.png](../../../../docs/design/storefront/references/4.png) | Supplemental Russian pharmacy mobile screenshot, 466 × 924; original creator/source not supplied. |
| W01 | [Life Pharmacy](https://www.lifepharmacy.com/) | Live desktop homepage, search entry, manual-location dialogs, sample detail and empty cart drawer. |
| W02 | [Apollo Pharmacy](https://www.apollopharmacy.in/) | Live desktop homepage, search entry, address drawer, sample detail and empty cart page. |
| W03 | [Tata 1mg](https://www.1mg.com/) | Live desktop homepage, city selector, search focus, sample detail and empty cart page. |

Live sites were inspected in a roughly 1280 × 720 browser viewport. Content can
vary by location, session, campaign and experiment. No location permission was
granted, address confirmed, account entered, item added or checkout submitted.
Displayed default locations are site/session state, not the owner's location.
Mobile behaviour of these websites was not verified; local images are the
mobile evidence. Static screenshots cannot establish scrolling, stickiness,
autocomplete, persistence, keyboard support or backend behaviour.

Impeccable planning/critique lenses used: task hierarchy, discoverability,
comparison load, recognition, feedback, accessibility and evidence boundaries.
This is an annotated reference inventory, not a scored production UX audit.
No visual generator, concept tournament or token generator was activated.

## 3. R01 — Pharmacy listing

| Area | Visible evidence |
| --- | --- |
| Navigation and search | Pharmacy name, location summary and cart badge; breadcrumbs; category heading/count; a broad search field; separate filter, sort and selected-brand controls. |
| Delivery location | Small “Deliver to” line with pin and chevron. Selection UI is absent. |
| Card anatomy / density | Six cards in two columns: stock/promo label, heart, contained pack shot, small metadata tags, two-line-ish name, rating, price and plus/quantity control. Similar card heights support comparison. |
| Category discovery | Current category appears in breadcrumb/title. No complete category navigator is shown. |
| Product detail | Not shown. Card links are implied, not verified. |
| Cart and checkout | Cart count and one quantity stepper are visible. No basket, totals, delivery fee, validation or checkout screen. |
| Type, colour, spacing, imagery | Dark blue headings, muted supporting text, pale canvas, white outlined rounded cards, green adds and amber highlights; generous pack-photo areas. Some small labels and soft pack shots may be hard to read. |

**Borrow:** the stable information order and two-column comparison density;
distinguish pack/brand from the product name; put price beside the buying action.

**Avoid:** copying the trust/delivery strip, reviews, bestseller/top-pick labels,
prices or brands as Al Mina claims; tiny metadata; an ambiguous currency glyph;
truncating the chosen pack so variants become indistinguishable.

**Adapt for Al Mina:** use real catalogue fields and AED formatting, explicit
option selection when needed, accessible save/add labels and full keyboard/touch
states. Keep filters in URL navigation and mirror directional layout for Arabic.
Card density should survive long English/Arabic names and unavailable products.

**Unknown:** filter/sort behaviour; search scope and suggestions; whether the
quantity stepper reflects cart quantity; save/login flow; pricing/stock refresh;
loading, errors, focus order and screen-reader output.

## 4. R02 — Pharmacy app home and product detail

| Area | Visible evidence |
| --- | --- |
| Navigation and search | Home has a top search field between scanner/camera affordances and cart; labelled bottom destinations. Detail has back, save and share controls. |
| Delivery location | No location selector is visible. Banner doorstep wording is not evidence of service coverage. |
| Card anatomy / density | Home uses a horizontal product rail with a partial next card, pack shot, name, category and rating. Card bottoms are obscured, so complete price/action anatomy is unavailable. |
| Category discovery | Circular category media and labels in a horizontal row with “See all.” |
| Product detail | Large isolated pack shot and gallery dots precede name, brand, rating, price/unit, pack dropdown, quantity and full-width add action; similar products follow. |
| Cart and checkout | Cart badge/navigation and an add action only. Detail's add button is shown in document flow; the image does not prove it is sticky. |
| Type, colour, spacing, imagery | Light lavender ground, blue campaign/action emphasis, white cards, rounded controls, large product photograph and clear heading scale. Home ad combines person, parcels, offer and CTA. |

**Borrow:** the owner's preferred gallery-first product hierarchy; clear pack
selection next to quantity; a purposeful campaign image with one obvious action.

**Avoid:** device frames, status bars, surrounding viewer controls, unrelated
branding/health claims, example discounts/reviews, and scanner/camera/chat UI
without an existing supported capability. Do not copy the blue palette by default.

**Adapt for Al Mina:** use actual product galleries and meaningful thumbnails;
show correct name, price, availability and variant before adding. Preserve missing
photo/description states. Desktop may place gallery and buying information beside
each other; that is an adaptation to test, not a layout selected here.

**Unknown:** gallery swipe/zoom, dot targets, variant price updates, sticky
behaviour, related-product logic, search results, cart/checkout, share support,
authentication and navigation/state restoration.

## 5. R03 — Green storefront home and detail

| Area | Visible evidence |
| --- | --- |
| Navigation and search | Menu/cart row; prominent search with adjustment icon; floating bottom navigation with labelled selected Home. Detail uses back, title and cart. |
| Delivery location | Not visible. Do not assume location is hidden in the menu. |
| Card anatomy / density | Two large image-first products across home; hearts and partial names/prices. Styled lifestyle photography occupies most of each card. |
| Category discovery | **Owner-preferred:** compact horizontal rounded rectangular category controls, each with a label and small pack image; “See all.” No selected category is apparent. |
| Product detail | Large lifestyle gallery, product identity, store/follow block, size chips, quantity and description; lower purchase dock pairs total with add. |
| Cart and checkout | Cart icon and dock only. The dock suggests persistent access, but a screenshot cannot prove fixed positioning or scroll behaviour. |
| Type, colour, spacing, imagery | White/light-gray surfaces, lime/black accents, rounded rectangular media and pill actions; leafy/stone product scenes; substantial photo emphasis. |

**Borrow:** the category-control anatomy; distinct label plus thumbnail; campaign
and product imagery given space; the requested persistent purchase-access idea.

**Avoid:** importing lime/black as Al Mina's palette, fictional first-order offers,
store-verification/follow features, large device shadows, viewer overlays, or a
dock that covers content. Lifestyle scenes must not misrepresent real packs.

**Adapt for Al Mina:** link category controls to real catalogue categories and
keep an explicit “all categories” route. Use selected state only when a category
is actually active. Prefer navigation links over ARIA tabs unless they switch
in-page panels. Plan safe-area/keyboard space and Arabic wrapping for the dock.

**Unknown:** whether category controls navigate, filter or switch panels; swipe
and selected behaviour; docking on scroll; gallery gestures; size price/stock
changes; cart/checkout; accessibility; source rights for its photography.

## 6. R04 — Supplemental Russian pharmacy screenshot

| Area | Visible evidence |
| --- | --- |
| Navigation and search | Back control, pharmacy/address context, broad search, and four labelled bottom destinations. |
| Delivery location | A pharmacy-address caption and a delivery time-window/fee line precede the pharmacy name. This may be a selected-store context rather than a customer delivery address. |
| Card anatomy / density | Two compact cards across; pack image, truncated name, crossed old price, current price and plus action. No rating/save affordance is apparent. |
| Category discovery | Horizontal icon/text chips appear below the campaign; labels suggest promotions, fitness and a programme, not necessarily a complete category taxonomy. |
| Product detail | Not shown. |
| Cart and checkout | Bottom cart destination and plus controls only. |
| Type, colour, spacing, imagery | White/light-gray ground, green banner/actions, dark sans-serif labels, compact sections and isolated pack shots. A device frame and faint grid are visible. |

**Borrow:** a useful ordering of local context, search, campaign, shortcuts and
products; compact shopping density; uncomplicated product actions.

**Avoid:** copying Russian text, rouble prices, pharmacy identity, green palette,
device chrome or grid texture. The banner contains an impossible February date;
reference artwork is not reliable operational content. Avoid silently truncated
pack names that hide the difference between products.

**Adapt for Al Mina:** distinguish delivery area from pharmacy address/pickup
store. Keep any delivery windows/fees tied to real server-backed information;
use only supported categories/programmes and true savings.

**Unknown:** image provenance, selected delivery mode, whether location is
editable, actual time/fee rules, navigation/search behaviour, card state, PDP,
checkout and responsive/accessibility behaviour. No preference priority is assigned
to this newly discovered file without an owner statement.

## 7. W01 — Life Pharmacy

Sources: [home](https://www.lifepharmacy.com/),
[sample product](https://www.lifepharmacy.com/product/cetaphil-moisturising-cream-jar-250-g).

| Area | Observed desktop evidence |
| --- | --- |
| Navigation and search | Large header search, shortcut hint, locale/account/wishlist/cart; category/brand navigation. Search entry exposes recent/trending choices and product shelves. |
| Delivery location | Visible delivery context opens automatic/manual choices; manual flow exposes text/map selection and confirmation. No confirmation was submitted. |
| Card anatomy / density | Product links, pack photo, category/name, discount/quantity labels, rating, delivery estimate, price and add control. |
| Category discovery | Department imagery, menu and brand destinations provide multiple browse routes. |
| Product detail | Gallery/thumbnails, brand/name, price/tax, delivery-versus-collection tabs, quantity/add, service information and product sections. |
| Cart and checkout | Empty cart drawer retains delivery context, coupon access and itemised totals; checkout is unavailable without items. |
| Type, colour, spacing, imagery | Dark-blue header, white search, magenta utility strip, white panels, blue actions and campaign-led photography. |

**Borrow:** search prominence, explicit location changes, readable purchase context.
**Avoid:** obstructive campaign/notification overlays and crowded promotional metadata.
**Adapt for Al Mina:** a simpler bilingual search/address grouping; show only supported
fulfilment, payment and service choices. **Unknown:** populated basket, coupon maths,
stock refresh, checkout/payment/auth, denied GPS recovery and mobile behaviour.
Do not transfer Life's delivery, certification, support or payment promises.

## 8. W02 — Apollo Pharmacy

Sources: [home](https://www.apollopharmacy.in/),
[sample product](https://www.apollopharmacy.in/otc/loreal-paris-hyaluron-pure-72h-purifying-smp-650ml),
[empty cart](https://www.apollopharmacy.in/medicines-cart).

| Area | Observed desktop evidence |
| --- | --- |
| Navigation and search | Address/account/cart header, service and department navigation; a large home search area opens a dedicated search view. |
| Delivery location | Address drawer offers current location or another location; neither was confirmed. |
| Card anatomy / density | Product photo, size/format, name, rating, original/current price, savings, unit price and add affordance. |
| Category discovery | Department hierarchy plus health-condition, brand and themed browse groups. |
| Product detail | Gallery, prominent name, selectable pack cards with price/stock, product facts and a separate price/location/purchase area. |
| Cart and checkout | Empty cart offers a return to shopping and recommendation sections; payment flow not visited. |
| Type, colour, spacing, imagery | Teal/white shell, strong sans-serif headings, illustrated search area, outlined panels and secondary pastel promotions. |

**Borrow:** unmistakable search entry; pack comparison with price/availability.
**Avoid:** importing a sprawling service menu, promotional clutter or bank-conditional
prices as the default price. **Adapt for Al Mina:** use existing catalogue/variant
fields and concise departments. Keep medical/insurance/lab services outside scope.
**Unknown:** keyboard/search quality, populated cart, fee/payment/auth rules, stale
stock handling and mobile behaviour. Never copy Apollo's delivery/medical claims.

## 9. W03 — Tata 1mg

Sources: [home](https://www.1mg.com/),
[sample product](https://www.1mg.com/otc/unienzyme-digestive-enzymes-for-indigestion-acidity-gastric-bloat-liquid-pineapple-otc73326),
[empty cart](https://www.1mg.com/cart).
The text-fetch service timed out on home; direct browser inspection succeeded.

| Area | Observed desktop evidence |
| --- | --- |
| Navigation and search | Separate service and category navigation; broad search beside city input; search remains in the reduced cart header. |
| Delivery location | City input opens popular/all-city choices; GPS affordance is present. No location was changed. |
| Card anatomy / density | Pack photo, long title, pack size, optional rating, delivery estimate, prices/savings; observed home cards link to detail. |
| Category discovery | Health-concern, personal-care, brand and category groups. |
| Product detail | Multiple pack/label images, product name/marketer, price, pack, add action, conditional offers and charge disclosure. |
| Cart and checkout | Simple empty state with a shopping return action; search/help remain available. |
| Type, colour, spacing, imagery | White/light-gray canvas, coral actions, dense sans-serif labels, photographic campaigns and pack galleries. |

**Borrow:** search/location proximity, readable pack metadata and a focused cart shell.
**Avoid:** roadblock ads, competing service navigation and coupon prices obscuring the
payable price. **Adapt for Al Mina:** one clear catalogue search and honest totals;
keep label images readable. **Unknown:** search relevance, populated cart, prescription/
payment/auth and mobile behaviour. Do not transplant its services, ratings or ETAs.

## 10. Cross-reference synthesis — ingredients, not a selected design

| Element | Owner-selected evidence | Interpretation to evaluate later |
| --- | --- | --- |
| Search | Latest search-first instruction; W01–W03 show prominent entry points | A visible, plainly labelled search across home/listing/PDP; preserve entered query, keyboard suggestions, results and recoverable zero-results states. Sticky placement and history policy remain open. |
| Address | Earlier integrated-header request; W01–W03, R01/R04 | Show actual delivery context near search, with a change action and manual alternative to optional GPS. Area choice must not imply a validated full address or guaranteed ETA. |
| Categories | R03 explicitly preferred | Compact image-and-label controls; test long labels/Arabic and discoverable horizontal overflow; provide all categories. Behaviour must match native link/tab semantics. |
| Cards | R01 earlier explicitly preferred | Stable price/name/pack/action alignment, factual stock, accessible add/save feedback; do not require hover to expose buying information. |
| PDP | R02 explicitly preferred; R03 purchase access earlier preferred | Lead with actual gallery; make name/pack/current price/stock clear before purchase; desktop hierarchy needs its own composition rather than a stretched phone. |
| Campaigns | R02/R03 earlier requested; W01–W03 show real merchandising patterns | Keep campaigns subordinate to search access; use owned media and one clear destination. Do not copy overlays, medical promises or rasterised interface text. |
| Cart/checkout | Functional preservation, not a selected reference screen | Retain server totals, quantity/stock checks, delivery validation, retry/idempotency and confirmation. No screenshot establishes a replacement checkout design. |
| Visual system | Real Al Mina logo family; complete overhaul request | Derive future type, spacing, colour roles and geometry together. No exact font, hex value, radius, scale or token name is approved here. |

### Future evaluation questions, not blockers for this inventory

- Which current catalogue groups should occupy the first category controls?
  Resolve from actual catalogue coverage and merchandising, not reference labels.
- Should home category controls navigate or change an in-page product set? The
  default recommendation is real category links, subject to later interaction review.
- Should search remain visible during scroll, and should recent searches be
  local/optional? Review privacy, keyboard, focus and mobile space before deciding.
- How should purchase controls coexist with mobile navigation and the keyboard?
  Demonstrate scroll, safe-area and error states in future coded previews.

No new owner answer is needed to complete reference organization. A strongest
overall reference and final identity remain deliberately unselected.

## 11. Reuse boundaries and handoff

- Preserve original reference files, including frames/watermarks, as provenance.
  **Never reproduce their watermarks, device frames, viewer buttons, unrelated
  brands/logos, fake reviews or commercial/medical claims in Al Mina screens.**
- Do not crop competitor artwork into shipping banners or scrape their catalogue
  into Al Mina. Rights for the supplied screenshot media are not established.
- Use real Al Mina names, packs, media, prices and inventory. Prefer honest
  missing-content states; demonstration content must be visibly identified.
- Preserve English/Arabic/RTL, routes/SEO, native browser navigation, accessible
  keyboard/focus/touch states and existing server-authoritative commerce.
- Treat admin/shared styles independently. Existing storefront appearance is not
  a design baseline, including the previously rejected local candidate.
- Next phase may establish a replacement identity and specification from these
  references. This inventory does not revive the archived DESIGN.md, choose a
  concept-board option, generate a new DESIGN.md or authorize implementation/deploy.

Verification of this artifact: all four local images visually inspected; source
links/asset dimensions/hashes checked; three named live websites inspected in a
browser, including search/location entry, sample product and empty-cart states.
No claim is made about unvisited flows, performance metrics or accessibility
conformance of the reference sites.
