import test from 'node:test';
import assert from 'node:assert/strict';
import { imageIdentitySchema, imageReviewStageSchema, projectImageReviewResponse } from '@almina/contracts';
import { compareImageIdentity, imageReviewProductIdentity, imageReviewProductRevision, reviewGtin, reviewStrength } from '../apps/api/src/modules/media/image-review-identity';
import { accessPolicy, canVisit, upstreamQuery } from '../apps/web/src/lib/admin/policy';
import { lookupPolicy } from '../apps/api/src/modules/auth/retained-policy';
import { imagePublicationStartSchema, imagePublicationActionSchema, type ImageReviewDetail } from '@almina/contracts';
import { initialReviewChecks, canApproveImage, imageReviewDecision, nextImageReviewId, reviewApprovalNote } from '../apps/web/src/lib/admin/image-review-workflow';
const identity = (patch: object = {}) => imageIdentitySchema.parse({ name: 'Acme Skin Cream', brand: 'Acme', form: 'Cream', size: '50 g', ...patch });
test('image review separates staff decisions from administrator staging and catalogue import', () => {
  assert.equal(canVisit('user', 'image-review'), true);
  for (const [method, endpoint, policy] of [['GET', '', 'staff'], ['GET', '/export', 'staff'], ['POST', '/decide', 'staff'], ['POST', '/stage', 'admin'], ['POST', '/preview', 'admin'], ['POST', '/import', 'admin'], ['POST', '/publish', 'admin']]) {
    assert.equal(accessPolicy(method!, 'image-review' + endpoint), policy);
    assert.equal(lookupPolicy(method!, '/api/image-review' + endpoint)?.policy, policy);
  }
  assert.equal(accessPolicy('GET', 'image-review/../products'), undefined);
  assert.equal(accessPolicy('DELETE', 'image-review'), undefined);
  assert.equal(accessPolicy('GET', 'image-review/uploads/' + 'a'.repeat(64)), 'admin');
  assert.throws(() => upstreamQuery('image-review', new URLSearchParams('limit=1000')));
  assert.throws(() => upstreamQuery('image-review', new URLSearchParams('filter={}')));
  assert.throws(() => upstreamQuery('image-review', new URLSearchParams('status=approved&status=pending')));
});
test('identity evidence compares full combinations, denominators, forms, pack and independent identifiers', () => {
  assert.notEqual(reviewStrength('875/125 mg'), reviewStrength('875 mg'));
  assert.equal(reviewStrength('1 mg/ml'), reviewStrength('5 mg/5 ml'));
  assert.notEqual(reviewStrength('1% w/w'), reviewStrength('1% w/v'));
  const comparisons = compareImageIdentity(identity({ strength: '2%', quantity: '30 capsules', barcode: '0036000291453' }), identity({ strength: '5%', quantity: '30 tablets', barcode: '0036000291452' }));
  assert.equal(comparisons.find(c => c.field === 'strength')!.status, 'conflict');
  assert.equal(comparisons.find(c => c.field === 'quantity')!.status, 'conflict');
  assert.equal(comparisons.find(c => c.field === 'barcode')!.status, 'unknown');
  assert.equal(reviewGtin('0036000291452'), '0036000291452');
  assert.equal(reviewGtin('00000000'), null);
  assert.equal(compareImageIdentity(identity(), identity({ size: '50 ml' })).find(c => c.field === 'size')!.status, 'conflict');
  assert.equal(compareImageIdentity(identity({ form: 'ODT Tablets' }), identity({ form: 'Tablets' })).find(c => c.field === 'form')!.status, 'conflict');
});
test('missing brands remain unknown, numeric raw identifiers stay unknown, and name text supports literal product lines', () => {
  const product = { name: 'ACM Novophane Energizing Shampoo 200 ml', product_id: 'PD0081', productForm: 'Shampoo', barcode: 123456789012 };
  const observed = identity({ name: 'ACM Novophane Energizing Shampoo', brand: 'ACM', line: 'Novophane', form: 'Shampoo', size: '200 ml' });
  const catalogue = imageReviewProductIdentity(product, observed);
  assert.equal(catalogue.line, 'Novophane'); assert.equal(catalogue.barcode, '');
  assert.equal(compareImageIdentity(observed, catalogue).find(c => c.field === 'brand')!.status, 'unknown');
  assert.equal(imageReviewProductRevision({ ...product, stock: 2 }), imageReviewProductRevision({ ...product, stock: 500 }));
  assert.notEqual(imageReviewProductRevision(product), imageReviewProductRevision({ ...product, mediaRevision: 1 }));
  assert.notEqual(imageReviewProductRevision({ ...product, _id: 'a'.repeat(24) }), imageReviewProductRevision({ ...product, _id: 'b'.repeat(24) }));
});
test('withdrawn Aptamil size and lash model differences remain independent blocking evidence', () => {
  const image = identity({ name: 'Aptamil Comfort 2', brand: 'Aptamil', size: '400 g', ageStage: 'stage 2' });
  const catalogue = identity({ name: 'Aptamil Comfort 2', brand: 'Aptamil', size: '900 g', ageStage: 'stage 2' });
  assert.equal(compareImageIdentity(image, catalogue).find(c => c.field === 'size')!.status, 'conflict');
  assert.equal(compareImageIdentity(identity({ shadeModel: '' }), identity({ shadeModel: 'KMAT04C' })).find(c => c.field === 'shadeModel')!.status, 'unknown');
});
test('temporary review contract bounds staging and response projection rejects unexpected provider or identity shapes', () => {
  assert.equal(imageReviewStageSchema.safeParse({ items: [] }).success, false);
  const result = projectImageReviewResponse('image-review/stage', { created: 1, replayed: 0, password: 'synthetic-secret' });
  assert.deepEqual(result, { created: 1, replayed: 0 });
  assert.throws(() => projectImageReviewResponse('image-review', { enabled: true, items: [{ private: 'unexpected' }], counts: {}, nextAfter: null }));
});

