# Admin product editor simplification — 22 November 2026

Goal: editing or adding many products quickly. Required to save: name, brand, category, price, stock.

## What changed (UI only; no API or schema change)
- One page, no tabs. Cards: Basics, Price & stock, Listing, then a collapsed "More details" (sales channels, care, identifiers, variants, catalogue feeds). Photos sit beside the form.
- Brand and category are searchable dropdowns. A value that does not exist can be added from the dropdown.
  - Brand options come from existing products (up to 1,000, cached for the session). Brand is a free-text product field, so adding one only sets it on this product.
  - A new category is created through the existing `POST category` endpoint and then read back by name.
- Product type is a three-way choice (General / Pharmacy medicine (OTC) / Prescription) defaulting to General.
- Stock changes need a reason: a short list, defaulting to "Stock count", shown only when stock changed.
- Removed from the UI: image rights, content-reviewed and physical-stock-reviewed checkboxes, image source URL.
  - Saving a product that is being published sets `contentReviewed`, `stockVerified`, `saleUnit` (default "Each") and `imageRights: authorized`, as the form already did. Adding photos is the admin's confirmation that they may be used.
- Publishing still requires, on the server, a description, a pack size and a General/OTC type. When these are missing the form saves a draft and says why. Prescription products are always saved as drafts. The server rules in `packages/contracts/src/product-content.ts` are unchanged.

## Speed
- Product list: price and stock can be edited in place (Enter saves). A publish switch on each row. Selected rows can be exported or archived.
- Edit page: Previous / Next through the catalogue, Save & next, Save & add another (new products), Ctrl/Cmd+S.

## Decisions to review
- Defaulting product type to General means an OTC medicine saved without changing the type is classed as General. Pharmacist classification is still enforced for Prescription.
- Whether description and pack size should remain required to publish is a server policy choice; relaxing it means changing `storePublicationIssues`.
