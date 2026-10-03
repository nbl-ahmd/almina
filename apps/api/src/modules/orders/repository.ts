import { ObjectId, type Document, type Filter } from 'mongodb';
import type { OrderQuery, Staff } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { cursorScope, decodeCursor, encodeCursor } from '../../http/cursor.js';
import { queryOptions, type GetDb } from '../../database.js';
import { orderSummaryDto, orderDetailDto, orderSummaryProjection, orderDetailProjection } from './dto.js';

export function orderFilter(query: OrderQuery, user: Staff): Filter<Document> {
  const filter: Filter<Document> = {};
  if (user.role !== 'admin') {
    // Empty city assignments never grant access to all customer records.
    if (query.city && !user.cities.includes(query.city)) throw new HttpError(403, 'FORBIDDEN');
    filter['customer.city'] = query.city ?? { $in: user.cities };
  } else if (query.city) filter['customer.city'] = query.city;
  if (query.status) filter.status = query.status;
  if (query.dispatched !== undefined) filter.dispatched = query.dispatched ? true : { $ne: true };
  if (query.canceled !== undefined) filter.canceled = query.canceled ? true : { $ne: true };
  return filter;
}
export function createOrderRepository(getDb: GetDb) {
  return {
    async list(query: OrderQuery, user: Staff) {
      const { limit, cursor, ...filters } = query;
      const scope = cursorScope('orders', filters, JSON.stringify([user.id, user.role, [...user.cities].sort()]));
      const filter = orderFilter(query, user);
      const after = decodeCursor(cursor, scope);
      if (after) filter._id = { $lt: after };
      const db = await getDb();
      const docs = await db.collection('orders').find(filter, { ...queryOptions, projection: orderSummaryProjection })
        .sort({ _id: -1 }).limit(limit + 1).toArray();
      const items = docs.slice(0, limit);
      return { items: items.map(orderSummaryDto), nextCursor: docs.length > limit ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
    async detail(value: string, user: Staff) {
      const db = await getDb();
      const doc = await db.collection('orders').findOne({ ...orderFilter({ limit: 1 }, user), _id: new ObjectId(value) },
        { ...queryOptions, projection: orderDetailProjection });
      if (!doc) throw new HttpError(404, 'NOT_FOUND'); // Conceal orders outside the staff member's assignment.
      return orderDetailDto(doc);
    },
  };
}
