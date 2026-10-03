const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
const mongoose = require('mongoose');
const { createLegacyApp } = require('./app');
const { secureRealtime } = require('./security/realtime.cjs');
const { isIP } = require('node:net');
const development = process.env.APP_ENV === 'development';
const origins = String(process.env.AUTH_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
if (!origins.length || origins.some(origin => {
  try { const url = new URL(origin); return url.origin !== origin || (url.protocol !== 'https:' && !(development && ['localhost', '127.0.0.1'].includes(url.hostname))); }
  catch { return true; }
})) throw new Error('Configure exact AUTH_ALLOWED_ORIGINS; HTTPS is required outside development');
const trustProxy = String(process.env.AUTH_TRUST_PROXY ?? '').split(',').filter(Boolean);
if (trustProxy.length > 10 || trustProxy.some(ip => !isIP(ip))) throw new Error('AUTH_TRUST_PROXY must contain explicit proxy IP addresses');
if (!process.env.MONGODB_URI) throw new Error('Configure injected MONGODB_URI');
const app = createLegacyApp({ origins, development, trustProxy: trustProxy.length ? trustProxy : false, webhookSecret: process.env.WHATSAPP_APP_SECRET });
const server = require('http').createServer(app);
const io = require('socket.io')(server, { cors: { origin: origins, credentials: true, methods: ['GET', 'POST'] },
  allowRequest: (req, callback) => callback(null, origins.includes(req.headers.origin)) });
app.locals.io = secureRealtime(io, app.locals.auth, origins, development);
mongoose.connect(process.env.MONGODB_URI).then(() => {
  require('./commerce/outbox.cjs').startOrderOutbox(async () => mongoose.connection.db);
  server.listen(process.env.PORT || 4000, () => console.log('Legacy API listening'));
}).catch(() => { console.error('Database connection failed'); process.exitCode = 1; });
server.requestTimeout = 15000;
server.headersTimeout = 10000;
