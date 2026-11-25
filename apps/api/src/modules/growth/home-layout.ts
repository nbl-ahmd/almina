import { defaultHomeLayout, homeLayoutAdminSchema, homeLayoutSaveSchema, homeLayoutSchema, type HomeLayout, type HomeLayoutAdmin, type HomeSection } from '@almina/contracts';
import type { Db } from 'mongodb';
import { HttpError } from '../../errors.js';
import { retailAudienceFilter } from '../catalog/audience.js';

/** One row per language: `sections` is the draft the editor works on, `live` is the published copy customers see (null = built-in
 *  homepage). Rows saved before the two were separated have no `live` field; their `published` flag says whether `sections` is live. */
type Stored = { _id: 'en' | 'ar'; locale: 'en' | 'ar'; revision: number; sections: HomeSection[]; live?: HomeSection[] | null; published?: boolean; updatedBy: string; updatedAt: Date };
const layouts = (db: Db) => db.collection<Stored>('home_layouts');
const options = { maxTimeMS: 3000 };

const liveSections = (row: Stored) => row.live !== undefined ? row.live : row.published ? row.sections : null;

function adminView(row: Stored, locale: 'en' | 'ar'): HomeLayoutAdmin | null {
  const live = liveSections(row);
  const parsed = homeLayoutAdminSchema.safeParse({ locale, revision: row.revision, sections: row.sections, published: live !== null,
    unpublishedChanges: live !== null && JSON.stringify(live) !== JSON.stringify(row.sections) });
  return parsed.success ? parsed.data : null;
}

/** Storefront read: the published copy only; null means "use the built-in homepage". */
export async function publishedHomeLayout(db: Db, locale: 'en' | 'ar'): Promise<HomeLayout | null> {
  const row = await layouts(db).findOne({ _id: locale }, options);
  const live = row ? liveSections(row) : null;
  if (!row || !live) return null;
  const parsed = homeLayoutSchema.safeParse({ locale, published: true, revision: row.revision, sections: live });
  return parsed.success ? parsed.data : null;
}

/** Admin read: the draft, else today's built-in order to start from. A broken draft falls back to the built-in order but keeps the
 *  row's revision, so staff can overwrite it. */
export async function adminHomeLayout(db: Db, locale: 'en' | 'ar'): Promise<HomeLayoutAdmin> {
  const row = await layouts(db).findOne({ _id: locale }, options);
  const fallback = { ...defaultHomeLayout(locale), unpublishedChanges: false };
  if (!row) return fallback;
  return adminView(row, locale) ?? { ...fallback, revision: row.revision, published: liveSections(row) !== null };
}

/** Saves with the revision the editor loaded, so two staff editing at once cannot overwrite each other silently. */
export async function saveHomeLayout(db: Db, raw: unknown, actor: string): Promise<HomeLayoutAdmin> {
  const parsed = homeLayoutSaveSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const { revision, locale, sections, action } = parsed.data;
  const collection = layouts(db);
  const stamp = { locale, sections, updatedBy: actor, updatedAt: new Date() };
  if (revision === 0) {
    const row: Stored = { _id: locale, ...stamp, live: action === 'publish' ? sections : null, revision: 1 };
    try { await collection.insertOne(row); }
    catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      throw error;
    }
    return adminView(row, locale)!;
  }
  const current = await collection.findOne({ _id: locale, revision }, options);
  if (!current) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  const live = action === 'publish' ? sections : action === 'unpublish' ? null : liveSections(current);
  const saved = await collection.findOneAndUpdate({ _id: locale, revision }, { $set: { ...stamp, live }, $unset: { published: '' }, $inc: { revision: 1 } },
    { ...options, returnDocument: 'after', includeResultMetadata: false });
  if (!saved) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  return adminView(saved, locale)!;
}

/** Distinct catalogue brand names for admin pickers (brand pages and brand sections), bounded. */
export async function catalogueBrandNames(db: Db) {
  const names = await db.collection('products').distinct('brand', { brand: { $type: 'string', $ne: '' }, archivedAt: { $exists: false } }, options);
  return [...new Set(names.filter((name): name is string => typeof name === 'string').map(name => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, 2000);
}

/** Brand names shoppers can actually see: published retail products in an active category. Safe to expose publicly. */
export async function publicBrandNames(db: Db) {
  const rows = await db.collection('products').aggregate<{ _id: string }>([
    { $match: { $and: [retailAudienceFilter, { disabled: { $ne: true }, published: { $ne: false }, active: { $ne: false }, archivedAt: { $exists: false } }] } },
    { $project: { category: 1, name: { $trim: { input: { $convert: { input: { $cond: [{ $gt: [{ $ifNull: ['$brand', ''] }, ''] }, '$brand', { $ifNull: ['$familyBrand', ''] }] }, to: 'string', onError: '', onNull: '' } } } } } },
    { $match: { name: { $ne: '' } } },
    { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category', pipeline: [{ $match: { disabled: { $ne: true }, archivedAt: { $exists: false } } }, { $project: { _id: 1 } }] } },
    { $match: { 'category.0': { $exists: true } } },
    { $group: { _id: '$name' } }, { $sort: { _id: 1 } }, { $limit: 2000 },
  ], options).toArray();
  return [...new Map(rows.map(row => [row._id.toLowerCase(), row._id])).values()];
}
