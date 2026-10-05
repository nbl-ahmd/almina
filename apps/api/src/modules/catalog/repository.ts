import { ObjectId, type Document, type Filter } from 'mongodb';
import type { AdminProductQuery } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { decodeCursor, encodeCursor, cursorScope } from '../../http/cursor.js';
import { productProjection, categoryProjection, bannerProjection, productDto, categoryDto, bannerDto } from './dto.js';

import { queryOptions, type GetDb } from '../../database.js';
import { measureCatalogQuery, type CatalogQueryObserver } from './timing.js';
export function productFilter(query: AdminProductQuery, admin: boolean): Filter<Document> {
  const filter: Filter<Document> = { archivedAt: { $exists: false } };
  if (!admin) { filter.disabled = { $ne: true }; filter.published = { $ne: false }; filter.active = { $ne: false }; } // Missing legacy flags remain visible.
  else if (query.disabled !== undefined) filter.disabled = query.disabled;
  if (query.categoryId) filter.category = new ObjectId(query.categoryId);
  if (query.featured !== undefined) filter.featured = query.featured;
  if (query.sale !== undefined) filter.sale = query.sale;
  if (query.q) filter.$text = { $search: query.q, $language: 'none' };
  return filter;
}
const publicCategoryJoin = [
  { $lookup: { from: 'categories', localField: 'category', foreignField: '_id',
    pipeline: [{ $match: { archivedAt: { $exists: false }, disabled: { $ne: true } } }, { $project: { _id: 1 } }], as: 'visibleCategory' } },
  { $match: { 'visibleCategory.0': { $exists: true } } },
];

