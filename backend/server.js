const path = require('path');
const { loadRetainedEnvironment, retainedRuntimeConfiguration } = require('./commerce/dist/service.cjs');
let runtime;
try {
  loadRetainedEnvironment(process.env.ALMINA_RUNTIME_ENV_FILE || path.join(__dirname, '.env.local'));
  runtime = retainedRuntimeConfiguration(process.env);
} catch { console.error('Retained runtime configuration invalid'); process.exit(1); }
const domain = require('./commerce/dist/service.cjs');
const database = domain.createPersistentDatabase(runtime);
const { createLegacyApp } = require('./app');
const { secureRealtime } = require('./security/realtime.cjs');
const { development, origins, trustProxy } = runtime;
const app = createLegacyApp({ getCommerceDb: () => database.getDb(), origins, development, trustProxy: trustProxy.length ? trustProxy : false, webhookSecret: process.env.WHATSAPP_APP_SECRET, commerceTelemetryEnabled: runtime.commerceTelemetryEnabled });
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: origins, credentials: true, methods: ['GET', 'POST'] },
  allowRequest: (req, callback) => callback(null, origins.includes(req.headers.origin)) });
app.locals.io = secureRealtime(io, app.locals.auth, origins, development);
let worker, pushWorker, reminderWorker;
let shutdown;
database.connect().then(async () => {
  if (app.locals.draining) return database.close();
  if (!await domain.retainedReadiness(() => database.getDb(), false)) throw new Error('Database unavailable');
  if (app.locals.draining) return database.close();
  pushWorker = await require('./integrations/push.cjs').startStaffPush(async () => database.getDb());
  if (app.locals.draining) { await pushWorker?.stop(); return database.close(); }
  worker = require('./commerce/outbox.cjs').startOrderOutbox(async () => database.getDb());
  const reminderOrigin = process.env.GROWTH_WEB_ORIGIN || origins[0];
  if (process.env.GROWTH_EMAIL_ENABLED === 'true' && origins.includes(reminderOrigin)) reminderWorker = domain.retentionWorker(async () => database.getDb(), {origin: reminderOrigin, onFailure: () => console.error('Requested reminder processing failed')});
  server.listen(runtime.port, development ? '127.0.0.1' : undefined, () => console.log('Express API listening'));
}).catch(async () => {
  if (!app.locals.draining) { console.error('API initialization failed'); process.exitCode = 1; }
  await pushWorker?.stop(); await database.close();
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.keepAliveTimeout = 5000;
server.maxHeadersCount = 50;
server.setTimeout(15000, socket => socket.destroy());

function stop() {
  if (shutdown) return shutdown;
  shutdown = require('./commerce/dist/service.cjs').drainRetainedService({
    markDraining: () => { app.locals.draining = true; },
    closeHttp: () => new Promise(resolve => {
      io.disconnectSockets(true);
      io.close(() => resolve());
      server.closeIdleConnections();
    }),
    stopWorkers: async () => { await Promise.all([worker?.stop(), pushWorker?.stop(), reminderWorker?.stop()]); },
    closeDatabase: async () => { await database.close(); },
    forceConnections: () => { io.disconnectSockets(true); server.closeAllConnections(); },
  }).catch(() => { console.error('Retained shutdown deadline failed'); process.exit(1); });
  return shutdown;
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
