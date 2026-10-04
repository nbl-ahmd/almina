const path = require('path');
const { loadRetainedEnvironment, retainedRuntimeConfiguration } = require('./commerce/dist/service.cjs');
let runtime;
try {
  loadRetainedEnvironment(path.join(__dirname, '.env.local'));
  runtime = retainedRuntimeConfiguration(process.env);
} catch { console.error('Retained runtime configuration invalid'); process.exit(1); }
const mongoose = require('mongoose');
const { createLegacyApp } = require('./app');
const { secureRealtime } = require('./security/realtime.cjs');
const { development, origins, trustProxy } = runtime;
const app = createLegacyApp({ origins, development, trustProxy: trustProxy.length ? trustProxy : false, webhookSecret: process.env.WHATSAPP_APP_SECRET });
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: origins, credentials: true, methods: ['GET', 'POST'] },
  allowRequest: (req, callback) => callback(null, origins.includes(req.headers.origin)) });
app.locals.io = secureRealtime(io, app.locals.auth, origins, development);
let worker, pushWorker;
let shutdown;
mongoose.connect(runtime.mongoUri, runtime.mongoOptions).then(async () => {
  if (app.locals.draining) return mongoose.disconnect();
  pushWorker = await require('./integrations/push.cjs').startStaffPush(async () => mongoose.connection.db);
  if (app.locals.draining) { await pushWorker?.stop(); return mongoose.disconnect(); }
  worker = require('./commerce/outbox.cjs').startOrderOutbox(async () => mongoose.connection.db);
  server.listen(runtime.port, () => console.log('Express API listening'));
}).catch(async () => { console.error('API initialization failed'); await pushWorker?.stop(); await mongoose.disconnect(); process.exitCode = 1; });
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
    stopWorkers: async () => { await Promise.all([worker?.stop(), pushWorker?.stop()]); },
    closeDatabase: async () => { await mongoose.disconnect(); },
    forceConnections: () => { io.disconnectSockets(true); server.closeAllConnections(); },
  }).catch(() => { console.error('Retained shutdown deadline failed'); process.exit(1); });
  return shutdown;
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
