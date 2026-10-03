// Isolated synthetic login UI fixture: never imports startup, environment secrets, MongoClient or providers.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { hash } from 'bcryptjs';
import { securityDb, id } from '../../tests/helpers/security-fixture.ts';
const require = createRequire(import.meta.url);
const express = require('../../backend/node_modules/express');
const { createLegacyApp } = require('../../backend/app');
const { createSessionService } = require('../../backend/security/sessions.cjs');
const { secureRealtime } = require('../../backend/security/realtime.cjs');
const origin = 'http://127.0.0.1:4500';
const fixture = securityDb({ users: [{ _id: id, username: 'synthetic-admin', name: 'Synthetic Admin', role: 'admin', cities: [], password: await hash('synthetic-browser-password', 4) }] });
const auth = createSessionService(async () => fixture.db);
const routers = { auth: require('../../backend/routes/Login')(auth, true, () => fixture.db) };
for (const resource of ['products', 'category', 'banners', 'orders', 'whatsapp', 'store', 'batch']) {
  const router = express.Router();
  router.get('/status', (_req, res) => res.json({ status: 'open' }));
  router.get('*', (_req, res) => res.json([]));
  router.post('*', (_req, res) => res.status(204).end());
  routers[resource] = router;
}
const app = createLegacyApp({ origins: [origin], development: true, auth, routers });
// Mount synthetic static UI before the app's terminal 404/error handlers.
const terminal = app._router.stack.splice(-2);
const html = readFileSync('frontend/build/index.html', 'utf8');
const metaCsp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/i)?.[1];
if (!metaCsp || !html.includes('script-src &#x27;self&#x27;') && !html.includes("script-src 'self'")) throw new Error('Build the hardened legacy frontend first');
app.use((_req, res, next) => {
  res.set('Content-Security-Policy', metaCsp.replaceAll('&#x27;', "'").replaceAll('&apos;', "'") + "; frame-ancestors 'none'"); next();
});
app.get('/__fixture/health', (_req, res) => res.send('almina-synthetic-auth'));
app.use(express.static(path.resolve('frontend/build')));
app.get('*', (_req, res) => res.sendFile(path.resolve('frontend/build/index.html')));
app._router.stack.push(...terminal);
const server = createServer(app);
const io = require('../../backend/node_modules/socket.io')(server, { cors: { origin, credentials: true } });
secureRealtime(io, auth, [origin], true);
server.listen(4500, '127.0.0.1', () => console.log('Synthetic authentication fixture listening on loopback port 4500'));
