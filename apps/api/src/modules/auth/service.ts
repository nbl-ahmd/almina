import { createHash, randomBytes } from 'node:crypto';
import { compare } from 'bcryptjs';
import { ObjectId } from 'mongodb';
import type { Staff } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { staffDto, staffProjection } from './dto.js';
import { queryOptions, type GetDb } from '../../database.js';

const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
const invalidCredentials = () => new HttpError(401, 'UNAUTHORIZED');
// Valid cost-12 dummy hash keeps unknown-user attempts on the same asynchronous bcrypt path.
const dummyHash = '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
export function createAuthService(getDb: GetDb) {
  return {
    async login(input: { username: string; password: string }) {
      const db = await getDb();
      const doc = await db.collection('users').findOne({ username: input.username },
        { ...queryOptions, projection: { ...staffProjection, password: 1, disabled: 1 } });
      const supportedHash = typeof doc?.password === 'string' && /^\$2[aby]\$(0[4-9]|1[0-4])\$[./A-Za-z0-9]{53}$/.test(doc.password);
      const passwordHash = supportedHash ? doc!.password as string : dummyHash;
      const valid = await compare(input.password, passwordHash);
      if (!doc || !supportedHash || !valid || doc.disabled === true || !['admin', 'user'].includes(doc.role)) throw invalidCredentials();
      const user = staffDto(doc);
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
      await db.collection('api_sessions').insertOne({ tokenHash: hashToken(token), userId: doc._id, expiresAt }, queryOptions);
      return { token, expiresAt: expiresAt.toISOString(), user };
    },
    async authenticate(authorization: string | undefined): Promise<Staff> {
      const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/);
      if (!match?.[1]) throw invalidCredentials();
      const db = await getDb();
      const session = await db.collection('api_sessions').findOne({ tokenHash: hashToken(match[1]), expiresAt: { $gt: new Date() } },
        { ...queryOptions, projection: { userId: 1 } });
      if (!(session?.userId instanceof ObjectId)) throw invalidCredentials();
      const doc = await db.collection('users').findOne({ _id: session.userId, disabled: { $ne: true } },
        { ...queryOptions, projection: staffProjection });
      if (!doc || !['admin', 'user'].includes(doc.role)) throw invalidCredentials();
      return staffDto(doc); // Role/city changes and deleted users take effect on the next request.
    },
    async logout(authorization: string | undefined) {
      const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/);
      if (!match?.[1]) throw invalidCredentials();
      const db = await getDb();
      await db.collection('api_sessions').deleteOne({ tokenHash: hashToken(match[1]) }, queryOptions);
    },
  };
}
