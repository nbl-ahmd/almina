# Image review and publishing: one-step flow (2026-11-23)

## What changed

**Going live from the Products table.** The toggle no longer asks for content, stock and image-rights reviews. Store publication
(`storePublicationIssues`) now needs only a complete product name and a sellable type (General or Pharmacy medicine; prescription
items are never sold online, `unreviewed` must be set first). When a product goes live the server records the reviewed stamps
(`contentReviewed`, `stockVerified` + `stockReviewedAt/By`, `imageRights: authorized`), exactly as saving in the product editor
already did, so search, rewards, related products and the advertising feeds that read those stamps keep working. The audit row says
"Visibility toggle (marked reviewed)". Advertising feeds keep the strict `publicationIssues` list. If a product still cannot go live
the toast says why (type or name) and offers "Open product". The Needs-action page no longer lists the removed checks.

**Image review.** One image, one product, one decision.
- The screen shows the image beside the matched product. Only details that differ from the label are listed, each with "Use label
  value" and an inline edit (administrators); matching details collapse into one line.
- No per-field confirmation, written evidence, hold reason, discard or "correct extraction" controls. Differences warn but do not block.
- Actions: **Save & publish & next** (administrators; **Approve & next** for staff), Hold, Not a match, Skip. Alt+Enter / Alt+H / Alt+J.
- Approving moves to the next image at once. Administrators' approvals publish the image in the background (toast with progress and a
  clear message if it needs a retry from the Approved tab). Corrections made on the screen travel with the approval.
- Server (`decideImageReview`, `validateChecks`): approval no longer requires per-field checks, evidence text, a minimum-length note
  or a receipt for corrected values. Still enforced: the original was shown, flagged source images cannot be approved, withdrawn
  associations and stale product records are rejected, only administrators may change catalogue fields, and a shared barcode needs
  one confirmation checkbox. Existing approvals stay valid; the schema's `note` is now optional.

## Risk to know about
Approving no longer proves each field was checked. A reviewer can approve an image whose strength or size differs from the catalogue;
the screen highlights it and offers the one-click fix, but the server will accept the approval. Rollback: restore `validateChecks`
and the schema's `note.min(5)` from the previous commit (stored approvals are compatible both ways).

## Verification
Unit and integration tests updated and extended (one-step approval, publish gate and stamping); new Playwright spec
`tests/e2e/image-review.spec.ts` (four images: matching, differing + correction, hold; background publish call; no review controls;
products-table toggle). The e2e fixture now enables the review module and can seed products directly.
