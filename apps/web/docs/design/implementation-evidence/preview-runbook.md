# Isolated catalogue preview — baseline runbook

Recorded 17 November 2026 for P0-01. Current setup was observed working; the stop/restart cycle below was **not executed** during baseline reconciliation. See [phase evidence](phase-0.md) for identities and limitations.

## Purpose and boundaries

Read-only storefront visual reference: committed `scripts/tooling/storefront-reference-fixture.mjs` serves local media/synthetic catalogue facts; Next serves customer pages. No database, full backend, checkout/provider service or live authentication. This is not the full commerce/admin E2E harness and cannot validate those flows. Do not enable real capabilities or replace local origins with production endpoints.

## Preflight on each restart

1. Read current progress/AGENTS and inspect `git status`. Confirm Node/npm versions against `.nvmrc`/package.json; resolve installed Next via `npm run docs:next`. At baseline these were Node 24.21.0/npm 11.19.0/Next 16.4.2.
2. Inspect current fixture and Next config. Validate trusted local asset/provenance availability under `docs/design/storefront/previews/assets/`; no credentials are required. Do not run install/build scripts with backend environment files.
3. Check root/apps/web environment-file **presence**, without printing their values. If new environment files exist, reconcile isolation before starting: a clean shell alone does not stop Next from loading its project env files. Do not delete user configuration to make this recipe work.
4. Rediscover listeners: `lsof -nP -iTCP:4860 -iTCP:4861 -sTCP:LISTEN`. If occupied, identify ownership and health. Reuse the verified healthy session, or stop only an owned launcher as below. Never kill an arbitrary port holder. Alternate ports require changing both ports and every local origin consistently.
5. Confirm no concurrent process uses the same `.next-admin-dev` output. Do not remove live build output. The baseline root node_modules Next CLI path below was verified; re-resolve it if dependency layout changes.

## Foreground launch — two owned terminals

These commands inject only the listed safe development configuration; no existing `.env` or whole-shell environment should be imported. Keep processes in the foreground so Ctrl-C targets the owned session. Run from the stated directories.

Terminal A — catalogue:

```sh
cd /Users/administrator/Nabeel/dev/almina
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" \
  NODE_ENV=development APP_ENV=development DATABASE_MODE=disabled \
  PORT=4861 NEXT_TELEMETRY_DISABLED=1 \
  node scripts/tooling/storefront-reference-fixture.mjs
```

Terminal B — web:

```sh
cd /Users/administrator/Nabeel/dev/almina/apps/web
env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" \
  NODE_ENV=development APP_ENV=development DATABASE_MODE=disabled \
  NEXT_TELEMETRY_DISABLED=1 AL_MINA_ISOLATED_DEV=1 ALMINA_REFERENCE_PREVIEW=1 \
  WEB_ORIGIN=http://127.0.0.1:4860 \
  API_ORIGIN=http://127.0.0.1:4861 LEGACY_API_ORIGIN=http://127.0.0.1:4861 \
  STOREFRONT_REDIRECTS_VERIFIED=true CHECKOUT_ENABLED=false \
  STRIPE_TEST_ENABLED=false COMMERCE_TELEMETRY_ENABLED=false \
  node ../../node_modules/next/dist/bin/next dev --turbopack --hostname 127.0.0.1 --port 4860
```

The three explicit false feature values match the inspected baseline defaults and make the recipe unambiguous. Never substitute `npm start` (legacy deployment contract), `npm run dev:demo` (different disposable commerce environment) or the admin fixture and assume the same baseline. Do not rely on `/tmp/almina-reference-runtime.mjs`; it is an existing untracked convenience wrapper, not durable tooling.

## Verify before use

- `http://127.0.0.1:4861/__fixture/reference-health` must return exactly `almina-reference-preview-synthetic` with 200.
- `http://127.0.0.1:4860/` must render the visible sample-price/availability notice and reference catalogue. Check products/cart and gated checkout. Use local Next MCP/browser diagnostics when exercising UI, rather than interpreting 200 as full correctness.
- Confirm API traffic stays loopback and no production/provider operations are involved. Root/apps/web env files were absent at baseline; recheck on future sessions.
- Record exact source commit, process ownership, launch configuration, ports, locale/state and evidence. P0-04 owns full browser captures; this recipe alone proves no visual/commerce acceptance.

## Stop and restart safely

For the two foreground sessions, Ctrl-C in Terminal B and Terminal A, then confirm their listeners exited. If backgrounding is necessary later, record owned launcher/child PIDs at launch and send SIGTERM only to the revalidated owned process; verify shutdown before reuse. Do not use broad `pkill`, port-wide kill pipelines or stale PID numbers.

The pre-existing wrapper discovered during P0-01 owned both services and handles SIGINT/SIGTERM by signalling its children. If replacing that session, first verify its current command/cwd/parent-child relationships, then signal that owned wrapper and check both listeners. Its historical PID 34386 is evidence only, not a restart instruction. No process was stopped in P0-01.

To restart, repeat preflight, then launch the two foreground commands. Keep data/config unchanged; do not clear caches or install/upgrade dependencies merely because a port is occupied. If either service fails, preserve diagnostic evidence, stop the owned counterpart and investigate before retrying.
