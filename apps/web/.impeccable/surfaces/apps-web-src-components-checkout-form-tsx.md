---
version: 1
slug: "apps-web-src-components-checkout-form-tsx"
primary_target: "apps/web/src/components/checkout-form.tsx"
related_targets: ["apps/web/src/app/(storefront)/checkout/page.tsx","apps/web/src/components/stripe-return.tsx","apps/web/src/app/(storefront)/storefront.css"]
---

# Responsive purchase flow

Mode: Operate. Existing Al Mina storefront world; code-led refinement of the user-specified mobile stages and desktop side-by-side checkout. References are layout/interaction evidence, not authorization to collect card numbers or advertise unsupported methods.

## Direction contract

THESIS: A guided handoff from delivery details to a confident final review. Replace the long mobile form and buried dropdown with two focused stages and native radio payment choices.

OWN-WORLD: Existing Geist with a checkout-specific white, charcoal and cool-gray palette; charcoal progress and blue reserved for verified success. Crisp 9–14px checkout corners, 48px fields, Heroicons, honest totals and quiet separators; no new identity or motion dependency.

STORY: Recognise the basket, enter essential details, review the server-confirmed total, select card or cash, then receive a clear verified outcome. Back/edit preserves entered fields. Optional address details and vouchers disclose on demand.

FIRST VIEWPORT: Mobile shows back-to-cart, secure-checkout label, two-stage progress, compact expandable basket and contact/delivery task with a safe-area-aware continue action. Desktop shows the complete grouped form left and sticky basket/totals/action right. Signature moment: the chosen payment card settles locally and a verified confirmation check resolves with a short ring and staggered receipt reveal.

FORM: Owner confirmed guided mobile stages and desktop side by side, following the supplied references. Precisely pinned extension within the established visual system; no concept tournament or generated comp. seed: not applicable — precisely specified local extension; concept roll not performed.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Constraints: two new-order payment choices, hosted card collection, immutable server totals, idempotency and legacy pending-method recovery. No fake trust claims, urgency or reviews. Reduced motion, keyboard radio navigation, RTL, explicit loading/error/retry states. No customer PII in persistent draft storage.
