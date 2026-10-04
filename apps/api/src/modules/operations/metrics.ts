import type { Express } from 'express';
export type OperationGroup = 'catalog' | 'checkout' | 'other';
const bounds = [50, 100, 250, 500, 1000, 1500, 3000, 6000, 10000, Infinity];
type Sample = { count: number; failures: number; aborted: number; histogram: number[] };
const empty = (): Sample => ({ count: 0, failures: 0, aborted: 0, histogram: bounds.map(() => 0) });
export function operationGroup(method: string, path: string): OperationGroup {
  if (method === 'POST' && ['/api/orders', '/api/v1/checkout'].includes(path.replace(/\/$/, ''))) return 'checkout';
  if (method === 'GET' && (/^\/api\/v1\/catalog\//.test(path) || /^\/api\/products(?:\/(?:search|[^/]+|(?:details|category)\/[^/]+))?\/?$/.test(path))) return 'catalog';
  return 'other';
}
export function createOperationalMetrics(source: 'api' | 'retained-api', now: () => number = Date.now) {
  const startedAt = now();
  const buckets = new Map<number, { groups: Record<OperationGroup, Sample>; databaseErrors: number }>();
  function bucket() {
    const minute = Math.floor(now() / 60000);
    for (const key of buckets.keys()) if (key < minute - 29) buckets.delete(key);
    if (!buckets.has(minute)) buckets.set(minute, { groups: { catalog: empty(), checkout: empty(), other: empty() }, databaseErrors: 0 });
    return buckets.get(minute)!;
  }
  return {
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
      for (const [minute, value] of buckets) {
        if (minute <= end && minute > end - minutes) {
          databaseErrors += value.databaseErrors;
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
        clientJavaScriptErrors: null, clientJavaScriptCoverage: 'not-configured' as const };
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
