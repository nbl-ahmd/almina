# Delivery zones UI extension review — 2026-11-07

Disposition: ordinary Operate-mode extension matches the incumbent systems. The independent delivery finish review returned **ship** after the refreshed screenshot matrix, Arabic picker localization and duplicate pin-removal action were resolved. This is a scoped UI evidence record, not production activation, verification of real provider geography, or a whole-application review.

## Authority and scope

Reviewed against `.agents/skills/impeccable/reference/document.md`, `apps/web/PRODUCT.md`, `apps/web/DESIGN.md` and `apps/web/src/app/(admin)/admin/DESIGN.md`. No new visual world or approved composition was introduced. Existing system documents and `.impeccable/design.json` remain authoritative and unchanged by this pass; no token or sidecar regeneration is warranted for this ordinary extension.

Source sample: `apps/web/src/components/admin/delivery-management.tsx`, `apps/web/src/components/delivery-map.tsx`, `apps/web/src/components/delivery-map.css`, `apps/web/src/components/delivery-pin-picker.tsx`, and the changed integrations in `checkout-form.tsx`, `customer-address-book.tsx` and `wholesale/portal.tsx`. The map and picker live directly under `components`, not under `components/admin`. Admin and storefront stylesheets were checked alongside these components.

## System match

- Palette: admin retains white working panels, neutral canvas and ink actions; checkout retains its existing cool gray fields and charcoal controls. Map geometry and pins carry geographic information rather than a new brand treatment.
- Type: optimized Geist and the incumbent compact admin hierarchy remain; storefront fields retain readable values and persistent labels. Arabic retains the existing Arial/Tahoma fallback and RTL layout. No new display family or decorative type ramp is introduced.
- Layout and shape: existing panel boundaries, compact admin controls and responsive form grids continue. The map uses a neutral bordered well with (12px) corners, (340px) desktop height and (300px) height at widths up to (600px); mobile map controls reach (44px).
- Named rules: the admin **State and Data Rule** and **Working Surface Rule** remain applicable; the storefront **Coral With Ink Rule** and **Flat Product Rule** remain unchanged. Map colors do not authorize colored admin primary actions or navigation.
- Interaction: explicit save/activation actions, visible status messages, map disclosure and coordinate/GeoJSON alternatives support a precise task flow. Customer pin changes invalidate review; removal clears the picker and requires a new delivery review. Checkout has one delivery-pin removal action and retains its existing location action.

The visible routing explanation follows the requested order: eligible branch priority first, then the nearest fully stocked branch. Lower priority numbers take precedence; overlapping rules for one branch use zone priority first. Branch details and allocation tasks remain separate from delivery-zone editing, and activation communicates its prerequisites.

## Evidence

The refreshed isolated browser run is recorded in `.verification-results/zones-final-browser.txt`: four scenarios passed, including branch/polygon/checkout flow, Arabic account and wholesale pickers, checkout review invalidation after pin removal, and the retained account-provider fallback. `.verification-results/zones-ar-recapture.txt` records the subsequent passing Arabic recapture. The documentation pass inspected the test source and logs; it did not rerun these scenarios.

`tests/e2e/delivery-zones.spec.ts` saves branch address/hours through the UI, allocates branch stock through the UI, draws a polygon, edits its GeoJSON alternative, saves it and explicitly activates coverage in isolated fixtures. It selects a customer pin, reviews the assigned synthetic local branch, checks (AED 5.00) delivery and (AED 45.00) total, and places a cash order through to Order received. Zone-editor document overflow is checked at (360px), (390px), (768px) and (1280px); Arabic account and wholesale overflow is checked at (390px). These assertions do not imply that every route was checked at every width.

Arabic account and wholesale scenarios grant browser geolocation permission, supply a synthetic GPS position, invoke the actual current-location action, open the localized map/coordinates, and remove the pin. Their captures include loaded synthetic tiles. They demonstrate browser permission and picker behavior under controlled location data, not a physical-device accuracy measurement or live address-provider verification.

Screenshot matrix (paths relative to `.verification-results/`):

| Surface/state | Phone | Desktop |
| --- | --- | --- |
| Branch setup | `zones-branches-390.png` | `zones-branches-1280.png` |
| Zone editor | `zones-editor-390.png` | `zones-editor-1280.png` |
| Polygon map detail | `zones-map-390.png` | `zones-map-1280.png` |
| Checkout | `zones-checkout-390.png` | `zones-checkout-1280.png` |
| Review/payment | `zones-payment-390.png` | `zones-checkout-1280.png` (review/payment state) |
| Arabic account GPS and map | `zones-account-ar-390.png` | — |
| Arabic wholesale GPS and map | `zones-wholesale-ar-390.png` | — |
| Arabic account pin removed | `zones-account-ar-removal-390.png` | — |
| Arabic wholesale pin removed | `zones-wholesale-ar-removal-390.png` | — |

The desktop file named `zones-checkout-1280.png` shows the reviewed payment state; it is not a separate delivery-entry capture. Map imagery in this matrix is explicitly labelled **Synthetic map fixture**, intercepted for isolated tests. These captures verify controls and layout, not real boundaries, branch coordinates or OpenStreetMap tile availability. Direct visual samples checked in this documentation pass were the phone editor, desktop checkout review and Arabic account removal state; the independent finish review supplied the full-matrix disposition.

## Advisory and preservation

`.verification-results/zones-design-detect.json` contains one advisory for the configurable default map color (`#2563eb`) in `delivery-management.tsx`. That value already matches admin chart blue, while the detector's storefront context does not contain it. This geographic data mark is intentional local usage; the advisory is not a blocker or justification to expand global storefront tokens.

Not canonized or repaired: inherited admin micro-label/touch-target drift already recorded by the incumbent system remains outside this extension; third-party map chrome and its marker styling are local geographic UI, not new global primitives. No defects were legitimized by adding tokens or prohibitions.

Only this review note was written. The storefront DESIGN.md, admin DESIGN.md and root `.impeccable/design.json` were hash-checked before and after writing and preserved byte-for-byte. Source, product context and operational setup documentation were left untouched by this pass. Operational setup and activation requirements remain in [DELIVERY_ZONES_2026-11-06.md](DELIVERY_ZONES_2026-11-06.md).
