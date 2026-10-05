import { z } from 'zod';
import { hash } from 'bcryptjs';
import { ObjectId, type Db, type Document, type ClientSession } from 'mongodb';
import { HttpError } from '../../errors.js';

const id = z.string().regex(/^[a-f0-9]{24}$/i);
const input = z.object({ username: z.string().regex(/^[A-Za-z0-9_.@-]{1,100}$/),
  password: z.string().min(12).max(72).refine(value => Buffer.byteLength(value) <= 72),
  name: z.string().trim().min(1).max(100), role: z.enum(['admin', 'user']),
  cities: z.array(z.string().trim().min(1).max(100)).max(100).refine(values => new Set(values).size === values.length),
}).strict();
function validate<T extends z.ZodType>(schema: T, raw: unknown): z.infer<T> {
  const value = schema.safeParse(raw); if (!value.success) throw new HttpError(400, 'INVALID_REQUEST'); return value.data;
}
export const staffProvisioningInput = (raw: unknown) => validate(input, raw);
async function administrator(db: Db, actor: string, session?: ClientSession) {
  const actorId = new ObjectId(validate(id, actor));
  if (!await db.collection('users').findOne({ _id: actorId, role: 'admin', disabled: { $ne: true } },
    { projection: { _id: 1 }, maxTimeMS: 3000, ...(session ? { session } : {}) })) throw new HttpError(403, 'FORBIDDEN');
  return actorId;
}
async function serializeStaffWrites(db: Db, action: (session: ClientSession) => Promise<void>) {
  const controls = db.collection<Document & { _id: string }>('auth_administration_controls');
  try { await controls.updateOne({ _id: 'staff-administration' }, { $setOnInsert: { revision: 0 } }, { upsert: true, maxTimeMS: 3000 }); }
  catch (error) { if ((error as { code?: number }).code !== 11000) throw error; }
  const session = db.client.startSession();
  try {
    await session.withTransaction(async () => {
      await controls.updateOne({ _id: 'staff-administration' }, { $inc: { revision: 1 } }, { session });
      await action(session);
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 5000 });
  } finally { await session.endSession(); }
}
export async function provisionStaff(db: Db, raw: unknown, actor: string) {
  const value = staffProvisioningInput(raw);
  await administrator(db, actor); // Reject a stale/revoked actor before expensive password work.
  const password = await hash(value.password, 12);
  await serializeStaffWrites(db, async session => {
    const actorId = await administrator(db, actor, session);
    // Username is the natural retry identity. Existing active/disabled accounts
    // are never overwritten, re-enabled or assigned a different role/password.
    if (await db.collection('users').findOne({ username: value.username }, { projection: { _id: 1 }, session })) return;
    const user = { _id: new ObjectId(), ...value, password, createdAt: new Date() };
    await db.collection('users').insertOne(user, { session });
    await db.collection('auth_administration_audit').insertOne({ actorId, targetUserId: user._id, action: 'provision',
      role: value.role, cities: value.cities, reason: 'Administrator provisioned account', createdAt: new Date() }, { session });
  });
  return { message: 'User provisioning request processed' };
}
export async function deactivateStaff(db: Db, userId: string, actor: string) {
  const targetId = new ObjectId(validate(id, userId));
  if (targetId.equals(new ObjectId(validate(id, actor)))) throw new HttpError(403, 'FORBIDDEN');
  await administrator(db, actor);
  await serializeStaffWrites(db, async session => {
    const actorId = await administrator(db, actor, session);
    const target = await db.collection('users').findOne({ _id: targetId }, { session });
    if (!target || target.disabled === true) return; // Exact/repeated deactivation is a no-op.
    if (target.role === 'admin' && await db.collection('users').countDocuments({ role: 'admin', disabled: { $ne: true } }, { session }) <= 1) throw new HttpError(409, 'INVALID_TRANSITION');
    await db.collection('users').updateOne({ _id: targetId }, { $set: { disabled: true, deactivatedAt: new Date(), deactivatedBy: actorId } }, { session });
    await db.collection('api_sessions').deleteMany({ userId: targetId }, { session });
    await db.collection('auth_administration_audit').insertOne({ actorId, targetUserId: targetId, action: 'deactivate',
      previousRole: target.role, reason: 'Administrator deactivated account', createdAt: new Date() }, { session });
  });
  return { message: 'User deactivation processed' };
}
export async function retainedStaffList(db: Db, query: unknown, actor: string) {
  const value = validate(z.object({ limit: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(100),
    before: id.optional() }).strict(), query);
  await administrator(db, actor);
  const docs = await db.collection('users').find({ disabled: { $ne: true }, ...(value.before ? { _id: { $lt: new ObjectId(value.before) } } : {}) },
    { projection: { username: 1, name: 1, role: 1, cities: 1 }, maxTimeMS: 3000 }).sort({ _id: -1 }).limit(value.limit).toArray();
  return docs.map(doc => ({ _id: doc._id, username: doc.username, name: doc.name, role: doc.role,
    cities: Array.isArray(doc.cities) ? doc.cities.filter((value: unknown) => typeof value === 'string') : [] }));
}
