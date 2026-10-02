# Migration scripts

No data migration runs as part of install, startup or build. Future scripts must follow the audit: dry run first, explicit environment/database selection, bounded batches, checkpoints, idempotency, counts and verification, with a documented rollback. Never import legacy server startup to access data.
