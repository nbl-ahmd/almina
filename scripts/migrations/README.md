# Migration scripts

No data migration runs as part of install, startup or build. Scripts must follow the audit: plan first, explicit environment/database selection, bounded batches, idempotency, counts and verification, with a documented rollback. Never import legacy server startup to access data.

- `api-indexes.ts`: connection-free index plan by default; explicit `--apply` adds indexes.
- `commerce.ts`: connection-free description by default; `--apply` requires `COMMERCE_WRITERS_PAUSED=true` and explicitly injected database configuration. Preserves legacy fields, historical amounts and stock; applies additive indexes/status/provenance/policy/counter changes. Plans do not inventory live data. Rehearse apply/rerun in isolated staging before production.
- `release-gate.ts`: validates release evidence without connecting to any service. `template` emits an incomplete record; `preflight`, `cutover`, and `complete` fail on missing evidence. It never runs migrations or authorizes removal of legacy fields.

Follow the [production cutover and recovery procedure](../../docs/migration/PRODUCTION_CUTOVER_2026-10-03.md) and [commerce migration constraints](../../docs/migration/COMMERCE_INTEGRITY_2026-10-03.md). All writers must actually be paused before commerce apply; an environment flag alone does not pause them. Keep counters, receipts, snapshots, outbox, new orders and old fields during application rollback.
