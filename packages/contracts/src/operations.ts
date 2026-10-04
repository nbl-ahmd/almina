import { z } from 'zod';
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const sample = z.object({ count, failures: count, aborted: count, failureRate: z.number().min(0).max(1).nullable(),
  p95UpperBoundMs: count.nullable(), p95Over10Seconds: z.boolean() }).strict();
const http = z.object({ source: z.enum(['api', 'retained-api']), scope: z.literal('this-process-only'), startedAt: z.iso.datetime(), measuredAt: z.iso.datetime(),
  windowMinutes: z.union([z.literal(5), z.literal(10)]), warmupComplete: z.boolean(), groups: z.object({ catalog: sample, checkout: sample, other: sample }).strict(),
  databaseErrors: count, clientJavaScriptErrors: z.null(), clientJavaScriptCoverage: z.literal('not-configured') }).strict();
export const operationsSnapshotSchema = z.object({ http, latency: http, database: z.object({ invalidStockValues: count,
  maintainedDuplicateOrderNumbers: count, legacyDuplicateOrderNumbers: count, orphanCheckoutReceipts: count,
  ordersMissingReceipts: count, ordersMissingConfirmationJobs: count,
  outbox: z.array(z.object({ state: z.enum(['pending', 'processing', 'failed']), count, oldestAgeSeconds: count.nullable() }).strict()).max(3),
  pendingWebhookEvents: count, oldestPendingWebhookAgeSeconds: count.nullable(), stockOrderReconciliation: z.literal('operator-required'),
}).strict(), alerts: z.array(z.enum(['HTTP_5XX_THRESHOLD', 'CHECKOUT_FAILURE_THRESHOLD', 'CATALOG_LATENCY_THRESHOLD', 'CHECKOUT_LATENCY_THRESHOLD',
  'COMMERCE_INTEGRITY_REVIEW', 'WEBHOOK_BACKLOG', 'OUTBOX_REVIEW', 'DATABASE_ERRORS'])).max(8),
  measurement: z.literal('bounded-read-candidates; reconcile before action'), }).strict();
