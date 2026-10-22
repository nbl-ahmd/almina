import type { Db, ClientSession, Document } from 'mongodb';
import { HttpError } from '../../errors.js';
export async function validateAudience(db: Db, product: Document, session: ClientSession) {
  if (!Array.isArray(product.wholesaleTypeIds) || !product.wholesaleTypeIds.length) return;
  const count = await db.collection<Document & { _id: string }>('wholesale_types').countDocuments(
    { _id: { $in: product.wholesaleTypeIds } }, { session, maxTimeMS: 3000 });
  if (count !== product.wholesaleTypeIds.length) throw new HttpError(400, 'INVALID_REQUEST');
}
