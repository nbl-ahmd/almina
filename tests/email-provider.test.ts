import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer, createConnection, type Socket } from 'node:net';
import { createRequire } from 'node:module';
import { administrativeEmail, confirmationMessage, deliverEmail, type MailMessage, type SmtpOptions } from '../apps/api/src/modules/notifications/email';
const credentials = { user: 'synthetic@example.invalid', password: 'synthetic-not-a-secret' };
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const message = confirmationMessage({ orderId: 'OD5001', customer: { email: 'synthetic@example.invalid' }, html: 'ignored', recipient: 'ignored@example.invalid' }, credentials.user);
test('email uses persisted confirmation identity and bounded single-recipient administrative content', () => {
  assert.equal(message.to, credentials.user); assert.equal(message.messageId, '<almina-order-OD5001@alminapharmacy.com>');
  assert.equal(message.html, undefined); assert.ok(!message.text!.includes('ignored'));
  assert.throws(() => confirmationMessage({ orderId: 'OD5001\r\n', customer: { email: credentials.user } }));
  for (const recipient of ['a@example.invalid,b@example.invalid', 'a@example.invalid\r\nBcc: b@example.invalid', 'Name <a@example.invalid>'])
    assert.throws(() => administrativeEmail({ recipient, htmlContent: '<p>Reviewed</p>' }));
  assert.throws(() => administrativeEmail({ recipient: credentials.user, htmlContent: 'x'.repeat(65537) }));
  assert.throws(() => administrativeEmail({ recipient: credentials.user, htmlContent: '🔒'.repeat(20000) }));
  assert.throws(() => administrativeEmail({ recipient: credentials.user, htmlContent: 'Reviewed', attachments: [{ path: '/private' }] }));
  assert.equal(administrativeEmail({ recipient: credentials.user, htmlContent: '<p>Reviewed</p>' }).html, '<p>Reviewed</p>');
});
test('SMTP provider accepts once, enforces TLS and restricted access, closes and never retries in the adapter', async () => {
  let calls = 0, closed = 0; let configured: SmtpOptions | undefined; let delivered: MailMessage | undefined;
  await deliverEmail(message, credentials, options => { configured = options; return {
    sendMail: async value => { calls++; delivered = value; return { accepted: [credentials.user], rejected: [] }; }, close: () => { closed++; },
  }; });
  assert.equal(calls, 1); assert.equal(closed, 1); assert.deepEqual(delivered, message);
  assert.equal(configured!.host, 'smtp.office365.com'); assert.equal(configured!.port, 587); assert.equal(configured!.requireTLS, true);
  assert.equal(configured!.tls.rejectUnauthorized, true); assert.equal(configured!.tls.minVersion, 'TLSv1.2');
  assert.equal(configured!.disableFileAccess, true); assert.equal(configured!.disableUrlAccess, true);
  assert.equal(configured!.dnsTimeout, 5000); assert.equal(configured!.logger, false); assert.equal(configured!.debug, false);
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(deliverEmail(message, credentials, () => { throw new Error('Must not construct'); }, cancelled.signal), { code: 'SERVICE_UNAVAILABLE' });
  await assert.rejects(deliverEmail(message, {}, () => { throw new Error('Must not construct'); }), { code: 'SERVICE_UNAVAILABLE' });
});
test('SMTP rejects malformed/rejected acceptance, sanitizes failures and bounds stalled sends/cancellation without blind retry', async () => {
  for (const result of [{ accepted: [], rejected: [] }, { accepted: ['other@example.invalid'], rejected: [] },
    { accepted: [credentials.user], rejected: ['other@example.invalid'] }, undefined]) {
    let calls = 0, closed = 0;
    await assert.rejects(deliverEmail(message, credentials, () => ({ sendMail: async () => { calls++; return result; }, close: () => { closed++; } })), { code: 'SERVICE_UNAVAILABLE' });
    assert.equal(calls, 1); assert.equal(closed, 1);
  }
  for (const abort of [false, true]) {
    let calls = 0, closed = 0, lateReject!: (error: Error) => void;
    const cancellation = new AbortController();
    const pending = deliverEmail(message, credentials, () => ({ sendMail: () => { calls++; return new Promise((_resolve, reject) => { lateReject = reject; }); },
      close: () => { closed++; } }), cancellation.signal, abort ? 1000 : 10);
    if (abort) setImmediate(() => cancellation.abort());
    await assert.rejects(pending, { code: 'SERVICE_UNAVAILABLE' });
    assert.equal(calls, 1); assert.equal(closed, 1); lateReject(new Error('Synthetic provider diagnostic'));
  }
  await assert.rejects(deliverEmail(message, credentials, () => ({ sendMail: async () => { throw new Error('Synthetic private content'); }, close: () => { throw new Error('Synthetic cleanup content'); } })), error => error instanceof Error && error.message === 'SERVICE_UNAVAILABLE');
});
test('real Nodemailer stalled greeting is cancelled by closing its owned loopback socket', async () => {
  const sockets = new Set<Socket>();
  const server = createServer(socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = server.address(); assert.ok(endpoint && typeof endpoint !== 'string');
  const { createSmtpTransport } = require('./integrations/smtp.cjs');
  let opened: Socket | undefined;
  try {
    await assert.rejects(deliverEmail(message, credentials, options => createSmtpTransport(options, require('nodemailer'), (target: { host: string; port: number }) => {
      assert.equal(target.host, 'smtp.office365.com'); assert.equal(target.port, 587);
      opened = createConnection({ host: '127.0.0.1', port: endpoint.port }); return opened;
    }), undefined, 100), { code: 'SERVICE_UNAVAILABLE' });
    assert.ok(opened?.destroyed);
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
