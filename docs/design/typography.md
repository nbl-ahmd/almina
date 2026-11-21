# Typography

**Manrope is the Latin display and UI face.** Its broad, open forms carry the large Market Green headline into short product names without requiring a second Latin download. Avenir Next supplied the original character but the local system stack varies by device. Inter is a strong compact UI alternative; Manrope gives the campaign heading a more recognisable silhouette. Use Noto Sans Arabic for Arabic runs, including in mixed-language product names. Both selected families use SIL OFL 1.1. Self-host licensed subsets, retain the notices and request only the weights used. [Manrope licence](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt) · [Noto Sans Arabic licence](https://github.com/google/fonts/blob/main/ofl/notosansarabic/OFL.txt)

| Role | Phone size / line (px) | Desktop size / line | Weight | Latin tracking |
|---|---|---|---:|---:|
| Campaign | 36/40 | 56/60 | 700 | −.035em |
| Page title | 28/34 | 40/46 | 700 | −.025em |
| Section | 22/28 | 28/34 | 700 | −.015em |
| Card product name | 16/22 | 16/22 | 600 | 0 |
| Body and input | 16/24 | 16/24 | 400 | 0 |
| Button | 16/20 | 16/20 | 600 | 0 |
| Price | 18/24 | 18/24 | 700 | 0 |
| Pack, hint and badge | 14/20 | 14/20 | 400 or 600 | 0 |

Scale the campaign and page titles fluidly between endpoints from 390px to 1280px. Allow wrapping at 200% zoom. Keep body copy within 65 characters per line. Use Arial and Tahoma as immediate Latin and Arabic fallbacks respectively, ending both stacks with sans-serif. Load the active locale’s body font first and use swap display.

Arabic uses natural tracking and at least 1.6 line height, including headings. Let cards and controls grow for wrapped labels and diacritics. For example, render an Arabic product name, the Latin pack identifier “SPF 50+” and its price as separate directional runs. Use bdi or dir=auto for catalogue strings. Format currency through the existing locale formatter, isolate the entire formatted amount and use tabular numerals for price, quantity and totals. Keep amounts together and allow adjacent labels to wrap.

## Composition and optical rules

Use a single page heading and nested section headings. Product titles are heading links inside listings. Reserve the campaign role for campaign copy. Desktop hero headlines wrap to two or three short lines in a maximum 12-character measure; use the smaller section role for a long department name where needed. Heading size follows hierarchy, and product names retain their 16px size at every breakpoint.

Use weight 400 for supporting text, 600 for labels and product identity, and 700 for headings and current prices. A compact navigation label uses 14/20px at 600 weight. Main purchase controls keep 16px labels. Type roles are semantic tokens, for example `type.product-name`, `type.price` and `type.section`. At implementation, express text sizes in rem so browser text preferences apply.

In cards, reserve two lines for the name at ordinary text sizes, then allow extra lines for a complete product name, strength and formulation. Place pack size on its own line. Align price and button baselines within each grid row by allowing text areas to grow to the tallest card. Do not shrink text to equalize rows. Price uses tabular numerals where the font supports them. Preserve the full currency value, separating any unit qualifier into the supporting text role. Show AED through the established locale formatter.

Match Latin and Arabic optical weight by reviewing the same name, quantity and amount in both scripts. Use Arabic line height of at least 1.6 for every type role, including labels. Reserve height for that line box and let buttons expand. Test fallback font metrics before fonts load and long Arabic labels after loading. Keep product names selectable and available to assistive technology in full.

Section headings use 22/28px below 900px and 28/34px from 900px. Pack text and hints use weight 400. Badges and compact navigation labels use 600. Detail product headings use the page-title role. Detail purchase prices use 24/32px at 700 weight. Arabic’s minimum 1.6 line height overrides every Latin line-height value in the table.
