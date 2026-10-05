import { commerceEventRequest } from '../../../lib/telemetry/gateway';
import { getWebEnvironment } from '../../../lib/server/env';
export function POST(request: Request) {
  const env = getWebEnvironment();
  return commerceEventRequest(request, { enabled: env.COMMERCE_TELEMETRY_ENABLED, webOrigin: env.WEB_ORIGIN, apiOrigin: env.API_ORIGIN });
}
