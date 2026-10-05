# Authenticated operations snapshots — 2026-10-04

Branch: `codex/operations-dashboard`, stacked on `codex/whatsapp-inbox-ownership`.

The maintained operations module exposes an administrator-only read through retained `GET /api/operations` and modular `GET /api/v1/admin/operations`. Next `/admin/operations` renders the retained snapshot on the server. Staff and anonymous callers cannot access either API or the dashboard. The gateway validates the complete fixed response schema rather than projecting arbitrary upstream fields.

## Measurements and alerts

Each API instance records bounded, fixed-group catalog/checkout/other counters and duration histograms in at most thirty minute buckets. Health/status/operations probes are excluded. There are no URL, query, identity, product, address or payload dimensions. Five-minute counts include 5xx and aborted requests; expected 4xx validation/stock conflicts do not count as server failures. Ten-minute latency uses histogram upper bounds, not an exact percentile. Counters reset on process restart; empty samples return null rates and durations. These are minute-bucket approximations and cannot replace hosting-wide request/session measurements.

Read-only MongoDB aggregates report invalid stock values, duplicate business order numbers, missing maintained checkout receipts/confirmation jobs, orphan receipts, pending inbox receipts and outbox backlog/failed jobs. Legacy-only duplicate numbers are reported separately for reconciliation. Queries have a three-second server bound and four-second overall deadline. A query failure returns 503, never zero counts. Additive receipt-order and inbox-state indexes are included in the index plan; no index was applied to production.

Threshold candidates follow the cutover runbook: >1% 5xx/100 requests in five minutes; >2% server/aborted checkout failures/20 attempts; catalog >1500 ms and checkout >3000 ms p95 upper bounds/20 requests over ten minutes. Warmup prevents initial rate/latency decisions. Invalid stock, maintained duplicates, missing records, failed/old outbox jobs, old pending inbox events and observed MongoDB errors request investigation. Confirmed integrity failures require pausing writers and preserving receipts. No automatic traffic switch, writer pause, retry or destructive repair occurs.

## Coverage and hosted gates

The database candidates do **not** prove stock/order ledger reconciliation. Reconcile the paused baseline against committed events and independent fulfillment records. Missing queue dates are unknown. Client JavaScript errors, consented session counts, web latency, actual provider delivery and hosted alert destinations are not configured by this PR and remain explicit unknowns in the response/UI.

Before cutover, check query plans/volume on the isolated representative database, apply reviewed additive indexes, collect authenticated snapshots from **every** modular/retained instance, retain measurements across restarts and connect the owner's monitored alert destinations. The fixed thresholds do not establish a production baseline. Include the runbook's critical synthetic failures, database availability and client errors as separate signals. Do not expose the snapshot anonymously or store session cookies in monitoring records.

## Verification

Local: 62 unit, 100 API/security, 32 mandatory disposable replica-set/load, 7 release-gate and 27 Chromium scenarios passed, with lint, workspace typecheck, foundation build and all three lockfile audits (zero high/critical). Real database tests inject duplicates, orphan/missing receipts, missing confirmation jobs, invalid stock and inbox/outbox backlog; assert fixed counts/alerts without PII or writes; and verify unavailable measurements return 503.

Browser tests cover 360/390/768/1280 px, direct reload, scrollable keyboard-accessible tables, no page overflow and denied staff access. Running isolated Next Turbopack at port 4760 with a synthetic disposable database fixture has no compilation/runtime diagnostics. React inspection shows `Server(OperationsView)` and server tables; axe 4.12.1 scoped to `#admin-main` reports zero violations/incomplete checks. No production database/provider action, deployment or analytics collection occurred.

Rollback removes the dashboard/routing or switches to a previously verified compatible application; it does not change business records. Retain additive indexes. Production remains blocked by hosted acceptance, backups/restore, credential rotation and exact deployed-SHA evidence.
