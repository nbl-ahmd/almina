# Review repair register — 16 November 2026

Baseline: dual-agent critique, 28/40, source be1eca9. Owner authorized fixing all verified issues and conflicting definitions. This register records implementation status, not a new independent review score. No deployment.

| Finding | Resolution |
|---|---|
| Static/duplicate mobile cart checkout | Dedicated cart layout with one fixed mobile next-step action above bottom navigation, one desktop summary action and reserved content clearance. |
| Search/cart ellipses | Labelled controls use 16px rounded rectangles; equal-sided phone icon cart remains circular. Removed conflicting radius/background utilities and competing page rules. |
| Competing style ownership | storefront-controls.css owns customer control roles/states; storefront-cart.css owns cart layout. Shared Button variants/admin unchanged. Checkout text actions use explicit ghost variants rather than inherited native button fill. |
| Ambiguous cart counts | Header/body identify quantities and distinct products using locale-aware item-count text. |
| Missing line/subtotal amounts | Server-loaded catalogue prices produce integer-minor-unit line and merchandise estimates. Null/unsafe prices stay unavailable. No delivery/tax/final-quote logic changed. |
| Disabled checkout promises | Feature-aware state copy says ordering unavailable/not quoted; the next link says Ordering information. Existing feature gate retained. |
| Mixed currency | Core PDP, cart, checkout, recent/saved cards and hosted-payment return use CurrencyAmount. Internal ISO currency and monetary APIs remain unchanged. |
| Mixed primary actions | Customer primary/default/accent is coral/ink; outline/ghost controls have distinct secondary roles. Shapes/states have a single scoped owner. |
| Narrow mobile search panel | Suggestions span the header shell. Input/clear/Escape behavior retained. |
| Small search/delivery targets | Minimum 44px hit areas; campaign CTA/footer links also retain 44px targets. |
| Tiny stock/chip type | Availability/chips now 12px; intentional 13px supporting labels documented. |
| Unavailable minus glyph | Neutral unavailable icon replaces decrement-like minus. |
| Repeated pack text | Literal pack size moves into the chip without losing full accessible product name or container identity. |
| Existing basket product recommended again | Recommendations filter current cart IDs and update on existing storage/cart events. |
| Repeated cart help/continuation | One summary help block and continuation link; recommendations follow summary. |
| Long phone footer/menu | Native collapsible secondary groups on phones; desktop groups remain expanded and links preserved. |
| Repeated no-results explanations | One main empty-result explanation. Literal suggested queries retain their wording inside localized surrounding labels. |
| Review-state ambiguity | Distinguishes published-list loading failure from sign-in/qualifying-order requirements for submitting. No review API/auth change. |
| Lone page 1 | Pagination appears only when previous/next navigation exists. URLs and filter retention unchanged. |
| Sparse PDP description | Actual summary is accepted as description fallback; exact pack facts are visible. No invented use/ingredients/medical content. Source-content limitation remains below. |
| Uneven product photos | Existing exact-pack images remain contained in consistent frames. A higher-quality replacement photo still requires verified source media; no generated/cropped pack identity or product association change. |

## Remaining catalogue inputs

The local reference fixture intentionally supplies blank descriptions. It is not evidence that production products have no content. Reviewed local assets/provenance cover six exact product IDs. The PD0826 Bioderma image has a handheld background; the other source photos vary in internal whitespace/scale. No alternate verified exact-pack asset was available in the reviewed reference asset set. Retain originals until a verified replacement is available.

These two content limitations cannot be honestly filled by layout code or generated product claims. Current runtime uses real descriptions/summaries when supplied and an honest pharmacy-contact fallback otherwise. Identity/media data, production records and integrations were not modified.
