import { compareImageIdentity, imageReviewEditableFields, imageReviewProductIdentity, type ImageIdentityField, type ImageReviewDecisionInput, type ImageReviewDetail, type ImageReviewItem, type ImageReviewProductChanges } from '@almina/contracts';

export type ReviewCheck = ImageReviewDecisionInput['checks'][number];
export const reviewApprovalNote = 'I inspected this individual original and verified all required identity attributes against the selected catalogue product.';
export const reviewHoldReasons = ['Needs another pharmacist check', 'Size or strength is unclear', 'Label is unreadable', 'No matching product found'] as const;
export const reviewLabelEvidence = 'I verified this value on this individual original label.';

export function editableProductField(field: ImageIdentityField) {
  return (imageReviewEditableFields as Partial<Record<ImageIdentityField, keyof ImageReviewProductChanges>>)[field];
}

export function previewImageReview(detail: ImageReviewDetail, changes: ImageReviewProductChanges) {
  if (!detail.product?.fields || !Object.keys(changes).length) return detail;
  const identity = imageReviewProductIdentity({ ...detail.product.fields, ...changes }, detail.item.source.identity);
  return { ...detail, comparison: compareImageIdentity(detail.item.source.identity, identity) };
}

export function initialReviewChecks(detail: ImageReviewDetail): ReviewCheck[] {
  return detail.comparison.filter(row => row.required).map(row => ({ field: row.field, imageValue: row.imageValue, catalogueValue: row.catalogueValue, confirmed: false, evidence: '' }));
}
export function isUnchangedMatch(detail: ImageReviewDetail, check: ReviewCheck) {
  const row = detail.comparison.find(value => value.field === check.field);
  return !!row && row.status === 'match' && check.imageValue === row.imageValue && check.catalogueValue === row.catalogueValue;
}
export function reviewFieldMatches(detail: ImageReviewDetail, check: ReviewCheck) {
  if (!check.imageValue.trim() || !check.catalogueValue.trim()) return false;
  const image = { ...detail.item.source.identity, [check.field]: check.imageValue.trim() };
  const catalogue = Object.fromEntries(detail.comparison.map(field => [field.field, field.catalogueValue])) as typeof image;
  catalogue[check.field] = check.catalogueValue.trim();
  const resolved = compareImageIdentity(image, catalogue).find(field => field.field === check.field);
  return resolved?.status === 'match' || (check.field === 'name' && resolved?.status === 'unknown');
}
/** Evaluates readiness only; the attestation is created exclusively by a reviewer's approval action. */
export function canApproveImage(detail: ImageReviewDetail, checks: ReviewCheck[], originalLoaded: boolean, sharedConfirmed: boolean) {
  if (!originalLoaded || detail.item.status === 'imported' || !detail.product || detail.withdrawalReason || detail.item.source.flags.length || !checks.length) return false;
  if (detail.sharedIdentifiers.length && !sharedConfirmed) return false;
  if (new Set(checks.map(check => check.field)).size !== checks.length || detail.comparison.some(row => row.required && !checks.some(check => check.field === row.field))) return false;
  return checks.every(check => {
    const row = detail.comparison.find(value => value.field === check.field);
    if (!row || !check.imageValue.trim() || !check.catalogueValue.trim()) return false;
    if (isUnchangedMatch(detail, check)) return true;
    if (!check.confirmed || check.evidence.trim().length < 10 || (row.catalogueValue && row.catalogueValue !== check.catalogueValue)) return false;
    return reviewFieldMatches(detail, check);
  });
}
export function imageReviewDecision(detail: ImageReviewDetail, checks: ReviewCheck[], decision: 'approved' | 'held' | 'rejected', originalLoaded: boolean, sharedConfirmed: boolean, note: string): Omit<ImageReviewDecisionInput, 'requestId'> {
  if (decision === 'approved' && !canApproveImage(detail, checks, originalLoaded, sharedConfirmed)) throw new Error('Inspect the original and resolve the highlighted attributes before approving.');
  const fallback = decision === 'approved' ? reviewApprovalNote : decision === 'held' ? reviewHoldReasons[0] : 'Rejected this proposed association after review.';
  const minimum = decision === 'approved' && sharedConfirmed ? 10 : 5;
  const trimmed = note.trim(), savedNote = trimmed && trimmed.length < minimum ? `${fallback} Note: ${trimmed}` : trimmed || fallback;
  return { itemId: detail.item.itemId, expectedRevision: detail.item.revision, productId: detail.product?.productId ?? null, productRevision: detail.product?.revision ?? null,
    decision, originalViewed: decision === 'approved', sharedIdentifierConfirmed: sharedConfirmed,
    checks: decision === 'approved' ? checks.map(check => ({ ...check, confirmed: check.confirmed || isUnchangedMatch(detail, check) })) : checks,
    note: savedNote };
}
export function nextImageReviewId(items: Pick<ImageReviewItem, 'itemId'>[], current?: string) {
  if (!items.length) return null;
  const index = items.findIndex(item => item.itemId === current);
  return items.slice(index + 1).concat(items.slice(0, Math.max(0, index))).find(item => item.itemId !== current)?.itemId ?? null;
}
