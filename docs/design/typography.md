# Typography — Quick Commerce Edition

Manrope (self-hosted variable, 400–800) for Latin, Noto Sans Arabic for Arabic. Manrope's geometric build sits close to the Gilroy/Okra
faces in the reference apps, so no new face is downloaded. Sizes in CSS px at default text size; implement in rem.

| Role | Phone | Desktop | Weight | Tracking |
|---|---|---|---|---|
| campaign | 26/30 | 44/48 | 800 | −0.03em |
| page-title | 24/30 | 32/38 | 800 | −0.02em |
| section | 20/26 | 24/30 | 800 | −0.02em |
| sheet-title | 17/24 | 18/26 | 800 | −0.01em |
| product-name (tile) | 14/20 | 15/21 | 600 | 0 |
| product-name (detail H1) | 22/28 | 30/36 | 800 | −0.02em |
| price (tile) | 16/22 | 17/22 | 800 | 0, tabular |
| price (detail) | 26/32 | 30/36 | 800 | 0, tabular |
| to-pay | 17/24 | 18/24 | 800 | 0, tabular |
| body | 15/22 | 16/24 | 500 | 0 |
| support | 13/18 | 13/18 | 500 | 0 |
| micro (stickers, pay-bar label) | 11/14 | 11/14 | 700 | 0.02em |
| button | 15/20 | 16/20 | 700 | 0 |

Inputs are always 16px so iOS does not zoom. Arabic keeps natural tracking and a line height of at least 1.6, and grows instead of clipping.
Isolate prices, SKUs, phone numbers and Latin product names inside Arabic text. Full product names are never truncated on detail, cart or
checkout; tiles may wrap to as many lines as the name needs.
