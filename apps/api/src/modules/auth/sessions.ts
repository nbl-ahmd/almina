import { createHash, randomBytes } from 'node:crypto';
import { compare } from 'bcryptjs';
import { ObjectId, type Document } from 'mongodb';
import { staffDtoSchema, type ErrorCode, type Staff } from '@almina/contracts';
import type { GetDb } from '../../database.js';
import { HttpError } from '../../errors.js';
import { id } from '../dto-values.js';
import { sessionLifetimeMs } from './cookies.js';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const dummyHash = '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
const queryOptions = { maxTimeMS: 3000, timeoutMS: 4000 };
const staffProjection = { _id: 1, username: 1, name: 1, role: 1, cities: 1, password: 1, disabled: 1 };
type ErrorFactory = (status: number, code: ErrorCode) => Error;
export function createSessionService(getDb: GetDb, error: ErrorFactory = (status, code) => new HttpError(status, code)) {
  const unauthorized = () => error(401, 'UNAUTHORIZED');
  function identity(doc: Document): Staff {
    const result = staffDtoSchema.safeParse({ id: id(doc._id), username: doc.username, name: doc.name, role: doc.role,
      cities: Array.isArray(doc.cities) ? doc.cities.filter((city: unknown) => typeof city === 'string') : [] });
    if (!result.success) throw unauthorized(); return result.data;
  }
  return {
    async login(raw: unknown) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw error(400, 'INVALID_REQUEST');
      const input = raw as Record<string, unknown>;
      if (typeof input.username !== 'string' || !input.username.length || input.username.length > 100
        || typeof input.password !== 'string' || !input.password.length || Buffer.byteLength(input.password) > 72
        || Object.keys(input).some(key => !['username', 'password'].includes(key))) throw error(400, 'INVALID_REQUEST');
      const db = await getDb();
      const doc = await db.collection('users').findOne({ username: input.username }, { ...queryOptions, projection: staffProjection });
      const password = typeof doc?.password === 'string' && /^\$2[aby]\$(0[4-9]|1[0-4])\$[./A-Za-z0-9]{53}$/.test(doc.password) ? doc.password : undefined;
      const valid = await compare(input.password, password ?? dummyHash);
      if (!doc || !password || !valid || doc.disabled === true || !['admin', 'user'].includes(doc.role)) throw unauthorized();
      const user = identity(doc), token = randomBytes(32).toString('base64url'), expiresAt = new Date(Date.now() + sessionLifetimeMs);
      await db.collection('api_sessions').insertOne({ tokenHash: digest(token), userId: doc._id, expiresAt,
        passwordFingerprint: digest(password), scheme: 'cookie-v2' }, queryOptions);
      return { token, expiresAt: expiresAt.toISOString(), user };
    },
    async authenticate(token: string | undefined) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw unauthorized();
      const db = await getDb();
      const session = await db.collection('api_sessions').findOne({ tokenHash: digest(token), scheme: 'cookie-v2', expiresAt: { $gt: new Date() } }, queryOptions);
      const userId = id(session?.userId); if (!userId) throw unauthorized();
      const doc = await db.collection('users').findOne({ _id: new ObjectId(userId), disabled: { $ne: true } }, { ...queryOptions, projection: staffProjection });
      if (!doc || !['admin', 'user'].includes(doc.role) || typeof doc.password !== 'string'
        || session?.passwordFingerprint !== digest(doc.password)) throw unauthorized();
      return identity(doc);
    },
    async logout(token: string | undefined) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw unauthorized();
      await (await getDb()).collection('api_sessions').deleteOne({ tokenHash: digest(token) }, queryOptions);
    },
    async revokeUser(userId: { toHexString(): string }) {
      let value: string; try { value = userId.toHexString(); } catch { throw error(400, 'INVALID_REQUEST'); }
      if (!/^[a-f0-9]{24}$/.test(value)) throw error(400, 'INVALID_REQUEST');
      await (await getDb()).collection('api_sessions').deleteMany({ userId: new ObjectId(value) }, queryOptions);
    },
    async limitLogin(username: unknown, ip: string | undefined) {
      const db = await getDb(), window = Math.floor(Date.now() / (15 * 60 * 1000));
      for (const [kind, value, limit] of [['ip', ip, 50], ['account', typeof username === 'string' ? username.normalize('NFKC').trim().toLowerCase() : '', 20]] as const) {
        const result = await db.collection<Document & { _id: string }>('auth_rate_limits').findOneAndUpdate(
          { _id: `login:${kind}:${digest(String(value))}:${window}` },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * 15 * 60 * 1000) } },
          { ...queryOptions, upsert: true, returnDocument: 'after' });
        // Preserve the historical ModifyResult adapter alongside current native driver documents.
        const count: unknown = result?.count ?? result?.value?.count;
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 1) throw error(503, 'SERVICE_UNAVAILABLE');
        if (count > limit) throw error(429, 'RATE_LIMITED');
      }
    },
  };
}
