import { z } from 'zod';
import type { Db } from 'mongodb';
import { HttpError } from '../../errors.js';
export async function setStoreStatus(db: Db, raw: unknown) {
  const parsed = z.object({ status: z.boolean() }).strict().safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  await db.collection('stores').findOneAndUpdate({}, { $set: { status: parsed.data.status ? 'open' : 'closed' } }, { upsert: true });
}
export async function storeStatus(db: Db) {
  const store = await db.collection('stores').findOne({}, { projection: { status: 1 }, maxTimeMS: 3000 });
  if (!store) throw new HttpError(404, 'NOT_FOUND');
  if (!['open', 'closed'].includes(store.status)) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  return store.status as 'open' | 'closed';
}
