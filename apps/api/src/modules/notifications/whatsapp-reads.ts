import { z } from 'zod';
import type { Db, Document } from 'mongodb';
import { HttpError } from '../../errors.js';
const integer = z.string().regex(/^\d{1,5}$/).transform(Number);
const pageSchema = z.object({ limit: integer.pipe(z.number().int().min(1).max(100)).optional(), offset: integer.pipe(z.number().int().min(0).max(10000)).optional() }).strict();
export function whatsappReadPage(raw: unknown) {
  const result = pageSchema.safeParse(raw); if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  return { limit: result.data.limit ?? 25, offset: result.data.offset ?? 0 };
}
const query = { maxTimeMS: 3000, timeoutMS: 4000 };
export async function retainedWhatsappList(db: Db, kind: 'recipients' | 'posters' | 'reports', raw: unknown) {
  const page = whatsappReadPage(raw);
  const name = kind === 'recipients' ? 'conversations' : kind === 'posters' ? 'whatsappposters' : 'whatsappbulkreports';
  const projection: Document = kind === 'recipients' ? { _id: 1, from: 1, name: 1, promotionStatus: 1 }
    : kind === 'posters' ? { _id: 1, image: 1, cloudinaryImages: 1, gdriveFileId: 1, createdAt: 1 }
    : { _id: 1, broadcast: { $slice: -100 } };
  return db.collection(name).find(kind === 'posters' ? { archivedAt: { $exists: false } } : {}, { ...query, projection })
    .sort({ _id: -1 }).skip(page.offset).limit(page.limit).toArray();
}
export async function retainedWhatsappConversation(db: Db, recipient: unknown, raw: unknown) {
  const parsed = z.string().regex(/^\+?[0-9]{1,20}$/).safeParse(recipient);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const result = pageSchema.extend({ offset: z.string().regex(/^\d{1,9}$/).transform(Number).pipe(z.number().int().min(0).max(100000000)).optional() }).safeParse(raw);
  if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  const page = { limit: result.data.limit ?? 25, offset: result.data.offset ?? 0 };
  // Offset is from the newest message. Preserve chronological order within each page and expose older history explicitly.
  const count = { $size: { $cond: [{ $isArray: '$messages' }, '$messages', []] } };
  const remaining = { $subtract: [count, page.offset] };
  const values = await db.collection('conversations').aggregate([
    { $match: { from: parsed.data } }, { $limit: 1 },
    { $project: { _id: 1, from: 1, name: 1, promotionStatus: 1, messageCount: count, messageOffset: { $literal: page.offset },
      hasOlderMessages: { $gt: [count, page.offset + page.limit] },
      messages: { $cond: [{ $gt: [remaining, 0] }, { $slice: ['$messages', { $max: [0, { $subtract: [remaining, page.limit] }] }, { $min: [page.limit, remaining] }] }, []] } } },
    { $project: { _id: 1, from: 1, name: 1, promotionStatus: 1, messageCount: 1, messageOffset: 1, hasOlderMessages: 1,
      'messages._id': 1, 'messages.content': 1, 'messages.timestamp': 1, 'messages.sender': 1 } },
  ], query).toArray();
  if (!values[0]) throw new HttpError(404, 'NOT_FOUND'); return values[0];
}
export async function retainedWhatsappPoster(db: Db, filename: unknown, raw: unknown) {
  if (!z.object({}).strict().safeParse(raw).success) throw new HttpError(400, 'INVALID_REQUEST');
  const parsed = z.string().max(180).regex(/^[A-Za-z0-9_-]+\.(?:jpeg|jpg|png|webp)$/i).safeParse(filename);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  // Archived images remain addressable for previously sent templates; never delete their references automatically.
  const poster = await db.collection('whatsappposters').findOne({ image: parsed.data }, { ...query, projection: { gdriveFileId: 1 } });
  if (!poster) throw new HttpError(404, 'NOT_FOUND'); return poster.gdriveFileId as unknown;
}
