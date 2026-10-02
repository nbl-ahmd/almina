import 'server-only';
import { createApiClient } from '@almina/contracts/client';
import { getWebEnvironment } from './env';

export function getApiClient() {
  return createApiClient({ origin: getWebEnvironment().API_ORIGIN });
}
