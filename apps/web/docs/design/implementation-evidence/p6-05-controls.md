# P6-05 — Storefront controls and typography revision

The owner approved the page compositions and requested a softer design language before visual acceptance. The request called out the boxed All categories trigger, tight navigation padding, unnecessary underlining, heavy control borders, large chips, filters, search, purchase actions, quantity controls and overly bold type.

## Design changes

- The previous look came from both shared shadcn-derived classes and local retail overrides. The shared components still provide accessible structure, variants and interactions. Retail styles now own the presentation across those components. Admin, wholesale and root missing-page recovery retain their separate styling and font choices.
- Desktop navigation has breathing room and a plain categories trigger. It opens the same panel. Nav selection uses color and a quiet selected surface. Search reads as one connected mint field with a distinct submit target on phone and desktop.
- Category and filter chips use a smaller visual capsule inside a 44px minimum tap target. The sort dropdown reads as a text control with a chevron. Form fields that need an identifiable edge and keyboard focus retain visible treatment.
- Product frames use white surfaces without repeated borders. Metadata reads as type instead of stacked chips. Quick add uses a quiet coral tint, purchase uses solid brand coral, and counters use a soft grouped surface. Existing stock, saved, busy, confirmed and disabled states keep their meaning.
- DM Sans and Noto Sans Arabic are self-hosted variable fonts with their OFL licenses. The interface uses 500 for everyday control labels and card names, 600 for emphasis and 650 for strong headings and prices. Page titles use 24px on phones and 28px on wide views. Exact brand coral remains #FF5A5F alongside mint surfaces and deep green-black ink. Normal action text measures 4.94:1 at rest and 4.73:1 on hover.
- Shopping compositions, route structure, responsive grids, fixed purchase placement and existing commerce behavior are preserved.

The full desktop composition and green and teal mobile references informed quiet surfaces, category discovery and tightly grouped shopping controls. Search prominence, accessible discovery and compact purchase patterns were cross-checked against the official services. [Desktop reference](../../../../../docs/design/storefront/references/2026-11-17/06-desktop-fullpage.webp), [green mobile reference](../../../../../docs/design/storefront/references/2026-11-17/03-green-pharmacy-screens.jpg), [teal mobile reference](../../../../../docs/design/storefront/references/2026-11-17/05-teal-mobile-search-discovery.jpg), [Blinkit](https://blinkit.com/brand/S%26B), [Instamart](https://www.swiggy.com/instamart/), [Tata 1mg](https://www.1mg.com/), [Apollo Pharmacy](https://www.apollopharmacy.in/).

## Follow-up control pass

The owner flagged the desktop product purchase panel, cart quantity control and extra underlines and scrollbars. The shared disabled button variant had added a filled tile and a border to each unavailable step. The product page and cart now use the same tinted, borderless quantity group with 44px step buttons. Disabled steps only change ink. Desktop purchase and save actions no longer have separate outline boxes. Add confirmation keeps its success tint, check and live message. View cart uses a directional chevron.

Reviewed home, categories, listing, search, product details, cart, checkout, account, support and policy surfaces. Standalone shopping links use color, context or an icon. Inline policy and validation links retain their underlines. Category, thumbnail, related and recently viewed rows hide the native horizontal scrollbar and retain scrolling and focus access. Overflowing search panels, menus and dialogs retain native scrolling and its visual cues.

### Latest screens

| Screen | English mobile | English desktop | Arabic mobile | Arabic desktop |
| --- | --- | --- | --- | --- |
| CeraVe product after adding | [390px](p6-05-polish/en-pdp-390.png) | [1440px](p6-05-polish/en-pdp-1440.png) | [390px](p6-05-polish/ar-pdp-390.png) | [1440px](p6-05-polish/ar-pdp-1440.png) |
| Cart at quantity one | [390px](p6-05-polish/en-cart-390.png) | [1440px](p6-05-polish/en-cart-1440.png) | [390px](p6-05-polish/ar-cart-390.png) | [1440px](p6-05-polish/ar-cart-1440.png) |

The local captures match the product in the owner’s screenshot and use the isolated reference catalogue. The isolated build, typecheck, lint and 63 Chromium tests passed. The automated cases cover Arabic and English, enabled and disabled quantity states, Add confirmation, keyboard focus scrolling an overflowed related section, checkout review, and admin and wholesale isolation. Seven focused cases passed in each of WebKit and Firefox. The local reference preview passed 120 route, browser, language and viewport checks. Axe reported no violations in 16 main-content scans. The raw production SEO smoke test passed.

## Earlier screen set

Local captures at 390×844 and 1440×900 use reviewed pack photos and synthetic prices and stock.

| Screen | English mobile | English desktop | Arabic mobile | Arabic desktop |
| --- | --- | --- | --- | --- |
| Home | [390px](p6-05-controls/en-home-390.png) | [1440px](p6-05-controls/en-home-1440.png) | [390px](p6-05-controls/ar-home-390.png) | [1440px](p6-05-controls/ar-home-1440.png) |
| Product listing | [390px](p6-05-controls/en-listing-390.png) | [1440px](p6-05-controls/en-listing-1440.png) | [390px](p6-05-controls/ar-listing-390.png) | [1440px](p6-05-controls/ar-listing-1440.png) |
| Product detail | [390px](p6-05-controls/en-product-390.png) | [1440px](p6-05-controls/en-product-1440.png) | [390px](p6-05-controls/ar-product-390.png) | [1440px](p6-05-controls/ar-product-1440.png) |

## Verification

The isolated production build, workspace typecheck, lint, SEO smoke and five design-authority checks passed. Playwright ran 91 Chromium interaction cases across bilingual navigation, responsive controls, search, filters, shopping, checkout, customer account and compatibility. The three-engine viewport sweep covered 864 checks with zero horizontal overflow or uncaught page exceptions. Eighteen enlarged Firefox views also fit. Axe reported no violations in the 18 primary viewport scans. The reviewed 390px home shelves retain approximately 23px between the first buying row and navigation dock. WebKit covered 20 distinct scenarios across checkout, search, listing, product detail and navigation. The baseline WebKit build reproduced a Cancel focus bug. The revised search keeps the input focused through the mouse press, then restores focus to the search form and dismisses the keyboard on Cancel. Both locales passed the targeted rerun in Chromium and WebKit. The test waits for the guest saved-list response before navigating Back, so the strict page-error check remains intact. Physical-device, production catalogue and live-provider checks remain separate release work.
