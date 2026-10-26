import { randomUUID } from 'node:crypto';
import type { ClientSession, Db, Document } from 'mongodb';
import { imagePublicationStartSchema, imagePublicationActionSchema, type ImagePublication } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { authorizeImageReview, previewImageReviewImport, importImageReviewApprovals } from './image-review.js';
import { reviewDigest } from './image-review-identity.js';

type Job = Document & { _id: string; actor: string; phase: ImagePublication['phase']; resumePhase: 'preparing' | 'publishing'; createdAt: Date; updatedAt: Date;
  boundary: string | null; cursor: string | null; preparedImages: number; publishedImages: number; skippedImages: number; totalProducts: number; processedProducts: number;
  error: ImagePublication['error']; leaseToken?: string; leaseUntil?: Date };
type Group = Document & { _id: string; jobId: string; productId: string; approvalIds: string[]; images: number; state: 'pending' | 'holding' | 'skipped' | 'published'; manifestId?: string; reason?: string };
type Entry = Document & { _id: string; groupId: string; itemId: string; approvalId: string; resolved: boolean };
const options = { maxTimeMS: 3000 };
const jobs = (db: Db) => db.collection<Job>('image_review_publications');
const groups = (db: Db) => db.collection<Group>('image_review_publication_groups');
const entries = (db: Db) => db.collection<Entry>('image_review_publication_entries');
const control = (db: Db) => db.collection<Document & { _id: string }>('image_review_publication_control');
const leaseMs = 10 * 60 * 1000;

