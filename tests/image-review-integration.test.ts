import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { MongoClient, ObjectId, type Db } from 'mongodb';
import { imageIdentitySchema, type ImageReviewDecisionInput, type ImageReviewDetail } from '@almina/contracts';
import { stageImageReview, createImageReviewDraft, listImageReviews, getImageReview, decideImageReview, previewImageReviewImport, importImageReviewApprovals, exportImageReviewApprovals, imageReviewUploadProgress, publishImageReviewApprovals } from '../apps/api/src/modules/media/image-review';
import { startImagePublication, getImagePublication, changeImagePublication, processImagePublication, imagePublicationWorker } from '../apps/api/src/modules/media/image-review-publication';
import { initialReviewChecks, imageReviewDecision, canApproveImage } from '../apps/web/src/lib/admin/image-review-workflow';
const require = createRequire(import.meta.url);
const { createLegacyApp } = require('../backend/app.js');
const uri = process.env.COMMERCE_TEST_URI;
assert.ok(uri || process.env.REQUIRE_DATABASE_TESTS !== '1', 'Disposable database required');
if (uri) assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
const bytes = Buffer.from('synthetic-original-image-bytes');
const hash = createHash('sha256').update(bytes).digest('hex');
const source = (assetId: string, productId = 'PD_TEST', patch: object = {}) => ({ assetId, sourceSha256: hash, publicId: 'products/' + assetId,
  imageUrl: `https://res.cloudinary.com/synthetic/image/upload/v1/products/${assetId}.webp`,
  identity: imageIdentitySchema.parse({ name: 'Acme Skin Cream', brand: 'Acme', form: 'Cream', size: '50 g' }), labelText: ['Acme Skin Cream', '50 g'], flags: [],
  candidateProductIds: [productId], priorDecision: 'approved', sourceNote: 'Historical agent proposal; human approval is still required.', extractionReference: 'test-blind-cache', ...patch });
