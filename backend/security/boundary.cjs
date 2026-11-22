const { createHmac, timingSafeEqual } = require('node:crypto');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { cookieName, cookieOptions, readSessionCookie, verifyBrowserMutation } = require('./sessions.cjs');
const { lookupPolicy } = require('./policy.cjs');
function fail(status, code) { return Object.assign(new Error(code), { statusCode: status, code }); }
const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
function securityHeaders(development) {
  return helmet({ contentSecurityPolicy: { useDefaults: false, directives: {
    defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"],
  } }, strictTransportSecurity: development ? false : { maxAge: 31536000, includeSubDomains: false },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' } });
}
function verifyWebhook(req, secret) {
  const signature = req.headers['x-hub-signature-256'];
  if (!secret || typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(signature) || !Buffer.isBuffer(req.rawBody)) throw fail(403, 'FORBIDDEN');
  const expected = createHmac('sha256', secret).update(req.rawBody).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))) throw fail(403, 'FORBIDDEN');
}
function installBoundary(app, { auth, origins, development = false, webhookSecret, trustProxy = false }) {
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.set('trust proxy', trustProxy);
  app.use(securityHeaders(development));
  app.use((req, res, next) => {
    res.set({ 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'Cache-Control': 'no-store' });
    res.vary('Origin');
    if (req.headers.origin) {
      if (!origins.includes(req.headers.origin)) return next(fail(403, 'FORBIDDEN'));
      res.set({ 'Access-Control-Allow-Origin': req.headers.origin, 'Access-Control-Allow-Credentials': 'true' });
    }
    if (req.method === 'OPTIONS') {
      const headers = String(req.headers['access-control-request-headers'] ?? '').toLowerCase().split(',').map(value => value.trim()).filter(Boolean);
      if (!origins.includes(req.headers.origin) || !lookupPolicy(req.headers['access-control-request-method'], req.path)
        || headers.some(header => !['content-type', 'x-csrf-protection', 'idempotency-key'].includes(header))) return next(fail(403, 'FORBIDDEN'));
      return res.set({ 'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Protection, Idempotency-Key', 'Access-Control-Max-Age': '600' }).status(204).end();
    }
    next();
  });
  // Fixed read-only live status endpoints cannot spend the allowance needed to save an order.
  // Both pools remain IP bounded before authentication; all existing RBAC still runs below.
  const liveRead = req => ['GET','HEAD'].includes(req.method) && /^\/api\/(?:auth\/me|orders\/(?:receiving|events|notifications))\/?$/i.test(req.originalUrl.split('?')[0]);
  app.use('/api', rateLimit({ windowMs:60000,limit:240,standardHeaders:'draft-8',legacyHeaders:false,skip:req=>!liveRead(req) }));
  app.use('/api', rateLimit({ windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false,skip:liveRead }));
  app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api', wrap(async (req, res, next) => {
    const route = lookupPolicy(req.method, req.originalUrl.split('?')[0]);
    if (!route) throw fail(404, 'NOT_FOUND');
    req.accessPolicy = route.policy;
    // Published catalog/poster media is intentionally embedded cross-origin and fetched by Meta.
    if (route.policy === 'public' && /\/(?:images|image)\/[^/]+\/?$/i.test(req.path)) res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    if (!['public', 'login', 'webhook', 'verification'].includes(route.policy)) {
      req.identity = await auth.authenticate(readSessionCookie(req.headers, development));
      if (route.policy === 'admin' && req.identity.role !== 'admin') throw fail(403, 'FORBIDDEN');
      if (req.identity.accountType === 'branch' && !require('../commerce/dist/service.cjs').storeAccountRouteAllowed(req.method, req.originalUrl.split('?')[0])) throw fail(403, 'FORBIDDEN');
    }
    // Compatibility catalog reads share URLs with staff editors. Only a verified
    // server session may read drafts; anonymous filters cannot override publication.
    if (route.policy === 'public' && ['GET', 'HEAD'].includes(req.method)
      && /^\/api\/(products|category)(?:\/|$)/.test(route.path) && !route.path.includes('/images/')) {
      const token = readSessionCookie(req.headers, development);
      if (token) {
        try { const actor = await auth.authenticate(token); if(actor.accountType !== 'branch') req.identity = actor; }
        catch (error) { if ((error.status ?? error.statusCode) !== 401) throw error; }
      }
    }
    const actualParts = req.originalUrl.split('?')[0].replace(/\/$/, '').split('/');
    const routeParts = route.path.split('/');
    for (let i = 0; i < routeParts.length; i++) {
      const param = routeParts[i]; const value = actualParts[i];
      if ([':id', ':categoryId', ':orderId'].includes(param) && !/^[a-f0-9]{24}$/i.test(value)) throw fail(400, 'INVALID_REQUEST');
      if (param === ':productId' && !(route.path.includes('/details/') ? /^[A-Za-z0-9_-]{1,80}$/ : /^[a-f0-9]{24}$/i).test(value)) throw fail(400, 'INVALID_REQUEST');
      if (param === ':filename' && (!/^[A-Za-z0-9_.-]{1,200}$/.test(value) || value.includes('..'))) throw fail(400, 'INVALID_REQUEST');
      if (param === ':recipient' && !/^\+?[0-9]{1,20}$/.test(value)) throw fail(400, 'INVALID_REQUEST');
    }
    if (!['GET', 'HEAD'].includes(req.method) && route.policy !== 'webhook') verifyBrowserMutation(req, origins);
    next();
  }));
  return { cookieName: cookieName(development), cookieOptions: cookieOptions(development) };
}
module.exports = { installBoundary, securityHeaders, verifyWebhook, wrap, fail };
