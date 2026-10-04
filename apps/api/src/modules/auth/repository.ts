import type { Staff } from '@almina/contracts';
import { cursorScope, decodeCursor, encodeCursor } from '../../http/cursor.js';
import { queryOptions, type GetDb } from '../../database.js';
import { staffDto, staffProjection } from './dto.js';

export function createStaffRepository(getDb: GetDb) {
  return {
    async list(query: { limit: number; cursor?: string | undefined }, user: Staff) {
      const scope = cursorScope('users', {}, user.id);
      const after = decodeCursor(query.cursor, scope);
      const db = await getDb();
      const docs = await db.collection('users').find({ disabled: { $ne: true }, ...(after ? { _id: { $lt: after } } : {}) },
        { ...queryOptions, projection: staffProjection }).sort({ _id: -1 }).limit(query.limit + 1).toArray();
      const items = docs.slice(0, query.limit);
      return { items: items.map(staffDto), nextCursor: docs.length > query.limit ? encodeCursor(items.at(-1)!._id, scope) : null };
    },
  };
}