const pack = (sources: ReturnType<typeof source>[], withdrawals: object[] = []) => ({ schemaVersion: 'image-review-package-v1', sourceRun: 'synthetic-test', catalogueChecksum: 'a'.repeat(64), withdrawals, items: sources });
const decision = (d: ImageReviewDetail, patch: Partial<ImageReviewDecisionInput> = {}): ImageReviewDecisionInput => ({
  itemId: d.item.itemId, expectedRevision: d.item.revision, productId: d.product?.productId ?? null, productRevision: d.product?.revision ?? null,
  decision: 'approved', originalViewed: true, sharedIdentifierConfirmed: false, requestId: randomUUID(), note: 'Original package independently verified.',
  checks: d.comparison.filter(c => c.required).map(c => ({ field: c.field, confirmed: true, imageValue: c.imageValue, catalogueValue: c.catalogueValue, evidence: '' })), ...patch,
});
test('review decisions persist independently of imports, protect withdrawals and stale records, and append images atomically', { skip: !uri }, async () => {
  assert.match(uri!, /^mongodb:\/\/127\.0\.0\.1:\d+\/\?replicaSet=almina_test$/);
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_' + randomUUID().replaceAll('-', ''));
  const administrator = new ObjectId(), staff = new ObjectId(), productId = new ObjectId();
  try {
    await db.collection('users').insertMany([{ _id: administrator, role: 'admin', name: 'Synthetic administrator' }, { _id: staff, role: 'user', name: 'Synthetic pharmacist' }]);
    const product = { _id: productId, product_id: 'PD_TEST', name: 'Acme Skin Cream 50 g', brand: 'Acme', productForm: 'Cream', packLabel: '50 g', price: 23.5, stock: 17, vat: true,
      published: false, disabled: true, images: ['retained.webp'], gdriveFileIds: ['retained-drive'], cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/products/existing.webp'] };
    await db.collection('products').insertOne(product);
    const input = pack([source('image-one'), source('image-two'), source('withdrawn')], [{ assetId: 'withdrawn', productId: 'PD_TEST', reason: 'Confirmed incorrect historical association' }]);
    await assert.rejects(stageImageReview(db, input, String(staff), 'synthetic'), { status: 403 });
    assert.deepEqual(await stageImageReview(db, input, String(administrator), 'synthetic'), { created: 3, replayed: 0 });
    assert.deepEqual(await stageImageReview(db, input, String(administrator), 'synthetic'), { created: 0, replayed: 3 });
    await assert.rejects(stageImageReview(db, pack([source('unsafe', 'PD_TEST', { imageUrl: 'http://127.0.0.1/private.webp' })]), String(administrator), 'synthetic'), { status: 400 });
    await assert.rejects(stageImageReview(db, pack([source('image-one', 'PD_TEST', { sourceNote: 'changed evidence' })]), String(administrator), 'synthetic'), { status: 409 });
    let page = await listImageReviews(db, { status: 'all' }, String(staff));
    assert.equal(page.counts.pending, 2); assert.equal(page.counts.held, 1); assert.equal(page.counts.approved, 0); // Incoming agent approvals are never trusted.
    const approvals: string[] = [];
    for (const row of page.items) {
      const detail = await getImageReview(db, row.itemId, String(staff));
      if (row.source.assetId === 'withdrawn') { assert.ok(detail.withdrawalReason); await assert.rejects(decideImageReview(db, decision(detail), String(staff)), { status: 409 }); continue; }
      await assert.rejects(decideImageReview(db, decision(detail, { originalViewed: false }), String(staff)), { status: 409 });
      await assert.rejects(decideImageReview(db, decision(detail, { checks: [] }), String(staff)), { status: 409 });
      const savedInput = decision(detail), saved = await decideImageReview(db, savedInput, String(staff));
      assert.deepEqual(await decideImageReview(db, savedInput, String(staff)), saved);
      assert.equal(saved.status, 'approved'); approvals.push(saved.approvalId!);
      await assert.rejects(decideImageReview(db, { ...savedInput, note: 'Changed replay payload' }, String(staff)), { status: 409 });
      await assert.rejects(decideImageReview(db, decision(detail), String(staff)), { status: 409 });
    }
    assert.deepEqual((await db.collection('products').findOne({ _id: productId }))!.cloudinaryImages, product.cloudinaryImages);
    const exported = await exportImageReviewApprovals(db, {}, String(staff)); assert.equal(exported.mappings.length, 2);
    await assert.rejects(previewImageReviewImport(db, { approvalIds: approvals }, String(staff)), { status: 403 });
    const manifest = await previewImageReviewImport(db, { approvalIds: approvals }, String(administrator));
    assert.equal((await previewImageReviewImport(db, { approvalIds: approvals }, String(administrator))).manifestId, manifest.manifestId);
    await assert.rejects(importImageReviewApprovals(db, { manifestId: manifest.manifestId, approvalIds: approvals.slice(0, 1) }, String(administrator), 'synthetic'), { status: 409 });
    const request = { manifestId: manifest.manifestId, approvalIds: approvals };
    let providerReads = 0;
    const transport: typeof fetch = async (url, options) => { providerReads++; assert.match(String(url), /^https:\/\/res\.cloudinary\.com\/synthetic\/image\/upload\/v1\/products\//); assert.equal(options?.method, undefined); assert.equal(options?.redirect, 'error'); assert.equal(new Headers(options?.headers).has('authorization'), false); return new Response(bytes); };
    await assert.rejects(importImageReviewApprovals(db, request, String(administrator), 'synthetic', async () => new Response('changed')), { status: 409 });
    assert.equal(await db.collection('image_review_imports').countDocuments(), 0);
    await db.collection('products').updateOne({ _id: productId }, { $set: { stock: 9 } });
    const results = await Promise.all([importImageReviewApprovals(db, request, String(administrator), 'synthetic', transport), importImageReviewApprovals(db, request, String(administrator), 'synthetic', transport)]);
    assert.equal(results.filter(r => !r.replayed).length, 1);
    const after = (await db.collection('products').findOne({ _id: productId }))!;
    assert.equal(after.stock, 9); assert.equal(after.price, 23.5); assert.equal(after.vat, true); assert.equal(after.disabled, true); assert.equal(after.published, false);
    assert.deepEqual(after.images, product.images); assert.deepEqual(after.gdriveFileIds, product.gdriveFileIds);
    assert.equal(after.cloudinaryImages.length, 3); assert.equal(after.cloudinaryImages[0], product.cloudinaryImages[0]); assert.equal(after.mediaRevision, 1);
    assert.equal(await db.collection('media_history').countDocuments(), 1);
    const previousReads = providerReads;
    assert.equal((await importImageReviewApprovals(db, request, String(administrator), 'synthetic', transport)).replayed, true);
    assert.equal(providerReads, previousReads); assert.equal((await exportImageReviewApprovals(db, {}, String(staff))).mappings.length, 0);
    page = await listImageReviews(db, { status: 'imported' }, String(staff)); assert.equal(page.items.length, 2);
    await assert.rejects(decideImageReview(db, decision(await getImageReview(db, page.items[0]!.itemId, String(staff)), { decision: 'held' }), String(staff)), { status: 409 });
  } finally { await db.dropDatabase(); await client.close(); }
});
test('pharmacist evidence resolves missing fields and corrects OCR while catalogue conflicts and stale approvals remain blocked', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_evidence_' + randomUUID().replaceAll('-', ''));
  const actor = new ObjectId(), product = new ObjectId();
  try {
    await db.collection('users').insertOne({ _id: actor, role: 'admin' });
    await db.collection('products').insertOne({ _id: product, product_id: 'PD_TEST', name: 'Acme Skin Cream 50 g', productForm: 'Cream', packLabel: '50 g', barcode: '0036000291452' });
    await stageImageReview(db, pack([source('needs-evidence')]), String(actor), 'synthetic');
    const row = (await listImageReviews(db, {}, String(actor))).items[0]!;
    let detail = await getImageReview(db, row.itemId, String(actor));
    await assert.rejects(decideImageReview(db, decision(detail), String(actor)), { status: 409 });
    const verified = decision(detail); const brand = verified.checks.find(c => c.field === 'brand')!; brand.catalogueValue = 'Acme'; brand.evidence = 'Manufacturer catalogue independently checked for this product ID.';
    const saved = await decideImageReview(db, verified, String(actor)); assert.equal(saved.status, 'approved');
    await db.collection('products').updateOne({ _id: product }, { $set: { packLabel: '100 g' } });
    assert.equal((await exportImageReviewApprovals(db, {}, String(actor))).staleItemIds.length, 1);
    detail = await getImageReview(db, row.itemId, String(actor));
    const conflicting = decision(detail); conflicting.checks.forEach(c => { c.confirmed = true; c.evidence = 'Trying to confirm an unresolved catalogue conflict.'; });
    await assert.rejects(decideImageReview(db, conflicting, String(actor)), { status: 409 });
    const badCatalogue = decision(detail); badCatalogue.checks.find(c => c.field === 'size')!.catalogueValue = '50 g';
    await assert.rejects(decideImageReview(db, badCatalogue, String(actor)), { status: 409 });
    await db.collection('products').updateOne({ _id: product }, { $set: { brand: 'Acme', packLabel: '50 g', strength: '5%' } });
    const ocrSource = source('ocr-correction', 'PD_TEST', { identity: imageIdentitySchema.parse({ ...source('x').identity, strength: '2%' }) });
    await stageImageReview(db, pack([ocrSource]), String(actor), 'synthetic');
    const ocr = (await listImageReviews(db, {}, String(actor))).items.find(item => item.source.assetId === 'ocr-correction')!;
    detail = await getImageReview(db, ocr.itemId, String(actor));
    const correction = decision(detail); const strength = correction.checks.find(c => c.field === 'strength')!; strength.imageValue = '5%';
    await assert.rejects(decideImageReview(db, correction, String(actor)), { status: 409 });
    strength.evidence = 'Original label re-read by pharmacist; saved OCR 2% was incorrect, visible label is 5%.';
    const corrected = await decideImageReview(db, correction, String(actor)); assert.equal(corrected.status, 'approved');
    assert.equal((await getImageReview(db, ocr.itemId, String(actor))).item.source.identity.strength, '2%');
    await db.collection('products').insertOne({ product_id: 'PD_PEER', name: 'Another product', barcode: '0036000291452' });
    assert.equal((await exportImageReviewApprovals(db, {}, String(actor))).mappings.length, 0);
    const fresh = await getImageReview(db, ocr.itemId, String(actor));
    const disambiguated = { ...correction, expectedRevision: fresh.item.revision, sharedIdentifierConfirmed: true, requestId: randomUUID() };
    assert.equal((await decideImageReview(db, disambiguated, String(actor))).status, 'approved');
    assert.equal((await exportImageReviewApprovals(db, {}, String(actor))).mappings.length, 1);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('a later withdrawal invalidates approvals and previews while preserving prior evidence', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_withdraw_' + randomUUID().replaceAll('-', ''));
  const actor = new ObjectId();
  try {
    await db.collection('users').insertOne({ _id: actor, role: 'admin' });
    await db.collection('products').insertOne({ product_id: 'PD_TEST', name: 'Acme Skin Cream 50 g', brand: 'Acme', productForm: 'Cream', packLabel: '50 g' });
    const original = source('later-withdrawal');
    await stageImageReview(db, pack([original]), String(actor), 'synthetic');
    const row = (await listImageReviews(db, {}, String(actor))).items[0]!;
    const saved = await decideImageReview(db, decision(await getImageReview(db, row.itemId, String(actor))), String(actor));
    const manifest = await previewImageReviewImport(db, { approvalIds: [saved.approvalId] }, String(actor));
    const correction = pack([original], [{ assetId: original.assetId, productId: 'PD_TEST', reason: 'Post-review identity correction' }]);
    await stageImageReview(db, correction, String(actor), 'synthetic');
    const after = await getImageReview(db, row.itemId, String(actor));
    assert.equal(after.item.status, 'held'); assert.equal(after.item.approvalId, null); assert.ok(after.withdrawalReason);
    assert.equal(after.history[0]!.decision, 'approved');
    assert.equal((await exportImageReviewApprovals(db, {}, String(actor))).mappings.length, 0);
    await assert.rejects(importImageReviewApprovals(db, { manifestId: manifest.manifestId, approvalIds: [saved.approvalId] }, String(actor), 'synthetic', async () => { throw Error('Must not fetch a withdrawn asset'); }), { status: 409 });
    await stageImageReview(db, correction, String(actor), 'synthetic');
    assert.equal((await getImageReview(db, row.itemId, String(actor))).item.revision, after.item.revision);
    const updatedExtraction = { ...original, extractionReference: 'new-candidate-free-extraction' };
    assert.equal((await stageImageReview(db, pack([updatedExtraction]), String(actor), 'synthetic')).created, 1);
    assert.equal((await getImageReview(db, row.itemId, String(actor))).item.source.extractionReference, original.extractionReference);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('package loading resumes from a server checkpoint and concurrent decisions do not overwrite another reviewer', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_resume_' + randomUUID().replaceAll('-', ''));
  const actor = new ObjectId(), staff = new ObjectId(), packageId = 'f'.repeat(64);
  try {
    await db.collection('users').insertMany([{ _id: actor, role: 'admin' }, { _id: staff, role: 'user' }]);
    await db.collection('products').insertOne({ product_id: 'PD_TEST', name: 'Acme Skin Cream 50 g', brand: 'Acme', productForm: 'Cream', packLabel: '50 g' });
    assert.deepEqual(await imageReviewUploadProgress(db, packageId, String(actor)), { processed: 0, total: null });
    const first = { ...pack([source('resume-one')]), upload: { packageId, offset: 0, total: 2 } };
    const second = { ...pack([source('resume-two')]), upload: { packageId, offset: 1, total: 2 } };
    await assert.rejects(stageImageReview(db, second, String(actor), 'synthetic'), { status: 409 });
    await stageImageReview(db, first, String(actor), 'synthetic');
    assert.deepEqual(await imageReviewUploadProgress(db, packageId, String(actor)), { processed: 1, total: 2 });
    assert.deepEqual(await stageImageReview(db, first, String(actor), 'synthetic'), { created: 1, replayed: 0 });
    await assert.rejects(stageImageReview(db, { ...first, items: [source('changed-chunk')] }, String(actor), 'synthetic'), { status: 409 });
    await stageImageReview(db, second, String(actor), 'synthetic');
    assert.deepEqual(await imageReviewUploadProgress(db, packageId, String(actor)), { processed: 2, total: 2 });
    await assert.rejects(imageReviewUploadProgress(db, packageId, String(staff)), { status: 403 });
    const row = (await listImageReviews(db, {}, String(staff))).items[0]!;
    const detail = await getImageReview(db, row.itemId, String(staff));
    const choices = await Promise.allSettled([decideImageReview(db, decision(detail), String(staff)), decideImageReview(db, decision(detail, { decision: 'held', note: 'A second reviewer requests another check.' }), String(actor))]);
    assert.equal(choices.filter(c => c.status === 'fulfilled').length, 1);
    assert.equal((await getImageReview(db, row.itemId, String(staff))).history.length, 1);
    await stageImageReview(db, first, String(actor), 'synthetic');
    assert.equal((await getImageReview(db, row.itemId, String(staff))).item.revision, 1);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('a changed second product rolls back every image and history entry in an import', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_atomic_' + randomUUID().replaceAll('-', ''));
  const actor = new ObjectId();
  try {
    await db.collection('users').insertOne({ _id: actor, role: 'admin' });
    for (const product_id of ['PD_TEST', 'PD_TWO']) await db.collection('products').insertOne({ product_id, name: 'Acme Skin Cream 50 g', brand: 'Acme', productForm: 'Cream', packLabel: '50 g' });
    await stageImageReview(db, pack([source('atomic-one'), source('atomic-two', 'PD_TWO')]), String(actor), 'synthetic');
    const approvals: string[] = [];
    for (const row of (await listImageReviews(db, {}, String(actor))).items) approvals.push((await decideImageReview(db, decision(await getImageReview(db, row.itemId, String(actor))), String(actor))).approvalId!);
    const manifest = await previewImageReviewImport(db, { approvalIds: approvals }, String(actor));
    await db.collection('products').updateOne({ product_id: manifest.mappings[1]!.productId }, { $set: { name: 'Changed since approval' } });
    await assert.rejects(importImageReviewApprovals(db, { manifestId: manifest.manifestId, approvalIds: approvals }, String(actor), 'synthetic', async () => new Response(bytes)), { status: 409 });
    assert.equal(await db.collection('products').countDocuments({ cloudinaryImages: { $exists: true } }), 0);
    assert.equal(await db.collection('media_history').countDocuments(), 0);
    assert.equal(await db.collection('image_review_imports').countDocuments(), 0);
    assert.equal((await listImageReviews(db, { status: 'approved' }, String(actor))).items.length, 2);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('one-click publication preflights, links existing images and safely resumes failed or concurrent requests', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_publish_' + randomUUID().replaceAll('-', ''));
  const actor = new ObjectId(), staff = new ObjectId(), product = new ObjectId();
  try {
    await db.collection('users').insertMany([{ _id: actor, role: 'admin' }, { _id: staff, role: 'user' }]);
    await db.collection('products').insertOne({ _id: product, product_id: 'PD_TEST', name: 'Acme Skin Cream 50 g', brand: 'Acme', productForm: 'Cream', packLabel: '50 g', stock: 7, price: 12.5, published: false, disabled: true });
    await stageImageReview(db, pack(Array.from({ length: 7 }, (_, index) => source('publish-' + index))), String(actor), 'synthetic');
    const approvalIds: string[] = [];
    for (const row of (await listImageReviews(db, {}, String(staff))).items) approvalIds.push((await decideImageReview(db, decision(await getImageReview(db, row.itemId, String(staff))), String(staff))).approvalId!);
    const request = { requestId: randomUUID(), approvalIds };
    await assert.rejects(publishImageReviewApprovals(db, request, String(staff), 'synthetic'), { status: 403 });
    await assert.rejects(publishImageReviewApprovals(db, { ...request, approvalIds: [approvalIds[0], approvalIds[0]] }, String(actor), 'synthetic'), { status: 400 });
    await assert.rejects(publishImageReviewApprovals(db, request, String(actor), 'synthetic', async () => new Response('wrong bytes')), { status: 409 });
    assert.equal(await db.collection('image_review_publish_requests').countDocuments(), 1);
    assert.equal(await db.collection('media_history').countDocuments(), 0);
    const transport: typeof fetch = async (_url, options) => { assert.equal(options?.method, undefined); return new Response(bytes); };
    const results = await Promise.all([publishImageReviewApprovals(db, request, String(actor), 'synthetic', transport), publishImageReviewApprovals(db, { ...request, approvalIds: [...approvalIds].reverse() }, String(actor), 'synthetic', transport)]);
    assert.equal(results.filter(result => !result.replayed).length, 1);
    const saved = (await db.collection('products').findOne({ _id: product }))!;
    assert.equal(saved.cloudinaryImages.length, 7); assert.equal(saved.mediaRevision, 1);
    assert.equal(saved.stock, 7); assert.equal(saved.price, 12.5); assert.equal(saved.published, false); assert.equal(saved.disabled, true);
    assert.equal(await db.collection('media_history').countDocuments(), 1);
    assert.equal((await publishImageReviewApprovals(db, request, String(actor), 'synthetic', async () => { throw Error('Completed publication must not read the provider again'); })).replayed, true);
    await assert.rejects(publishImageReviewApprovals(db, { ...request, approvalIds: approvalIds.slice(0, 1) }, String(actor), 'synthetic', transport), { status: 409 });
    await stageImageReview(db, pack([source('publish-fresh')]), String(actor), 'synthetic');
    const fresh = (await listImageReviews(db, {}, String(staff))).items[0]!;
    const approved = await decideImageReview(db, decision(await getImageReview(db, fresh.itemId, String(staff))), String(staff));
    const simultaneous = { requestId: randomUUID(), approvalIds: [approved.approvalId] };
    const firstClicks = await Promise.all([publishImageReviewApprovals(db, simultaneous, String(actor), 'synthetic', transport), publishImageReviewApprovals(db, simultaneous, String(actor), 'synthetic', transport)]);
    assert.equal(firstClicks.filter(result => !result.replayed).length, 1);
    assert.equal((await db.collection('products').findOne({ _id: product }))!.cloudinaryImages.length, 8);
    assert.equal(await db.collection('media_history').countDocuments(), 2);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('a completed concurrent import is replayed when it overtakes preflight or the transaction receipt read', { skip: !uri }, async t => {
  for (const phase of ['preflight', 'transaction'] as const) await t.test(phase, async () => {
    const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_replay_' + randomUUID().replaceAll('-', ''));
    const actor = new ObjectId();
    let release!: () => void, arrived!: () => void, paused = false;
    const gate = new Promise<void>(resolve => { release = resolve; }), waiting = new Promise<void>(resolve => { arrived = resolve; });
    try {
      await db.collection('users').insertOne({ _id: actor, role: 'admin' });
      await db.collection('products').insertOne({ product_id: 'PD_TEST', name: 'Acme Skin Cream 50 g', brand: 'Acme', productForm: 'Cream', packLabel: '50 g', stock: 7, price: 12.5 });
      await stageImageReview(db, pack([source('replay-' + phase)]), String(actor), 'synthetic');
      const row = (await listImageReviews(db, {}, String(actor))).items[0]!;
      const approval = await decideImageReview(db, decision(await getImageReview(db, row.itemId, String(actor))), String(actor));
      const manifest = await previewImageReviewImport(db, { approvalIds: [approval.approvalId] }, String(actor));
      const input = { manifestId: manifest.manifestId, approvalIds: [approval.approvalId] };
      // Pause only this caller at a real database boundary; the other caller commits normally.
      const delayed = new Proxy(db, { get(target, key) {
        if (key === 'collection') return (...args: Parameters<Db['collection']>) => {
          const collection = target.collection(...args);
          const selected = args[0] === (phase === 'preflight' ? 'image_review_items' : 'image_review_imports');
          if (!selected) return collection;
          return new Proxy(collection, { get(targetCollection, method) {
            if (method === 'findOne') return async (...params: Parameters<typeof collection.findOne>) => {
              if (!paused && (phase === 'preflight' || params[1]?.session)) {
                paused = true;
                if (phase === 'transaction') {
                  const before = await targetCollection.findOne(...params);
                  arrived(); await gate; return before;
                }
                arrived(); await gate;
              }
              return targetCollection.findOne(...params);
            };
            const value: unknown = Reflect.get(targetCollection, method);
            return typeof value === 'function' ? value.bind(targetCollection) : value;
          } });
        };
        const value: unknown = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      } });
      const slow = importImageReviewApprovals(delayed, input, String(actor), 'synthetic', async () => new Response(bytes));
      await waiting;
      try { assert.equal((await importImageReviewApprovals(db, input, String(actor), 'synthetic', async () => new Response(bytes))).replayed, false); }
      finally { release(); }
      assert.equal((await slow).replayed, true);
      assert.equal(await db.collection('image_review_imports').countDocuments(), 1);
      assert.equal(await db.collection('media_history').countDocuments(), 1);
      const product = (await db.collection('products').findOne({ product_id: 'PD_TEST' }))!;
      assert.equal(product.cloudinaryImages.length, 1); assert.equal(product.mediaRevision, 1);
      assert.equal(product.stock, 7); assert.equal(product.price, 12.5);
    } finally { release(); await db.dropDatabase(); await client.close(); }
  });
});
test('retained HTTP boundary authenticates review routes, prevents staff imports and enforces CSRF and feature disablement', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_http_' + randomUUID().replaceAll('-', ''));
  const administrator = String(new ObjectId()), staff = String(new ObjectId());
  const tokens: Record<string, object> = { ['a'.repeat(43)]: { id: administrator, role: 'admin', name: 'Administrator', cities: [] }, ['b'.repeat(43)]: { id: staff, role: 'user', name: 'Staff', cities: [] } };
  await db.collection('users').insertMany([{ _id: new ObjectId(administrator), role: 'admin' }, { _id: new ObjectId(staff), role: 'user' }]);
  const app = createLegacyApp({ development: true, origins: ['http://127.0.0.1:4999'], imageReviewEnabled: true, recoveryCloudName: 'synthetic', getCommerceDb: async () => db,
    auth: { authenticate: async (token: string) => { if (!tokens[token]) throw Object.assign(new Error('unauthorized'), { status: 401 }); return tokens[token]; } } });
  const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
  const port = server.address().port;
  const request = (endpoint: string, role?: 'admin' | 'user', body?: object, csrf = true) => fetch(`http://127.0.0.1:${port}/api/image-review${endpoint}`, { method: body ? 'POST' : 'GET', headers: {
    ...(role ? { cookie: 'almina_session=' + (role === 'admin' ? 'a' : 'b').repeat(43) } : {}),
    ...(body ? { 'content-type': 'application/json', origin: 'http://127.0.0.1:4999', ...(csrf ? { 'x-csrf-protection': '1' } : {}) } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    assert.equal((await request('')).status, 401);
    assert.equal((await request('/stage', 'user', pack([source('http-source')]))).status, 403);
    assert.equal((await request('/import', 'user', {})).status, 403);
    assert.equal((await request('/draft', 'user', {})).status, 403);
    assert.equal((await request('/draft', 'admin', {}, false)).status, 403);
    assert.equal((await request('/draft', 'admin', {})).status, 400);
    assert.equal((await request('/publish', 'user', {})).status, 403);
    assert.equal((await request('/publication', 'user')).status, 403);
    assert.equal((await request('/publication/start', 'user', { requestId: randomUUID() })).status, 403);
    assert.equal((await request('/publication/resume', 'user', { jobId: randomUUID() })).status, 403);
    assert.equal((await request('/publication/pause', 'admin', { jobId: randomUUID() }, false)).status, 403);
    assert.equal((await request('/publication?extra=1', 'admin')).status, 400);
    assert.equal((await request('/publication', 'admin')).status, 200);
    assert.equal((await request('/stage', 'admin', pack([source('http-source')]), false)).status, 403);
    assert.equal((await request('/stage', 'admin', pack([source('http-source')]))).status, 200);
    assert.equal((await request('', 'user')).status, 200);
    assert.equal((await request('/export', 'user')).status, 200);
    assert.equal((await request('?filter[$where]=x', 'admin')).status, 400);
    assert.equal((await request('/select', 'user', { itemId: 'a'.repeat(64), productId: 'PD_TEST', role: 'admin' })).status, 400);
    app.locals.imageReviewEnabled = false;
    assert.equal((await request('', 'user')).status, 200);
    assert.equal((await request('/stage', 'admin', pack([source('disabled')]))).status, 503);
  } finally { await new Promise<void>(resolve => server.close(resolve)); await db.dropDatabase(); await client.close(); }
});

async function publicationFixture(db: ReturnType<MongoClient['db']>, products: { id: string; images: number }[]) {
  const actor = new ObjectId(), other = new ObjectId(), staff = new ObjectId();
  await db.collection('users').insertMany([{ _id: actor, role: 'admin' }, { _id: other, role: 'admin' }, { _id: staff, role: 'user' }]);
  for (const product of products) {
    await db.collection('products').insertOne({ product_id: product.id, name: 'Acme Skin Cream 50 g', brand: 'Acme', productForm: 'Cream', packLabel: '50 g', price: 12.5, stock: 7, published: false, disabled: true });
    const rows = Array.from({ length: product.images }, (_, index) => source(`${product.id}-${index}`, product.id));
    for (let index = 0; index < rows.length; index += 25) await stageImageReview(db, pack(rows.slice(index, index + 25)), String(actor), 'synthetic');
  }
  let after: string | null = null;
  do {
    const page = await listImageReviews(db, { status: 'pending', limit: 25, ...(after ? { after } : {}) }, String(actor));
    for (const row of page.items) await decideImageReview(db, decision(await getImageReview(db, row.itemId, String(staff))), String(staff));
    after = page.nextAfter;
  } while (after);
  return { actor: String(actor), other: String(other), staff: String(staff) };
}
async function finishPublication(db: ReturnType<MongoClient['db']>) {
  for (let step = 0; step < 100; step++) if (!await processImagePublication(db, 'synthetic', async () => new Response(bytes))) return;
  assert.fail('Publication did not finish within its bounded test steps');
}
test('durable publication serializes starts, snapshots more than a page, groups photos and holds invalid groups without blocking valid imports', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_jobs_' + randomUUID().replaceAll('-', ''));
  try {
    const users = await publicationFixture(db, [{ id: 'PD_SEVEN', images: 7 }, { id: 'PD_OVERFULL', images: 101 }, { id: 'PD_STALE', images: 1 }]);
    await assert.rejects(startImagePublication(db, { requestId: randomUUID() }, users.staff), { status: 403 });
    await assert.rejects(getImagePublication(db, users.staff), { status: 403 });
    await assert.rejects(startImagePublication(db, { requestId: randomUUID(), approvalIds: [] }, users.actor), { status: 400 });
    const request = { requestId: randomUUID() };
    const starts = await Promise.all([startImagePublication(db, request, users.actor), startImagePublication(db, { requestId: randomUUID() }, users.other), startImagePublication(db, request, users.actor)]);
    const jobId = starts[0].publication!.jobId;
    assert.ok(starts.every(row => row.publication!.jobId === jobId));
    assert.equal(await db.collection('image_review_publications').countDocuments(), 1);
    await db.collection('products').updateOne({ product_id: 'PD_STALE' }, { $set: { packLabel: '500 g' } });
    // New approvals after start do not enter this run, even if their hashed item ID sorts earlier.
    await stageImageReview(db, pack([source('later', 'PD_SEVEN')]), users.actor, 'synthetic');
    const later = (await listImageReviews(db, { status: 'pending' }, users.actor)).items[0]!;
    await decideImageReview(db, decision(await getImageReview(db, later.itemId, users.actor)), users.actor);
    await finishPublication(db);
    const result = (await getImagePublication(db, users.actor)).publication!;
    assert.equal(result.phase, 'complete'); assert.equal(result.preparedImages, 109);
    assert.equal(result.publishedImages, 7); assert.equal(result.skippedImages, 102); assert.equal(result.processedProducts, 3);
    assert.equal(result.issues.length, 2);
    assert.equal(await db.collection('image_review_items').countDocuments({ status: 'held' }), 102);
    assert.equal(await db.collection('image_review_items').countDocuments({ status: 'approved' }), 1);
    assert.equal(await db.collection('image_review_events').countDocuments({ publicationId: jobId }), 102);
    const product = (await db.collection('products').findOne({ product_id: 'PD_SEVEN' }))!;
    assert.equal(product.cloudinaryImages.length, 7); assert.equal(product.mediaRevision, 1);
    assert.equal(product.price, 12.5); assert.equal(product.stock, 7); assert.equal(product.published, false); assert.equal(product.disabled, true);
    assert.equal((await startImagePublication(db, request, users.actor)).publication!.jobId, jobId);
    assert.equal(await db.collection('image_review_publications').countDocuments(), 1);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('publication leases exclude parallel workers, survive a lost completion and reauthorize resume after an administrator is disabled', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_lease_' + randomUUID().replaceAll('-', ''));
  try {
    const { actor, other } = await publicationFixture(db, [{ id: 'PD_TEST', images: 2 }]);
    const jobId = (await startImagePublication(db, { requestId: randomUUID() }, actor)).publication!.jobId;
    await processImagePublication(db, 'synthetic'); await processImagePublication(db, 'synthetic');
    const group = (await db.collection('image_review_publication_groups').findOne({ jobId }))!;
    const manifest = await previewImageReviewImport(db, { approvalIds: group.approvalIds }, actor);
    await db.collection('image_review_publication_groups').updateOne({ _id: group._id }, { $set: { manifestId: manifest.manifestId } });
    await importImageReviewApprovals(db, { manifestId: manifest.manifestId, approvalIds: group.approvalIds }, actor, 'synthetic', async () => new Response(bytes));
    // Simulate a terminated worker after successful import but before group/counter acknowledgement.
    await db.collection<{ _id: string }>('image_review_publications').updateOne({ _id: jobId }, { $set: { leaseToken: 'dead-worker', leaseUntil: new Date(Date.now() + 60_000) } });
    assert.equal(await processImagePublication(db, 'synthetic'), false);
    await db.collection<{ _id: string }>('image_review_publications').updateOne({ _id: jobId }, { $set: { leaseUntil: new Date(0) } });
    await db.collection('users').updateOne({ _id: new ObjectId(actor) }, { $set: { disabled: true } });
    await processImagePublication(db, 'synthetic');
    const paused = (await getImagePublication(db, other)).publication!;
    assert.equal(paused.phase, 'paused'); assert.equal(paused.error, 'access'); assert.equal(paused.canResume, true);
    await assert.rejects(changeImagePublication(db, { jobId }, actor, 'resume'), { status: 403 });
    await changeImagePublication(db, { jobId }, other, 'resume');
    const results = await Promise.all([processImagePublication(db, 'synthetic', async () => { throw Error('Receipt replay must not download'); }), processImagePublication(db, 'synthetic')]);
    assert.equal(results.filter(Boolean).length, 1);
    await finishPublication(db);
    const done = (await getImagePublication(db, other)).publication!;
    assert.equal(done.publishedImages, 2); assert.equal(done.processedProducts, 1);
    assert.equal(await db.collection('media_history').countDocuments(), 1);
    assert.equal(await db.collection('image_review_imports').countDocuments(), 1);
    assert.equal(await db.collection('image_review_publication_actions').countDocuments({ action: 'resume', actor: other }), 1);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('provider failure pauses instead of discarding approvals and manual pause prevents new imports until resume', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_pause_' + randomUUID().replaceAll('-', ''));
  try {
    const { actor } = await publicationFixture(db, [{ id: 'PD_TEST', images: 1 }]);
    const jobId = (await startImagePublication(db, { requestId: randomUUID() }, actor)).publication!.jobId;
    await processImagePublication(db, 'synthetic'); await processImagePublication(db, 'synthetic');
    await changeImagePublication(db, { jobId }, actor, 'pause');
    assert.equal(await processImagePublication(db, 'synthetic'), false);
    await changeImagePublication(db, { jobId }, actor, 'resume');
    await processImagePublication(db, 'synthetic', async () => new Response('', { status: 503 }));
    assert.equal((await getImagePublication(db, actor)).publication!.error, 'provider');
    assert.equal(await db.collection('image_review_items').countDocuments({ status: 'approved' }), 1);
    await changeImagePublication(db, { jobId }, actor, 'resume');
    await finishPublication(db);
    assert.equal((await getImagePublication(db, actor)).publication!.publishedImages, 1);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('background worker stops claiming work and waits for its active image read before shutdown', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_stop_' + randomUUID().replaceAll('-', ''));
  try {
    const { actor } = await publicationFixture(db, [{ id: 'PD_TEST', images: 1 }]);
    await startImagePublication(db, { requestId: randomUUID() }, actor);
    await processImagePublication(db, 'synthetic'); await processImagePublication(db, 'synthetic');
    let release!: () => void, entered!: () => void;
    const wait = new Promise<void>(resolve => { release = resolve; }), reading = new Promise<void>(resolve => { entered = resolve; });
    let disabledReads = 0;
    const disabled = imagePublicationWorker(() => { disabledReads++; return db; }, { enabled: () => false });
    await disabled.stop(); assert.equal(disabledReads, 0);
    const worker = imagePublicationWorker(() => db, { cloudName: 'synthetic', intervalMs: 10, transport: async () => { entered(); await wait; return new Response(bytes); } });
    await Promise.race([reading, new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(Error('Worker did not claim job')), 3000); timer.unref(); })]);
    let stopped = false;
    const stop = worker.stop().then(() => { stopped = true; });
    await Promise.resolve(); assert.equal(stopped, false);
    release(); await stop;
    assert.equal(stopped, true);
    assert.equal((await getImagePublication(db, actor)).publication!.publishedImages, 1);
  } finally { await db.dropDatabase(); await client.close(); }
});
test('automatic holds preserve a newer pharmacist decision and original immutable evidence', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_recheck_' + randomUUID().replaceAll('-', ''));
  try {
    const { actor, staff } = await publicationFixture(db, [{ id: 'PD_TEST', images: 1 }]);
    const original = (await listImageReviews(db, { status: 'approved' }, actor)).items[0]!;
    await startImagePublication(db, { requestId: randomUUID() }, actor);
    await processImagePublication(db, 'synthetic'); await processImagePublication(db, 'synthetic');
    await processImagePublication(db, 'synthetic', async () => new Response('wrong image bytes'));
    const fresh = await decideImageReview(db, decision(await getImageReview(db, original.itemId, staff)), staff);
    assert.notEqual(fresh.approvalId, original.approvalId);
    await finishPublication(db);
    const current = await getImageReview(db, original.itemId, staff);
    assert.equal(current.item.status, 'approved'); assert.equal(current.item.approvalId, fresh.approvalId);
    assert.equal(await db.collection('image_review_events').countDocuments({ approvalId: original.approvalId }), 1);
    assert.equal(current.history.length, 2);
    assert.equal(await db.collection('media_history').countDocuments(), 0);
  } finally { await db.dropDatabase(); await client.close(); }
});

test('the one-action review payload preserves server field checks, human provenance and stale-product protection', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_fast_review_' + randomUUID().replaceAll('-', ''));
  try {
    const actor = new ObjectId(), staff = new ObjectId();
    await db.collection('users').insertMany([{ _id: actor, role: 'admin' }, { _id: staff, role: 'user' }]);
    await db.collection('products').insertOne({ product_id: 'PD_TEST', name: 'Acme Skin Cream 50 g', brand: 'Acme', productForm: 'Cream', packLabel: '50 g' });
    await stageImageReview(db, pack([source('fast-review'), source('fast-stale')]), String(actor), 'synthetic');
    const rows = (await listImageReviews(db, {}, String(staff))).items;
    const detail = await getImageReview(db, rows[0]!.itemId, String(staff));
    const checks = initialReviewChecks(detail);
    assert.equal(canApproveImage(detail, checks, true, false), true);
    const input = { ...imageReviewDecision(detail, checks, 'approved', true, false, ''), requestId: randomUUID() };
    const approved = await decideImageReview(db, input, String(staff));
    assert.equal(approved.status, 'approved'); assert.ok(approved.approvalId);
    const event = (await db.collection('image_review_events').findOne({ itemId: detail.item.itemId }))!;
    assert.equal(event.input.originalViewed, true); assert.ok(event.input.checks.every((check: { confirmed: boolean }) => check.confirmed));
    assert.match(event.input.note, /I inspected this individual original/);
    const next = await getImageReview(db, rows[1]!.itemId, String(staff));
    const stale = { ...imageReviewDecision(next, initialReviewChecks(next), 'approved', true, false, ''), requestId: randomUUID() };
    await db.collection('products').updateOne({ product_id: 'PD_TEST' }, { $set: { packLabel: '100 g' } });
    await assert.rejects(decideImageReview(db, stale, String(staff)), { status: 409 });
    assert.equal((await getImageReview(db, rows[1]!.itemId, String(staff))).item.status, 'pending');
  } finally { await db.dropDatabase(); await client.close(); }
});

test('inline identity correction and image approval commit together with the corrected revision', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_edit_' + randomUUID().replaceAll('-', ''));
  const admin = new ObjectId(), staff = new ObjectId(), id = new ObjectId();
  try {
    await db.collection('users').insertMany([{ _id: admin, role: 'admin' }, { _id: staff, role: 'user' }]);
    await db.collection('products').insertOne({ _id: id, product_id: 'PD_TEST', name: 'Acme Skin Cream', brand: 'Acme',
      productForm: 'Cream', packLabel: '100 g', stock: 9, price: 34, vat: true, cloudinaryImages: [], published: true, mediaRevision: 3 });
    await stageImageReview(db, pack([source('inline-edit')]), String(admin), 'synthetic');
    const row = (await listImageReviews(db, {}, String(admin))).items[0]!;
    const detail = await getImageReview(db, row.itemId, String(admin));
    assert.equal(detail.product?.fields?.packLabel, '100 g');
    const input = decision(detail, { productChanges: { packLabel: '50 g' } });
    const size = input.checks.find(check => check.field === 'size')!;
    size.catalogueValue = '50 g';
    await assert.rejects(decideImageReview(db, input, String(staff)), { status: 403 });
    await assert.rejects(decideImageReview(db, input, String(admin)), { status: 409 });
    size.evidence = 'I verified this value on the individual original label.';
    await assert.rejects(decideImageReview(db, { ...input, checks: input.checks.filter(check => check.field !== 'brand') }, String(admin)), { status: 409 });
    assert.equal((await db.collection('products').findOne({ _id: id }))?.packLabel, '100 g');
    assert.equal((await getImageReview(db, row.itemId, String(admin))).item.status, 'pending');
    await assert.rejects(decideImageReview(db, { ...input, productChanges: { price: 0 } }, String(admin)), { status: 400 });
    await db.collection('products').updateOne({ _id: id }, { $set: { packLabel: '75 g' } });
    await assert.rejects(decideImageReview(db, input, String(admin)), { status: 409 });
    await db.collection('products').updateOne({ _id: id }, { $set: { packLabel: '100 g' } });
    const approved = await decideImageReview(db, input, String(admin));
    assert.deepEqual(await decideImageReview(db, input, String(admin)), approved);
    const saved = (await db.collection('products').findOne({ _id: id }))!;
    assert.deepEqual([saved.packLabel, saved.stock, saved.price, saved.vat, saved.published, saved.mediaRevision], ['50 g', 9, 34, true, true, 3]);
    const exported = await exportImageReviewApprovals(db, {}, String(admin));
    assert.equal(exported.mappings.length, 1);
    assert.notEqual(exported.mappings[0]!.productRevision, detail.product?.revision);
    assert.equal((await db.collection<{ _id: string; priorProduct: { fields: { packLabel: string } } }>('image_review_events').findOne({ _id: input.requestId }))?.priorProduct.fields.packLabel, '100 g');
  } finally { await db.dropDatabase(); await client.close(); }
});

test('unmatched image creates and selects one unpublished product using an idempotent receipt', { skip: !uri }, async () => {
  const client = await new MongoClient(uri!).connect(), db = client.db('almina_image_review_create_' + randomUUID().replaceAll('-', ''));
  const admin = new ObjectId(), staff = new ObjectId(), category = new ObjectId();
  try {
    await db.collection('users').insertMany([{ _id: admin, role: 'admin' }, { _id: staff, role: 'user' }]);
    await db.collection('stores').insertOne({ name: 'Test' });
    await db.collection('categories').insertOne({ _id: category, name: 'Skin care' });
    await stageImageReview(db, pack([source('unmatched', 'PD_TEST', { candidateProductIds: [] })]), String(admin), 'synthetic');
    const row = (await listImageReviews(db, {}, String(admin))).items[0]!;
    const input = { itemId: row.itemId, expectedRevision: row.revision, requestId: randomUUID(), product: {
      name: 'Acme Skin Cream', brand: 'Acme', productForm: 'Cream', packLabel: '50 g', category: String(category), price: '25.50', stock: '4', vat: true,
    } };
    await assert.rejects(createImageReviewDraft(db, input, String(staff)), { status: 403 });
    await assert.rejects(createImageReviewDraft(db, { ...input, product: { ...input.product, category: String(new ObjectId()) } }, String(admin)), { status: 400 });
    const [result, retry] = await Promise.all([createImageReviewDraft(db, input, String(admin)), createImageReviewDraft(db, input, String(admin))]);
    assert.deepEqual(result, retry);
    assert.equal(result.status, 'pending'); assert.ok(result.selectedProductId);
    assert.equal(await db.collection('products').countDocuments(), 1);
    assert.equal(await db.collection('inventory_adjustments').countDocuments(), 1);
    const product = (await db.collection('products').findOne({ product_id: result.selectedProductId }))!;
    assert.deepEqual([product.published, product.disabled, product.price, product.stock, product.images], [false, true, 25.5, 4, []]);
    const detail = await getImageReview(db, row.itemId, String(admin));
    assert.equal(detail.product?.productId, result.selectedProductId);
    assert.equal(detail.history[0]?.decision, 'draft created');
    await assert.rejects(createImageReviewDraft(db, { ...input, expectedRevision: result.revision, requestId: randomUUID() }, String(admin)), { status: 409 });
    assert.equal((await exportImageReviewApprovals(db, {}, String(admin))).mappings.length, 0);
  } finally { await db.dropDatabase(); await client.close(); }
});
