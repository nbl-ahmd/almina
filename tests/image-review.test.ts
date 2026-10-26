import test from 'node:test';
import assert from 'node:assert/strict';
import { imageIdentitySchema, imageReviewStageSchema, projectImageReviewResponse } from '@almina/contracts';
import { compareImageIdentity, imageReviewProductIdentity, imageReviewProductRevision, reviewGtin, reviewStrength } from '../apps/api/src/modules/media/image-review-identity';
import { accessPolicy, canVisit, upstreamQuery } from '../apps/web/src/lib/admin/policy';
import { lookupPolicy } from '../apps/api/src/modules/auth/retained-policy';
import { imagePublicationStartSchema, imagePublicationActionSchema } from '@almina/contracts';
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
