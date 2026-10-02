import { createServer } from 'node:http';
import { readApiEnvironment } from '@almina/config/env';
import { createLogger } from '@almina/config/logger';
import { createApp } from './app.js';
import { createDatabase } from './database.js';
import { HttpError } from './errors.js';

async function main() {
  const env = readApiEnvironment(process.env);
  const logger = createLogger({ service: 'api', environment: env.APP_ENV, level: env.LOG_LEVEL });
  const database = createDatabase(env.database);
  let stopping = false;
  const server = createServer(createApp({ database, logger, webOrigin: env.WEB_ORIGIN, development: env.APP_ENV === 'development',
    trustProxy: env.API_TRUST_PROXY, draining: () => stopping,
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
      void database.close().then(() => logger.log('info', 'api_stopped'))
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
