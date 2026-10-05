import type { Express } from 'express';
import { commerceEvents, type CommerceEvent } from '@almina/contracts/commerce-events';
export type OperationGroup = 'catalog' | 'checkout' | 'other';
const bounds = [50, 100, 250, 500, 1000, 1500, 3000, 6000, 10000, Infinity];
type Sample = { count: number; failures: number; aborted: number; histogram: number[] };
const empty = (): Sample => ({ count: 0, failures: 0, aborted: 0, histogram: bounds.map(() => 0) });
export function operationGroup(method: string, path: string): OperationGroup {
  if (method === 'POST' && ['/api/orders', '/api/v1/checkout'].includes(path.replace(/\/$/, ''))) return 'checkout';
  if (method === 'GET' && (/^\/api\/v1\/catalog\//.test(path) || /^\/api\/products(?:\/(?:search|[^/]+|(?:details|category)\/[^/]+))?\/?$/.test(path))) return 'catalog';
  return 'other';
}
const emptyEvents = () => Object.fromEntries(commerceEvents.map(event => [event, 0])) as Record<CommerceEvent, number>;
export function createOperationalMetrics(source: 'api' | 'retained-api', now: () => number = Date.now, telemetryEnabled = false) {
  const startedAt = now();
  const buckets = new Map<number, { groups: Record<OperationGroup, Sample>; databaseErrors: number; commerceEvents: Record<CommerceEvent, number> }>();
  function bucket() {
    const minute = Math.floor(now() / 60000);
    for (const key of buckets.keys()) if (key < minute - 29) buckets.delete(key);
    if (!buckets.has(minute)) buckets.set(minute, { groups: { catalog: empty(), checkout: empty(), other: empty() }, databaseErrors: 0, commerceEvents: emptyEvents() });
    return buckets.get(minute)!;
  }
  return {
    recordCommerceEvent(event: CommerceEvent) {
      if (!telemetryEnabled || !commerceEvents.includes(event)) return false;
      const events = bucket().commerceEvents;
      if (events[event] >= 10000) return false;
      events[event]++; return true;
    },
    record(group: OperationGroup, status: number, durationMs: number, aborted = false) {
      if (!['catalog', 'checkout', 'other'].includes(group) || !Number.isInteger(status) || status < 100 || status > 599 || !Number.isFinite(durationMs) || durationMs < 0) return;
      const value = bucket().groups[group]; value.count++;
      if (status >= 500) value.failures++;
      if (aborted) value.aborted++;
      value.histogram[bounds.findIndex(limit => durationMs <= limit)]!++;
    },
    databaseError() { bucket().databaseErrors++; },
    snapshot(minutes: 5 | 10 = 5) {
      const end = Math.floor(now() / 60000), groups = { catalog: empty(), checkout: empty(), other: empty() };
      let databaseErrors = 0;
      const events = emptyEvents();
      for (const [minute, value] of buckets) {
        if (minute <= end && minute > end - minutes) {
          databaseErrors += value.databaseErrors;
          for (const event of commerceEvents) events[event] += value.commerceEvents[event];
          for (const name of ['catalog', 'checkout', 'other'] as const) {
            groups[name].count += value.groups[name].count; groups[name].failures += value.groups[name].failures; groups[name].aborted += value.groups[name].aborted;
            value.groups[name].histogram.forEach((count, index) => { groups[name].histogram[index]! += count; });
          }
        }
      }
      const measured = Object.fromEntries(Object.entries(groups).map(([name, value]) => {
        let sum = 0;
        const index = value.histogram.findIndex(count => { sum += count; return value.count > 0 && sum >= Math.ceil(value.count * .95); });
        return [name, { count: value.count, failures: value.failures, aborted: value.aborted,
          failureRate: value.count ? value.failures / value.count : null,
          p95UpperBoundMs: index >= 0 && Number.isFinite(bounds[index]) ? bounds[index]! : null,
          p95Over10Seconds: index === bounds.length - 1 }];
      })) as Record<OperationGroup, { count: number; failures: number; aborted: number; failureRate: number | null; p95UpperBoundMs: number | null; p95Over10Seconds: boolean }>;
      return { source, scope: 'this-process-only' as const, startedAt: new Date(startedAt).toISOString(), measuredAt: new Date(now()).toISOString(),
        windowMinutes: minutes, warmupComplete: now() - startedAt >= minutes * 60000, groups: measured, databaseErrors,
        clientJavaScriptErrors: telemetryEnabled ? events.client_error : null,
        clientJavaScriptCoverage: telemetryEnabled ? 'consented-reports-only' as const : 'not-configured' as const,
        commerceEvents: telemetryEnabled ? events : null };
    },
  };
}
export type OperationalMetrics = ReturnType<typeof createOperationalMetrics>;
export function installOperationalMetrics(app: Express, metrics: OperationalMetrics) {
  app.use((req, res, next) => {
    const path = req.path.replace(/\/$/, '');
    if (path.startsWith('/health/') || ['/api/v1/status', '/api/operations', '/api/v1/admin/operations'].includes(path)) { next(); return; }
    const group = operationGroup(req.method, path), start = performance.now(); let finished = false;
    res.once('finish', () => { finished = true; metrics.record(group, res.statusCode, performance.now() - start); });
    res.once('close', () => { if (!finished) metrics.record(group, 499, performance.now() - start, true); });
    next();
  });
}
