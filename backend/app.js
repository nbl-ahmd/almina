const express = require('express');
const { createSessionService } = require('./security/sessions.cjs');
const { installBoundary, verifyWebhook, wrap, fail } = require('./security/boundary.cjs');
function createLegacyApp(options) {
  const app = express();
  const domain = require('./commerce/dist/service.cjs');
  const { createOperationalMetrics, installOperationalMetrics } = domain;
  const getDb = async () => {
    const db = await options.getCommerceDb?.();
    if (!db) throw new domain.HttpError(503, 'SERVICE_UNAVAILABLE');
    return db;
  };
  app.locals.operationsMetrics = createOperationalMetrics('retained-api', Date.now, options.commerceTelemetryEnabled === true);
  installOperationalMetrics(app, app.locals.operationsMetrics);
  const auth = options.auth ?? createSessionService(getDb);
  app.locals.draining = false;
  app.locals.driveMedia = options.driveMedia;
  app.locals.whatsappSender = options.whatsappSender;
  const healthHeaders = require('./security/boundary.cjs').securityHeaders(options.development);
  // External uptime ping: no authentication, database or provider work.
  app.get('/api/ping', healthHeaders, (_req, res) => res.set('Cache-Control', 'no-store').type('text/plain').send('pong'));
  app.get('/health/live', healthHeaders, (_req, res) => res.set('Cache-Control', 'no-store').json({ status: 'live' }));
  app.get('/health/ready', healthHeaders, wrap(async (_req, res) => {
    const ready = await require('./commerce/dist/service.cjs').retainedReadiness(
      getDb, app.locals.draining);
    const sha = process.env.RENDER_GIT_COMMIT;
    res.status(ready ? 200 : 503).set('Cache-Control', 'no-store').json({ status: ready ? 'ready' : 'unavailable',
      commitSha: /^[a-f0-9]{40}$/.test(sha ?? '') ? sha : null });
  }));
  // Additive API ownership: one persistent listener, pool, outbox lifecycle and metrics window.
  const versioned = domain.createVersionedApp({ getDb,
    database: { mode: 'enabled', checkReadiness: () => domain.retainedReadiness(getDb, app.locals.draining) },
    logger: options.logger ?? domain.createLogger({ service: 'api', environment: options.development ? 'development' : 'production', level: 'warn' }),
    webOrigins: options.origins, development: options.development, trustProxy: Array.isArray(options.trustProxy) ? options.trustProxy : [],
    draining: () => app.locals.draining, metrics: app.locals.operationsMetrics, observeRequests: false, commerceTelemetryEnabled: options.commerceTelemetryEnabled === true,
    onOrderCreated: order => app.locals.io?.emit('newOrder', { _id: order.id, orderId: order.orderId }),
    location: options.location,
    ...(options.stripePayments ? {stripePayments: options.stripePayments} : {}),
  });
  app.locals.stripePayments = versioned.locals.stripePayments;
  app.use('/api/v1', (req, res, next) => { req.url = '/api/v1' + req.url; versioned(req, res, next); });
  app.use((_req, res, next) => app.locals.draining ? res.status(503).set('Retry-After', '30').json({ error: 'Service draining' }) : next());
  installBoundary(app, { ...options, auth });
  app.use('/api/recovery', express.json({ limit: '4mb', inflate: false }));
  app.use('/api/catalog-import', express.json({ limit: '4mb', inflate: false }));
  app.get('/api/catalog-export/state', wrap(async(_req,res)=>res.json(await domain.catalogExportState(await getDb()))));
  app.get('/api/catalog-export/products', wrap(async(req,res)=>res.json(await domain.catalogExportPage(await getDb(),req.query))));
  app.use(express.json({ limit: '128kb', inflate: false, verify(req, _res, buffer) {
    if (/^\/api\/whatsapp\/webhook\/?$/i.test(req.originalUrl.split('?')[0])) req.rawBody = Buffer.from(buffer);
  } }));
  app.post('/api/whatsapp/webhook', wrap(async (req, res, next) => {
    verifyWebhook(req, options.webhookSecret);
    const db = await (options.getWebhookDb ? options.getWebhookDb() : getDb());
    req.whatsappReceiptId = await require('./commerce/dist/service.cjs').receiveWhatsappEvent(db, req.body);
    if (!req.whatsappReceiptId) return res.sendStatus(200);
    next();
  }));
  const routers = options.routers ?? {
    'image-review': require('./routes/imageReview'),
    'catalog-import': require('./routes/catalogImport'),
    operations: require('./routes/operations'),
    media: require('./routes/media'), recovery: require('./routes/recovery'), category: require('./routes/categories'), banners: require('./routes/banners'), products: require('./routes/products'),
    orders: require('./routes/Orderrouter'), batch: require('./routes/batchProductRouter'), store: require('./routes/storeRouter'),
    whatsapp: require('./routes/whatsapp'), auth: require('./routes/Login')(auth, options.development, getDb),
  };
  for (const [name, router] of Object.entries(routers)) {
    app.use(`/api/${name}`, router);
  }
  // Static delivery is limited to catalog images. No CSV, WhatsApp posters, private files or source mounts.
  for (const name of ['products', 'category', 'banner']) {
    app.use(`/public/${name}`, express.static(require('path').join(__dirname, 'public', name), { dotfiles: 'deny', index: false,
      setHeaders: res => res.set('Cross-Origin-Resource-Policy', 'cross-origin') }));
  }
  app.use((_req, _res, next) => next(fail(404, 'NOT_FOUND')));
  app.use((error, _req, res, _next) => {
    if (typeof error?.name === 'string' && error.name.startsWith('Mongo')) app.locals.operationsMetrics.databaseError();
    if (res.headersSent) return res.destroy();
    const proposedStatus = (typeof error.code === 'string' && error.code.startsWith('LIMIT_')) ? 413 : error.statusCode ?? error.status;
    const status = proposedStatus >= 400 && proposedStatus < 600 ? proposedStatus : 500;
    if (status === 429) res.set('Retry-After', '900');
    // Never serialize provider errors, database errors, request bodies or credentials.
    const code = ['BRANCH_LOGIN_CONFLICT','BRANCH_STOCK_CONFLICT','DELIVERY_SETUP_REQUIRED','DELIVERY_LOCATION_REQUIRED','CATALOG_REVIEW_REQUIRED', 'PRODUCT_FAMILY_CONFLICT', 'INVALID_REQUEST', 'INSUFFICIENT_STOCK', 'PRODUCT_UNAVAILABLE', 'MINIMUM_ORDER',
      'ADDRESS_NOT_SERVICEABLE', 'PRICE_CHANGED', 'STOCK_CHANGED', 'RECOVERY_IMPORT_REQUIRED', 'IDEMPOTENCY_CONFLICT', 'COMMERCE_UNAVAILABLE', 'INVALID_TRANSITION', 'DELIVERY_UNCERTAIN'].includes(error.code) ? error.code : undefined;
    res.status(status).json({ ...(code ? { code } : {}), error: status === 401 ? 'Invalid credentials or session' : status === 403 ? 'Access denied'
      : status === 400 ? 'Invalid request' : status === 404 ? 'Not found' : status === 429 ? 'Too many requests' : 'Request failed' });
  });
  app.locals.cloudinaryUploads = options.cloudinaryUploads ?? (process.env.CLOUDINARY_UPLOAD_ENABLED === 'true' ? {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY, apiSecret: process.env.CLOUDINARY_API_SECRET,
  } : undefined);
  app.locals.mediaTransport = options.mediaTransport;
  app.locals.imageReviewEnabled = options.imageReviewEnabled ?? process.env.IMAGE_REVIEW_ENABLED === 'true';
  app.locals.imageReviewHostedPublication = options.imageReviewHostedPublication ?? process.env.IMAGE_REVIEW_HOSTED_PUBLICATION === 'true';
  app.locals.recoveryAllowed = options.recoveryAllowed ?? process.env.RECOVERY_CATALOG_ALLOWED === 'true';
  app.locals.recoveryCloudName = options.recoveryCloudName ?? process.env.CLOUDINARY_CLOUD_NAME;
  app.locals.getCommerceDb = getDb;
  app.locals.getWebhookDb = options.getWebhookDb;
  app.locals.auth = auth;
  return app;
}
module.exports = { createLegacyApp };
