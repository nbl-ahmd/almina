const path = require('path');
const { loadRetainedEnvironment, retainedRuntimeConfiguration } = require('./commerce/dist/service.cjs');
let runtime;
try {
  loadRetainedEnvironment(process.env.ALMINA_RUNTIME_ENV_FILE || path.join(__dirname, '.env.local'));
  runtime = retainedRuntimeConfiguration(process.env);
} catch { console.error('Retained runtime configuration invalid'); process.exit(1); }
const domain = require('./commerce/dist/service.cjs');
// The API process makes every order and notification write, so the driver's own command events wake the workers instantly.
const localWrites = domain.createLocalWriteSignal();
const database = domain.createPersistentDatabase(runtime, undefined, { localWrites });
const { createLegacyApp } = require('./app');
const { secureRealtime } = require('./security/realtime.cjs');
const { development, origins, trustProxy } = runtime;
const app = createLegacyApp({ getCommerceDb: () => database.getDb(), origins, development, trustProxy: trustProxy.length ? trustProxy : false, webhookSecret: process.env.WHATSAPP_APP_SECRET, commerceTelemetryEnabled: runtime.commerceTelemetryEnabled });
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: origins, credentials: true, methods: ['GET', 'POST'] },
  allowRequest: (req, callback) => callback(null, origins.includes(req.headers.origin)) });
app.locals.localWrites = localWrites;
app.locals.io = secureRealtime(io, app.locals.auth, origins, development);
let stripeWorker, worker, staffEmailWorker, pushWorker, reminderWorker, campaignWorker, imageReviewWorker, searchWorker, merchantWorker, alertWorker, wake;
let shutdown;
database.connect().then(async () => {
  if (app.locals.draining) return database.close();
  if (!await domain.retainedReadiness(() => database.getDb(), false)) throw new Error('Database unavailable');
  if (app.locals.draining) return database.close();
  await domain.prepareStaffAlertStorage(database.getDb());
  // One change stream wakes the order workers, so they do not poll an idle database every second or five seconds.
  wake = domain.createOutboxWake(() => database.getDb(), { log: message => console.warn(message), local: localWrites });
  alertWorker=domain.staffAlertWorker(()=>database.getDb(),()=>console.error(JSON.stringify({level:'error',service:'api',event:'staff_alert_failed'})),{ wake, local: localWrites });
  pushWorker = await require('./integrations/push.cjs').startStaffPush(async () => database.getDb(), process.env, { wake });
  if (app.locals.draining) { await alertWorker?.stop(); await pushWorker?.stop(); await wake?.shutdown(); return database.close(); }
  if (process.env.EMAIL_PROVIDER === 'resend') await domain.prepareEmailStorage(database.getDb());
  worker = require('./commerce/outbox.cjs').startOrderOutbox(async () => database.getDb(), { wake });
  // Safety net: the shop inbox hears about every new order even if push, WhatsApp or the console are down.
  if (domain.staffEmailConfigured()) staffEmailWorker = await domain.staffOrderEmailOutbox(async () => database.getDb(), { wake, adminOrigin: process.env.ADMIN_ORIGIN || process.env.GROWTH_WEB_ORIGIN,
    smtpFactory: options => require('./integrations/smtp.cjs').createSmtpTransport(options), onFailure: () => console.error(JSON.stringify({ level: 'error', service: 'api', event: 'staff_order_email_failed' })) });
  else console.warn(JSON.stringify({ level: 'warn', service: 'api', event: 'staff_order_email_disabled' }));
  const reminderOrigin = process.env.GROWTH_WEB_ORIGIN || origins[0];
  if (process.env.GROWTH_EMAIL_ENABLED === 'true' && origins.includes(reminderOrigin)) reminderWorker = domain.retentionWorker(async () => database.getDb(), {local: localWrites, origin: reminderOrigin, onFailure: () => console.error('Requested reminder processing failed')});
  if (process.env.MARKETING_EMAIL_ENABLED === 'true') campaignWorker = domain.marketingWorker(async () => database.getDb(), { local: localWrites });
  if (app.locals.imageReviewEnabled && app.locals.imageReviewHostedPublication) imageReviewWorker = domain.imagePublicationWorker(() => database.getDb(), { local: localWrites, cloudName: app.locals.cloudinaryUploads?.cloudName ?? app.locals.recoveryCloudName, enabled: () => app.locals.imageReviewEnabled && !app.locals.draining });
  await domain.prepareStripeStorage(database.getDb(), app.locals.stripePayments.enabled);
  stripeWorker = domain.stripeReconciler(app.locals.stripePayments, () => console.error('Stripe test reconciliation failed'), { local: localWrites });
  searchWorker = domain.searchEmbeddingWorker(() => database.getDb(), process.env, { local: localWrites });
  merchantWorker = domain.merchantSyncWorker(() => database.getDb(), process.env, { local: localWrites });
  server.listen(runtime.port, development ? '127.0.0.1' : undefined, () => console.log('Express API listening'));
}).catch(async () => {
  if (!app.locals.draining) { console.error('API initialization failed'); process.exitCode = 1; }
  await alertWorker?.stop(); await merchantWorker?.stop(); await stripeWorker?.stop(); await searchWorker?.stop(); await imageReviewWorker?.stop(); await pushWorker?.stop(); await wake?.shutdown(); await database.close();
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 50;
server.setTimeout(domain.SERVER_SOCKET_TIMEOUT_MS, socket => socket.destroy());

function stop() {
  if (shutdown) return shutdown;
  shutdown = require('./commerce/dist/service.cjs').drainRetainedService({
    markDraining: () => { app.locals.draining = true; },
    closeHttp: () => new Promise(resolve => {
      io.disconnectSockets(true);
      io.close(() => resolve());
      server.closeIdleConnections();
    }),
    stopWorkers: async () => { await Promise.all([staffEmailWorker?.stop(), alertWorker?.stop(),merchantWorker?.stop(), stripeWorker?.stop(), worker?.stop(), pushWorker?.stop(), wake?.shutdown(), reminderWorker?.stop(), campaignWorker?.stop(), imageReviewWorker?.stop(), searchWorker?.stop()]); },
    closeDatabase: async () => { await database.close(); },
    forceConnections: () => { io.disconnectSockets(true); server.closeAllConnections(); },
  }).catch(() => { console.error('Retained shutdown deadline failed'); process.exit(1); });
  return shutdown;
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