test('background publication endpoints require administrator privileges and strict job requests', () => {
  for (const [method, path] of [['GET', '/publication'], ['POST', '/publication/start'], ['POST', '/publication/resume'], ['POST', '/publication/pause']]) {
    assert.equal(accessPolicy(method!, 'image-review' + path), 'admin');
    assert.equal(lookupPolicy(method!, '/api/image-review' + path)?.policy, 'admin');
  }
  assert.equal(imagePublicationStartSchema.safeParse({ requestId: 'abc' }).success, false);
  assert.equal(imagePublicationActionSchema.safeParse({ jobId: 'abc', role: 'admin' }).success, false);
  assert.throws(() => projectImageReviewResponse('image-review/publication', { publication: { phase: 'publishing', private: 'unexpected' } }));
  assert.deepEqual(projectImageReviewResponse('image-review/publication', { publication: null, private: 'ignored' }), { publication: null });
});

function workflowDetail(): ImageReviewDetail {
  const values = identity();
  return { item: { itemId: 'a'.repeat(64), revision: 0, status: 'pending', selectedProductId: 'PD_TEST', note: '', reviewer: null, reviewedAt: null, approvalId: null,
    source: { assetId: 'synthetic', sourceSha256: 'b'.repeat(64), publicId: 'products/synthetic', imageUrl: 'https://res.cloudinary.com/synthetic/image/upload/v1/products/synthetic.webp', identity: values, labelText: [], flags: [], candidateProductIds: ['PD_TEST'], priorDecision: 'held', sourceNote: '', extractionReference: 'synthetic' } },
    product: { productId: 'PD_TEST', id: 'a'.repeat(24), name: values.name, revision: 'c'.repeat(64), mediaRevision: 0, images: [], identity: values },
    candidates: [], comparison: compareImageIdentity(values, values), withdrawalReason: null, sharedIdentifiers: [], history: [] };
}
test('one-action review creates a human attestation only on approval, after the individual original loads', () => {
  const detail = workflowDetail(), checks = initialReviewChecks(detail);
  assert.ok(checks.every(check => !check.confirmed));
  assert.equal(canApproveImage(detail, checks, false, false), false);
  assert.throws(() => imageReviewDecision(detail, checks, 'approved', false, false, ''), /Inspect the original/);
  assert.equal(canApproveImage(detail, checks, true, false), true);
  const input = imageReviewDecision(detail, checks, 'approved', true, false, '');
  assert.equal(input.originalViewed, true); assert.ok(input.checks.every(check => check.confirmed)); assert.equal(input.note, reviewApprovalNote);
  assert.match(imageReviewDecision(detail, checks, 'approved', true, false, 'OK').note, /Note: OK$/);
  assert.ok(checks.every(check => !check.confirmed), 'Readiness and the builder never mutate prior UI evidence');
  const held = imageReviewDecision(detail, checks, 'held', true, false, 'Size or strength is unclear');
  assert.equal(held.originalViewed, false); assert.equal(held.note, 'Size or strength is unclear');
});
test('fast review blocks conflicts, unknown required evidence, edits to catalogue truth, shared IDs, flags and withdrawals', () => {
  const detail = workflowDetail(), checks = initialReviewChecks(detail);
  assert.equal(canApproveImage(detail, checks.filter(check => check.field !== 'brand'), true, false), false);
  detail.sharedIdentifiers = ['0036000291452'];
  assert.equal(canApproveImage(detail, checks, true, false), false);
  assert.equal(canApproveImage(detail, checks, true, true), true);
  detail.sharedIdentifiers = []; detail.withdrawalReason = 'Wrong size';
  assert.equal(canApproveImage(detail, checks, true, false), false);
  detail.withdrawalReason = null; detail.item.source.flags = ['blurry'];
  assert.equal(canApproveImage(detail, checks, true, false), false);
  detail.item.source.flags = []; detail.item.status = 'imported';
  assert.equal(canApproveImage(detail, checks, true, false), false);
  detail.item.status = 'pending';
  detail.comparison = compareImageIdentity(identity(), identity({ size: '100 g' }));
  const conflicting = initialReviewChecks(detail);
  const size = conflicting.find(check => check.field === 'size')!;
  size.confirmed = true; size.evidence = 'Verified exact values on the original label';
  assert.equal(canApproveImage(detail, conflicting, true, false), false, 'A generic confirmation cannot resolve a size conflict');
  size.catalogueValue = '50 g';
  assert.equal(canApproveImage(detail, conflicting, true, false), false, 'Known catalogue data is immutable in the review');
  detail.comparison = compareImageIdentity(identity({ brand: '' }), identity());
  const unknown = initialReviewChecks(detail), brand = unknown.find(check => check.field === 'brand')!;
  assert.equal(canApproveImage(detail, unknown, true, false), false);
  brand.imageValue = 'Acme'; brand.confirmed = true;
  assert.equal(canApproveImage(detail, unknown, true, false), false, 'Missing OCR still needs provenance');
  brand.evidence = 'I verified Acme on this individual original label.';
  assert.equal(canApproveImage(detail, unknown, true, false), true);
});
test('queue navigation advances without resaving skipped images and wraps without returning the current image', () => {
  const rows = ['a', 'b', 'c'].map(itemId => ({ itemId }));
  assert.equal(nextImageReviewId(rows, 'a'), 'b'); assert.equal(nextImageReviewId(rows, 'c'), 'a');
  assert.equal(nextImageReviewId(rows, 'missing'), 'a'); assert.equal(nextImageReviewId([rows[0]!], 'a'), null);
  assert.equal(nextImageReviewId([], 'a'), null);
});
