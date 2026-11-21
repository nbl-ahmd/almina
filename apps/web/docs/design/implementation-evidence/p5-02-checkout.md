# P5-02 checkout presentation

Implemented on `codex/storefront-pharmacy-app-reference` from `4eefadf` on 18 November 2026.

## Layout and states

| State | Implementation |
| --- | --- |
| Details | Bounded form with visible native labels and separate contact and delivery groups. Manual address fields precede the optional pin and delivery instructions. Fields, validation messages, saved addresses, pin controls and help keep their existing interactions. |
| Review and payment | Phones switch to a focused review heading and show the delivery address, available payment choices and quoted totals. Desktop keeps the details form alongside an order breakdown and the same primary action. Item count reflects quantity. The review preserves VAT handling, delivery, current pack details and voucher behavior. |
| Small viewport and keyboard | The same form-associated button moves between a measured phone dock and the summary. Short landscape and an open software keyboard place it in the page. Measured height and focus scroll clearance leave the end of checkout reachable. |
| Unavailable, loading and empty | Bounded state panels share the storefront canvas and controls. Disabled checkout keeps the pharmacy phone link, the way back to the cart and a read-only estimate. |
| Completion and hosted payment return | Confirmation uses the positive status role and a static completion mark. The hosted payment return shares the accepted frame and retains server-sourced statuses and recovery actions. Existing payment capability gates and test-mode disclosures remain in effect. |

## Evidence

| State | Captures |
| --- | --- |
| Phone details | [English](p5-02-checkout/en-details.png), [Arabic](p5-02-checkout/ar-details.png) |
| Phone review | [English](p5-02-checkout/en-review.png), [Arabic](p5-02-checkout/ar-review.png) |
| Desktop review | [English](p5-02-checkout/en-desktop.png) |
| Disabled checkout and result | [Disabled checkout](p5-02-checkout/disabled.png), [Arabic cash confirmation](p5-02-checkout/ar-confirmation.png) |

Bilingual browser cases exercise validation focus, one actionable form button, preservation of focused input across resize, 320px phone through 1440px desktop, 667×375 short landscape, an emulated visual viewport for the software keyboard, and focus after review. The review-only fixture cases assert unchanged stock, orders and receipts. Confirmation uses disposable cash orders and hosted-payment cases use the existing mocked provider. The checked-out local preview retains its disabled configuration. Production data, providers and deployments were excluded.

The isolated Next.js production build, typecheck, repository lint and 38 unit checks passed. The broader suite passed 52 Chromium, 8 WebKit and 2 admin/wholesale boundary cases. The last visual adjustment extends the accepted canvas below short checkout states. A focused final-build run covers the responsive action and result states against that revision. Next development diagnostics on the existing disabled preview reported no compilation or session errors.

## Ownership

The checkout stylesheet is now scoped to the accepted checkout frame. Removed accumulated inset-field, custom select picker, duplicate action and blue confirmation styles. The native fields, radios and disclosures retain their existing semantics. Legacy button rules exclude the checkout boundary so the shared accepted variants supply its colors, control radii and states. Cart, public catalog, wholesale and admin retain their applicable boundaries.

P5-03 owns the next broader commerce and authentication verification. Native software-keyboard behavior, physical devices, assistive technology and live provider availability remain release checks.
