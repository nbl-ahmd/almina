import { createServer } from 'node:http';
import { readApiEnvironment } from '@almina/config/env';
import { createLogger } from '@almina/config/logger';
import { createApp } from './app.js';
import { createDatabase } from './database.js';

async function main() {
  const env = readApiEnvironment(process.env);
  const logger = createLogger({ service: 'api', environment: env.APP_ENV, level: env.LOG_LEVEL });
  const database = createDatabase(env.database);
  const server = createServer(createApp({ database, logger }));
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.on('error', () => {
    logger.log('error', 'request_failed');
    void database.close().finally(() => { process.exitCode = 1; });
  });
  server.listen(env.PORT, env.API_HOST, () => logger.log('info', 'api_started'));

  let stopping = false;
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