export function createCatalogRepository(getDb: GetDb, observe?: CatalogQueryObserver) {
  return {
    async sitemap(query: { kind: 'products' | 'categories'; cursor?: string | undefined }) {
      const scope = cursorScope('sitemap', { kind: query.kind });
      const after = decodeCursor(query.cursor, scope);
      const db = await getDb();
      const product = query.kind === 'products';
      const filter: Filter<Document> = { archivedAt: { $exists: false }, disabled: { $ne: true }, ...(product ? { published: { $ne: false }, active: { $ne: false } } : {}), name: { $type: 'string', $ne: '' },
        _id: { $type: 'objectId', ...(after ? { $lt: after } : {}) },
        $expr: { $and: [{ $eq: [{ $type: '$name' }, 'string'] },
          ...(product ? [
            { $eq: [{ $type: '$product_id' }, 'string'] },
            { $in: [{ $type: '$price' }, ['double', 'int', 'long']] },
            { $in: [{ $type: '$stock' }, ['double', 'int', 'long']] },
            { $eq: ['$stock', { $trunc: { $convert: { input: '$stock', to: 'double', onError: null, onNull: null } } }] },
          ] : []),
        ] },
        ...(product ? { product_id: { $type: 'string', $regex: '^[A-Za-z0-9_-]{1,80}$' },
          price: { $type: 'number', $gte: 0, $lte: Number.MAX_VALUE },
          stock: { $type: 'number', $gte: 0, $lte: Number.MAX_SAFE_INTEGER } } : {}),
      };
      const docs = await measureCatalogQuery('sitemap', () => db.collection(query.kind).aggregate([
        { $match: filter }, { $sort: { _id: -1 } },
        ...(product ? [
          { $lookup: { from: 'categories', localField: 'category', foreignField: '_id',
            pipeline: [{ $match: { archivedAt: { $exists: false }, disabled: { $ne: true }, name: { $type: 'string', $ne: '' } } }, { $project: { _id: 1 } }], as: 'visibleCategory' } },
          { $match: { 'visibleCategory.0': { $exists: true } } },
        ] : []),
        { $limit: 1001 }, { $project: { _id: 1, name: 1, ...(product ? { product_id: 1 } : {}) } },
      ], { ...queryOptions, allowDiskUse: false }).toArray(), observe);
      const items = docs.slice(0, 1000);
      return { items: items.map(doc => ({ id: doc._id.toHexString() as string, name: doc.name as string,
        ...(product ? { productId: doc.product_id as string } : {}) })),
        nextCursor: docs.length > 1000 ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
    async products(query: AdminProductQuery, admin = false) {
      const { limit, cursor, ...filters } = query;
      const scope = cursorScope(admin ? 'admin-products' : 'products', filters);
      const filter = productFilter(query, admin);
      const after = decodeCursor(cursor, scope);
      if (after) filter._id = { $lt: after };
      const db = await getDb();
      const docs = await measureCatalogQuery('products', () => db.collection('products').aggregate([
        { $match: filter }, { $sort: { _id: -1 } },
        ...(admin ? [] : publicCategoryJoin), { $limit: limit + 1 }, { $project: productProjection },
      ], { ...queryOptions, allowDiskUse: false }).toArray(), observe);
      const items = docs.slice(0, limit);
      return { items: items.map(productDto), nextCursor: docs.length > limit ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
    async product(identifier: { id: string } | { productId: string }, admin = false) {
      const db = await getDb();
      const filter: Filter<Document> = 'id' in identifier ? { _id: new ObjectId(identifier.id) } : { product_id: identifier.productId };
      filter.archivedAt = { $exists: false };
      if (!admin) { filter.disabled = { $ne: true }; filter.published = { $ne: false }; filter.active = { $ne: false }; }
      const docs = await measureCatalogQuery('product', () => db.collection('products').aggregate([
        { $match: filter }, ...(admin ? [] : publicCategoryJoin), { $limit: 1 }, { $project: productProjection },
      ], queryOptions).toArray(), observe);
      if (!docs[0]) throw new HttpError(404, 'NOT_FOUND');
      return productDto(docs[0]);
    },
    async categories(query: { limit: number; cursor?: string | undefined }) {
      const scope = cursorScope('categories', {});
      const after = decodeCursor(query.cursor, scope);
      const filter: Filter<Document> = { archivedAt: { $exists: false }, disabled: { $ne: true }, ...(after ? { _id: { $lt: after } } : {}) };
      const db = await getDb();
      const docs = await measureCatalogQuery('categories', () => db.collection('categories').find(filter, { ...queryOptions, projection: categoryProjection })
        .sort({ _id: -1 }).limit(query.limit + 1).toArray(), observe);
      const items = docs.slice(0, query.limit);
      return { items: items.map(categoryDto), nextCursor: docs.length > query.limit ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
    async category(value: string) {
      const db = await getDb();
      const doc = await measureCatalogQuery('category', () => db.collection('categories').findOne({ _id: new ObjectId(value), archivedAt: { $exists: false }, disabled: { $ne: true } },
        { ...queryOptions, projection: categoryProjection }), observe);
      if (!doc) throw new HttpError(404, 'NOT_FOUND');
      return categoryDto(doc);
    },
    async banners(query: { limit: number; cursor?: string | undefined }) {
      const scope = cursorScope('banners', {});
      const after = decodeCursor(query.cursor, scope);
      const db = await getDb();
      const docs = await measureCatalogQuery('banners', () => db.collection('banners').find({ archivedAt: { $exists: false }, ...(after ? { _id: { $lt: after } } : {}) },
        { ...queryOptions, projection: bannerProjection }).sort({ _id: -1 }).limit(query.limit + 1).toArray(), observe);
      const items = docs.slice(0, query.limit);
      return { items: items.map(bannerDto), nextCursor: docs.length > query.limit ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
    async store() {
      const db = await getDb();
      const doc = await measureCatalogQuery('store', () => db.collection('stores').findOne({}, { ...queryOptions, projection: { _id: 0, status: 1 }, sort: { _id: 1 } }), observe);
      // Never invent an open store if the configuration is absent or corrupt.
      if (!doc || !['open', 'closed'].includes(doc.status)) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
      return { status: doc.status as 'open' | 'closed' };
    },
  };
}
