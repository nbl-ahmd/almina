import type { z } from 'zod';
import type { operationsSnapshotSchema } from '@almina/contracts';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Table } from './views';
import { Badge, Card, Note, StatGrid, StatTile } from './ui';

export function OperationsView({ snapshot }: { snapshot: z.infer<typeof operationsSnapshotSchema> }) {
  const database = snapshot.database;
  const groups = Object.entries(snapshot.http.groups);
  const requests = groups.reduce((total, [, value]) => total + value.count, 0);
  const failures = groups.reduce((total, [, value]) => total + value.failures, 0);
  const queue = database.outbox.reduce((total, value) => total + value.count, 0);
  return (
    <>
      <p className="admin-hint admin-hint--tight">
        Measured at {snapshot.http.measuredAt}. This view covers one {snapshot.http.source} process. Refresh to read current signals; collect every deployed API instance before making a release decision.
      </p>
      <StatGrid>
        <StatTile label="Requests sampled" countTo={requests} meta={`${snapshot.http.windowMinutes}-minute window`} />
        <StatTile label="Server failures" countTo={failures} meta="5xx within the window" tone={failures > 0 ? 'warning' : 'brand'} />
        <StatTile label="Alerts" countTo={snapshot.alerts.length} meta="Thresholds to investigate" tone={snapshot.alerts.length ? 'warning' : 'brand'} />
        <StatTile label="Notification queue" countTo={queue} meta="Pending, processing and failed jobs" />
      </StatGrid>
      <Card title="Alerts to investigate">
        {snapshot.alerts.length ? (
          <Note tone="warning" icon={<ExclamationTriangleIcon />}>
            <ul className="admin-list-disc">
              {snapshot.alerts.map(alert => <li key={alert}>{alert.replaceAll('_', ' ')}</li>)}
            </ul>
          </Note>
        ) : (
          <p>No thresholds triggered in this sample. {snapshot.http.warmupComplete ? 'Five-minute sampling is available.' : 'Five-minute sampling is still warming up.'}</p>
        )}
        <p className="admin-hint">
          Pause commerce writers for confirmed duplicate orders, invalid stock or missing committed records. Preserve receipts and reconcile before rollback.
        </p>
      </Card>
      <Card title="API requests" description="Five-minute buckets per fixed operation group." flush>
        <Table caption="API requests — five-minute buckets" columns={[{ key: 'group', label: 'Operation' }, { key: 'count', label: 'Requests', align: 'end' },
          { key: 'failures', label: '5xx', align: 'end' }, { key: 'aborted', label: 'Aborted', align: 'end' }, { key: 'rate', label: '5xx rate', align: 'end' },
          { key: 'p95', label: 'p95 duration' }]}
          data={Object.entries(snapshot.http.groups).map(([group, value]) => ({ group, ...value, rate: value.failureRate === null ? 'No samples' : `${(value.failureRate * 100).toFixed(2)}%`,
            p95: !value.count ? 'No samples' : value.p95Over10Seconds ? 'Above 10 seconds' : `At most ${value.p95UpperBoundMs} ms` }))} />
      </Card>
      <Card title="Database integrity candidates" description="Candidates only. Reconcile against a paused baseline before acting." flush>
        <Table caption="Database integrity candidates" columns={[{ key: 'signal', label: 'Signal' }, { key: 'count', label: 'Count', align: 'end' }]}
          data={[['Invalid stock values', database.invalidStockValues], ['Duplicate maintained order numbers', database.maintainedDuplicateOrderNumbers],
            ['Legacy duplicate numbers requiring review', database.legacyDuplicateOrderNumbers], ['Checkout receipts without orders', database.orphanCheckoutReceipts],
            ['Maintained orders without receipts', database.ordersMissingReceipts], ['Maintained orders without confirmation jobs', database.ordersMissingConfirmationJobs],
            ['Pending webhook events', database.pendingWebhookEvents], ['Observed database errors in this process', snapshot.http.databaseErrors]].map(([signal, count]) => ({ signal, count }))} />
      </Card>
      <Card title="Notification queue" flush>
        <Table caption="Notification queue" columns={[{ key: 'state', label: 'State' }, { key: 'count', label: 'Jobs', align: 'end' }, { key: 'oldest', label: 'Oldest age' }]}
          data={database.outbox.map(value => ({ ...value, oldest: value.oldestAgeSeconds === null ? 'Unknown' : `${value.oldestAgeSeconds} seconds` }))} />
      </Card>
      <Card title="Acceptance still required">
        <p>Stock/order reconciliation requires the paused baseline and committed-event ledger. Zero invalid stock values do not prove that quantities reconcile. Frontend latency, provider delivery and hosting alerts require independent monitoring.</p>
        {snapshot.http.commerceEvents ? <><h3>Optional usage reports</h3><p className="admin-hint">Consented storefront reports only; untrusted, partial coverage. These counts are not orders, customers or affected sessions. Replays can report twice; missing reports do not prove healthy journeys.</p>
          <dl>{Object.entries(snapshot.http.commerceEvents).map(([event, count]) => <div key={event}><dt>{event.replaceAll('_', ' ')}</dt><dd>{count}</dd></div>)}</dl>
          <p>Client JavaScript reports: {snapshot.http.clientJavaScriptErrors}. Investigate alerts by reproducing critical journeys; collect every deployed instance.</p></>
          : <p>Client JavaScript errors and optional usage reports are not configured.</p>}
        <p className="admin-hint admin-hint--tight">Retained-process counters reset on restart and use minute buckets. An empty sample is unknown. The modular API exposes its independently authenticated operations snapshot; the hosting monitor must collect it and retain evidence for the observation window.</p>
      </Card>
      <p className="admin-hint">
        <Badge tone="info">One process</Badge> Measurements are bounded per-process samples, not hosting-wide totals.
      </p>
    </>
  );
}
