# Storefront campaign and category artwork

Created 15 November 2026 through the built-in `image_gen` tool at the owner’s explicit request for a new ad banner. These assets are generated illustrations; no external brand asset or reference screenshot was copied into runtime.

## almina-care-courier.png

- Runtime asset: `apps/web/public/design/campaigns/almina-care-courier.png`.
- Exact generation prompt: [care-courier.prompt.txt](care-courier.prompt.txt).
- Format: 1280 × 1280, alpha PNG.
- Role: Transparent generic courier cutout; not a depiction of actual Al Mina staff.
- SHA-256: `76d96f773c56b62140c855da6e04045a7681e11c002332fdfbe714aa265e5883`.

## pharmacy-categories.png

- Runtime asset: `apps/web/public/design/categories/pharmacy-categories.png`.
- Exact generation prompt: [category-illustrations.prompt.txt](category-illustrations.prompt.txt).
- Format: 1536 × 1024 PNG.
- Role: Six generic category still lifes in a 3 × 2 sprite; not catalogue stock.
- SHA-256: `f2ce66bc964fa123c51e2c2e79398771edab0c3452a80fb58aa1839e77f5628d`.

The courier is placed on the home campaign with a coral HTML background, translated live headline/body and a working catalogue CTA. No discount, ETA, free-delivery, medical or availability claim is embedded. RTL mirrors this decorative cutout to face the copy; product photographs and the logo are not mirrored.

Category illustrations are decorative (`alt=""`) alongside actual category labels/links. Real category media takes precedence. The sprite never supplies a product’s image or changes product identity, stock or prices.

The exact prompts are also embedded in PNG text metadata using Impeccable’s provenance tool. Scan: 2 raster assets, 0 missing prompt records. No raster editing was performed outside the generation/provenance tools. Retain prompts when replacing artwork. Before public release, the owner should review the illustration and translated campaign copy with the rest of the storefront; this record does not constitute visual or production approval.
