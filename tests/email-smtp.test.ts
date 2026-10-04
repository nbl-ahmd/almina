import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer, createConnection, type Socket } from 'node:net';
import { createRequire } from 'node:module';
import { confirmationMessage, deliverEmail } from '../apps/api/src/modules/notifications/email';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { createSmtpTransport } = require('./integrations/smtp.cjs');
const mailer = require('nodemailer');
const credentials = { user: 'synthetic@example.invalid', password: 'synthetic-not-a-secret' };
const message = confirmationMessage({ orderId: 'OD5001', customer: { email: credentials.user } }, credentials.user);
test('real Nodemailer stalled greeting is cancelled by closing its owned loopback socket', async () => {
  const sockets = new Set<Socket>();
  const server = createServer(socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = server.address(); assert.ok(endpoint && typeof endpoint !== 'string');
  let opened: Socket | undefined;
  try {
    await assert.rejects(deliverEmail(message, credentials, options => createSmtpTransport(options, mailer, (target: { host: string; port: number }) => {
      assert.equal(target.host, 'smtp.office365.com'); assert.equal(target.port, 587);
      opened = createConnection({ host: '127.0.0.1', port: endpoint.port }); return opened;
    }), undefined, 100), { code: 'SERVICE_UNAVAILABLE' });
    assert.ok(opened?.destroyed);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
