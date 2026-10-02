const express = require('express');
const mongoose = require('mongoose');
const { createSessionService } = require('./security/sessions.cjs');
const { installBoundary, verifyWebhook, wrap, fail } = require('./security/boundary.cjs');
function createLegacyApp(options) {
  const app = express();
  const auth = options.auth ?? createSessionService(async () => {
    if (!mongoose.connection.db || mongoose.connection.readyState !== 1) throw fail(503, 'SERVICE_UNAVAILABLE');
    return mongoose.connection.db;
  });
  installBoundary(app, { ...options, auth });
  app.use(express.json({ limit: '128kb', inflate: false, verify(req, _res, buffer) {
    if (/^\/api\/whatsapp\/webhook\/?$/i.test(req.originalUrl.split('?')[0])) req.rawBody = Buffer.from(buffer);
  } }));
  app.post('/api/whatsapp/webhook', wrap(async (req, res, next) => {
    verifyWebhook(req, options.webhookSecret);
    if (!req.body || req.body.object !== 'whatsapp_business_account' || !Array.isArray(req.body.entry)) throw fail(400, 'INVALID_REQUEST');
    // Upstream-signed events may be replayed. Unique _id gives a durable receipt.
    // Marking before processing provides at-most-once effects; failed processing requires operator recovery.
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (!value || req.body.entry.length !== 1 || req.body.entry[0].changes.length !== 1
      || (value.messages?.length > 1) || (value.statuses?.length > 1)) throw fail(400, 'INVALID_REQUEST');
    const message = value.messages?.[0] ?? value.statuses?.[0];
    if (message) {
      if (typeof message.id !== 'string' || message.id.length > 512) throw fail(400, 'INVALID_REQUEST');
      try { await (options.getWebhookDb ? await options.getWebhookDb() : mongoose.connection.db).collection('webhook_receipts').insertOne({ _id: message.id + (value.statuses ? ':' + message.status + ':' + message.timestamp : ''), receivedAt: new Date() }); }
      catch (error) { if (error.code === 11000) return res.sendStatus(200); throw error; }
    }
    next();
  }));
  const routers = options.routers ?? {
    category: require('./routes/categories'), banners: require('./routes/banners'), products: require('./routes/products'),
    orders: require('./routes/Orderrouter'), batch: require('./routes/batchProductRouter'), store: require('./routes/storeRouter'),
    whatsapp: require('./routes/whatsapp'), auth: require('./routes/Login')(auth, options.development),
  };
  for (const [name, router] of Object.entries(routers)) {
    // Express 4 does not catch rejected async handlers by itself.
    for (const layer of router.stack ?? []) for (const handler of layer.route?.stack ?? []) {
      if (handler.handle.constructor.name === 'AsyncFunction') handler.handle = wrap(handler.handle);
    }
    app.use(`/api/${name}`, router);
  }
  // Static delivery is limited to catalog images. No CSV, WhatsApp posters, private files or source mounts.
  for (const name of ['products', 'category', 'banner']) {
    app.use(`/public/${name}`, express.static(require('path').join(__dirname, 'public', name), { dotfiles: 'deny', index: false,
      setHeaders: res => res.set('Cross-Origin-Resource-Policy', 'cross-origin') }));
  }
  app.use((_req, _res, next) => next(fail(404, 'NOT_FOUND')));
  app.use((error, _req, res, _next) => {
    if (res.headersSent) return res.destroy();
    const proposedStatus = (typeof error.code === 'string' && error.code.startsWith('LIMIT_')) ? 413 : error.statusCode ?? error.status;
    const status = proposedStatus >= 400 && proposedStatus < 600 ? proposedStatus : 500;
    if (status === 429) res.set('Retry-After', '900');
    // Never serialize provider errors, database errors, request bodies or credentials.
    const code = ['INVALID_REQUEST', 'INSUFFICIENT_STOCK', 'PRODUCT_UNAVAILABLE', 'MINIMUM_ORDER',
      'IDEMPOTENCY_CONFLICT', 'COMMERCE_UNAVAILABLE', 'INVALID_TRANSITION'].includes(error.code) ? error.code : undefined;
    res.status(status).json({ ...(code ? { code } : {}), error: status === 401 ? 'Invalid credentials or session' : status === 403 ? 'Access denied'
      : status === 400 ? 'Invalid request' : status === 404 ? 'Not found' : status === 429 ? 'Too many requests' : 'Request failed' });
  });
  app.locals.getCommerceDb = options.getCommerceDb;
  app.locals.auth = auth;
  return app;
}
module.exports = { createLegacyApp };
