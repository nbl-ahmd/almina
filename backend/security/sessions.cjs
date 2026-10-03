// Shared by the legacy service and the TypeScript API. No startup or database connection here.
const { createHash, randomBytes } = require('node:crypto');
const { compare } = require('bcryptjs');
const digest = value => createHash('sha256').update(value).digest('hex');
const dummyHash = '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';
const queryOptions = { maxTimeMS: 3000 };
const sessionLifetimeMs = 8 * 60 * 60 * 1000;
const staffProjection = { _id: 1, username: 1, name: 1, role: 1, cities: 1, password: 1, disabled: 1 };
function failure(status, code) { return Object.assign(new Error(code), { status, statusCode: status, code }); }
function identity(doc) {
  return { id: doc._id.toHexString(), username: doc.username, name: doc.name, role: doc.role,
    cities: Array.isArray(doc.cities) ? doc.cities.filter(city => typeof city === 'string') : [] };
}
function createSessionService(getDb, error = failure) {
  const unauthorized = () => error(401, 'UNAUTHORIZED');
  return {
    async login(input) {
      if (!input || typeof input.username !== 'string' || input.username.length < 1 || input.username.length > 100
        || typeof input.password !== 'string' || !input.password.length || Buffer.byteLength(input.password) > 72
        || Object.keys(input).some(key => !['username', 'password'].includes(key))) throw error(400, 'INVALID_REQUEST');
      const db = await getDb();
      const doc = await db.collection('users').findOne({ username: input.username }, { ...queryOptions, projection: staffProjection });
      const supported = typeof doc?.password === 'string' && /^\$2[aby]\$(0[4-9]|1[0-4])\$[./A-Za-z0-9]{53}$/.test(doc.password);
      const valid = await compare(input.password, supported ? doc.password : dummyHash);
      if (!doc || !supported || !valid || doc.disabled === true || !['admin', 'user'].includes(doc.role)) throw unauthorized();
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + sessionLifetimeMs);
      await db.collection('api_sessions').insertOne({ tokenHash: digest(token), userId: doc._id, expiresAt,
        passwordFingerprint: digest(doc.password), scheme: 'cookie-v2' }, queryOptions);
      return { token, expiresAt: expiresAt.toISOString(), user: identity(doc) };
    },
    async authenticate(token) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw unauthorized();
      const db = await getDb();
      const session = await db.collection('api_sessions').findOne({ tokenHash: digest(token), scheme: 'cookie-v2', expiresAt: { $gt: new Date() } }, queryOptions);
      if (!session?.userId?.toHexString) throw unauthorized();
      const doc = await db.collection('users').findOne({ _id: session.userId, disabled: { $ne: true } }, { ...queryOptions, projection: staffProjection });
      if (!doc || !['admin', 'user'].includes(doc.role) || typeof doc.password !== 'string'
        || session.passwordFingerprint !== digest(doc.password)) throw unauthorized();
      return identity(doc);
    },
    async logout(token) {
      if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw unauthorized();
      const db = await getDb();
      await db.collection('api_sessions').deleteOne({ tokenHash: digest(token) }, queryOptions);
    },
    async revokeUser(userId) { await (await getDb()).collection('api_sessions').deleteMany({ userId }, queryOptions); },
    // Atomic, distributed, fixed-window quotas. Keys contain no raw username or IP.
    async limitLogin(username, ip) {
      const db = await getDb();
      const window = Math.floor(Date.now() / (15 * 60 * 1000));
      for (const [kind, value, limit] of [['ip', ip, 50], ['account', typeof username === 'string' ? username.normalize('NFKC').trim().toLowerCase() : '', 20]]) {
        const result = await db.collection('auth_rate_limits').findOneAndUpdate(
          { _id: `login:${kind}:${digest(String(value))}:${window}` },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * 15 * 60 * 1000) } },
          { ...queryOptions, upsert: true, returnDocument: 'after' });
        // Mongoose 7 uses driver 5 (ModifyResult); the v1 service uses driver 7 (document).
        const count = result?.count ?? result?.value?.count;
        if (typeof count !== 'number') throw error(503, 'SERVICE_UNAVAILABLE');
        if (count > limit) throw error(429, 'RATE_LIMITED');
      }
    },
  };
}
function cookieOptions(development = false) {
  return { httpOnly: true, secure: !development, sameSite: 'lax', path: '/', maxAge: sessionLifetimeMs };
}
function cookieName(development = false) { return development ? 'almina_session' : '__Host-almina_session'; }
function readSessionCookie(headers, development = false) {
  const name = cookieName(development);
  const cookies = String(headers.cookie ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith(`${name}=`));
  if (cookies.length !== 1) return undefined;
  const token = cookies[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
function verifyBrowserMutation(req, origins, error = failure) {
  if (!origins.includes(req.headers.origin) || req.headers['x-csrf-protection'] !== '1'
    || req.headers['sec-fetch-site'] === 'cross-site') throw error(403, 'FORBIDDEN');
}
module.exports = { createSessionService, cookieOptions, cookieName, readSessionCookie, verifyBrowserMutation };
