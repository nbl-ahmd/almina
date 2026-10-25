import 'server-only';
import { growthMetricsResponseSchema } from '@almina/contracts';
import { getWebEnvironment } from '../env';
import { requireIdentity, sessionHeader } from './gateway';

/** Reuse the authenticated aggregate reporting contract; never expose customer rows. */
export async function readDashboardReport(days: 7 | 30 | 90) {
  await requireIdentity(true);
  const env = getWebEnvironment();
  const response = await fetch(new URL(`/api/v1/admin/growth/metrics?days=${days}`, env.API_ORIGIN), {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { cookie: await sessionHeader(), origin: env.WEB_ORIGIN, 'x-csrf-protection': '1' },
  });
  if (!response.ok) throw new Error('Order reporting is unavailable.');
  const payload: unknown = await response.json();
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : null;
  return growthMetricsResponseSchema.parse(data);
}
