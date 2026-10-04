import type { z } from 'zod';
import type { operationsSnapshotSchema } from '@almina/contracts';
import { Table } from './views';
export function OperationsView({ snapshot }: { snapshot: z.infer<typeof operationsSnapshotSchema> }) {
  const database = snapshot.database;
  return <>
    <h1>Operations</h1>
    <p>Measured at {snapshot.http.measuredAt}. This view covers one {snapshot.http.source} process. Refresh to read current signals; collect every deployed API instance before making a release decision.</p>
    <section className="admin-panel"><h2>Alerts to investigate</h2>
      {snapshot.alerts.length ? <ul role="alert">{snapshot.alerts.map(alert => <li key={alert}>{alert.replaceAll('_', ' ')}</li>)}</ul>
        : <p>No thresholds triggered in this sample. {snapshot.http.warmupComplete ? 'Five-minute sampling is available.' : 'Five-minute sampling is still warming up.'}</p>}
      <p>Pause commerce writers for confirmed duplicate orders, invalid stock or missing committed records. Preserve receipts and reconcile before rollback.</p>
    </section>
    <Table caption="API requests — five-minute buckets" columns={[{ key: 'group', label: 'Operation' }, { key: 'count', label: 'Requests' },
      { key: 'failures', label: '5xx' }, { key: 'aborted', label: 'Aborted' }, { key: 'rate', label: '5xx rate' }, { key: 'p95', label: 'p95 duration' }]}
      data={Object.entries(snapshot.http.groups).map(([group, value]) => ({ group, ...value, rate: value.failureRate === null ? 'No samples' : `${(value.failureRate * 100).toFixed(2)}%`,
        p95: !value.count ? 'No samples' : value.p95Over10Seconds ? 'Above 10 seconds' : `At most ${value.p95UpperBoundMs} ms` }))} />
    <Table caption="Database integrity candidates" columns={[{ key: 'signal', label: 'Signal' }, { key: 'count', label: 'Count' }]}
      data={[['Invalid stock values', database.invalidStockValues], ['Duplicate maintained order numbers', database.maintainedDuplicateOrderNumbers],
        ['Legacy duplicate numbers requiring review', database.legacyDuplicateOrderNumbers], ['Checkout receipts without orders', database.orphanCheckoutReceipts],
        ['Maintained orders without receipts', database.ordersMissingReceipts], ['Maintained orders without confirmation jobs', database.ordersMissingConfirmationJobs],
        ['Pending webhook events', database.pendingWebhookEvents], ['Observed database errors in this process', snapshot.http.databaseErrors]].map(([signal, count]) => ({ signal, count }))} />
    <Table caption="Notification queue" columns={[{ key: 'state', label: 'State' }, { key: 'count', label: 'Jobs' }, { key: 'oldest', label: 'Oldest age' }]}
      data={database.outbox.map(value => ({ ...value, oldest: value.oldestAgeSeconds === null ? 'Unknown' : `${value.oldestAgeSeconds} seconds` }))} />
    <section className="admin-panel"><h2>Acceptance still required</h2>
      <p>Stock/order reconciliation requires the paused baseline and committed-event ledger. Zero invalid stock values do not prove that quantities reconcile. Client JavaScript errors, frontend latency, provider delivery and hosting alerts are not measured here.</p>
      <p>Retained-process counters reset on restart and use minute buckets. An empty sample is unknown. The modular API exposes its independently authenticated operations snapshot; the hosting monitor must collect it and retain evidence for the observation window.</p>
    </section>
  </>;
}
