import 'server-only';
import { createLogger } from '@almina/config/logger';
import { getWebEnvironment } from './env';

export function getWebLogger() {
  const env = getWebEnvironment();
  return createLogger({ service: 'web', environment: env.APP_ENV, level: env.LOG_LEVEL });
}
