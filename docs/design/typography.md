# Typography

Manrope supplies Latin interface text and headings. Noto Sans Arabic supplies Arabic text. These font choices are fixed by the approved brief. Use weights 400, 600 and 700. Self-host the required font files through the existing Next.js font mechanism, with the applicable license notices. Verify the chosen files and available numeral features before implementation.

## Semantic type roles

Sizes and line heights are CSS pixels at the standard browser text setting. Implement with rem units so text preferences and zoom apply.

| Token | Phone reference at 390px, size / line | Desktop reference at 1280px, size / line | Weight | Latin tracking |
|---|---|---|---|---|
| type.campaign | 36 / 40 | 56 / 60 maximum | 700 | −.035em |
| type.page-title | 28 / 34 | 40 / 46 maximum | 700 | −.025em |
| type.section | 22 / 28 | 28 / 34 | 700 | −.015em |
| type.product-name | 16 / 22 | 16 / 22 | 600 | 0 |
| type.body | 16 / 24 | 16 / 24 | 400 | 0 |
| type.label | 16 / 24 | 16 / 24 | 600 | 0 |
| type.button | 16 / 20 | 16 / 20 | 600 | 0 |
| type.price | 18 / 24 | 18 / 24 | 700 | 0 |
| type.detail-price | 24 / 32 | 24 / 32 | 700 | 0 |
| type.support | 14 / 20 | 14 / 20 | 400 | 0 |
| type.badge | 14 / 20 | 14 / 20 | 600 | 0 |
| type.navigation | 14 / 20 | 14 / 20 | 600 | 0 |

Campaign and page titles interpolate linearly between their reference sizes at 390px and 1280px, clamping to the endpoints outside that range. At 768px, campaign is approximately 44.5/48.5px and page title 33.1/39.1px. At 900px, campaign is approximately 47.5/51.5px and page title 34.9/40.9px. Section headings use 22/28px below 900px and 28/34px from 900px. Other roles retain their table sizes across widths. Cap the campaign measure around 12–16 characters where the copy permits. Body text has a 65-character maximum measure. Use natural wrapping, with balanced short headings as a progressive enhancement.

## Product identity and prices

Every page has one H1. A product detail H1 uses type.page-title. Listing card titles use type.product-name. Reserve two name lines at ordinary text sizes, then allow additional lines to preserve the full name, formulation and strength. Put pack size on its own line. Align prices and actions across a row by growing the text region to match its tallest card. Text remains selectable and available in full to assistive technology.

Use type.price in cards and type.detail-price in the detail purchase block. Keep genuine former prices in type.support with a strike-through. Format amounts through the existing locale-aware currency formatter, using tabular numerals where available. Isolate the complete formatted amount as a directional unit, with its currency included. Allow the adjacent unit or pack qualifier to wrap. Essential amounts keep their complete value.

## Arabic and mixed text

Use Noto Sans Arabic, natural tracking and a minimum line height of 1.6 for every Arabic role, including buttons and headings. This overrides the Latin line heights in the table. Let components grow for diacritics and wrapped labels. Review optical weight against the matching Latin role.

Set language and direction from the active locale. Use bdi or dir=auto for catalogue names and isolate Latin SKUs, strength strings such as SPF 50+, phone numbers and prices within Arabic content. Preserve the order of characters inside those runs. Use semantic inline-start/end alignment.

Use Arial and Tahoma as immediate Latin and Arabic fallbacks, followed by sans-serif. Load the active locale's body font first and use swap display. Compare fallback and loaded font geometry for layout shifts. Review English, Arabic and mixed names at 200% text enlargement, 400% zoom and with text-spacing overrides before implementation sign-off.
