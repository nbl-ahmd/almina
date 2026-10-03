# Performance evidence

Captured on 2026-10-03 before/after the production-performance source changes.

- `production-baseline.json`: three cold-browser public-homepage lab samples. No production mutations.
- `production-transfer-baseline.json`: supplemental one-run CDP network totals including cross-origin/preloaded resources and headers.
- `next-before.json` / `next-after.json`: five samples per compiled Next route, same synthetic upstream and browser settings.
- `next-transfer-before.json` / `next-transfer-after.json`: supplemental one-run CDP totals. The baseline source was archived before the edits, with matching workspace-local dependencies.
- `cra-before.json` / `cra-after.json`: five samples per compiled CRA route. `/login` is a not-found control; it is not `/admin/login`.
- `cra-bundle-before.json` / `cra-bundle-after.json`: actual per-chunk raw/gzip bytes and source-map span estimates. Gzip attribution is not additive per package.
- `http-before.json` / `http-after.json`: twenty sequential warm loopback HTTP requests per route with an 80 ms synthetic upstream delay.
- `database.json`: twenty samples per case against a newly created disposable MongoDB, with absent/present planned indexes and equivalent deep offset/cursor scans. Never connected to an application database.

See [method, interpretation, changes and rollout limits](../PERFORMANCE_2026-10-03.md). All timing values are milliseconds. Browser coverage counts UTF-16 code units, not exact executed bytes. Resource Timing and CDP wire totals use different accounting; compare matching fields. Missing INP events are not zero. No deployment or real-user percentile measurements are represented here.
