import { prepareEmailStorage } from './modules/notifications/storage.js';
import { orderOutbox } from './modules/notifications/outbox.js';
import { sendOrderEmail } from './modules/notifications/email.js';
import { createServer } from 'node:http';
import { readApiEnvironment } from '@almina/config/env';
import { createLogger } from '@almina/config/logger';
import { createApp } from './app.js';
import { createDatabase } from './database.js';
import { HttpError } from './errors.js';
import { retentionWorker } from './modules/growth/retention.js';

async function main() {
  const env = readApiEnvironment(process.env);
  const logger = createLogger({ service: 'api', environment: env.APP_ENV, level: env.LOG_LEVEL });
  const database = createDatabase(env.database);
  if (process.env.EMAIL_PROVIDER === 'resend') await prepareEmailStorage(await database.getDb());
  const orderEmails = process.env.EMAIL_PROVIDER === 'resend' ? orderOutbox(() => database.getDb(), {
    send: async (order, signal) => sendOrderEmail(await database.getDb(), order, signal),
    onFailure: () => logger.log('error', 'request_failed'),
  }) : undefined;
  let stopping = false;
  const allowedOrigins = typeof env.WEB_ORIGIN === 'string' ? [env.WEB_ORIGIN] : env.WEB_ORIGIN;
  const reminderOrigin = process.env.GROWTH_WEB_ORIGIN || allowedOrigins[0];
  const reminders = process.env.GROWTH_EMAIL_ENABLED === 'true' && reminderOrigin && allowedOrigins.includes(reminderOrigin)
    ? retentionWorker(async () => database.getDb(), { origin: reminderOrigin, onFailure: () => logger.log('error', 'reminder_failed') }) : undefined;
  const server = createServer(createApp({ database, logger, webOrigin: env.WEB_ORIGIN, development: env.APP_ENV === 'development',
    trustProxy: env.API_TRUST_PROXY, draining: () => stopping, commerceTelemetryEnabled: env.COMMERCE_TELEMETRY_ENABLED,
    getDb: async () => {
      try { return await database.getDb(); }
      catch { throw new HttpError(503, 'SERVICE_UNAVAILABLE'); }
    },
  }));
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 50;
  server.setTimeout(15000, socket => socket.destroy());
  server.on('error', () => {
    logger.log('error', 'request_failed');
    void database.close().catch(() => logger.log('error', 'shutdown_failed')).finally(() => { process.exitCode = 1; });
  });
  server.listen(env.PORT, env.API_HOST, () => logger.log('info', 'api_started'));

  const stop = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000);
    deadline.unref();
    server.close(() => {
      void (async () => { await reminders?.stop(); await orderEmails?.stop(); await database.close(); })().then(() => logger.log('info', 'api_stopped'))
        .catch(() => { logger.log('error', 'shutdown_failed'); process.exitCode = 1; })
        .finally(() => clearTimeout(deadline));
    });
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

void main().catch(() => {
  // Never print config errors, URI, native driver errors or credential-bearing stacks.
  process.stderr.write('{"level":"error","service":"api","event":"configuration_invalid"}\n');
  process.exitCode = 1;
});
