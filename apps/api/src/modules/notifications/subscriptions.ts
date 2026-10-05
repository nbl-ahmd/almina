import { ObjectId, type Db } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../../errors.js';
import { pushSubscription } from './push.js';

const empty = z.object({}).strict();
// Historic callers may echo a userId. It is bounded and deliberately ignored;
// only the independently authenticated identity selects the write target.
const echo = { userId: z.string().max(100).optional() };
const registration = z.object({ subscription: z.unknown(), ...echo }).strict();
const removal = z.object(echo).strict();
const actorId = z.string().regex(/^[a-f0-9]{24}$/i);
function parsed<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  return result.data;
}
export function staffSubscriptionInput(raw: unknown, query: unknown) {
  parsed(empty, query);
  return pushSubscription(parsed(registration, raw).subscription);
}
export function staffUnsubscriptionInput(raw: unknown, query: unknown) {
  parsed(empty, query); parsed(removal, raw ?? {});
}
const options = { maxTimeMS: 3000, timeoutMS: 4000, writeConcern: { w: 'majority' as const } };
function owner(actor: string) {
  const value = actorId.safeParse(actor);
  if (!value.success) throw new HttpError(401, 'UNAUTHORIZED');
  return { _id: new ObjectId(value.data), role: { $in: ['admin', 'user'] }, disabled: { $ne: true } };
}
export async function registerStaffSubscription(db: Db, raw: unknown, actor: string, query: unknown) {
  const subscription = staffSubscriptionInput(raw, query);
  const filter = owner(actor);
  const result = await db.collection('users').updateOne(filter, { $set: { subscription } }, options);
  if (result.matchedCount !== 1) throw new HttpError(401, 'UNAUTHORIZED');
}
export async function removeStaffSubscription(db: Db, raw: unknown, actor: string, query: unknown) {
  staffUnsubscriptionInput(raw, query);
  const filter = owner(actor);
  const result = await db.collection('users').updateOne(filter, { $unset: { subscription: '' } }, options);
  if (result.matchedCount !== 1) throw new HttpError(401, 'UNAUTHORIZED');
}
