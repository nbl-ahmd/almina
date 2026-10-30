# Checkout UX — 2026-10-30

Implementation branch: `codex/responsive-checkout-ux`. Not deployed.

Mobile uses Delivery details then Review & payment, with back/edit preserving fields, progress and a safe-area-aware action. Desktop keeps grouped fields beside a sticky order summary. Payment choices use native radios for credit/debit card and cash on delivery. Existing legacy pending payment recovery is retained.

Detail validation reuses the commerce contract. Formatted and Arabic-digit mobile numbers normalize before validation. Optional address details and cash vouchers disclose on demand. Only server quotes provide totals; checkout acknowledgments, idempotency, immutable saved attempts and hosted card collection are preserved.

Owner's later reference feedback replaces the initial mint treatment with scoped white, charcoal and cool gray. Related controls group through proximity, complete payment cards are touch targets, and the total/action hold the strongest emphasis. Product thumbnails persist after review. Verified success uses a short blue ring/receipt reveal. Motion uses CSS transform/opacity, existing easing, pointer gating and reduced-motion overrides; no dependencies added.

## Verification and limits

252 unit tests and 179 disposable integration tests passed. Before the final reference revision, CUA browser checks covered 360/390/768/1440px, RTL, linked validation focus, keyboard radio selection, back/edit preservation, quote changes and disposable cash success. A changed price blocked submission until reviewed. Reload during a delayed response recovered the same order without a second stock deduction. Next runtime diagnostics reported no errors.

The final reference revision still needs rendered browser verification. The CUA tool became unavailable during this turn. Older captures under `apps/web/.impeccable/review/checkout-before-reference-revision/` deliberately document the superseded look, not final visual approval. Updated browser regression source has not been executed as a Playwright suite. No real payment or production order was created. No production configuration changed. Reduced-motion CSS was inspected; device-level motion preference and physical phone testing remain outstanding. No PageSpeed improvement is claimed.

Rollback: revert the frontend change; no database migration or integration configuration rollback is needed.

## Scoped design-system comparison — interim source record

Compared `apps/web/DESIGN.md`, the existing root `.impeccable/design.json`
sidecar, `apps/web/PRODUCT.md` and the checkout surface contract at
`apps/web/.impeccable/surfaces/apps-web-src-components-checkout-form-tsx.md`
against `checkout-form.tsx`, `checkout-ui.tsx`, `stripe-return.tsx` and the final
checkout rules in `apps/web/src/app/(storefront)/storefront.css`. The document
reference was read in full. This is an ordinary checkout extension; the existing
design document and sidecar are preserved. The observations below describe
source declarations, not measured final rendering or new storefront tokens.

- **Palette:** checkout locally overrides ink to charcoal (`#202124`), supporting
  text to cool gray (`#60646c` / `#656970`), subtle surfaces to `#f7f8f9` and
  control boundaries to `#c7cbd1`. Selected payment cards remain white with a
  charcoal boundary and radio mark. Verified confirmation uses blue (`#2459a6`)
  on `#edf3fc`, with a `#b9cdec` ring. Error and warning semantics remain separate.
  This records the owner's neutral checkout request without replacing the
  incumbent storefront coral/pastel palette.
- **Typography:** checkout inherits the existing storefront family and Arabic
  fallback. Source uses a 20/24px responsive checkout title, a 22px contact and
  delivery heading, 18px summary heading, 16px field text, 14px labels/body and
  12px supporting copy. The final total is 22px with tabular numerals. Confirmation
  uses 24/30px in the cash receipt and 24px in the hosted-payment return.
- **Layout and depth:** source limits the flow to 1160px; from 1024px the form
  sits beside a 380px sticky summary with an 80px gap. Mobile shows details and
  payment as separate stages and uses a bottom action with safe-area padding.
  The form groups through spacing and separators, while the summary has a quiet
  gray fill. Field and bottom-action shadows are faint ambient effects; no hard
  offset shadow is introduced.
- **Components and existing rules:** Heroicons, native payment radios, labelled
  fields, linked validation, 48px primary controls and 44px utility targets retain
  incumbent conventions. The Coral With Ink Rule still applies wherever coral
  is used; the Flat Product Rule is unchanged. Checkout's native disclosures,
  full-card payment labels and server-confirmed totals are local task patterns,
  not new global visual prohibitions. Existing motion easing is reused, with
  reduced-motion overrides; receipt/ring effects are declared locally and do
  not establish an entrance-animation requirement for future commerce surfaces.
- **Shapes and contract alignment:** the final CSS declares 9px field corners,
  10px payment/action corners and a 14px summary, with charcoal progress and blue
  verified success. The surface contract was reconciled to these source values
  during this pass. They remain local checkout observations pending final review
  and are not added to the incumbent storefront token scales.

Pre-existing context drift is retained: PRODUCT.md describes the original Figma
brief while the current app instructions describe a later competitor-led
direction. The root sidecar also retains older press-scale and footer-clearance
values alongside newer guidance in DESIGN.md and source. Reconciliation falls
outside this checkout documentation boundary.

**Outstanding finish check:** recapture and inspect the final reference revision
at 360/390px, tablet and desktop, including RTL, keyboard focus/radio selection,
loading/error/retry, changed totals, back/edit, cash confirmation and hosted
payment return states. Check computed palette inheritance, boundaries/contrast,
overflow, bottom-action clearance and reduced motion. Earlier screenshots are
superseded evidence only. Final visual review remains unfinished; no final
approval, contrast pass or reference-match verdict is recorded here. No assets
were generated. Unverified boundary contrast and
pre-existing context drift are not canonized or repaired by this record.
