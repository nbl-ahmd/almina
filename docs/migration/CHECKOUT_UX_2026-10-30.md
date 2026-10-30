# Checkout UX — 2026-10-30

Implementation branch: `codex/responsive-checkout-ux`. Not deployed.

Mobile uses Delivery details then Review & payment, with back/edit preserving fields, progress and a safe-area-aware action. Desktop keeps grouped fields beside a sticky order summary. Payment choices use native radios for credit/debit card and cash on delivery. Existing legacy pending payment recovery is retained.

Detail validation reuses the commerce contract. Formatted and Arabic-digit mobile numbers normalize before validation. Optional address details and cash vouchers disclose on demand. Only server quotes provide totals; checkout acknowledgments, idempotency, immutable saved attempts and hosted card collection are preserved.

Owner's later reference feedback replaces the initial mint treatment with scoped white, charcoal and cool gray. Related controls group through proximity, complete payment cards are touch targets, and the total/action hold the strongest emphasis. Product thumbnails persist after review. Verified success uses a short blue ring/receipt reveal. Motion uses CSS transform/opacity, existing easing, pointer gating and reduced-motion overrides; no dependencies added.

## Verification and limits

Final validation passed: 252 unit tests, 179 disposable integration tests, typecheck, lint and the isolated production build. The actual Playwright checkout/payment run passed all 35 cases, covering responsive checkout at 360/390/768/1280px and card flow at 1440px; axe checks on checkout and cash confirmation; a real order in a disposable database; changed-price review; saved-intent retry; GPS/manual fallbacks; and mocked card cancellation, refund, paid, idempotency and authorization states. Card provider outcomes were mocked; no external payment was executed. Next.js MCP reported no compilation issues.

The separate final capture test passed. Final renders were opened and inspected under `apps/web/.impeccable/review/checkout-final/`: `desktop.png`, `mobile.png`, `mobile-details.png`, `user-360.png`, `user-768.png`, `arabic.png` and `confirmation.png`. These show the final neutral revision; the captures under `checkout-before-reference-revision/` are superseded. The capture test confirmed the normal-mode success animation as `checkout-success-settle` with a `0.28s` duration. Browser emulation of reduced motion confirmed animation/transition suppression (`none`) on the checked checkout elements. This is actual browser evidence, separate from the CSS inspection and automated functional suite.

No real charge, production order, production configuration change or deployment occurred. Physical phone behavior and an external payment-provider charge remain untested. No quantified PageSpeed improvement is claimed.

### Finish review

The independent finish reviewer returned **ship** after the full five-section review, with no material fixes required. This disposition applies to the scoped checkout extension and its final source/render evidence; physical-phone and real-charge acceptance remain the separate limits stated above.

Rollback: revert the frontend change; no database migration or integration configuration rollback is needed.

## Scoped design-system comparison — final source and render record

Compared `apps/web/DESIGN.md`, the existing root `.impeccable/design.json`
sidecar, `apps/web/PRODUCT.md` and the checkout surface contract at
`apps/web/.impeccable/surfaces/apps-web-src-components-checkout-form-tsx.md`
against `checkout-form.tsx`, `checkout-ui.tsx`, `stripe-return.tsx` and the final
checkout rules in `apps/web/src/app/(storefront)/storefront.css`. The document
reference was read in full. This is an ordinary checkout extension; the existing
design document and sidecar are preserved. The observations below compare final source with the opened final captures. Exact
values are source declarations; screenshots corroborate their visible use without
establishing new storefront tokens or a measured pixel-match claim.

- **Palette:** checkout locally overrides ink to charcoal (`#202124`), supporting
  text to cool gray (`#60646c` / `#656970`), subtle surfaces to `#f7f8f9` and
  control boundaries to `#c7cbd1`. Selected payment cards remain white with a
  charcoal boundary and radio mark. Verified confirmation uses blue (`#2459a6`)
  on `#edf3fc`, with a `#b9cdec` ring. Error and warning semantics remain separate.
  This records the owner's neutral checkout request without replacing the
  incumbent storefront coral/pastel palette.
- **Typography:** checkout inherits the existing storefront family and Arabic
  fallback, visible in the English and RTL captures respectively. Source uses a 20/24px responsive checkout title, a 22px contact and
  delivery heading, 18px summary heading, 16px field text, 14px labels/body and
  12px supporting copy. The final total is 22px with tabular numerals. Confirmation
  uses 24/30px in the cash receipt and 24px in the hosted-payment return.
- **Layout and depth:** the desktop capture shows grouped fields left and the
  quiet summary right; mobile/tablet captures show the separate review stage,
  full-width payment choices at narrow widths and a fixed bottom action. Source limits the flow to 1160px; from 1024px the form
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
  during this pass. The captures show the neutral progress, selected radio card and blue
  confirmation ring. These remain local checkout observations and are not added
  to the incumbent storefront token scales.

Pre-existing context drift is retained: PRODUCT.md describes the original Figma
brief while the current app instructions describe a later competitor-led
direction. The root sidecar also retains older press-scale and footer-clearance
values alongside newer guidance in DESIGN.md and source. Reconciliation falls
outside this checkout documentation boundary.

The final capture set confirms the intended visual hierarchy: delivery fields are grouped by proximity, the selected payment card has a dark outline/check, the basket retains a thumbnail, and the total and order action receive the strongest emphasis. Arabic mirrors the flow and confirmation. Full-page screenshots include the fixed action at the capture viewport edge; scroll reachability and functional behavior are assessed by browser tests rather than inferred from that screenshot composition.

No assets were generated. The checkout's pale unselected control boundaries are recorded as an observed local treatment, not promoted into a reusable accessibility rule or proof of contrast compliance; an axe pass alone does not establish every non-text boundary's contrast. Pre-existing product-context and sidecar drift are not canonized or repaired because they fall outside this ordinary checkout extension. The independent finish review verdict is recorded separately above.
