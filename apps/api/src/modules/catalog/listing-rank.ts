import type { Document } from 'mongodb';

/** Deterministic merchandising, never a clinical or personalised recommendation. */
export function listingRankStages(q?: string): Document[] {
  const literal = q?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = (field: string, regex: string) => ({ $regexMatch: { input: { $convert: { input: `$${field}`, to: 'string', onError: '', onNull: '' } }, regex, options: 'i' } });
  return [{ $set: {
    _listingAvailable: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] },
    _listingFeatured: { $cond: [{ $eq: ['$featured', true] }, 1, 0] },
    _listingPhoto: { $cond: [{ $or: [
      { $gt: [{ $size: { $cond: [{ $isArray: '$cloudinaryImages' }, '$cloudinaryImages', []] } }, 0] },
      { $gt: [{ $size: { $cond: [{ $isArray: '$images' }, '$images', []] } }, 0] },
      { $and: [{ $eq: [{ $type: '$image' }, 'string'] }, { $ne: ['$image', ''] }] },
    ] }, 1, 0] },
    _listingMatch: literal ? { $switch: { branches: [
      { case: { $or: ['name', 'barcode', 'gtin', 'product_id'].map(field => match(field, `^${literal}$`)) }, then: 4 },
      { case: match('name', `^${literal}`), then: 3 },
      { case: match('name', literal), then: 2 },
      { case: match('brand', literal), then: 1 },
    ], default: 0 } } : 0,
  } }];
}
export const listingRankSort = { _listingMatch: -1, _listingAvailable: -1, _listingFeatured: -1, _listingPhoto: -1, name: 1, _id: 1 } as const;
