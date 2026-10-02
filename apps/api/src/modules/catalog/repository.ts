import { ObjectId, type Document, type Filter } from 'mongodb';
import type { AdminProductQuery } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { decodeCursor, encodeCursor, cursorScope } from '../../http/cursor.js';
import { productProjection, categoryProjection, bannerProjection, productDto, categoryDto, bannerDto } from './dto.js';

import { queryOptions, type GetDb } from '../../database.js';
export function productFilter(query: AdminProductQuery, admin: boolean): Filter<Document> {
  const filter: Filter<Document> = {};
  if (!admin) filter.disabled = { $ne: true }; // Missing legacy disabled fields remain visible.
  else if (query.disabled !== undefined) filter.disabled = query.disabled;
  if (query.categoryId) filter.category = new ObjectId(query.categoryId);
  if (query.featured !== undefined) filter.featured = query.featured;
  if (query.sale !== undefined) filter.sale = query.sale;
  if (query.q) filter.$text = { $search: query.q, $language: 'none' };
  return filter;
}
const publicCategoryJoin = [
  { $lookup: { from: 'categories', localField: 'category', foreignField: '_id',
    pipeline: [{ $match: { disabled: { $ne: true } } }, { $project: { _id: 1 } }], as: 'visibleCategory' } },
  { $match: { 'visibleCategory.0': { $exists: true } } },
];

export function createCatalogRepository(getDb: GetDb) {
  return {
    async products(query: AdminProductQuery, admin = false) {
      const { limit, cursor, ...filters } = query;
      const scope = cursorScope(admin ? 'admin-products' : 'products', filters);
      const filter = productFilter(query, admin);
      const after = decodeCursor(cursor, scope);
      if (after) filter._id = { $lt: after };
      const db = await getDb();
      const docs = await db.collection('products').aggregate([
        { $match: filter }, { $sort: { _id: -1 } },
        ...(admin ? [] : publicCategoryJoin), { $limit: limit + 1 }, { $project: productProjection },
      ], { ...queryOptions, allowDiskUse: false }).toArray();
      const items = docs.slice(0, limit);
      return { items: items.map(productDto), nextCursor: docs.length > limit ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
    async product(identifier: { id: string } | { productId: string }, admin = false) {
      const db = await getDb();
      const filter: Filter<Document> = 'id' in identifier ? { _id: new ObjectId(identifier.id) } : { product_id: identifier.productId };
      if (!admin) filter.disabled = { $ne: true };
      const docs = await db.collection('products').aggregate([
        { $match: filter }, ...(admin ? [] : publicCategoryJoin), { $limit: 1 }, { $project: productProjection },
      ], queryOptions).toArray();
      if (!docs[0]) throw new HttpError(404, 'NOT_FOUND');
      return productDto(docs[0]);
    },
    async categories(query: { limit: number; cursor?: string | undefined }) {
      const scope = cursorScope('categories', {});
      const after = decodeCursor(query.cursor, scope);
      const filter: Filter<Document> = { disabled: { $ne: true }, ...(after ? { _id: { $lt: after } } : {}) };
      const db = await getDb();
      const docs = await db.collection('categories').find(filter, { ...queryOptions, projection: categoryProjection })
        .sort({ _id: -1 }).limit(query.limit + 1).toArray();
      const items = docs.slice(0, query.limit);
      return { items: items.map(categoryDto), nextCursor: docs.length > query.limit ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
    async category(value: string) {
      const db = await getDb();
      const doc = await db.collection('categories').findOne({ _id: new ObjectId(value), disabled: { $ne: true } },
        { ...queryOptions, projection: categoryProjection });
      if (!doc) throw new HttpError(404, 'NOT_FOUND');
      return categoryDto(doc);
    },
    async banners(query: { limit: number; cursor?: string | undefined }) {
      const scope = cursorScope('banners', {});
      const after = decodeCursor(query.cursor, scope);
      const db = await getDb();
      const docs = await db.collection('banners').find(after ? { _id: { $lt: after } } : {},
        { ...queryOptions, projection: bannerProjection }).sort({ _id: -1 }).limit(query.limit + 1).toArray();
      const items = docs.slice(0, query.limit);
      return { items: items.map(bannerDto), nextCursor: docs.length > query.limit ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
    async store() {
      const db = await getDb();
      const doc = await db.collection('stores').findOne({}, { ...queryOptions, projection: { _id: 0, status: 1 }, sort: { _id: 1 } });
      // Never invent an open store if the configuration is absent or corrupt.
      if (!doc || !['open', 'closed'].includes(doc.status)) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
      return { status: doc.status as 'open' | 'closed' };
    },
  };
}
