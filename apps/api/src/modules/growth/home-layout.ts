import { defaultHomeLayout, homeLayoutSchema, type HomeLayout } from '@almina/contracts';
import type { Db } from 'mongodb';
import { HttpError } from '../../errors.js';

type Stored = HomeLayout & { _id: 'en' | 'ar'; updatedBy: string; updatedAt: Date };
const layouts = (db: Db) => db.collection<Stored>('home_layouts');
const options = { maxTimeMS: 3000 };

function clean(row: Stored | null, locale: 'en' | 'ar'): HomeLayout | null {
  if (!row) return null;
  const { _id: _key, updatedBy: _actor, updatedAt: _time, ...layout } = row;
  void [_key, _actor, _time];
  const parsed = homeLayoutSchema.safeParse({ ...layout, locale });
  return parsed.success ? parsed.data : null;
}

/** Storefront read: the published layout only; null means "use the built-in homepage". */
export async function publishedHomeLayout(db: Db, locale: 'en' | 'ar') {
  const layout = clean(await layouts(db).findOne({ _id: locale, published: true }, options), locale);
  return layout?.published ? layout : null;
}

/** Admin read: the saved draft or published layout, else today's built-in order to start from. */
export async function adminHomeLayout(db: Db, locale: 'en' | 'ar') {
  return clean(await layouts(db).findOne({ _id: locale }, options), locale) ?? defaultHomeLayout(locale);
}

/** Saves with the revision the editor loaded, so two staff editing at once cannot overwrite each other silently. */
export async function saveHomeLayout(db: Db, raw: unknown, actor: string) {
  const parsed = homeLayoutSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const { revision, locale, ...layout } = parsed.data;
  const update = { ...layout, locale, updatedBy: actor, updatedAt: new Date() };
  const collection = layouts(db);
  if (revision === 0) {
    try { await collection.insertOne({ _id: locale, ...update, revision: 1 }); }
    catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      throw error;
    }
    return { ...parsed.data, revision: 1 };
  }
  const saved = await collection.findOneAndUpdate({ _id: locale, revision }, { $set: update, $inc: { revision: 1 } },
    { ...options, returnDocument: 'after', includeResultMetadata: false });
  if (!saved) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  return clean(saved, locale)!;
}

/** Distinct catalogue brand names for admin pickers (brand pages and brand sections), bounded. */
export async function catalogueBrandNames(db: Db) {
  const names = await db.collection('products').distinct('brand', { brand: { $type: 'string', $ne: '' }, archivedAt: { $exists: false } }, options);
  return [...new Set(names.filter((name): name is string => typeof name === 'string').map(name => name.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, 2000);
}