async function transaction<T>(db: Db, action: (session: ClientSession) => Promise<T>) {
  const session = db.client.startSession();
  try { return await session.withTransaction(() => action(session), { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }); }
  finally { await session.endSession(); }
}
async function status(db: Db, job: Job | null): Promise<{ publication: ImagePublication | null }> {
  if (!job) return { publication: null };
  const issues = await groups(db).find({ jobId: job._id, state: { $in: ['holding', 'skipped'] } }, options).sort({ _id: 1 }).limit(21).toArray();
  return { publication: { jobId: job._id, phase: job.phase, preparedImages: job.preparedImages, publishedImages: job.publishedImages,
    skippedImages: job.skippedImages, totalProducts: job.totalProducts, processedProducts: job.processedProducts, error: job.error, updatedAt: job.updatedAt.toISOString(), canResume: job.phase === 'paused' && (!job.leaseUntil || job.leaseUntil <= new Date()),
    issues: issues.slice(0, 20).map(group => ({ productId: group.productId, images: group.images, reason: group.reason ?? 'Review the association again.' })), moreIssues: issues.length > 20 } };
}
export async function getImagePublication(db: Db, actor: string) {
  await authorizeImageReview(db, actor, true);
  const current = await control(db).findOne({ _id: 'active' }, options);
  return status(db, current?.jobId ? await jobs(db).findOne({ _id: String(current.jobId) }, options) : null);
}
export async function startImagePublication(db: Db, raw: unknown, actor: string) {
  await authorizeImageReview(db, actor, true);
  const parsed = imagePublicationStartSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const requestId = parsed.data.requestId;
  // Initialize the shared serialization point outside transactions; duplicate inserts are harmless.
  try { await control(db).updateOne({ _id: 'active' }, { $setOnInsert: { jobId: null } }, { upsert: true }); }
  catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error; }
  const jobId = await transaction(db, async session => {
    await authorizeImageReview(db, actor, true, session);
    const requests = db.collection<Document & { _id: string }>('image_review_publication_requests');
    const previous = await requests.findOne({ _id: requestId }, { session });
    if (previous) {
      if (previous.actor !== actor) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      return String(previous.jobId);
    }
    // Every start writes this document, serializing concurrent administrators.
    const lock = await control(db).findOneAndUpdate({ _id: 'active' }, { $inc: { revision: 1 } }, { session, returnDocument: 'after' });
    const current = lock?.jobId ? await jobs(db).findOne({ _id: String(lock.jobId) }, { session }) : null;
    let id = current?._id;
    if (!current || current.phase === 'complete') {
      id = requestId;
      const now = new Date();
      const last = await db.collection<Document & { _id: string }>('image_review_items').find({ status: 'approved', reviewedAt: { $lte: now } }, { session, projection: { _id: 1 }, ...options }).sort({ _id: -1 }).limit(1).next();
      await jobs(db).insertOne({ _id: id, actor, phase: 'preparing', resumePhase: 'preparing', createdAt: now, updatedAt: now, boundary: last?._id ?? null, cursor: null,
        preparedImages: 0, publishedImages: 0, skippedImages: 0, totalProducts: 0, processedProducts: 0, error: null }, { session });
      await control(db).updateOne({ _id: 'active' }, { $set: { jobId: id } }, { session });
    }
    await requests.insertOne({ _id: requestId, actor, jobId: id!, createdAt: new Date() }, { session });
    return id!;
  });
  return status(db, await jobs(db).findOne({ _id: jobId }, options));
}
export async function changeImagePublication(db: Db, raw: unknown, actor: string, action: 'pause' | 'resume') {
  await authorizeImageReview(db, actor, true);
  const parsed = imagePublicationActionSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  await transaction(db, async session => {
    await authorizeImageReview(db, actor, true, session);
    const job = await jobs(db).findOne({ _id: parsed.data.jobId }, { session });
    if (!job) throw new HttpError(404, 'NOT_FOUND');
    if (job.phase === 'complete' || (action === 'pause' ? job.phase === 'paused' : job.phase !== 'paused')) return;
    if (action === 'resume' && job.leaseUntil && job.leaseUntil > new Date()) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
    await jobs(db).updateOne({ _id: job._id }, { $set: action === 'pause'
      ? { phase: 'paused', resumePhase: job.phase === 'preparing' ? 'preparing' : 'publishing', updatedAt: new Date() }
      : { phase: job.resumePhase, actor, error: null, updatedAt: new Date() } }, { session });
    await db.collection('image_review_publication_actions').insertOne({ jobId: job._id, actor, action, createdAt: new Date() }, { session });
  });
  return status(db, await jobs(db).findOne({ _id: parsed.data.jobId }, options));
}
async function owned(db: Db, job: Job, session: ClientSession) {
  await authorizeImageReview(db, job.actor, true, session);
  const changed = await jobs(db).updateOne({ _id: job._id, leaseToken: job.leaseToken!, leaseUntil: { $gt: new Date() } }, { $inc: { leaseRevision: 1 } }, { session });
  if (changed.modifiedCount !== 1) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
}
async function prepare(db: Db, job: Job) {
  await transaction(db, async session => {
    await owned(db, job, session);
    const page = job.boundary ? await db.collection<Document & { _id: string }>('image_review_items').find({ status: 'approved', reviewedAt: { $lte: job.createdAt },
      _id: { $lte: job.boundary, ...(job.cursor ? { $gt: job.cursor } : {}) } }, { session, ...options, projection: { _id: 1, approvalId: 1, selectedProductId: 1 } }).sort({ _id: 1 }).limit(100).toArray() : [];
    let newProducts = 0;
    for (const row of page) {
      if (!row.approvalId || !row.selectedProductId) throw new Error('Invalid persisted approval');
      const groupId = reviewDigest([job._id, row.selectedProductId]);
      const group = await groups(db).findOne({ _id: groupId }, { session });
      if (!group) {
        newProducts++;
        await groups(db).insertOne({ _id: groupId, jobId: job._id, productId: String(row.selectedProductId), approvalIds: [String(row.approvalId)], images: 1, state: 'pending' }, { session });
      } else await groups(db).updateOne({ _id: groupId }, { $inc: { images: 1 }, ...(group.approvalIds.length < 9 ? { $set: { approvalIds: [...group.approvalIds, String(row.approvalId)] } } : {}) }, { session });
      await entries(db).insertOne({ _id: reviewDigest([job._id, row._id]), groupId, itemId: row._id, approvalId: String(row.approvalId), resolved: false }, { session });
    }
    const fields = page.length ? { cursor: page.at(-1)!._id } : { resumePhase: 'publishing' as const };
    // A pause requested while preparing is preserved.
    await jobs(db).updateOne({ _id: job._id, leaseToken: job.leaseToken! }, { $set: { ...fields, updatedAt: new Date() }, $inc: { preparedImages: page.length, totalProducts: newProducts } }, { session });
    if (!page.length) await jobs(db).updateOne({ _id: job._id, phase: 'preparing', leaseToken: job.leaseToken! }, { $set: { phase: 'publishing' } }, { session });
  });
}
async function finishGroup(db: Db, job: Job, group: Group, state: 'published' | 'skipped', session: ClientSession) {
  const changed = await groups(db).updateOne({ _id: group._id, state: { $in: ['pending', 'holding'] } }, { $set: { state } }, { session });
  if (changed.modifiedCount !== 1) return;
  await jobs(db).updateOne({ _id: job._id, leaseToken: job.leaseToken! }, { $inc: { processedProducts: 1, [state === 'published' ? 'publishedImages' : 'skippedImages']: group.images }, $set: { updatedAt: new Date() } }, { session });
}
async function holdInvalid(db: Db, job: Job, group: Group) {
  await transaction(db, async session => {
    await owned(db, job, session);
    const page = await entries(db).find({ groupId: group._id, resolved: false }, { session, ...options }).sort({ _id: 1 }).limit(25).toArray();
    for (const entry of page) {
      const row = await db.collection<Document & { _id: string }>('image_review_items').findOneAndUpdate({ _id: entry.itemId, status: 'approved', approvalId: entry.approvalId },
        { $set: { status: 'held', approvalId: null, note: group.reason, reviewer: job.actor, reviewedAt: new Date() }, $inc: { revision: 1 } }, { session, returnDocument: 'after' });
      if (row) await db.collection<Document & { _id: string }>('image_review_events').insertOne({ _id: reviewDigest(['publication-hold', group._id, entry._id]), itemId: row._id, actor: job.actor, createdAt: new Date(),
        sourceApprovalId: entry.approvalId, publicationId: job._id, result: { status: 'held', note: group.reason } }, { session });
      await entries(db).updateOne({ _id: entry._id }, { $set: { resolved: true } }, { session });
    }
    if (page.length < 25) await finishGroup(db, job, group, 'skipped', session);
  });
}
function reviewFailure(error: unknown): string | null {
  if (!(error instanceof HttpError)) return null;
  if ([404, 409, 413].includes(error.status)) return 'The product, gallery, approval or original image needs another review.';
  return null;
}
/** One bounded, leased step. Multiple API instances may safely call this worker. */
export async function processImagePublication(db: Db, cloudName?: string, transport: typeof fetch = fetch) {
  const job = await jobs(db).findOneAndUpdate({ phase: { $in: ['preparing', 'publishing'] }, $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: new Date() } }] },
    { $set: { leaseToken: randomUUID(), leaseUntil: new Date(Date.now() + leaseMs) } }, { ...options, sort: { createdAt: 1 }, returnDocument: 'after' });
  if (!job) return false;
  try {
    await authorizeImageReview(db, job.actor, true);
    if (job.phase === 'preparing') await prepare(db, job);
    else {
      const group = await groups(db).find({ jobId: job._id, state: { $in: ['pending', 'holding'] } }, options).sort({ _id: 1 }).limit(1).next();
      if (!group) await transaction(db, async session => { await owned(db, job, session); await jobs(db).updateOne({ _id: job._id, leaseToken: job.leaseToken! }, { $set: { phase: 'complete', error: null, updatedAt: new Date() } }, { session }); });
      else if (group.state === 'holding') await holdInvalid(db, job, group);
      else {
        try {
          if (group.images > 8) throw new HttpError(409, 'CATALOG_REVIEW_REQUIRED');
          let manifestId = group.manifestId;
          if (!manifestId) {
            const manifest = await previewImageReviewImport(db, { approvalIds: group.approvalIds }, job.actor);
            manifestId = manifest.manifestId;
            await transaction(db, async session => { await owned(db, job, session); await groups(db).updateOne({ _id: group._id, state: 'pending' }, { $set: { manifestId: manifest.manifestId } }, { session }); });
          }
          // Pause prevents a new import; an in-flight transaction may still finish.
          if (!(await jobs(db).findOne({ _id: job._id, leaseToken: job.leaseToken!, phase: 'publishing', leaseUntil: { $gt: new Date() } }, options))) return true;
          await importImageReviewApprovals(db, { manifestId, approvalIds: group.approvalIds }, job.actor, cloudName, transport);
          await transaction(db, async session => { await owned(db, job, session); await finishGroup(db, job, group, 'published', session); });
        } catch (error) {
          const reason = reviewFailure(error);
          if (!reason) throw error;
          await transaction(db, async session => { await owned(db, job, session); await groups(db).updateOne({ _id: group._id, state: 'pending' }, { $set: { state: 'holding', reason } }, { session }); });
        }
      }
    }
  } catch (error) {
    const kind = error instanceof HttpError && error.status === 403 ? 'access' : error instanceof HttpError && error.status === 503 ? 'provider' : 'service';
    await jobs(db).updateOne({ _id: job._id, leaseToken: job.leaseToken! }, { $set: { phase: 'paused', resumePhase: job.phase === 'preparing' ? 'preparing' : 'publishing', error: kind, updatedAt: new Date() } });
  } finally {
    await jobs(db).updateOne({ _id: job._id, leaseToken: job.leaseToken! }, { $unset: { leaseToken: '', leaseUntil: '' } });
  }
  return true;
}
export function imagePublicationWorker(getDb: () => Promise<Db> | Db, configuration: { cloudName?: string; transport?: typeof fetch; enabled?: () => boolean; intervalMs?: number } = {}) {
  let stopped = false, running: Promise<unknown> | undefined;
  const tick = () => {
    if (stopped || running || configuration.enabled?.() === false) return;
    running = Promise.resolve().then(getDb).then(db => processImagePublication(db, configuration.cloudName, configuration.transport)).catch(() => undefined).finally(() => { running = undefined; });
  };
  const timer = setInterval(tick, configuration.intervalMs ?? 1500); timer.unref(); tick();
  return { stop: async () => { stopped = true; clearInterval(timer); await running; } };
}
